import {
  CapabilityFlag,
  ExportPolicy,
  Figure,
  GroupNode,
  HtmlBlock,
  ImageNode,
  ImportRecord,
  Legend,
  LiftedBy,
  ObjectBase,
  OriginalSourceRef,
  Panel,
  Project,
  ShapeNode,
  TextNode,
} from '../../ir-schema/dist/index';
import { AdapterHints } from '../../importer-adapters/dist/index';
import { NormalizedDocument, NormalizedNode } from '../../core-normalizer/dist/index';
import { buildProvenance } from './provenance/buildProvenance';
import { makeStabilityProfile } from './stabilityProfile';

const NON_RENDERABLE_DEFINITION_TAGS: ReadonlySet<string> = new Set([
  'defs',
  'symbol',
  'clippath',
  'mask',
  'marker',
  'pattern',
  'lineargradient',
  'radialgradient',
  'metadata',
  'title',
  'desc',
  'style',
  'script',
]);

function defaultBase<T extends ObjectBase['objectType']>(nodeId: string, explicitId: string | undefined, objectType: T, bbox: ObjectBase['bbox'], provenance: ObjectBase['provenance'], capabilities: CapabilityFlag[]): Omit<ObjectBase, 'objectType'> & { objectType: T } {
  return {
    id: explicitId ?? `obj_${nodeId}`,
    objectType,
    name: `${objectType}_${nodeId}`,
    visible: true,
    locked: false,
    zIndex: 0,
    bbox,
    transform: { translate: [0, 0], scale: [1, 1], rotate: 0 },
    styleRef: null,
    capabilities,
    provenance,
    stability: makeStabilityProfile(objectType === 'image_node' ? 'atomic' : objectType === 'group_node' || objectType === 'html_block' ? 'group_only' : 'semantic'),
    manualEdits: [],
  };
}

const HTML_TAGS: ReadonlySet<string> = new Set(['div', 'span', 'p', 'img', 'figure', 'figcaption', 'section']);

function resolveHtmlTagName(node: NormalizedNode): HtmlBlock['tagName'] {
  const explicit = String(node.attributes['data-fe-tag'] ?? '').toLowerCase();
  if (HTML_TAGS.has(explicit)) return explicit as HtmlBlock['tagName'];
  const native = node.tagName.toLowerCase();
  if (HTML_TAGS.has(native)) return native as HtmlBlock['tagName'];
  return 'div';
}

function resolveNodeTextContent(node: NormalizedNode): string | null {
  if (node.textContent !== null && node.textContent !== undefined) return node.textContent;
  const attrText = node.attributes['data-fe-text-content'];
  return attrText === undefined ? null : attrText;
}

function firstNumeric(value: string | undefined, fallback = 0): number {
  if (!value) return fallback;
  const token = String(value).trim().split(/[\s,]+/)[0];
  const parsed = Number.parseFloat(token);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function unionBBoxes(boxes: Array<{ x: number; y: number; w: number; h: number } | null | undefined>): { x: number; y: number; w: number; h: number } | null {
  const valid = boxes.filter((bbox): bbox is { x: number; y: number; w: number; h: number } => Boolean(bbox));
  if (valid.length === 0) return null;
  let minX = valid[0].x;
  let minY = valid[0].y;
  let maxX = valid[0].x + valid[0].w;
  let maxY = valid[0].y + valid[0].h;
  for (let i = 1; i < valid.length; i += 1) {
    const bbox = valid[i];
    minX = Math.min(minX, bbox.x);
    minY = Math.min(minY, bbox.y);
    maxX = Math.max(maxX, bbox.x + bbox.w);
    maxY = Math.max(maxY, bbox.y + bbox.h);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function collectDescendantNodeIds(normalized: NormalizedDocument, rootNodeId: string): string[] {
  const out: string[] = [];
  const stack = [...(normalized.nodes[rootNodeId]?.children ?? [])];
  while (stack.length > 0) {
    const nodeId = stack.shift()!;
    out.push(nodeId);
    const node = normalized.nodes[nodeId];
    if (!node) continue;
    stack.unshift(...node.children);
  }
  return out;
}

function normalizeHrefToken(href: string | undefined): string | null {
  if (!href) return null;
  const raw = href.startsWith('#') ? href.slice(1) : href;
  return raw.trim().length > 0 ? raw.trim() : null;
}

function buildAttributeIdIndex(normalized: NormalizedDocument): Map<string, NormalizedNode> {
  const index = new Map<string, NormalizedNode>();
  for (const node of Object.values(normalized.nodes)) {
    const id = String(node.attributes.id ?? '').trim();
    if (!id || index.has(id)) continue;
    index.set(id, node);
  }
  return index;
}

function isSerializableShapeTag(tagName: string): boolean {
  return ['path', 'line', 'rect', 'circle', 'polyline', 'polygon', 'ellipse'].includes(tagName);
}

function resolveShapeKind(
  node: NormalizedNode,
  useReference: { definitionTag: string } | null
): ShapeNode['shapeKind'] {
  const localTag = String(node.localTagName ?? node.tagName ?? '').toLowerCase();
  const candidate = localTag === 'use' ? useReference?.definitionTag ?? 'path' : localTag;
  return ['path', 'line', 'rect', 'circle', 'polyline', 'polygon'].includes(candidate)
    ? candidate as ShapeNode['shapeKind']
    : 'path';
}

function buildUseReference(
  node: NormalizedNode,
  normalized: NormalizedDocument,
  parentById: Record<string, string | null>,
  attributeIdIndex: Map<string, NormalizedNode>
): {
  href: string;
  definitionId: string;
  definitionTag: string;
  definitionAttributes: Record<string, string>;
} | null {
  if (String(node.localTagName ?? node.tagName ?? '').toLowerCase() !== 'use') return null;
  const definitionId = normalizeHrefToken(node.attributes.href ?? node.attributes['xlink:href']);
  if (!definitionId) return null;
  const definitionNode = attributeIdIndex.get(definitionId);
  if (!definitionNode) return null;
  const definitionTag = String(definitionNode.localTagName ?? definitionNode.tagName ?? '').toLowerCase();
  if (!isSerializableShapeTag(definitionTag)) return null;
  if (!isInNonRenderableDefinitionSubtree(definitionNode.nodeId, normalized, parentById)) return null;
  return {
    href: `#${definitionId}`,
    definitionId,
    definitionTag,
    definitionAttributes: { ...definitionNode.attributes, id: definitionId },
  };
}

function isMarkerLikeHrefToken(raw: string | null): boolean {
  if (!raw) return false;
  return /^m[0-9a-f]{4,}$/i.test(raw);
}

function isFontGlyphHref(href: string | undefined): boolean {
  const raw = normalizeHrefToken(href);
  if (!raw || isMarkerLikeHrefToken(raw)) return false;
  return /-([0-9a-fA-F]{1,6})$/.test(raw) || /^[A-Za-z][0-9A-Fa-f]{2,6}$/.test(raw);
}

function decodeGlyphCharFromHref(href: string | undefined): string | null {
  const raw = normalizeHrefToken(href);
  if (!raw || isMarkerLikeHrefToken(raw)) return null;
  const match = raw.match(/-([0-9a-fA-F]{1,6})$/) ?? raw.match(/^[A-Za-z]([0-9A-Fa-f]{2,6})$/);
  if (!match) return null;
  const codePoint = Number.parseInt(match[1], 16);
  if (!Number.isFinite(codePoint) || codePoint < 0x20) {
    return codePoint === 0x20 ? ' ' : null;
  }
  try {
    return String.fromCodePoint(codePoint);
  } catch {
    return null;
  }
}

function normalizeGlyphFontFamilyToken(token: string | null | undefined): string | null {
  const raw = String(token ?? '').trim();
  if (!raw) return null;
  const cleaned = raw.replace(/[-_]/g, ' ');
  const known = new Map([
    ['DejaVuSans', 'DejaVu Sans'],
    ['DejaVuSerif', 'DejaVu Serif'],
    ['DejaVuSansMono', 'DejaVu Sans Mono'],
  ]);
  if (known.has(raw)) return known.get(raw)!;
  if (known.has(cleaned.replace(/\s+/g, ''))) return known.get(cleaned.replace(/\s+/g, ''))!;
  const withSpaces = cleaned.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\s+/g, ' ').trim();
  return withSpaces.length > 0 ? withSpaces : raw;
}

function inferGlyphFontFamily(href: string | undefined): string | null {
  const raw = normalizeHrefToken(href);
  if (!raw || isMarkerLikeHrefToken(raw)) return null;
  const familyToken = raw.replace(/-([0-9a-fA-F]{1,6})$/, '');
  if (!familyToken || familyToken === raw) return null;
  return normalizeGlyphFontFamilyToken(familyToken);
}

function decodeGlyphContent(
  node: NormalizedNode,
  normalized: NormalizedDocument,
  attributeIdIndex: Map<string, NormalizedNode>
): {
  content: string;
  bbox: { x: number; y: number; w: number; h: number } | null;
  fontSize: number;
  rotate: number;
  position: [number, number];
  fontFamily: string | null;
  glyphVector: {
    wrapperTransform: string | null;
    wrapperStyle: Record<string, string>;
    definitions: Array<{ id: string; tagName: string; attributes: Record<string, string> }>;
    uses: Array<{ attributes: Record<string, string> }>;
  };
} | null {
  const descendants = collectDescendantNodeIds(normalized, node.nodeId)
    .map((childId) => normalized.nodes[childId])
    .filter(Boolean);
  const useNodes = descendants.filter((child) => child.localTagName.toLowerCase() === 'use');
  if (useNodes.length === 0) return null;

  const glyphUseNodes = useNodes.filter((useNode) => isFontGlyphHref(useNode.attributes.href ?? useNode.attributes['xlink:href']));
  if (glyphUseNodes.length === 0) return null;
  if (glyphUseNodes.length / useNodes.length < 0.6) return null;

  const content = glyphUseNodes
    .map((useNode) => decodeGlyphCharFromHref(useNode.attributes.href ?? useNode.attributes['xlink:href']))
    .filter((glyph): glyph is string => glyph !== null)
    .join('');

  if (content.trim().length === 0 && !content.includes(' ')) return null;

  const descendantTransformCarrier =
    descendants.find((child) => child.localTagName.toLowerCase() === 'g' && child.transform.raw !== null) ??
    descendants.find((child) => child.transform.raw !== null) ??
    null;
  const transformCarrier = node.transform.raw !== null ? node : descendantTransformCarrier ?? node;
  const [translateXRaw, translateYRaw] = transformCarrier.transform.translate ?? [node.bbox?.x ?? 0, node.bbox?.y ?? 0];
  const [scaleXRaw, scaleYRaw] = transformCarrier.transform.scale ?? [1, 1];
  const translateX = Number.isFinite(translateXRaw) ? translateXRaw : node.bbox?.x ?? 0;
  const translateY = Number.isFinite(translateYRaw) ? translateYRaw : node.bbox?.y ?? 0;
  const scaleX = Number.isFinite(scaleXRaw) && scaleXRaw !== 0 ? Math.abs(scaleXRaw) : 1;
  const scaleY = Number.isFinite(scaleYRaw) && scaleYRaw !== 0 ? Math.abs(scaleYRaw) : 1;

  const scaleDrivenFontSize =
    transformCarrier.transform.raw && (Math.abs(scaleX - 1) > 0.001 || Math.abs(scaleY - 1) > 0.001)
      ? clamp(Math.max(scaleX, scaleY) * 100, 4, 24)
      : 0;
  const localDefGlyphHeights = descendants
    .filter((child) => child.localTagName.toLowerCase() === 'path' && typeof child.attributes.id === 'string')
    .map((child) => child.bbox?.h ?? 0)
    .filter((value) => Number.isFinite(value) && value > 0 && value < 64);
  const fallbackGlyphSizes = glyphUseNodes
    .map((useNode) => useNode.bbox)
    .filter((childBBox): childBBox is { x: number; y: number; w: number; h: number } => Boolean(childBBox))
    .map((childBBox) => Math.max(childBBox.w, childBBox.h))
    .filter((value) => Number.isFinite(value) && value > 0 && value < 64);
  const rotate = Number.isFinite(transformCarrier.transform.rotate) ? Number(transformCarrier.transform.rotate) : 0;
  const fontSize = scaleDrivenFontSize || clamp(median(localDefGlyphHeights) || median(fallbackGlyphSizes) || 12, 6, 24);

  const rawXOffsets = glyphUseNodes
    .map((useNode) => useNode.transform.translate?.[0] ?? 0)
    .filter((value): value is number => Number.isFinite(value));
  const maxAdvance = rawXOffsets.length > 0 ? Math.max(...rawXOffsets) : 0;
  const minAdvance = rawXOffsets.length > 0 ? Math.min(...rawXOffsets) : 0;
  const widthFromAdvance =
    rawXOffsets.length > 0
      ? (maxAdvance - Math.min(0, minAdvance)) * scaleX + fontSize * 0.75
      : fontSize * 0.58 * Math.max(1, content.length);
  const width = Math.max(fontSize * 0.8, widthFromAdvance);
  const height = Math.max(fontSize * 1.3, fontSize + 1);

  const isQuarterTurn = Math.abs(Math.abs(rotate) - 90) <= 0.01;
  const bbox = isQuarterTurn
    ? {
        x: translateX - height * 0.5,
        y: translateY - width,
        w: height,
        h: width,
      }
    : {
        x: translateX,
        y: translateY - fontSize * 0.95,
        w: width,
        h: height,
      };

  const familyCandidates = glyphUseNodes
    .map((useNode) => inferGlyphFontFamily(useNode.attributes.href ?? useNode.attributes['xlink:href']))
    .filter((family): family is string => Boolean(family));
  const fontFamily = familyCandidates.length > 0 ? familyCandidates[0] : null;

  const definitionMap = new Map<string, { id: string; tagName: string; attributes: Record<string, string> }>();
  for (const useNode of glyphUseNodes) {
    const definitionId = normalizeHrefToken(useNode.attributes.href ?? useNode.attributes['xlink:href']);
    if (!definitionId || definitionMap.has(definitionId)) continue;
    const definitionNode = attributeIdIndex.get(definitionId);
    if (!definitionNode) continue;
    definitionMap.set(definitionId, {
      id: definitionId,
      tagName: String(definitionNode.localTagName ?? definitionNode.tagName ?? 'path').toLowerCase(),
      attributes: { ...definitionNode.attributes, id: definitionId },
    });
  }

  const wrapperStyle: Record<string, string> = {};
  for (const key of ['fill', 'fill-opacity', 'stroke', 'stroke-opacity', 'stroke-width']) {
    const value = transformCarrier.styles[key] ?? node.styles[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      wrapperStyle[key] = value;
    }
  }

  return {
    content,
    bbox,
    fontSize,
    rotate,
    position: [translateX, translateY],
    fontFamily,
    glyphVector: {
      wrapperTransform: transformCarrier.transform.raw ?? null,
      wrapperStyle,
      definitions: [...definitionMap.values()],
      uses: glyphUseNodes.map((useNode) => ({
        attributes: { ...useNode.attributes },
      })),
    },
  };
}

function makeGlyphTextProxy(node: NormalizedNode, normalized: NormalizedDocument, source: OriginalSourceRef, attributeIdIndex: Map<string, NormalizedNode>): TextNode | null {
  const idAttr = String(node.attributes.id ?? '');
  const objectTypeHint = String(node.attributes['data-fe-object-type'] ?? '').toLowerCase();
  const looksLikeExportedProxy = objectTypeHint === 'text_node';
  if (!looksLikeExportedProxy && !/^text_\d+$/i.test(idAttr)) return null;
  const decoded = decodeGlyphContent(node, normalized, attributeIdIndex);
  if (!decoded) return null;
  const bbox = decoded.bbox ?? node.bbox ?? { x: 0, y: 0, w: 0, h: 0 };
  const proxy = {
    ...defaultBase(node.nodeId, node.attributes['data-fe-object-id'], 'text_node', bbox, buildProvenance({
      sourceId: source.sourceId,
      node,
      originFileKind: source.kind === 'html' ? 'html' : 'svg',
      liftedBy: source.familyHint === 'matplotlib' ? 'matplotlib_adapter' : 'generic_importer',
      liftConfidence: 'medium',
      degradationReason: 'text_as_path',
    }), ['select', 'multi_select', 'drag', 'delete', 'group_only']),
    textKind: 'path_text_proxy',
    content: decoded.content,
    position: decoded.position,
    font: {
      family: decoded.fontFamily ?? node.styles['font-family'] ?? 'glyph_proxy',
      size: decoded.fontSize,
      weight: String(node.styles['font-weight'] ?? 'unknown'),
      style: String(node.styles['font-style'] ?? 'unknown'),
    },
    fill: String(node.styles.fill ?? '#111111'),
    transform: {
      translate: [0, 0],
      scale: [1, 1],
      rotate: decoded.rotate,
    },
  } as TextNode & {
    glyphVector?: {
      wrapperTransform: string | null;
      wrapperStyle: Record<string, string>;
      definitions: Array<{ id: string; tagName: string; attributes: Record<string, string> }>;
      uses: Array<{ attributes: Record<string, string> }>;
    };
  };
  proxy.glyphVector = decoded.glyphVector;
  return proxy;
}

function makeTextObject(node: NormalizedNode, source: OriginalSourceRef): TextNode {
  const textContent = resolveNodeTextContent(node);
  const isProxy = !textContent || textContent.trim().length === 0;
  const textKind = isProxy ? 'path_text_proxy' : 'raw_text';
  const textX = node.bbox?.x ?? firstNumeric(node.attributes.x);
  const textY = node.bbox?.y ?? firstNumeric(node.attributes.y);
  const textBBox = node.bbox ?? { x: textX, y: textY, w: 0, h: 0 };
  const capabilities: CapabilityFlag[] = isProxy
    ? ['select', 'multi_select', 'drag', 'delete', 'group_only']
    : ['select', 'multi_select', 'drag', 'delete', 'text_edit'];
  return {
    ...defaultBase(node.nodeId, node.attributes['data-fe-object-id'], 'text_node', textBBox, buildProvenance({
      sourceId: source.sourceId,
      node,
      originFileKind: source.kind === 'html' ? 'html' : 'svg',
      liftedBy: 'generic_importer',
      liftConfidence: 'high',
      degradationReason: isProxy ? 'text_as_path' : 'none',
    }), capabilities),
    textKind,
    content: textContent ?? '',
    position: [textX, textY],
    font: { family: node.styles['font-family'] ?? 'unknown', size: Number(node.styles['font-size'] ?? 12), weight: String(node.styles['font-weight'] ?? 'unknown'), style: String(node.styles['font-style'] ?? 'unknown') },
    fill: String(node.styles.fill ?? '#000000'),
  };
}

function makeImageObject(node: NormalizedNode, source: OriginalSourceRef): ImageNode {
  const capabilities: CapabilityFlag[] = ['select', 'multi_select', 'drag', 'delete', 'crop_only', 'replace_image', 'resize'];
  return {
    ...defaultBase(node.nodeId, node.attributes['data-fe-object-id'], 'image_node', node.bbox ?? { x: 0, y: 0, w: 0, h: 0 }, buildProvenance({
      sourceId: source.sourceId,
      node,
      originFileKind: source.kind === 'html' ? 'html' : 'svg',
      liftedBy: 'generic_importer',
      liftConfidence: 'high',
      degradationReason: 'raster_embedded',
    }), capabilities),
    imageKind: node.tagName.toLowerCase() === 'img' ? 'html_img' : 'embedded_base64',
    href: node.attributes.href ?? node.attributes['xlink:href'] ?? '',
    crop: { x: 0, y: 0, w: node.bbox?.w ?? 0, h: node.bbox?.h ?? 0 },
  };
}

function makeShapeObject(
  node: NormalizedNode,
  source: OriginalSourceRef,
  normalized: NormalizedDocument,
  parentById: Record<string, string | null>,
  attributeIdIndex: Map<string, NormalizedNode>
): ShapeNode {
  const capabilities: CapabilityFlag[] = ['select', 'multi_select', 'drag', 'delete', 'style_edit'];
  const strokeColor = node.styles.stroke ? String(node.styles.stroke) : 'none';
  const useReference = buildUseReference(node, normalized, parentById, attributeIdIndex);
  return {
    ...defaultBase(node.nodeId, node.attributes['data-fe-object-id'], 'shape_node', node.bbox ?? { x: 0, y: 0, w: 0, h: 0 }, buildProvenance({
      sourceId: source.sourceId,
      node,
      originFileKind: source.kind === 'html' ? 'html' : 'svg',
      liftedBy: 'generic_importer',
      liftConfidence: 'medium',
      degradationReason: 'none',
    }), capabilities),
    shapeKind: resolveShapeKind(node, useReference),
    geometry: {
      originalTag: String(node.localTagName ?? node.tagName ?? '').toLowerCase(),
      attributes: { ...node.attributes },
      ...(useReference ? { useReference } : {}),
    },
    stroke: { color: strokeColor, width: Number(node.styles['stroke-width'] ?? 1), dasharray: node.styles['stroke-dasharray'] ? String(node.styles['stroke-dasharray']) : null },
    fill: { color: node.styles.fill ? String(node.styles.fill) : null, opacity: Number(node.styles['fill-opacity'] ?? 1) },
  };
}

function makeGroupOrHtmlObject(node: NormalizedNode, source: OriginalSourceRef, normalized: NormalizedDocument): GroupNode | HtmlBlock {
  const explicitType = String(node.attributes['data-fe-object-type'] ?? '').toLowerCase();
  const objectType = node.nodeKind === 'html_block' || explicitType === 'html_block' || Boolean(node.attributes['data-fe-tag'])
    ? 'html_block'
    : 'group_node';
  const textContent = resolveNodeTextContent(node);
  const hasText = Boolean(textContent && textContent.trim().length > 0);
  const capabilities: CapabilityFlag[] = objectType === 'html_block'
    ? (hasText ? ['select', 'multi_select', 'drag', 'resize', 'delete', 'text_edit'] : ['select', 'multi_select', 'drag', 'resize', 'delete', 'group_only'])
    : ['select', 'multi_select', 'drag', 'delete', 'group_only', 'promote_semantic_role', 'reparent'];
  const base = defaultBase(node.nodeId, node.attributes['data-fe-object-id'], objectType, node.bbox ?? { x: 0, y: 0, w: 0, h: 0 }, buildProvenance({
    sourceId: source.sourceId,
    node,
    originFileKind: source.kind === 'html' ? 'html' : 'svg',
    liftedBy: 'generic_importer',
    liftConfidence: 'medium',
    degradationReason: 'none',
  }), capabilities);

  if (objectType === 'html_block') {
    return {
      ...base,
      objectType: 'html_block',
      tagName: resolveHtmlTagName(node),
      layoutMode: 'relative',
      textContent,
      childObjectIds: node.children
        .map((childId) => normalized.nodes[childId])
        .filter((child): child is NormalizedNode => Boolean(child))
        .map((child) => resolvedObjectIdForNode(child)),
    };
  }

  return {
    ...base,
    objectType: 'group_node',
    childObjectIds: node.children
      .map((childId) => normalized.nodes[childId])
      .filter((child): child is NormalizedNode => Boolean(child))
      .map((child) => resolvedObjectIdForNode(child)),
    semanticRoleHint: 'generic_group',
  };
}

function buildParentIndex(normalized: NormalizedDocument): Record<string, string | null> {
  const parentById: Record<string, string | null> = {};
  for (const node of Object.values(normalized.nodes)) {
    if (parentById[node.nodeId] === undefined) parentById[node.nodeId] = null;
    for (const childId of node.children) {
      parentById[childId] = node.nodeId;
    }
  }
  return parentById;
}

function isInNonRenderableDefinitionSubtree(
  nodeId: string,
  normalized: NormalizedDocument,
  parentById: Record<string, string | null>
): boolean {
  let cursor: string | null = nodeId;
  while (cursor) {
    const node = normalized.nodes[cursor];
    if (!node) break;
    const localTag = String(node.localTagName ?? node.tagName ?? '').toLowerCase();
    if (NON_RENDERABLE_DEFINITION_TAGS.has(localTag)) return true;
    cursor = parentById[cursor] ?? null;
  }
  return false;
}


function mapAdapterToLiftedBy(adapterName: string | undefined): LiftedBy {
  switch (adapterName) {
    case 'manual_promote':
      return 'manual_promote';
    case 'matplotlib_adapter':
      return 'matplotlib_adapter';
    case 'chart_adapter':
      return 'chart_adapter';
    case 'illustration_adapter':
      return 'illustration_adapter';
    case 'llm_svg_adapter':
      return 'llm_svg_adapter';
    default:
      return 'generic_importer';
  }
}

function semanticObjectExplicitId(node: NormalizedNode, expectedRole: 'panel' | 'legend'): string | undefined {
  const role = String(node.attributes['data-fe-role'] ?? '').toLowerCase();
  if (expectedRole === 'panel' && role !== 'panel') return undefined;
  if (expectedRole === 'legend' && role !== 'legend') return undefined;
  return node.attributes['data-fe-object-id'] ?? undefined;
}

function resolvedObjectIdForNode(node: NormalizedNode): string {
  return node.attributes['data-fe-object-id'] ?? `obj_${node.nodeId}`;
}

function reserveSemanticId(preferredId: string | undefined, role: 'panel' | 'legend', nodeId: string, reservedIds: Set<string>): string {
  const seed = preferredId ?? `obj_${role}_${nodeId}`;
  if (!reservedIds.has(seed)) {
    reservedIds.add(seed);
    return seed;
  }
  let suffix = 2;
  let next = `${seed}_${suffix}`;
  while (reservedIds.has(next)) {
    suffix += 1;
    next = `${seed}_${suffix}`;
  }
  reservedIds.add(next);
  return next;
}

function buildSemanticChildRefs(wrappedId: string, explicitId: string): string[] {
  if (!wrappedId) return [];
  if (wrappedId === explicitId) return [];
  return [wrappedId];
}

function isSemanticMarkerNode(node: NormalizedNode): boolean {
  const role = String(node.attributes['data-fe-role'] ?? '').toLowerCase();
  return role === 'panel' || role === 'legend' || role === 'annotation' || role === 'annotation_block' || role === 'figure_title' || role === 'panel_label';
}

function buildSemanticObjects(normalized: NormalizedDocument, hints: AdapterHints, source: OriginalSourceRef, reservedIds: Set<string>): { panels: Panel[]; legends: Legend[] } {
  const panels: Panel[] = [];
  const legends: Legend[] = [];
  const seenHints = new Set<string>();

  for (const hint of hints.hints) {
    const nodeId = hint.nodeIds[0];
    const dedupKey = `${hint.kind}:${nodeId}`;
    if (seenHints.has(dedupKey)) continue;
    seenHints.add(dedupKey);

    const node = normalized.nodes[nodeId];
    if (!node) continue;
    if (hint.kind === 'panel_candidate') {
      const explicitId = reserveSemanticId(semanticObjectExplicitId(node, 'panel'), 'panel', node.nodeId, reservedIds);
      const wrappedId = resolvedObjectIdForNode(node);
      const childObjectIds = buildSemanticChildRefs(wrappedId, explicitId);
      panels.push({
        ...defaultBase(`panel_${node.nodeId}`, explicitId, 'panel', node.bbox ?? { x: 0, y: 0, w: 0, h: 0 }, buildProvenance({
          sourceId: source.sourceId,
          node,
          originFileKind: source.kind === 'html' ? 'html' : 'svg',
          liftedBy: mapAdapterToLiftedBy(hint.evidence[0]?.adapter),
          liftConfidence: hint.confidence,
          degradationReason: 'none',
        }), ['select', 'multi_select', 'drag', 'resize', 'delete', 'reparent'] as CapabilityFlag[]),
        label: null,
        titleObjectId: null,
        layoutRole: 'plot_panel',
        anchor: { kind: 'absolute', value: null },
        offset: [0, 0],
        contentRootId: wrappedId === explicitId ? '' : wrappedId,
        childObjectIds,
        axisHints: { hasXAxis: false, hasYAxis: false, hasColorbar: false, axisGroupIds: [] },
      });
    }
    if (hint.kind === 'legend_candidate') {
      const explicitId = reserveSemanticId(semanticObjectExplicitId(node, 'legend'), 'legend', node.nodeId, reservedIds);
      const wrappedId = resolvedObjectIdForNode(node);
      legends.push({
        ...defaultBase(`legend_${node.nodeId}`, explicitId, 'legend', node.bbox ?? { x: 0, y: 0, w: 0, h: 0 }, buildProvenance({
          sourceId: source.sourceId,
          node,
          originFileKind: source.kind === 'html' ? 'html' : 'svg',
          liftedBy: mapAdapterToLiftedBy(hint.evidence[0]?.adapter),
          liftConfidence: hint.confidence,
          degradationReason: 'none',
        }), ['select', 'multi_select', 'drag', 'delete', 'reparent'] as CapabilityFlag[]),
        itemObjectIds: wrappedId === explicitId ? [] : [wrappedId],
        anchor: { kind: 'free', value: null, targetPanelId: null },
        offset: [0, 0],
        orientation: 'auto',
        floating: true,
      });
    }
  }

  return { panels, legends };
}

export function buildProject(normalized: NormalizedDocument, hints: AdapterHints, source: OriginalSourceRef): { project: Project; importRecord: ImportRecord } {
  const objects: Project['project']['objects'] = {};
  const parentById = buildParentIndex(normalized);
  const attributeIdIndex = buildAttributeIdIndex(normalized);
  const skippedNodeIds = new Set<string>();
  const glyphProxyRoots = new Map<string, TextNode>();

  for (const node of Object.values(normalized.nodes)) {
    const proxy = makeGlyphTextProxy(node, normalized, source, attributeIdIndex);
    if (!proxy) continue;
    glyphProxyRoots.set(node.nodeId, proxy);
    for (const childId of collectDescendantNodeIds(normalized, node.nodeId)) {
      skippedNodeIds.add(childId);
    }
  }

  for (const node of Object.values(normalized.nodes)) {
    if (isSemanticMarkerNode(node)) continue;
    const glyphProxy = glyphProxyRoots.get(node.nodeId);
    if (glyphProxy) {
      objects[glyphProxy.id] = glyphProxy;
      continue;
    }
    if (skippedNodeIds.has(node.nodeId)) continue;
    if (isInNonRenderableDefinitionSubtree(node.nodeId, normalized, parentById)) {
      skippedNodeIds.add(node.nodeId);
      continue;
    }
    if (String(node.styles.display ?? '').toLowerCase() === 'none') {
      skippedNodeIds.add(node.nodeId);
      continue;
    }
    if (String(node.styles.visibility ?? '').toLowerCase() === 'hidden') {
      skippedNodeIds.add(node.nodeId);
      continue;
    }
    const obj = node.nodeKind === 'text'
      ? makeTextObject(node, source)
      : node.nodeKind === 'image'
      ? makeImageObject(node, source)
      : node.nodeKind === 'shape'
      ? makeShapeObject(node, source, normalized, parentById, attributeIdIndex)
      : makeGroupOrHtmlObject(node, source, normalized);
    objects[obj.id] = obj as any;
  }

  for (const obj of Object.values(objects)) {
    if (obj.objectType === 'group_node' || obj.objectType === 'html_block') {
      obj.childObjectIds = obj.childObjectIds.filter((childId) => objects[childId] !== undefined);
    }
  }

  const semantic = buildSemanticObjects(normalized, hints, source, new Set(Object.keys(objects)));
  for (const p of semantic.panels) objects[p.id] = p;
  for (const l of semantic.legends) objects[l.id] = l;

  const figure: Figure = {
    figureId: 'fig_001',
    width: normalized.nodes[normalized.rootNodeId]?.bbox?.w ?? 800,
    height: normalized.nodes[normalized.rootNodeId]?.bbox?.h ?? 600,
    viewBox: [0, 0, normalized.nodes[normalized.rootNodeId]?.bbox?.w ?? 800, normalized.nodes[normalized.rootNodeId]?.bbox?.h ?? 600],
    background: '#ffffff',
    panels: semantic.panels.map(p => p.id),
    legends: semantic.legends.map(l => l.id),
    floatingObjects: [],
    renderTreeRootId: `obj_${normalized.rootNodeId}`,
    constraints: [],
    metadata: { title: '', description: '', tags: [] },
  };

  const exportPolicy: ExportPolicy = {
    defaultExportKind: 'svg',
    svg: { preferTextNode: true, flattenFragileObjects: false, embedImages: true },
    html: { mode: 'inline_svg_preferred', inlineStyles: true, externalCSS: false },
  };

  const importRecord: ImportRecord = {
    importId: 'import_001',
    sourceId: source.sourceId,
    familyClassifiedAs: hints.family,
    liftSuccesses: hints.hints.map(h => ({ kind: h.kind, nodeIds: h.nodeIds, confidence: h.confidence })),
    liftFailures: [],
    unknownObjects: Object.values(normalized.nodes).filter(n => n.nodeKind === 'unknown').map(n => n.nodeId),
    atomicRasterObjects: Object.values(objects).filter(o => o.objectType === 'image_node').map(o => o.id),
    manualAttentionRequired: Object.values(normalized.nodes).filter(n => n.nodeKind === 'unknown').map(n => n.nodeId),
    metrics: {
      rawNodeCount: Object.keys(normalized.nodes).length,
      liftedSemanticObjectCount: semantic.panels.length + semantic.legends.length,
      textEditableCount: Object.values(objects).filter(o => o.objectType === 'text_node' && o.capabilities.includes('text_edit')).length,
      atomicRasterCount: Object.values(objects).filter(o => o.objectType === 'image_node').length,
    },
  };

  const project: Project = {
    schemaVersion: '1.0.0-mvp',
    project: {
      projectId: 'proj_001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceMode: 'imported',
      originalSources: [source],
      figure,
      importRecords: [importRecord],
      history: { undoStack: [], redoStack: [], operationLog: [] },
      exportPolicy,
      objects,
    },
  };

  return { project, importRecord };
}
