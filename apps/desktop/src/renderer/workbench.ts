import { readFileSync, writeFileSync } from 'fs';
import { extname, isAbsolute, join, parse, resolve } from 'path';
import { Resvg } from '@resvg/resvg-js';
import { exportHTML } from '../../../../packages/core-export-html/dist/index';
import { exportSVG } from '../../../../packages/core-export-svg/dist/index';
import { buildSelectionOverlay, hitTestAtPoint } from '../../../../packages/editor-canvas/dist/index';
import { appendManualEdit, pushSnapshot } from '../../../../packages/core-history/dist/index';
import { redo as redoProject, undo as undoProject } from '../../../../packages/core-history/dist/index';
import { buildLatestImportReport } from '../../../../packages/editor-import-report/dist/index';
import { buildPropertyViewModel } from '../../../../packages/editor-properties/dist/index';
import {
  createEditorSession,
  alignSelected as alignSelectedState,
  clearSelection as clearSelectionState,
  deleteSelected,
  editSelectedText,
  distributeSelected as distributeSelectedState,
  importIntoSession,
  moveSelected,
  multiSelectObjects,
  promoteSelected,
  selectObject,
} from '../../../../packages/editor-state/dist/index';
import type { EditorSessionState } from '../../../../packages/editor-state/dist/index';
import { buildTreeViewModel } from '../../../../packages/editor-tree/dist/index';
import type { FamilyClass, OriginalSourceRef, TextNode } from '../../../../packages/ir-schema/dist/index';
const {
  copyFontPack,
  getBundledFontStackPresets,
  getFontPackRoot,
} = require('../../../../scripts/font_pack.cjs');

const projectApi = require('../../../../packages/editor-state/dist/index') as {
  loadProject?: (path: string) => unknown;
  saveProject?: (project: unknown, path: string) => void;
};
const importApi = importIntoSession as unknown as (
  file: { path: string; content: string },
  source: OriginalSourceRef,
  options?: { htmlMode?: 'strict_static' | 'limited' | 'snapshot' }
) => EditorSessionState;
const FONT_STACK_PRESETS = getBundledFontStackPresets();
const FONT_PACK_ROOT = getFontPackRoot();

export interface DesktopImportInput {
  path: string;
  content: string;
  kind: 'svg' | 'html';
  familyHint?: FamilyClass;
  htmlMode?: 'strict_static' | 'limited' | 'snapshot';
}

export interface DesktopCanvasView {
  selectedIds: string[];
  overlays: Array<{ objectId: string; x: number; y: number; w: number; h: number }>;
  curveHandles: Array<{ id: string; objectId: string; x: number; y: number; kind: string }>;
  lastHit: { objectId: string; objectType: string } | null;
}

export interface DesktopViewSnapshot {
  objectTree: ReturnType<typeof buildTreeViewModel>;
  canvas: DesktopCanvasView;
  properties: ReturnType<typeof buildPropertyViewModel>;
  importReport: ReturnType<typeof buildLatestImportReport>;
  warnings: string[];
}

export interface DesktopLinkedStatus {
  regionCount: number;
  treeNodeCount: number;
  selectedCount: number;
  overlayCount: number;
  hasProperties: boolean;
  hasImportReport: boolean;
  hasLoadedProjectFile: boolean;
}

export interface DesktopAppearancePatch {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  fill?: string;
  stroke?: string;
}

interface DesktopClipboardState {
  rootIds: string[];
  objectIds: string[];
  objects: Record<string, any>;
  pastedCount: number;
}

const DEFAULT_SELECT_HIT_DISTANCE = 6;
const BACKDROP_ONLY_HIT_DISTANCE = 4;
const TEXT_SELECT_HIT_DISTANCE = 32;
const MIN_SHAPE_HIT_SPAN = 14;

function pointToRectDistance(x: number, y: number, bbox: { x: number; y: number; w: number; h: number }): number {
  const dx = Math.max(bbox.x - x, 0, x - (bbox.x + bbox.w));
  const dy = Math.max(bbox.y - y, 0, y - (bbox.y + bbox.h));
  return Math.hypot(dx, dy);
}

function isTextLikeObject(obj: any): boolean {
  if (!obj) return false;
  return obj.objectType === 'text_node' || obj.objectType === 'figure_title' || obj.objectType === 'panel_label';
}

function isFiniteBBox(bbox: { x: number; y: number; w: number; h: number } | null | undefined): bbox is { x: number; y: number; w: number; h: number } {
  if (!bbox) return false;
  return Number.isFinite(bbox.x) && Number.isFinite(bbox.y) && Number.isFinite(bbox.w) && Number.isFinite(bbox.h);
}

function approxTextBBox(obj: any): { x: number; y: number; w: number; h: number } {
  const fontSize = Math.max(10, Number(obj?.font?.size ?? 12));
  const text = String(obj?.content ?? '');
  const approxWidth = Math.max(fontSize * 0.8, fontSize * 0.58 * Math.max(1, text.length));
  return {
    x: Number(obj?.position?.[0] ?? obj?.bbox?.x ?? 0),
    y: Number((obj?.position?.[1] ?? obj?.bbox?.y ?? 0) - fontSize * 0.95),
    w: approxWidth,
    h: fontSize * 1.35,
  };
}

function expandBBoxToMinimumSpan(
  bbox: { x: number; y: number; w: number; h: number },
  minWidth: number,
  minHeight: number
): { x: number; y: number; w: number; h: number } {
  const extraWidth = Math.max(0, minWidth - bbox.w);
  const extraHeight = Math.max(0, minHeight - bbox.h);
  return {
    x: bbox.x - extraWidth * 0.5,
    y: bbox.y - extraHeight * 0.5,
    w: bbox.w + extraWidth,
    h: bbox.h + extraHeight,
  };
}

function effectiveHitBBox(obj: any): { x: number; y: number; w: number; h: number } | null {
  if (!obj || !obj.visible) return null;
  const b = obj.bbox;
  if (isFiniteBBox(b) && b.w > 0 && b.h > 0) {
    if (obj.objectType === 'shape_node') {
      const strokeWidth = Math.max(1, Number(obj?.stroke?.width ?? 1));
      const minWidth = b.w >= b.h ? b.w : Math.max(MIN_SHAPE_HIT_SPAN, strokeWidth * 4);
      const minHeight = b.h >= b.w ? b.h : Math.max(MIN_SHAPE_HIT_SPAN, strokeWidth * 4);
      return expandBBoxToMinimumSpan(b, minWidth, minHeight);
    }
    return b;
  }
  if (obj.objectType === 'text_node') {
    return approxTextBBox(obj);
  }
  return isFiniteBBox(b) ? b : null;
}

function uniqueCapabilities(capabilities: string[]): string[] {
  return Array.from(new Set(capabilities.filter((item) => String(item).trim().length > 0)));
}

function normalizeHexColor(token: string): string {
  const raw = String(token ?? '').trim().toLowerCase();
  if (raw === '#fff') return '#ffffff';
  if (raw === '#000') return '#000000';
  return raw;
}

function normalizeFontFamilyToken(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .replace(/\s+/g, ' ');
}

function normalizeFontWeightToken(value: string | null | undefined): string {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return '400';
  if (raw === 'bold') return '700';
  if (raw === 'normal') return '400';
  if (/^[1-9]00$/.test(raw)) return raw;
  return '400';
}

function normalizeFontStyleToken(value: string | null | undefined): string {
  const raw = String(value ?? '').trim().toLowerCase();
  return raw === 'italic' || raw === 'oblique' ? 'italic' : 'normal';
}

function normalizeTextFillToken(value: string | null | undefined): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '#111827';
  if (raw.toLowerCase() === 'none') return 'none';
  if (/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw)) {
    return normalizeHexColor(raw);
  }
  return raw;
}

function normalizeShapeFillToken(value: string | null | undefined): string | null {
  const raw = String(value ?? '').trim();
  if (!raw || raw.toLowerCase() === 'none') return null;
  if (/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw)) {
    return normalizeHexColor(raw);
  }
  return raw;
}

function normalizeStrokeColorToken(value: string | null | undefined): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '#334155';
  if (raw.toLowerCase() === 'none') return 'none';
  if (/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw)) {
    return normalizeHexColor(raw);
  }
  return raw;
}

function normalizeSelectionObjectIds(project: EditorSessionState['project'], selectedIds: string[] | string | null): string[] {
  const inputIds = Array.isArray(selectedIds) ? selectedIds : selectedIds ? [selectedIds] : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const rawId of inputIds) {
    const objectId = String(rawId ?? '').trim();
    if (!objectId || seen.has(objectId) || !project.project.objects[objectId]) continue;
    seen.add(objectId);
    out.push(objectId);
  }
  return out;
}

function collectSelectionRootIds(project: EditorSessionState['project'], selectedIds: string[] | string | null): string[] {
  const objects = project.project.objects as Record<string, any>;
  const normalized = normalizeSelectionObjectIds(project, selectedIds);
  if (normalized.length < 2) return normalized;
  return collectClipboardRootIds(objects, normalized);
}

function collectSelectedTargets<T>(
  project: EditorSessionState['project'],
  selectedIds: string[] | string | null,
  predicate: (obj: any) => boolean
): T[] {
  const objects = project.project.objects as Record<string, any>;
  const rootIds = collectSelectionRootIds(project, selectedIds);
  const visited = new Set<string>();
  const targets: T[] = [];
  for (const rootId of rootIds) {
    for (const descendantId of collectDescendantObjectIds(objects, rootId)) {
      if (visited.has(descendantId)) continue;
      visited.add(descendantId);
      const candidate = objects[descendantId];
      if (!predicate(candidate)) continue;
      targets.push(candidate as T);
    }
  }
  return targets;
}

function resolveTextStyleTarget(project: EditorSessionState['project'], selectedIds: string[] | string | null): TextNode | null {
  return collectSelectedTargets<TextNode>(project, selectedIds, (obj) => obj?.objectType === 'text_node')[0] ?? null;
}

function resolveTextTargets(project: EditorSessionState['project'], selectedIds: string[] | string | null): TextNode[] {
  return collectSelectedTargets<TextNode>(project, selectedIds, (obj) => obj?.objectType === 'text_node');
}

function resolveShapeTargets(project: EditorSessionState['project'], selectedIds: string[] | string | null): any[] {
  return collectSelectedTargets<any>(project, selectedIds, (obj) => obj?.objectType === 'shape_node');
}

function upgradeProxyTextNodeForStyleEditing(obj: TextNode): void {
  if (obj.textKind !== 'path_text_proxy' && obj.textKind !== 'raster_text_proxy') return;
  obj.textKind = 'raw_text';
  obj.capabilities = uniqueCapabilities([
    ...obj.capabilities.filter((capability) => capability !== 'group_only'),
    'text_edit',
    'style_edit',
  ]) as TextNode['capabilities'];
  if (!obj.font.family || obj.font.family === 'glyph_proxy') {
    obj.font.family = DEFAULT_EDITOR_FONT_STACK;
  }
}

function ensureSvgNamespaces(svgText: string): string {
  const hasXmlns = /\sxmlns\s*=\s*['"][^'"]+['"]/i.test(svgText);
  const hasXmlnsXlink = /\sxmlns:xlink\s*=\s*['"][^'"]+['"]/i.test(svgText);
  const needsXlinkNs = /xlink:href\s*=/i.test(svgText);

  return svgText.replace(/<svg\b([^>]*)>/i, (_full, attrs: string) => {
    const additions: string[] = [];
    if (!hasXmlns) additions.push('xmlns="http://www.w3.org/2000/svg"');
    if (needsXlinkNs && !hasXmlnsXlink) additions.push('xmlns:xlink="http://www.w3.org/1999/xlink"');
    const extra = additions.length > 0 ? ` ${additions.join(' ')}` : '';
    return `<svg${attrs}${extra}>`;
  });
}

function isLightBackdropColor(token: string | null | undefined): boolean {
  const normalized = normalizeHexColor(String(token ?? ''));
  return normalized === '#ffffff' || normalized === '#faf9f6' || normalized === '#f6f5f2' || normalized === 'white';
}

function isBackdropLikeShape(obj: any, figureWidth: number, figureHeight: number): boolean {
  if (!obj || obj.objectType !== 'shape_node') return false;
  const bbox = effectiveHitBBox(obj);
  if (!bbox || bbox.w <= 0 || bbox.h <= 0) return false;
  const figureArea = Math.max(1, figureWidth * figureHeight);
  const areaRatio = (bbox.w * bbox.h) / figureArea;
  const widthRatio = bbox.w / Math.max(1, figureWidth);
  const heightRatio = bbox.h / Math.max(1, figureHeight);
  const fill = String(obj?.fill?.color ?? obj?.provenance?.originStyleSnapshot?.fill ?? '').trim().toLowerCase();
  return areaRatio >= 0.06 && (widthRatio >= 0.8 || heightRatio >= 0.8) && isLightBackdropColor(fill);
}

function isBackdropLikeGroup(obj: any, objects: Record<string, any>, figureWidth: number, figureHeight: number): boolean {
  if (!obj || obj.objectType !== 'group_node') return false;
  if (!Array.isArray(obj.childObjectIds) || obj.childObjectIds.length === 0) return false;
  if (!Array.isArray(obj.capabilities) || !obj.capabilities.includes('group_only')) return false;
  const bbox = effectiveHitBBox(obj);
  if (!bbox || bbox.w <= 0 || bbox.h <= 0) return false;
  const figureArea = Math.max(1, figureWidth * figureHeight);
  const groupArea = bbox.w * bbox.h;
  const areaRatio = groupArea / figureArea;
  const widthRatio = bbox.w / Math.max(1, figureWidth);
  const heightRatio = bbox.h / Math.max(1, figureHeight);
  const childArea = obj.childObjectIds
    .map((childId: string) => effectiveHitBBox(objects[childId]))
    .filter(Boolean)
    .reduce((sum: number, childBBox: any) => sum + Math.max(0, childBBox.w * childBBox.h), 0);
  return areaRatio >= 0.06 && (widthRatio >= 0.8 || heightRatio >= 0.8) && childArea / Math.max(1, groupArea) <= 0.2;
}

function buildDepthMap(objects: Record<string, any>): Record<string, number> {
  const depthMap: Record<string, number> = {};
  const queue: string[] = [];
  for (const obj of Object.values(objects)) {
    if (!Array.isArray(obj.childObjectIds) || obj.childObjectIds.length === 0) continue;
    queue.push(obj.id);
  }
  for (const id of Object.keys(objects)) {
    if (!(id in depthMap)) depthMap[id] = 0;
  }
  const seen = new Set<string>();
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const parent = objects[id];
    const parentDepth = depthMap[id] ?? 0;
    for (const childId of parent.childObjectIds ?? []) {
      depthMap[childId] = Math.max(depthMap[childId] ?? 0, parentDepth + 1);
      queue.push(childId);
    }
  }
  return depthMap;
}

function pickBestObjectAtPoint(
  objects: Record<string, any>,
  x: number,
  y: number,
  options?: { preferText?: boolean; maxDistance?: number; figureWidth?: number; figureHeight?: number }
): any | null {
  const preferText = options?.preferText === true;
  const maxDistance = Number.isFinite(options?.maxDistance) ? Number(options?.maxDistance) : 0;
  const figureWidth = Number.isFinite(options?.figureWidth) ? Number(options?.figureWidth) : 0;
  const figureHeight = Number.isFinite(options?.figureHeight) ? Number(options?.figureHeight) : 0;
  const depthMap = buildDepthMap(objects);
  const scored = Object.values(objects)
    .map((obj) => {
      if (!obj.visible) return null;
      const hitBox = effectiveHitBBox(obj);
      if (!hitBox) return null;
      const distance = pointToRectDistance(x, y, hitBox);
      if (distance > maxDistance) return null;
      const textLike = isTextLikeObject(obj);
      const textEditable = obj.capabilities.includes('text_edit');
      if (preferText && !textLike) return null;
      return {
        obj,
        distance,
        textLike: textLike ? 1 : 0,
        textEditable: textEditable ? 1 : 0,
        notGroup: obj.objectType === 'group_node' ? 0 : 1,
        leaf: Array.isArray(obj.childObjectIds) && obj.childObjectIds.length > 0 ? 0 : 1,
        depth: depthMap[obj.id] ?? 0,
        area: Math.max(0, hitBox.w * hitBox.h),
        zIndex: Number(obj.zIndex ?? 0),
        backdropLike:
          figureWidth > 0 && figureHeight > 0 && (
            isBackdropLikeShape(obj, figureWidth, figureHeight) ||
            isBackdropLikeGroup(obj, objects, figureWidth, figureHeight)
          )
            ? 1
            : 0,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => {
      if (a.backdropLike !== b.backdropLike) return a.backdropLike - b.backdropLike;
      if (a.distance !== b.distance) return a.distance - b.distance;
      if (a.textLike !== b.textLike) return b.textLike - a.textLike;
      if (a.textEditable !== b.textEditable) return b.textEditable - a.textEditable;
      if (a.notGroup !== b.notGroup) return b.notGroup - a.notGroup;
      if (a.leaf !== b.leaf) return b.leaf - a.leaf;
      if (a.depth !== b.depth) return b.depth - a.depth;
      if (a.area !== b.area) return a.area - b.area;
      if (a.zIndex !== b.zIndex) return b.zIndex - a.zIndex;
      return 0;
    });

  if (scored.length === 0) return null;
  return scored[0].backdropLike === 1 ? null : scored[0].obj;
}

const DEFAULT_EDITOR_FONT_STACK = FONT_STACK_PRESETS.sans;

const PATH_PARAM_COUNTS: Record<string, number> = {
  M: 2,
  L: 2,
  H: 1,
  V: 1,
  C: 6,
  S: 4,
  Q: 4,
  T: 2,
  A: 7,
  Z: 0,
};

function isUsableFontFamily(raw: unknown): raw is string {
  const token = String(raw ?? '').trim().toLowerCase();
  return token.length > 0 && token !== 'unknown' && token !== 'glyph_proxy';
}

function pickPreferredDocumentFontFamily(objects: Record<string, any>): string {
  const candidates = Object.values(objects)
    .filter((obj) => obj?.objectType === 'text_node' && isUsableFontFamily(obj?.font?.family))
    .sort((a, b) => Number(b?.zIndex ?? 0) - Number(a?.zIndex ?? 0));
  return candidates[0]?.font?.family ?? DEFAULT_EDITOR_FONT_STACK;
}

function childObjectIdsOf(obj: any): string[] {
  const refs = new Set<string>();
  if (Array.isArray(obj?.childObjectIds)) {
    for (const childId of obj.childObjectIds) refs.add(String(childId));
  }
  if (typeof obj?.textObjectId === 'string' && obj.textObjectId.length > 0) {
    refs.add(String(obj.textObjectId));
  }
  if (obj?.objectType === 'panel') {
    if (obj?.contentRootId) refs.add(String(obj.contentRootId));
    if (obj?.titleObjectId) refs.add(String(obj.titleObjectId));
  }
  if (obj?.objectType === 'legend' && Array.isArray(obj?.itemObjectIds)) {
    for (const childId of obj.itemObjectIds) refs.add(String(childId));
  }
  return [...refs];
}

function roundCoord(value: number): number {
  return Number(Number(value).toFixed(3));
}

function curveWeight(x: number, minX: number, maxX: number): number {
  if (!Number.isFinite(x) || !Number.isFinite(minX) || !Number.isFinite(maxX)) return 1;
  const width = maxX - minX;
  if (width <= 1e-6) return 1;
  const t = Math.max(0, Math.min(1, (x - minX) / width));
  return Math.max(0, 1 - Math.pow(2 * t - 1, 2));
}

function unionPointsBBox(points: Array<{ x: number; y: number }>): { x: number; y: number; w: number; h: number } | null {
  const valid = points.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  if (valid.length === 0) return null;
  const xs = valid.map((point) => point.x);
  const ys = valid.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return {
    x: roundCoord(minX),
    y: roundCoord(minY),
    w: roundCoord(Math.max(0, maxX - minX)),
    h: roundCoord(Math.max(0, maxY - minY)),
  };
}

function tokenizePathData(d: string): string[] {
  return String(d ?? '').match(/[AaCcHhLlMmQqSsTtVvZz]|[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/g) ?? [];
}

function parsePathCommands(d: string): Array<{ cmd: string; values: number[] }> | null {
  const tokens = tokenizePathData(d);
  if (tokens.length === 0) return null;
  const commands: Array<{ cmd: string; values: number[] }> = [];
  let index = 0;
  let currentCmd: string | null = null;
  while (index < tokens.length) {
    const token = tokens[index];
    if (/^[A-Za-z]$/.test(token)) {
      currentCmd = token;
      index += 1;
      const expected = PATH_PARAM_COUNTS[currentCmd.toUpperCase()];
      if (expected === undefined) return null;
      if (expected === 0) {
        commands.push({ cmd: currentCmd, values: [] });
        currentCmd = null;
      }
      continue;
    }
    if (!currentCmd) return null;
    const expected = PATH_PARAM_COUNTS[currentCmd.toUpperCase()];
    if (!Number.isFinite(expected)) return null;
    if (index + expected > tokens.length) return null;
    const values: number[] = [];
    for (let offset = 0; offset < expected; offset += 1) {
      const raw = tokens[index + offset];
      if (/^[A-Za-z]$/.test(raw)) return null;
      const numeric = Number.parseFloat(raw);
      if (!Number.isFinite(numeric)) return null;
      values.push(numeric);
    }
    commands.push({ cmd: currentCmd, values });
    index += expected;
    if (currentCmd === 'M') currentCmd = 'L';
    else if (currentCmd === 'm') currentCmd = 'l';
  }
  return commands;
}

function serializePathCommands(commands: Array<{ cmd: string; values: number[] }>): string {
  return commands
    .map((entry) => (entry.values.length === 0 ? entry.cmd : `${entry.cmd} ${entry.values.map((value) => roundCoord(value)).join(' ')}`))
    .join(' ');
}

function collectPathDataEntries(commands: Array<{ cmd: string; values: number[] }>): {
  entries: Array<{ commandIndex: number; paramIndex: number; absX: number }>;
  xValues: number[];
} {
  const entries: Array<{ commandIndex: number; paramIndex: number; absX: number }> = [];
  const xValues: number[] = [];
  let currentX = 0;
  let currentY = 0;

  for (let commandIndex = 0; commandIndex < commands.length; commandIndex += 1) {
    const entry = commands[commandIndex];
    const upper = entry.cmd.toUpperCase();
    const relative = entry.cmd !== upper;
    const values = entry.values;
    switch (upper) {
      case 'M':
      case 'L':
      case 'T': {
        const absX = relative ? currentX + values[0] : values[0];
        const absY = relative ? currentY + values[1] : values[1];
        xValues.push(absX);
        entries.push({ commandIndex, paramIndex: 1, absX });
        currentX = absX;
        currentY = absY;
        break;
      }
      case 'H': {
        const absX = relative ? currentX + values[0] : values[0];
        xValues.push(absX);
        currentX = absX;
        break;
      }
      case 'V': {
        entries.push({ commandIndex, paramIndex: 0, absX: currentX });
        currentY = relative ? currentY + values[0] : values[0];
        break;
      }
      case 'C': {
        const x0 = relative ? currentX + values[0] : values[0];
        const y0 = relative ? currentY + values[1] : values[1];
        const x1 = relative ? currentX + values[2] : values[2];
        const y1 = relative ? currentY + values[3] : values[3];
        const x2 = relative ? currentX + values[4] : values[4];
        const y2 = relative ? currentY + values[5] : values[5];
        xValues.push(x0, x1, x2);
        entries.push({ commandIndex, paramIndex: 1, absX: x0 });
        entries.push({ commandIndex, paramIndex: 3, absX: x1 });
        entries.push({ commandIndex, paramIndex: 5, absX: x2 });
        currentX = x2;
        currentY = y2;
        void y0;
        void y1;
        break;
      }
      case 'S':
      case 'Q': {
        const x0 = relative ? currentX + values[0] : values[0];
        const y0 = relative ? currentY + values[1] : values[1];
        const x1 = relative ? currentX + values[2] : values[2];
        const y1 = relative ? currentY + values[3] : values[3];
        xValues.push(x0, x1);
        entries.push({ commandIndex, paramIndex: 1, absX: x0 });
        entries.push({ commandIndex, paramIndex: 3, absX: x1 });
        currentX = x1;
        currentY = y1;
        void y0;
        break;
      }
      case 'A': {
        const absX = relative ? currentX + values[5] : values[5];
        const absY = relative ? currentY + values[6] : values[6];
        xValues.push(absX);
        entries.push({ commandIndex, paramIndex: 6, absX });
        currentX = absX;
        currentY = absY;
        break;
      }
      default:
        break;
    }
  }

  return { entries, xValues };
}

function computePathBBox(commands: Array<{ cmd: string; values: number[] }>): { x: number; y: number; w: number; h: number } | null {
  const points: Array<{ x: number; y: number }> = [];
  let currentX = 0;
  let currentY = 0;
  for (const entry of commands) {
    const upper = entry.cmd.toUpperCase();
    const relative = entry.cmd !== upper;
    const values = entry.values;
    switch (upper) {
      case 'M':
      case 'L':
      case 'T': {
        const x = relative ? currentX + values[0] : values[0];
        const y = relative ? currentY + values[1] : values[1];
        points.push({ x, y });
        currentX = x;
        currentY = y;
        break;
      }
      case 'H': {
        const x = relative ? currentX + values[0] : values[0];
        currentX = x;
        points.push({ x: currentX, y: currentY });
        break;
      }
      case 'V': {
        const y = relative ? currentY + values[0] : values[0];
        currentY = y;
        points.push({ x: currentX, y: currentY });
        break;
      }
      case 'C': {
        const p0 = { x: relative ? currentX + values[0] : values[0], y: relative ? currentY + values[1] : values[1] };
        const p1 = { x: relative ? currentX + values[2] : values[2], y: relative ? currentY + values[3] : values[3] };
        const p2 = { x: relative ? currentX + values[4] : values[4], y: relative ? currentY + values[5] : values[5] };
        points.push(p0, p1, p2);
        currentX = p2.x;
        currentY = p2.y;
        break;
      }
      case 'S':
      case 'Q': {
        const p0 = { x: relative ? currentX + values[0] : values[0], y: relative ? currentY + values[1] : values[1] };
        const p1 = { x: relative ? currentX + values[2] : values[2], y: relative ? currentY + values[3] : values[3] };
        points.push(p0, p1);
        currentX = p1.x;
        currentY = p1.y;
        break;
      }
      case 'A': {
        const p = { x: relative ? currentX + values[5] : values[5], y: relative ? currentY + values[6] : values[6] };
        points.push(p);
        currentX = p.x;
        currentY = p.y;
        break;
      }
      default:
        break;
    }
  }
  return unionPointsBBox(points);
}

function parsePointList(pointsText: string): Array<{ x: number; y: number }> | null {
  const values = String(pointsText ?? '')
    .trim()
    .split(/[\s,]+/)
    .map((token) => Number.parseFloat(token))
    .filter((token) => Number.isFinite(token));
  if (values.length < 2 || values.length % 2 !== 0) return null;
  const points: Array<{ x: number; y: number }> = [];
  for (let index = 0; index < values.length; index += 2) {
    points.push({ x: values[index], y: values[index + 1] });
  }
  return points;
}

function serializePointList(points: Array<{ x: number; y: number }>): string {
  return points.map((point) => `${roundCoord(point.x)} ${roundCoord(point.y)}`).join(' ');
}

function collectCurveXValuesForObject(obj: any): number[] {
  if (!obj || obj.objectType !== 'shape_node') return [];
  const attrs = (obj.geometry as any)?.attributes ?? {};
  switch (obj.shapeKind) {
    case 'path': {
      const commands = parsePathCommands(String(attrs.d ?? ''));
      if (!commands) return [];
      return collectPathDataEntries(commands).xValues;
    }
    case 'polyline':
    case 'polygon': {
      const points = parsePointList(String(attrs.points ?? ''));
      return points ? points.map((point) => point.x) : [];
    }
    case 'line': {
      return [Number(attrs.x1), Number(attrs.x2)].filter((value) => Number.isFinite(value));
    }
    case 'circle':
    case 'ellipse': {
      const centerX = Number(attrs.cx);
      if (Number.isFinite(centerX)) return [centerX];
      const bbox = effectiveHitBBox(obj);
      return bbox ? [bbox.x + bbox.w / 2] : [];
    }
    default: {
      const bbox = effectiveHitBBox(obj);
      return bbox ? [bbox.x + bbox.w / 2] : [];
    }
  }
}

function collectCurveRange(objects: Record<string, any>, objectId: string, visited = new Set<string>()): { minX: number; maxX: number } | null {
  if (visited.has(objectId)) return null;
  visited.add(objectId);
  const obj = objects[objectId];
  if (!obj) return null;
  const xValues = [...collectCurveXValuesForObject(obj)];
  for (const childId of childObjectIdsOf(obj)) {
    const childRange = collectCurveRange(objects, childId, visited);
    if (!childRange) continue;
    xValues.push(childRange.minX, childRange.maxX);
  }
  const valid = xValues.filter((value) => Number.isFinite(value));
  if (valid.length === 0) return null;
  return { minX: Math.min(...valid), maxX: Math.max(...valid) };
}

function adjustShapeCurveGeometry(obj: any, deltaY: number, range: { minX: number; maxX: number }): boolean {
  if (!obj || obj.objectType !== 'shape_node') return false;
  const attrs = ((obj.geometry as any)?.attributes ?? {}) as Record<string, any>;
  switch (obj.shapeKind) {
    case 'path': {
      const commands = parsePathCommands(String(attrs.d ?? ''));
      if (!commands) return false;
      const { entries } = collectPathDataEntries(commands);
      if (entries.length === 0) return false;
      for (const entry of entries) {
        const weight = curveWeight(entry.absX, range.minX, range.maxX);
        commands[entry.commandIndex].values[entry.paramIndex] += deltaY * weight;
      }
      const bbox = computePathBBox(commands);
      attrs.d = serializePathCommands(commands);
      if (bbox) obj.bbox = bbox;
      return true;
    }
    case 'polyline':
    case 'polygon': {
      const points = parsePointList(String(attrs.points ?? ''));
      if (!points || points.length === 0) return false;
      for (const point of points) {
        point.y = roundCoord(point.y + deltaY * curveWeight(point.x, range.minX, range.maxX));
      }
      attrs.points = serializePointList(points);
      const bbox = unionPointsBBox(points);
      if (bbox) obj.bbox = bbox;
      return true;
    }
    case 'line': {
      const x1 = Number(attrs.x1);
      const x2 = Number(attrs.x2);
      const y1 = Number(attrs.y1);
      const y2 = Number(attrs.y2);
      if (![x1, x2, y1, y2].every((value) => Number.isFinite(value))) return false;
      attrs.y1 = roundCoord(y1 + deltaY * curveWeight(x1, range.minX, range.maxX));
      attrs.y2 = roundCoord(y2 + deltaY * curveWeight(x2, range.minX, range.maxX));
      obj.bbox = {
        x: roundCoord(Math.min(x1, x2)),
        y: roundCoord(Math.min(Number(attrs.y1), Number(attrs.y2))),
        w: roundCoord(Math.abs(x2 - x1)),
        h: roundCoord(Math.abs(Number(attrs.y2) - Number(attrs.y1))),
      };
      return true;
    }
    case 'circle':
    case 'ellipse': {
      const cx = Number(attrs.cx);
      const cy = Number(attrs.cy);
      if (!Number.isFinite(cx) || !Number.isFinite(cy)) return false;
      const nextCy = roundCoord(cy + deltaY * curveWeight(cx, range.minX, range.maxX));
      attrs.cy = nextCy;
      const bbox = effectiveHitBBox(obj);
      if (bbox) {
        obj.bbox = {
          ...bbox,
          y: roundCoord(bbox.y + (nextCy - cy)),
        };
      }
      return true;
    }
    default:
      return false;
  }
}

function recomputeCompositeBBox(objects: Record<string, any>, objectId: string, visited = new Set<string>()): { x: number; y: number; w: number; h: number } | null {
  if (visited.has(objectId)) return effectiveHitBBox(objects[objectId]);
  visited.add(objectId);
  const obj = objects[objectId];
  if (!obj) return null;
  const childIds = childObjectIdsOf(obj);
  if (childIds.length === 0) {
    return effectiveHitBBox(obj);
  }
  const childBoxes = childIds
    .map((childId) => recomputeCompositeBBox(objects, childId, visited))
    .filter((bbox): bbox is { x: number; y: number; w: number; h: number } => Boolean(bbox));
  if (childBoxes.length === 0) {
    return effectiveHitBBox(obj);
  }
  const points = childBoxes.flatMap((bbox) => [
    { x: bbox.x, y: bbox.y },
    { x: bbox.x + bbox.w, y: bbox.y + bbox.h },
  ]);
  const bbox = unionPointsBBox(points);
  if (bbox) obj.bbox = bbox;
  return bbox;
}

function adjustCurveObjectTree(
  objects: Record<string, any>,
  objectId: string,
  deltaY: number,
  range: { minX: number; maxX: number },
  visited = new Set<string>()
): boolean {
  if (visited.has(objectId)) return false;
  visited.add(objectId);
  const obj = objects[objectId];
  if (!obj) return false;
  let changed = adjustShapeCurveGeometry(obj, deltaY, range);
  for (const childId of childObjectIdsOf(obj)) {
    changed = adjustCurveObjectTree(objects, childId, deltaY, range, visited) || changed;
  }
  if (changed && childObjectIdsOf(obj).length > 0) {
    recomputeCompositeBBox(objects, objectId);
  }
  return changed;
}

function collectPathCoordinatePairs(commands: Array<{ cmd: string; values: number[] }>): Array<{
  commandIndex: number;
  xParamIndex: number;
  yParamIndex: number;
  absX: number;
  absY: number;
  endpoint: boolean;
}> {
  const pairs: Array<{
    commandIndex: number;
    xParamIndex: number;
    yParamIndex: number;
    absX: number;
    absY: number;
    endpoint: boolean;
  }> = [];
  let currentX = 0;
  let currentY = 0;

  for (let commandIndex = 0; commandIndex < commands.length; commandIndex += 1) {
    const entry = commands[commandIndex];
    const upper = entry.cmd.toUpperCase();
    const relative = entry.cmd !== upper;
    const values = entry.values;
    const pushPair = (xParamIndex: number, yParamIndex: number, endpoint: boolean) => {
      const absX = relative ? currentX + values[xParamIndex] : values[xParamIndex];
      const absY = relative ? currentY + values[yParamIndex] : values[yParamIndex];
      pairs.push({ commandIndex, xParamIndex, yParamIndex, absX, absY, endpoint });
      return { absX, absY };
    };
    switch (upper) {
      case 'M':
      case 'L':
      case 'T': {
        const point = pushPair(0, 1, true);
        currentX = point.absX;
        currentY = point.absY;
        break;
      }
      case 'C': {
        const p0 = pushPair(0, 1, false);
        const p1 = pushPair(2, 3, false);
        const p2 = pushPair(4, 5, true);
        currentX = p2.absX;
        currentY = p2.absY;
        void p0;
        void p1;
        break;
      }
      case 'S':
      case 'Q': {
        const p0 = pushPair(0, 1, false);
        const p1 = pushPair(2, 3, true);
        currentX = p1.absX;
        currentY = p1.absY;
        void p0;
        break;
      }
      case 'A': {
        const p = pushPair(5, 6, true);
        currentX = p.absX;
        currentY = p.absY;
        break;
      }
      case 'H': {
        currentX = relative ? currentX + values[0] : values[0];
        break;
      }
      case 'V': {
        currentY = relative ? currentY + values[0] : values[0];
        break;
      }
      default:
        break;
    }
  }
  return pairs;
}

function encodeCurveHandleId(kind: string, objectId: string, ...parts: Array<string | number>): string {
  return [kind, objectId, ...parts.map((part) => String(part))].join(':');
}

function collectDescendantObjectIds(objects: Record<string, any>, rootId: string, visited = new Set<string>()): string[] {
  if (visited.has(rootId)) return [];
  visited.add(rootId);
  const out = [rootId];
  const obj = objects[rootId];
  if (!obj) return out;
  for (const childId of childObjectIdsOf(obj)) {
    out.push(...collectDescendantObjectIds(objects, childId, visited));
  }
  return out;
}

function collectClipboardRootIds(objects: Record<string, any>, selectedIds: string[]): string[] {
  const selectedSet = new Set(selectedIds);
  return selectedIds.filter((candidateId) => {
    for (const otherId of selectedSet) {
      if (otherId === candidateId) continue;
      const descendants = collectDescendantObjectIds(objects, otherId);
      if (descendants.includes(candidateId)) return false;
    }
    return true;
  });
}

function collectClipboardObjectIds(objects: Record<string, any>, rootIds: string[]): string[] {
  const visited = new Set<string>();
  const ordered: string[] = [];
  const walk = (objectId: string) => {
    if (visited.has(objectId)) return;
    visited.add(objectId);
    const obj = objects[objectId];
    if (!obj) return;
    ordered.push(objectId);
    for (const childId of childObjectIdsOf(obj)) {
      walk(childId);
    }
  };
  for (const rootId of rootIds) {
    walk(rootId);
  }
  return ordered;
}

function rewriteClipboardObjectReferences(obj: any, idMap: Map<string, string>): void {
  const rewriteId = (value: unknown): string => {
    const raw = String(value ?? '').trim();
    if (!raw) return raw;
    return idMap.get(raw) ?? raw;
  };
  const rewriteIdList = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    return value.map((item) => rewriteId(item)).filter((item) => String(item).trim().length > 0);
  };

  if ('childObjectIds' in obj && Array.isArray(obj.childObjectIds)) {
    obj.childObjectIds = rewriteIdList(obj.childObjectIds);
  }
  if ('itemObjectIds' in obj && Array.isArray(obj.itemObjectIds)) {
    obj.itemObjectIds = rewriteIdList(obj.itemObjectIds);
  }
  if ('textObjectId' in obj && typeof obj.textObjectId === 'string' && obj.textObjectId.trim().length > 0) {
    obj.textObjectId = rewriteId(obj.textObjectId);
  }
  if ('contentRootId' in obj && typeof obj.contentRootId === 'string' && obj.contentRootId.trim().length > 0) {
    obj.contentRootId = rewriteId(obj.contentRootId);
  }
  if ('titleObjectId' in obj && typeof obj.titleObjectId === 'string' && obj.titleObjectId.trim().length > 0) {
    obj.titleObjectId = rewriteId(obj.titleObjectId);
  }
  if (obj?.axisHints && Array.isArray(obj.axisHints.axisGroupIds)) {
    obj.axisHints.axisGroupIds = rewriteIdList(obj.axisHints.axisGroupIds);
  }
}

function translateCopiedObject(obj: any, dx: number, dy: number): void {
  if (!obj) return;
  if (obj.bbox) {
    const nextX = Number(obj.bbox.x);
    const nextY = Number(obj.bbox.y);
    if (Number.isFinite(nextX) && Number.isFinite(nextY)) {
      obj.bbox = {
        ...obj.bbox,
        x: roundCoord(nextX + dx),
        y: roundCoord(nextY + dy),
      };
    }
  }
  if (obj.transform && Array.isArray(obj.transform.translate)) {
    const [tx, ty] = obj.transform.translate;
    const nextTx = Number(tx);
    const nextTy = Number(ty);
    if (Number.isFinite(nextTx) && Number.isFinite(nextTy)) {
      obj.transform = {
        ...obj.transform,
        translate: [roundCoord(nextTx + dx), roundCoord(nextTy + dy)],
      };
    }
  }
  if (obj.objectType === 'text_node' && Array.isArray(obj.position)) {
    const [x, y] = obj.position;
    const nextX = Number(x);
    const nextY = Number(y);
    if (Number.isFinite(nextX) && Number.isFinite(nextY)) {
      obj.position = [roundCoord(nextX + dx), roundCoord(nextY + dy)];
    }
  }
}

function allocateCopiedObjectId(baseId: string, existingIds: Set<string>, allocatedIds: Set<string>, batchToken: number): string {
  const safeBase = String(baseId || 'object').trim() || 'object';
  const seed = `${safeBase}_copy_${batchToken}`;
  let candidate = seed;
  let suffix = 2;
  while (existingIds.has(candidate) || allocatedIds.has(candidate)) {
    candidate = `${seed}_${suffix}`;
    suffix += 1;
  }
  allocatedIds.add(candidate);
  return candidate;
}

function shapeCenter(obj: any): { x: number; y: number } | null {
  const attrs = (obj?.geometry as any)?.attributes ?? {};
  if (obj?.shapeKind === 'circle' || obj?.shapeKind === 'ellipse') {
    const cx = Number(attrs.cx);
    const cy = Number(attrs.cy);
    if (Number.isFinite(cx) && Number.isFinite(cy)) {
      return { x: cx, y: cy };
    }
  }
  const bbox = effectiveHitBBox(obj);
  return bbox ? { x: bbox.x + bbox.w / 2, y: bbox.y + bbox.h / 2 } : null;
}

function buildCurveHandlesForSelectedObject(objects: Record<string, any>, objectId: string): Array<{ id: string; objectId: string; x: number; y: number; kind: string }> {
  const descendantIds = collectDescendantObjectIds(objects, objectId);
  const pointHandles = descendantIds
    .map((id) => objects[id])
    .filter((obj) => obj?.objectType === 'shape_node' && (obj.shapeKind === 'circle' || obj.shapeKind === 'ellipse'))
    .map((obj) => {
      const center = shapeCenter(obj);
      if (!center) return null;
      return {
        id: encodeCurveHandleId('point', obj.id),
        objectId: obj.id,
        x: roundCoord(center.x),
        y: roundCoord(center.y),
        kind: 'point',
      };
    })
    .filter((item): item is { id: string; objectId: string; x: number; y: number; kind: string } => Boolean(item))
    .sort((a, b) => a.x - b.x || a.y - b.y);
  if (pointHandles.length > 0) {
    return pointHandles;
  }

  return descendantIds
    .map((id) => objects[id])
    .filter((obj) => obj?.objectType === 'shape_node')
    .flatMap((obj) => {
      if (obj.shapeKind === 'path') {
        const commands = parsePathCommands(String((obj.geometry as any)?.attributes?.d ?? ''));
        if (!commands) return [];
        return collectPathCoordinatePairs(commands)
          .filter((pair) => pair.endpoint)
          .map((pair, index) => ({
            id: encodeCurveHandleId('path', obj.id, pair.commandIndex, pair.xParamIndex, pair.yParamIndex, index),
            objectId: obj.id,
            x: roundCoord(pair.absX),
            y: roundCoord(pair.absY),
            kind: 'path',
          }));
      }
      if (obj.shapeKind === 'polyline' || obj.shapeKind === 'polygon') {
        const points = parsePointList(String((obj.geometry as any)?.attributes?.points ?? ''));
        if (!points) return [];
        return points.map((point, index) => ({
          id: encodeCurveHandleId('poly', obj.id, index),
          objectId: obj.id,
          x: roundCoord(point.x),
          y: roundCoord(point.y),
          kind: 'poly',
        }));
      }
      if (obj.shapeKind === 'line') {
        const attrs = (obj.geometry as any)?.attributes ?? {};
        const x1 = Number(attrs.x1);
        const y1 = Number(attrs.y1);
        const x2 = Number(attrs.x2);
        const y2 = Number(attrs.y2);
        if (![x1, y1, x2, y2].every((value) => Number.isFinite(value))) return [];
        return [
          { id: encodeCurveHandleId('line', obj.id, 1), objectId: obj.id, x: roundCoord(x1), y: roundCoord(y1), kind: 'line' },
          { id: encodeCurveHandleId('line', obj.id, 2), objectId: obj.id, x: roundCoord(x2), y: roundCoord(y2), kind: 'line' },
        ];
      }
      return [];
    })
    .sort((a, b) => a.x - b.x || a.y - b.y);
}

function buildCurveHandles(objects: Record<string, any>, selectedIds: string[]): Array<{ id: string; objectId: string; x: number; y: number; kind: string }> {
  const handles = selectedIds.flatMap((objectId) => buildCurveHandlesForSelectedObject(objects, objectId));
  const seen = new Set<string>();
  return handles.filter((handle) => {
    if (seen.has(handle.id)) return false;
    seen.add(handle.id);
    return true;
  });
}

function findSelectionRootForHandle(objects: Record<string, any>, selectedIds: string[], handleObjectId: string): string | null {
  for (const selectedId of selectedIds) {
    if (selectedId === handleObjectId) return selectedId;
    const descendants = collectDescendantObjectIds(objects, selectedId);
    if (descendants.includes(handleObjectId)) return selectedId;
  }
  return selectedIds[0] ?? null;
}

function adjustShapeCurveGeometryNearHandle(obj: any, anchorX: number, dx: number, dy: number, range: { minX: number; maxX: number }): boolean {
  if (!obj || obj.objectType !== 'shape_node') return false;
  const attrs = ((obj.geometry as any)?.attributes ?? {}) as Record<string, any>;
  const sigma = Math.max(28, (range.maxX - range.minX) / 7);
  const weightAt = (x: number) => {
    if (!Number.isFinite(x) || !Number.isFinite(anchorX)) return 0;
    const dist = x - anchorX;
    return Math.exp(-(dist * dist) / (2 * sigma * sigma));
  };
  switch (obj.shapeKind) {
    case 'path': {
      const commands = parsePathCommands(String(attrs.d ?? ''));
      if (!commands) return false;
      const pairs = collectPathCoordinatePairs(commands);
      if (pairs.length === 0) return false;
      for (const pair of pairs) {
        const weight = weightAt(pair.absX);
        commands[pair.commandIndex].values[pair.xParamIndex] += dx * weight;
        commands[pair.commandIndex].values[pair.yParamIndex] += dy * weight;
      }
      attrs.d = serializePathCommands(commands);
      const bbox = computePathBBox(commands);
      if (bbox) obj.bbox = bbox;
      return true;
    }
    case 'polyline':
    case 'polygon': {
      const points = parsePointList(String(attrs.points ?? ''));
      if (!points) return false;
      for (const point of points) {
        const weight = weightAt(point.x);
        point.x = roundCoord(point.x + dx * weight);
        point.y = roundCoord(point.y + dy * weight);
      }
      attrs.points = serializePointList(points);
      const bbox = unionPointsBBox(points);
      if (bbox) obj.bbox = bbox;
      return true;
    }
    case 'line': {
      const x1 = Number(attrs.x1);
      const y1 = Number(attrs.y1);
      const x2 = Number(attrs.x2);
      const y2 = Number(attrs.y2);
      if (![x1, y1, x2, y2].every((value) => Number.isFinite(value))) return false;
      attrs.x1 = roundCoord(x1 + dx * weightAt(x1));
      attrs.y1 = roundCoord(y1 + dy * weightAt(x1));
      attrs.x2 = roundCoord(x2 + dx * weightAt(x2));
      attrs.y2 = roundCoord(y2 + dy * weightAt(x2));
      obj.bbox = {
        x: roundCoord(Math.min(Number(attrs.x1), Number(attrs.x2))),
        y: roundCoord(Math.min(Number(attrs.y1), Number(attrs.y2))),
        w: roundCoord(Math.abs(Number(attrs.x2) - Number(attrs.x1))),
        h: roundCoord(Math.abs(Number(attrs.y2) - Number(attrs.y1))),
      };
      return true;
    }
    default:
      return false;
  }
}

function adjustPointShapeHandle(obj: any, dx: number, dy: number): boolean {
  if (!obj || obj.objectType !== 'shape_node') return false;
  const attrs = ((obj.geometry as any)?.attributes ?? {}) as Record<string, any>;
  if (obj.shapeKind === 'circle') {
    const cx = Number(attrs.cx);
    const cy = Number(attrs.cy);
    const r = Number(attrs.r);
    if (![cx, cy, r].every((value) => Number.isFinite(value))) return false;
    attrs.cx = roundCoord(cx + dx);
    attrs.cy = roundCoord(cy + dy);
    obj.bbox = {
      x: roundCoord(Number(attrs.cx) - r),
      y: roundCoord(Number(attrs.cy) - r),
      w: roundCoord(r * 2),
      h: roundCoord(r * 2),
    };
    return true;
  }
  if (obj.shapeKind === 'ellipse') {
    const cx = Number(attrs.cx);
    const cy = Number(attrs.cy);
    const rx = Number(attrs.rx);
    const ry = Number(attrs.ry);
    if (![cx, cy, rx, ry].every((value) => Number.isFinite(value))) return false;
    attrs.cx = roundCoord(cx + dx);
    attrs.cy = roundCoord(cy + dy);
    obj.bbox = {
      x: roundCoord(Number(attrs.cx) - rx),
      y: roundCoord(Number(attrs.cy) - ry),
      w: roundCoord(rx * 2),
      h: roundCoord(ry * 2),
    };
    return true;
  }
  return false;
}
function makeSource(input: DesktopImportInput): OriginalSourceRef {
  return {
    sourceId: `desktop_${Date.now()}`,
    kind: input.kind,
    path: input.path,
    sha256: 'desktop_generated',
    familyHint: input.familyHint ?? 'unknown',
    importedAt: new Date().toISOString(),
  };
}

export class DesktopWorkbench {
  private state: EditorSessionState | null = null;
  private lastHit: { objectId: string; objectType: string } | null = null;
  private lastProjectPath: string | null = null;
  private importedSourcePath: string | null = null;
  private importedSourceKind: 'svg' | 'html' | null = null;
  private hasProjectMutations = false;
  private clipboard: DesktopClipboardState | null = null;
  private treeCacheProject: EditorSessionState['project'] | null = null;
  private treeCacheValue: ReturnType<typeof buildTreeViewModel> = [];
  private importReportCacheProject: EditorSessionState['project'] | null = null;
  private importReportCacheValue: ReturnType<typeof buildLatestImportReport> = null;
  private propertyCacheProject: EditorSessionState['project'] | null = null;
  private propertyCacheSelectionKey: string | null = null;
  private propertyCacheValue: ReturnType<typeof buildPropertyViewModel> = null;
  private previewSvgCacheProject: EditorSessionState['project'] | null = null;
  private previewSvgCacheValue = '';

  private getCachedTreeView(): ReturnType<typeof buildTreeViewModel> {
    if (!this.state) return [];
    if (this.treeCacheProject !== this.state.project) {
      this.treeCacheProject = this.state.project;
      this.treeCacheValue = buildTreeViewModel(this.state.project);
    }
    return this.treeCacheValue;
  }

  private getCachedImportReport(): ReturnType<typeof buildLatestImportReport> {
    if (!this.state) return null;
    if (this.importReportCacheProject !== this.state.project) {
      this.importReportCacheProject = this.state.project;
      this.importReportCacheValue = buildLatestImportReport(this.state.project);
    }
    return this.importReportCacheValue;
  }

  private getCachedPropertyView(selectedIds: string[]): ReturnType<typeof buildPropertyViewModel> {
    if (!this.state || selectedIds.length === 0) return null;
    const cacheKey = selectedIds.join('\u0001');
    if (this.propertyCacheProject !== this.state.project || this.propertyCacheSelectionKey !== cacheKey) {
      this.propertyCacheProject = this.state.project;
      this.propertyCacheSelectionKey = cacheKey;
      this.propertyCacheValue = buildPropertyViewModel(this.state.project, selectedIds);
    }
    return this.propertyCacheValue;
  }

  private getCachedPreviewSvg(): string {
    if (!this.state) return '';
    if (this.previewSvgCacheProject !== this.state.project) {
      this.previewSvgCacheProject = this.state.project;
      this.previewSvgCacheValue = exportSVG(this.state.project).content;
    }
    return this.previewSvgCacheValue;
  }

  importDocument(input: DesktopImportInput): DesktopViewSnapshot {
    this.state = importApi(
      { path: input.path, content: input.content },
      makeSource(input),
      input.kind === 'html' ? { htmlMode: input.htmlMode ?? 'limited' } : undefined
    );
    this.lastHit = null;
    this.importedSourcePath = input.path || null;
    this.importedSourceKind = input.kind;
    this.hasProjectMutations = false;
    this.clipboard = null;
    return this.snapshot();
  }

  importFromFile(path: string, familyHint: FamilyClass = 'unknown', htmlMode: 'strict_static' | 'limited' | 'snapshot' = 'limited'): DesktopViewSnapshot {
    const content = readFileSync(path, 'utf8');
    const ext = extname(path).toLowerCase();
    const kind = ext === '.html' || ext === '.htm' ? 'html' : 'svg';
    return this.importDocument({ path, content, kind, familyHint, htmlMode });
  }

  saveProjectToFile(path: string): DesktopViewSnapshot {
    if (!this.state) throw new Error('DesktopWorkbench is not initialized. Call importDocument first.');
    if (!projectApi.saveProject) throw new Error('saveProject API is unavailable in current editor-state build.');
    projectApi.saveProject(this.state.project, path);
    this.lastProjectPath = path;
    return this.snapshot();
  }

  loadProjectFromFile(path: string): DesktopViewSnapshot {
    if (!projectApi.loadProject) throw new Error('loadProject API is unavailable in current editor-state build.');
    const project = projectApi.loadProject(path) as EditorSessionState['project'];
    this.state = createEditorSession(project);
    this.lastHit = null;
    this.lastProjectPath = path;
    this.importedSourcePath = null;
    this.importedSourceKind = null;
    this.hasProjectMutations = false;
    this.clipboard = null;
    return this.snapshot();
  }

  exportSvgToFile(path: string): DesktopViewSnapshot {
    if (!this.state) throw new Error('DesktopWorkbench is not initialized. Call importDocument first.');
    copyFontPack(parse(path).dir || process.cwd());
    writeFileSync(path, this.getCachedPreviewSvg(), 'utf8');
    return this.snapshot();
  }

  exportHtmlToFile(path: string): DesktopViewSnapshot {
    if (!this.state) throw new Error('DesktopWorkbench is not initialized. Call importDocument first.');
    copyFontPack(parse(path).dir || process.cwd());
    const artifact = exportHTML(this.state.project);
    writeFileSync(path, artifact.content, 'utf8');
    return this.snapshot();
  }

  exportPngToFile(path: string, dpi = 300): DesktopViewSnapshot {
    if (!this.state) throw new Error('DesktopWorkbench is not initialized. Call importDocument first.');
    const normalizedSvg = ensureSvgNamespaces(this.getCachedPreviewSvg());
    const probe = new Resvg(normalizedSvg, {
      font: {
        loadSystemFonts: false,
        fontDirs: [FONT_PACK_ROOT],
        defaultFontFamily: 'Inter',
      },
      shapeRendering: 2,
      textRendering: 2,
      imageRendering: 0,
    });
    const baseWidth = Math.max(1, Math.round(probe.width));
    const baseHeight = Math.max(1, Math.round(probe.height));
    const longestSide = Math.max(baseWidth, baseHeight, 1);
    const targetLongestSide = Math.min(8192, Math.max(longestSide, 4096));
    const zoom = targetLongestSide / longestSide;
    const rendered = new Resvg(normalizedSvg, {
      fitTo: { mode: 'zoom', value: zoom },
      font: {
        loadSystemFonts: false,
        fontDirs: [FONT_PACK_ROOT],
        defaultFontFamily: 'Inter',
      },
      shapeRendering: 2,
      textRendering: 2,
      imageRendering: 0,
    }).render();
    writeFileSync(path, rendered.asPng());
    return this.snapshot();
  }

  suggestDefaultPngPath(): string | null {
    if (!this.importedSourcePath) return null;
    const sourceMeta = parse(this.importedSourcePath);
    const fileBase = sourceMeta.name && sourceMeta.name.trim().length > 0 ? sourceMeta.name.trim() : 'figure';
    const outputDir = sourceMeta.dir
      ? (isAbsolute(this.importedSourcePath) ? sourceMeta.dir : resolve(process.cwd(), sourceMeta.dir))
      : process.cwd();
    return join(outputDir, `${fileBase}_full.png`);
  }

  previewSvgContent(): string {
    return this.getCachedPreviewSvg();
  }

  selectById(objectId: string, options?: { appendSelection?: boolean }): DesktopViewSnapshot {
    if (!this.state) throw new Error('DesktopWorkbench is not initialized. Call importDocument first.');
    const targetId = String(objectId ?? '').trim();
    if (!targetId) return this.snapshot();
    if (options?.appendSelection) {
      const nextIds = [...this.state.selection.selectedIds];
      if (!nextIds.includes(targetId)) {
        nextIds.push(targetId);
      }
      this.state = multiSelectObjects(this.state, nextIds);
    } else {
      this.state = selectObject(this.state, targetId);
    }
    this.lastHit = { objectId: targetId, objectType: this.state.project.project.objects[targetId]?.objectType ?? 'unknown' };
    return this.snapshot();
  }

  selectFirstEditableText(): DesktopViewSnapshot {
    if (!this.state) throw new Error('DesktopWorkbench is not initialized. Call importDocument first.');
    const editable = Object.values(this.state.project.project.objects).filter(
      (obj) => (obj.objectType === 'text_node' || obj.objectType === 'html_block') && obj.capabilities.includes('text_edit')
    );
    const candidate = editable.find((obj) => obj.objectType === 'text_node') ?? editable[0];
    if (!candidate) return this.snapshot();
    this.state = selectObject(this.state, candidate.id);
    return this.snapshot();
  }

  selectAtPoint(x: number, y: number, options?: { appendSelection?: boolean }): DesktopViewSnapshot {
    if (!this.state) throw new Error('DesktopWorkbench is not initialized. Call importDocument first.');
    const objects = this.state.project.project.objects as Record<string, any>;
    const figure = this.state.project.project.figure;
    const best = pickBestObjectAtPoint(objects, x, y, {
      maxDistance: DEFAULT_SELECT_HIT_DISTANCE,
      figureWidth: Number(figure.width ?? figure.viewBox?.[2] ?? 0),
      figureHeight: Number(figure.height ?? figure.viewBox?.[3] ?? 0),
    });
    if (best) {
      return this.selectById(best.id, options);
    }
    const backdropOnly = pickBestObjectAtPoint(objects, x, y, { maxDistance: BACKDROP_ONLY_HIT_DISTANCE });
    if (backdropOnly) {
      this.lastHit = null;
      return this.snapshot();
    }
    const hit = hitTestAtPoint(this.state.project, x, y);
    if (!hit) {
      this.lastHit = null;
      return this.snapshot();
    }
    return this.selectById(hit.objectId, options);
  }

  selectTextAtPoint(x: number, y: number, maxDistance = 32): DesktopViewSnapshot {
    if (!this.state) throw new Error('DesktopWorkbench is not initialized. Call importDocument first.');
    const objects = this.state.project.project.objects as Record<string, any>;
    const figure = this.state.project.project.figure;
    const best = pickBestObjectAtPoint(objects, x, y, {
      preferText: true,
      maxDistance: Number.isFinite(maxDistance) ? maxDistance : TEXT_SELECT_HIT_DISTANCE,
      figureWidth: Number(figure.width ?? figure.viewBox?.[2] ?? 0),
      figureHeight: Number(figure.height ?? figure.viewBox?.[3] ?? 0),
    });
    if (!best) {
      return this.snapshot();
    }
    this.state = selectObject(this.state, best.id);
    this.lastHit = { objectId: best.id, objectType: best.objectType };
    return this.snapshot();
  }

  copySelection(): DesktopViewSnapshot {
    if (!this.state) throw new Error('DesktopWorkbench is not initialized. Call importDocument first.');
    const objects = this.state.project.project.objects as Record<string, any>;
    const selectedIds = this.state.selection.selectedIds.filter((id) => Boolean(objects[id]));
    if (selectedIds.length === 0) {
      throw new Error('No objects selected to copy.');
    }
    const rootIds = collectClipboardRootIds(objects, selectedIds);
    if (rootIds.length === 0) {
      throw new Error('No objects selected to copy.');
    }
    const objectIds = collectClipboardObjectIds(objects, rootIds);
    const clipboardObjects: Record<string, any> = {};
    for (const objectId of objectIds) {
      clipboardObjects[objectId] = structuredClone(objects[objectId]);
    }
    this.clipboard = {
      rootIds,
      objectIds,
      objects: clipboardObjects,
      pastedCount: 0,
    };
    return this.snapshot();
  }

  pasteSelection(): DesktopViewSnapshot {
    if (!this.state) throw new Error('DesktopWorkbench is not initialized. Call importDocument first.');
    if (this.state.policy.readOnly) {
      throw new Error(`Session is read-only (${this.state.policy.reason ?? 'snapshot_policy'}); pasteSelection is blocked.`);
    }
    if (!this.clipboard || this.clipboard.rootIds.length === 0 || this.clipboard.objectIds.length === 0) {
      throw new Error('Clipboard is empty. Copy objects before pasting.');
    }

    const nextProject = pushSnapshot(this.state.project);
    const nextState = structuredClone(this.state) as EditorSessionState;
    nextState.project = nextProject;
    const objects = nextProject.project.objects as Record<string, any>;
    const existingIds = new Set(Object.keys(objects));
    const allocatedIds = new Set<string>();
    const newIdMap = new Map<string, string>();
    const pasteToken = Date.now();
    const offset = 12 * (this.clipboard.pastedCount + 1);
    const pastedEntries: Array<{ oldId: string; newId: string; object: any; originalZIndex: number }> = [];

    for (const oldId of this.clipboard.objectIds) {
      const original = this.clipboard.objects[oldId];
      if (!original) continue;
      const newId = allocateCopiedObjectId(oldId, existingIds, allocatedIds, pasteToken);
      newIdMap.set(oldId, newId);
    }

    for (const oldId of this.clipboard.objectIds) {
      const original = this.clipboard.objects[oldId];
      if (!original) continue;
      const newId = newIdMap.get(oldId);
      if (!newId) continue;
      const cloned = structuredClone(original);
      cloned.id = newId;
      cloned.name = `${String(original.name || original.id || 'object').trim() || original.id} copy`;
      rewriteClipboardObjectReferences(cloned, newIdMap);
      translateCopiedObject(cloned, offset, offset);
      pastedEntries.push({
        oldId,
        newId,
        object: cloned,
        originalZIndex: Number(original.zIndex ?? 0),
      });
    }

    if (pastedEntries.length === 0) {
      throw new Error('Clipboard is empty. Copy objects before pasting.');
    }

    pastedEntries.sort((a, b) => a.originalZIndex - b.originalZIndex || a.oldId.localeCompare(b.oldId));
    const maxZIndex = Object.values(objects).reduce((max, obj) => Math.max(max, Number(obj?.zIndex ?? 0)), 0);
    pastedEntries.forEach((entry, index) => {
      entry.object.zIndex = maxZIndex + 1 + index;
      objects[entry.newId] = entry.object;
    });

    const newRootIds = this.clipboard.rootIds
      .map((oldId) => newIdMap.get(oldId))
      .filter((id): id is string => Boolean(id));

    for (const rootId of newRootIds) {
      recomputeCompositeBBox(objects, rootId);
      const root = objects[rootId];
      if (!root) continue;
      if (root.objectType === 'panel') {
        if (!nextProject.project.figure.panels.includes(rootId)) nextProject.project.figure.panels.push(rootId);
      } else if (root.objectType === 'legend') {
        if (!nextProject.project.figure.legends.includes(rootId)) nextProject.project.figure.legends.push(rootId);
      } else if (!nextProject.project.figure.floatingObjects.includes(rootId)) {
        nextProject.project.figure.floatingObjects.push(rootId);
      }
    }

    nextState.selection.selectedIds = [...newRootIds];
    this.state = nextState;
    this.lastHit = newRootIds[0]
      ? { objectId: newRootIds[0], objectType: objects[newRootIds[0]]?.objectType ?? 'unknown' }
      : null;
    this.clipboard.pastedCount += 1;
    this.hasProjectMutations = true;
    return this.snapshot();
  }

  moveSelected(dx: number, dy: number): DesktopViewSnapshot {
    if (!this.state) throw new Error('DesktopWorkbench is not initialized. Call importDocument first.');
    this.state = moveSelected(this.state, dx, dy);
    this.hasProjectMutations = true;
    return this.snapshot();
  }

  adjustSelectedCurve(deltaY: number): DesktopViewSnapshot {
    if (!this.state) throw new Error('DesktopWorkbench is not initialized. Call importDocument first.');
    if (this.state.policy.readOnly) {
      throw new Error(`Session is read-only (${this.state.policy.reason ?? 'snapshot_policy'}); adjustSelectedCurve is blocked.`);
    }
    if (!Number.isFinite(deltaY) || Math.abs(deltaY) <= 0) {
      return this.snapshot();
    }
    const selectedIds = [...this.state.selection.selectedIds];
    if (selectedIds.length === 0) return this.snapshot();

    const nextProject = pushSnapshot(this.state.project);
    const nextState = structuredClone(this.state) as EditorSessionState;
    nextState.project = nextProject;
    const objects = nextProject.project.objects as Record<string, any>;
    let changed = false;

    for (const objectId of selectedIds) {
      const range = collectCurveRange(objects, objectId);
      if (!range) continue;
      changed = adjustCurveObjectTree(objects, objectId, deltaY, range) || changed;
      if (changed) {
        recomputeCompositeBBox(objects, objectId);
      }
    }

    if (!changed) {
      throw new Error('Selected object is not a curve-like shape or curve group.');
    }

    this.state = nextState;
    this.hasProjectMutations = true;
    return this.snapshot();
  }

  adjustSelectedCurveHandle(handleId: string, dx: number, dy: number): DesktopViewSnapshot {
    if (!this.state) throw new Error('DesktopWorkbench is not initialized. Call importDocument first.');
    if (this.state.policy.readOnly) {
      throw new Error(`Session is read-only (${this.state.policy.reason ?? 'snapshot_policy'}); adjustSelectedCurveHandle is blocked.`);
    }
    if (!handleId || (!Number.isFinite(dx) && !Number.isFinite(dy))) {
      return this.snapshot();
    }

    const nextProject = pushSnapshot(this.state.project);
    const nextState = structuredClone(this.state) as EditorSessionState;
    nextState.project = nextProject;
    const objects = nextProject.project.objects as Record<string, any>;
    const parts = String(handleId).split(':');
    const kind = parts[0] ?? '';
    const targetObjectId = parts[1] ?? '';
    const selectedIds = [...this.state.selection.selectedIds];
    let changed = false;

    if (kind === 'point') {
      const pointObject = objects[targetObjectId];
      const pointCenter = shapeCenter(pointObject);
      if (!pointCenter) throw new Error('Invalid curve handle target');
      changed = adjustPointShapeHandle(pointObject, dx, dy) || changed;
      const selectionRootId = findSelectionRootForHandle(objects, selectedIds, targetObjectId);
      if (selectionRootId) {
        const range = collectCurveRange(objects, selectionRootId);
        if (range) {
          for (const objectId of collectDescendantObjectIds(objects, selectionRootId)) {
            const child = objects[objectId];
            if (!child || child.id === targetObjectId) continue;
            if (child.objectType !== 'shape_node') continue;
            if (!['path', 'polyline', 'polygon', 'line'].includes(String(child.shapeKind))) continue;
            changed = adjustShapeCurveGeometryNearHandle(child, pointCenter.x, dx, dy, range) || changed;
          }
          recomputeCompositeBBox(objects, selectionRootId);
        }
      }
    } else if (kind === 'path') {
      const commandIndex = Number(parts[2]);
      const xParamIndex = Number(parts[3]);
      const yParamIndex = Number(parts[4]);
      const obj = objects[targetObjectId];
      const attrs = ((obj?.geometry as any)?.attributes ?? {}) as Record<string, any>;
      const commands = parsePathCommands(String(attrs.d ?? ''));
      if (!obj || obj.objectType !== 'shape_node' || !commands) {
        throw new Error('Invalid path handle target');
      }
      const entry = commands[commandIndex];
      if (!entry) throw new Error('Missing path command for handle');
      entry.values[xParamIndex] += dx;
      entry.values[yParamIndex] += dy;
      attrs.d = serializePathCommands(commands);
      const bbox = computePathBBox(commands);
      if (bbox) obj.bbox = bbox;
      const selectionRootId = findSelectionRootForHandle(objects, selectedIds, targetObjectId);
      if (selectionRootId) recomputeCompositeBBox(objects, selectionRootId);
      changed = true;
    } else if (kind === 'poly') {
      const pointIndex = Number(parts[2]);
      const obj = objects[targetObjectId];
      const attrs = ((obj?.geometry as any)?.attributes ?? {}) as Record<string, any>;
      const points = parsePointList(String(attrs.points ?? ''));
      if (!obj || obj.objectType !== 'shape_node' || !points || !points[pointIndex]) {
        throw new Error('Invalid poly handle target');
      }
      points[pointIndex].x = roundCoord(points[pointIndex].x + dx);
      points[pointIndex].y = roundCoord(points[pointIndex].y + dy);
      attrs.points = serializePointList(points);
      const bbox = unionPointsBBox(points);
      if (bbox) obj.bbox = bbox;
      const selectionRootId = findSelectionRootForHandle(objects, selectedIds, targetObjectId);
      if (selectionRootId) recomputeCompositeBBox(objects, selectionRootId);
      changed = true;
    } else if (kind === 'line') {
      const endpoint = Number(parts[2]);
      const obj = objects[targetObjectId];
      const attrs = ((obj?.geometry as any)?.attributes ?? {}) as Record<string, any>;
      if (!obj || obj.objectType !== 'shape_node') throw new Error('Invalid line handle target');
      const xKey = endpoint === 2 ? 'x2' : 'x1';
      const yKey = endpoint === 2 ? 'y2' : 'y1';
      attrs[xKey] = roundCoord(Number(attrs[xKey]) + dx);
      attrs[yKey] = roundCoord(Number(attrs[yKey]) + dy);
      obj.bbox = {
        x: roundCoord(Math.min(Number(attrs.x1), Number(attrs.x2))),
        y: roundCoord(Math.min(Number(attrs.y1), Number(attrs.y2))),
        w: roundCoord(Math.abs(Number(attrs.x2) - Number(attrs.x1))),
        h: roundCoord(Math.abs(Number(attrs.y2) - Number(attrs.y1))),
      };
      const selectionRootId = findSelectionRootForHandle(objects, selectedIds, targetObjectId);
      if (selectionRootId) recomputeCompositeBBox(objects, selectionRootId);
      changed = true;
    }

    if (!changed) {
      throw new Error('Selected curve handle could not be adjusted.');
    }

    this.state = nextState;
    this.hasProjectMutations = true;
    return this.snapshot();
  }

  multiSelectByIds(objectIds: string[]): DesktopViewSnapshot {
    if (!this.state) throw new Error('DesktopWorkbench is not initialized. Call importDocument first.');
    const objects = this.state.project.project.objects as Record<string, any>;
    const seen = new Set<string>();
    const nextIds: string[] = [];
    for (const rawId of objectIds) {
      const objectId = String(rawId ?? '').trim();
      if (!objectId || seen.has(objectId) || !objects[objectId]) continue;
      seen.add(objectId);
      nextIds.push(objectId);
    }
    this.state = multiSelectObjects(this.state, nextIds);
    return this.snapshot();
  }

  clearSelection(): DesktopViewSnapshot {
    if (!this.state) throw new Error('DesktopWorkbench is not initialized. Call importDocument first.');
    this.state = clearSelectionState(this.state);
    this.lastHit = null;
    return this.snapshot();
  }

  editSelectedText(content: string): DesktopViewSnapshot {
    if (!this.state) throw new Error('DesktopWorkbench is not initialized. Call importDocument first.');
    const selectedId = this.state.selection.selectedIds[0];
    if (!selectedId) return this.snapshot();

    this.state = editSelectedText(this.state, content);
    this.hasProjectMutations = true;
    return this.snapshot();
  }

  updateSelectedAppearance(patch: DesktopAppearancePatch): DesktopViewSnapshot {
    if (!this.state) throw new Error('DesktopWorkbench is not initialized. Call importDocument first.');
    if (this.state.policy.readOnly) {
      throw new Error(`Session is read-only (${this.state.policy.reason ?? 'snapshot_policy'}); updateSelectedAppearance is blocked.`);
    }
    const selectedIds = [...this.state.selection.selectedIds];
    const selectedRootIds = collectSelectionRootIds(this.state.project, selectedIds);
    const currentTextTargets = resolveTextTargets(this.state.project, selectedRootIds);
    const currentShapeTargets = resolveShapeTargets(this.state.project, selectedRootIds);
    if (currentTextTargets.length === 0 && currentShapeTargets.length === 0) {
      throw new Error('Selected object does not expose editable appearance.');
    }

    const normalizedFamily = patch.fontFamily === undefined ? undefined : normalizeFontFamilyToken(patch.fontFamily);
    const normalizedSize =
      patch.fontSize === undefined
        ? undefined
        : Math.max(
            6,
            Math.min(
              256,
              Number.isFinite(patch.fontSize)
                ? Number(patch.fontSize)
                : (currentTextTargets[0]?.font.size ?? 16)
            )
          );
    const normalizedWeight = patch.fontWeight === undefined ? undefined : normalizeFontWeightToken(patch.fontWeight);
    const normalizedStyle = patch.fontStyle === undefined ? undefined : normalizeFontStyleToken(patch.fontStyle);
    const normalizedFill = patch.fill === undefined ? undefined : normalizeTextFillToken(patch.fill);
    const normalizedStroke = patch.stroke === undefined ? undefined : normalizeStrokeColorToken(patch.stroke);

    const textFormatChanged = currentTextTargets.some((target) =>
      (normalizedFamily !== undefined && normalizedFamily.length > 0 && normalizedFamily !== target.font.family) ||
      (normalizedSize !== undefined && normalizedSize !== target.font.size) ||
      (normalizedWeight !== undefined && normalizedWeight !== target.font.weight) ||
      (normalizedStyle !== undefined && normalizedStyle !== target.font.style)
    );
    const textFillChanged = currentTextTargets.some(
      (target) => normalizedFill !== undefined && normalizedFill !== target.fill
    );
    const shapeChanged = currentShapeTargets.some((target) =>
      (normalizedFill !== undefined &&
        target.shapeKind !== 'line' &&
        target.shapeKind !== 'polyline' &&
        normalizeShapeFillToken(normalizedFill) !== target.fill.color) ||
      (normalizedStroke !== undefined && normalizedStroke !== target.stroke.color)
    );

    if (!textFormatChanged && !textFillChanged && !shapeChanged) {
      return this.snapshot();
    }

    const nextProject = pushSnapshot(this.state.project);
    const nextState = structuredClone(this.state) as EditorSessionState;
    nextState.project = nextProject;
    const nextTextTargets = resolveTextTargets(nextProject, selectedRootIds);
    const nextShapeTargets = resolveShapeTargets(nextProject, selectedRootIds);

    for (const nextTarget of nextTextTargets) {
      const before = {
        textKind: nextTarget.textKind,
        bbox: { ...nextTarget.bbox },
        font: { ...nextTarget.font },
        fill: nextTarget.fill,
        capabilities: [...nextTarget.capabilities],
      };

      if (textFormatChanged) {
        upgradeProxyTextNodeForStyleEditing(nextTarget);
      }
      if (normalizedFamily !== undefined && normalizedFamily.length > 0) nextTarget.font.family = normalizedFamily;
      if (normalizedSize !== undefined) nextTarget.font.size = normalizedSize;
      if (normalizedWeight !== undefined) nextTarget.font.weight = normalizedWeight;
      if (normalizedStyle !== undefined) nextTarget.font.style = normalizedStyle;
      if (normalizedFill !== undefined) nextTarget.fill = normalizedFill;
      if (textFormatChanged) {
        nextTarget.bbox = approxTextBBox(nextTarget);
      }

      appendManualEdit(
        nextTarget as any,
        'manual_role_override',
        before,
        {
          textKind: nextTarget.textKind,
          bbox: { ...nextTarget.bbox },
          font: { ...nextTarget.font },
          fill: nextTarget.fill,
          capabilities: [...nextTarget.capabilities],
        },
        'update_text_style'
      );
    }

    for (const nextShape of nextShapeTargets) {
      const before = {
        fill: { ...nextShape.fill },
        stroke: { ...nextShape.stroke },
      };
      if (normalizedFill !== undefined && nextShape.shapeKind !== 'line' && nextShape.shapeKind !== 'polyline') {
        nextShape.fill.color = normalizeShapeFillToken(normalizedFill);
      }
      if (normalizedStroke !== undefined) {
        nextShape.stroke.color = normalizedStroke;
      }
      appendManualEdit(
        nextShape,
        'manual_role_override',
        before,
        {
          fill: { ...nextShape.fill },
          stroke: { ...nextShape.stroke },
        },
        'update_object_color'
      );
    }

    for (const rootId of selectedRootIds) {
      recomputeCompositeBBox(nextProject.project.objects as Record<string, any>, rootId);
    }

    this.state = nextState;
    this.hasProjectMutations = true;
    return this.snapshot();
  }

  updateSelectedTextStyle(patch: DesktopAppearancePatch): DesktopViewSnapshot {
    return this.updateSelectedAppearance(patch);
  }

  updateDocumentFontFamily(fontFamily: string): DesktopViewSnapshot {
    if (!this.state) throw new Error('DesktopWorkbench is not initialized. Call importDocument first.');
    if (this.state.policy.readOnly) {
      throw new Error(`Session is read-only (${this.state.policy.reason ?? 'snapshot_policy'}); updateDocumentFontFamily is blocked.`);
    }
    const normalizedFamily = normalizeFontFamilyToken(fontFamily);
    if (!normalizedFamily) throw new Error('Missing font family');

    const objects = this.state.project.project.objects as Record<string, any>;
    const textTargets = Object.values(objects).filter((obj): obj is TextNode => obj?.objectType === 'text_node');
    const changedTargets = textTargets.filter(
      (target) => target.textKind !== 'raw_text' || target.font.family !== normalizedFamily
    );
    if (changedTargets.length === 0) return this.snapshot();

    const nextProject = pushSnapshot(this.state.project);
    const nextState = structuredClone(this.state) as EditorSessionState;
    nextState.project = nextProject;
    const nextObjects = nextProject.project.objects as Record<string, any>;

    for (const target of changedTargets) {
      const nextTarget = nextObjects[target.id] as TextNode | undefined;
      if (!nextTarget) continue;
      const before = {
        font: { ...nextTarget.font },
        fill: nextTarget.fill,
        textKind: nextTarget.textKind,
        capabilities: [...nextTarget.capabilities],
      };
      if (nextTarget.textKind !== 'raw_text') {
        upgradeProxyTextNodeForStyleEditing(nextTarget);
      }
      nextTarget.font.family = normalizedFamily;
      appendManualEdit(
        nextTarget as any,
        'manual_role_override',
        before,
        {
          font: { ...nextTarget.font },
          fill: nextTarget.fill,
          textKind: nextTarget.textKind,
          capabilities: [...nextTarget.capabilities],
        },
        'update_document_font_family'
      );
    }

    this.state = nextState;
    this.hasProjectMutations = true;
    return this.snapshot();
  }

  deleteSelected(): DesktopViewSnapshot {
    if (!this.state) throw new Error('DesktopWorkbench is not initialized. Call importDocument first.');
    this.state = deleteSelected(this.state);
    this.hasProjectMutations = true;
    return this.snapshot();
  }

  promoteSelection(role: 'panel' | 'legend' | 'annotation_block' | 'group_node', reason = 'desktop_manual_promote'): DesktopViewSnapshot {
    if (!this.state) throw new Error('DesktopWorkbench is not initialized. Call importDocument first.');
    this.state = promoteSelected(this.state, role, reason);
    this.hasProjectMutations = true;
    return this.snapshot();
  }

  alignSelected(mode: 'align_left' | 'align_right' | 'align_top' | 'align_bottom' | 'center_horizontal' | 'center_vertical'): DesktopViewSnapshot {
    if (!this.state) throw new Error('DesktopWorkbench is not initialized. Call importDocument first.');
    if (this.state.policy.readOnly) {
      throw new Error(`Session is read-only (${this.state.policy.reason ?? 'snapshot_policy'}); alignSelected is blocked.`);
    }
    if (this.state.selection.selectedIds.length < 2) return this.snapshot();
    this.state = alignSelectedState(this.state, mode);
    this.hasProjectMutations = true;
    return this.snapshot();
  }

  distributeSelected(mode: 'equal_spacing_horizontal' | 'equal_spacing_vertical'): DesktopViewSnapshot {
    if (!this.state) throw new Error('DesktopWorkbench is not initialized. Call importDocument first.');
    if (this.state.policy.readOnly) {
      throw new Error(`Session is read-only (${this.state.policy.reason ?? 'snapshot_policy'}); distributeSelected is blocked.`);
    }
    if (this.state.selection.selectedIds.length < 2) return this.snapshot();
    this.state = distributeSelectedState(this.state, mode);
    this.hasProjectMutations = true;
    return this.snapshot();
  }

  undo(): DesktopViewSnapshot {
    if (!this.state) throw new Error('DesktopWorkbench is not initialized. Call importDocument first.');
    const project = undoProject(this.state.project);
    const selectedIds = this.state.selection.selectedIds.filter((id) => Boolean(project.project.objects[id]));
    this.state = {
      ...this.state,
      project,
      selection: { ...this.state.selection, selectedIds },
    };
    this.hasProjectMutations = true;
    return this.snapshot();
  }

  redo(): DesktopViewSnapshot {
    if (!this.state) throw new Error('DesktopWorkbench is not initialized. Call importDocument first.');
    const project = redoProject(this.state.project);
    const selectedIds = this.state.selection.selectedIds.filter((id) => Boolean(project.project.objects[id]));
    this.state = {
      ...this.state,
      project,
      selection: { ...this.state.selection, selectedIds },
    };
    this.hasProjectMutations = true;
    return this.snapshot();
  }

  addTextAtPoint(x: number, y: number, content: string): DesktopViewSnapshot {
    if (!this.state) throw new Error('DesktopWorkbench is not initialized. Call importDocument first.');
    if (this.state.policy.readOnly) {
      throw new Error(`Session is read-only (${this.state.policy.reason ?? 'snapshot_policy'}); addTextAtPoint is blocked.`);
    }
    const text = String(content ?? '').trim();
    if (!text) {
      return this.snapshot();
    }

    const nextProject = pushSnapshot(this.state.project);
    const nextState = structuredClone(this.state) as EditorSessionState;
    nextState.project = nextProject;
    const originSource = nextProject.project.originalSources[0] ?? null;
    const originFileKind =
      this.importedSourceKind ??
      (originSource?.kind === 'svg' || originSource?.kind === 'html' ? originSource.kind : 'native');

    const id = `obj_manual_text_${Date.now()}`;
    const fontSize = 16;
    const width = Math.max(fontSize * 0.8, fontSize * 0.58 * Math.max(1, text.length));
    const preferredFontFamily = pickPreferredDocumentFontFamily(nextProject.project.objects as Record<string, any>);
    const node: TextNode = {
      id,
      objectType: 'text_node',
      name: `text_node_${id}`,
      visible: true,
      locked: false,
      zIndex: Object.keys(nextProject.project.objects).length + 10,
      bbox: {
        x,
        y: y - fontSize * 0.95,
        w: width,
        h: fontSize * 1.35,
      },
      transform: {
        translate: [0, 0],
        scale: [1, 1],
        rotate: 0,
      },
      styleRef: null,
      capabilities: ['select', 'multi_select', 'drag', 'delete', 'text_edit', 'style_edit'],
      provenance: {
        originFileKind,
        originSourceId: originSource?.sourceId ?? 'desktop_manual',
        originNodeIds: [],
        originSelectorOrPath: null,
        originBBox: null,
        originStyleSnapshot: {},
        liftedBy: 'manual_promote',
        liftConfidence: 'manual',
        degradationReason: 'none',
      },
      stability: {
        exportStabilityClass: 'stable',
        requiresSnapshotRendering: false,
        reimportExpectation: 'semantic',
        equivalenceTarget: 'EQ-L2',
      },
      manualEdits: [],
      textKind: 'raw_text',
      content: text,
      position: [x, y],
      font: {
        family: preferredFontFamily,
        size: fontSize,
        weight: '400',
        style: 'normal',
      },
      fill: '#111827',
    };

    nextProject.project.objects[id] = node;
    nextProject.project.figure.floatingObjects.push(id);
    nextState.selection.selectedIds = [id];
    this.state = nextState;
    this.lastHit = { objectId: id, objectType: 'text_node' };
    this.hasProjectMutations = true;
    return this.snapshot();
  }

  linkedStatus(): DesktopLinkedStatus {
    const rootCount = this.state
      ? [
          ...(this.state.project.project.figure.panels ?? []),
          ...(this.state.project.project.figure.legends ?? []),
          ...(this.state.project.project.figure.floatingObjects ?? []),
        ].length
      : 0;
    const selectedCount = this.state?.selection.selectedIds.length ?? 0;
    return {
      regionCount: 4,
      treeNodeCount: rootCount,
      selectedCount,
      overlayCount: selectedCount,
      hasProperties: selectedCount > 0,
      hasImportReport: this.state !== null,
      hasLoadedProjectFile: this.lastProjectPath !== null,
    };
  }

  hasLoadedProjectFile(): boolean {
    return this.lastProjectPath !== null;
  }

  snapshot(): DesktopViewSnapshot {
    if (!this.state) {
      return {
        objectTree: [],
        canvas: { selectedIds: [], overlays: [], curveHandles: [], lastHit: null },
        properties: null,
        importReport: null,
        warnings: [],
      };
    }

    const selectedIds = this.state.selection.selectedIds;
    return {
      objectTree: this.getCachedTreeView(),
      canvas: {
        selectedIds: [...this.state.selection.selectedIds],
        overlays: buildSelectionOverlay(this.state.project, this.state.selection.selectedIds),
        curveHandles: buildCurveHandles(this.state.project.project.objects as Record<string, any>, this.state.selection.selectedIds),
        lastHit: this.lastHit,
      },
      properties: this.getCachedPropertyView(selectedIds),
      importReport: this.getCachedImportReport(),
      warnings: [...this.state.warnings],
    };
  }
}

export function createDesktopWorkbench(): DesktopWorkbench {
  return new DesktopWorkbench();
}
