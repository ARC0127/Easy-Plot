"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeProjectToSvg = serializeProjectToSvg;
function esc(v) {
    return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function attrs(record) {
    return Object.entries(record)
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
        .map(([k, v]) => `${k}="${esc(String(v))}"`)
        .join(' ');
}
function transformAttr(obj) {
    const parts = [];
    const [tx, ty] = obj.transform.translate;
    const [sx, sy] = obj.transform.scale;
    const rotate = obj.transform.rotate;
    if (tx !== 0 || ty !== 0)
        parts.push(`translate(${tx} ${ty})`);
    if (sx !== 1 || sy !== 1)
        parts.push(`scale(${sx} ${sy})`);
    if (rotate !== 0)
        parts.push(`rotate(${rotate})`);
    return parts.length > 0 ? parts.join(' ') : undefined;
}
function combineTransformAttrs(...parts) {
    const tokens = parts
        .map((part) => String(part ?? '').trim())
        .filter((part) => part.length > 0);
    return tokens.length > 0 ? tokens.join(' ') : undefined;
}
const SANS_FONT_STACK = [
    'Aptos',
    'Calibri',
    'Segoe UI',
    'Helvetica Neue',
    'Arial',
    'Noto Sans',
    'Liberation Sans',
    'DejaVu Sans',
    'PingFang SC',
    'Hiragino Sans GB',
    'Microsoft YaHei',
    'Source Han Sans SC',
    'sans-serif',
];
const SERIF_FONT_STACK = [
    'Cambria',
    'Georgia',
    'Times New Roman',
    'Noto Serif',
    'Noto Serif CJK SC',
    'Source Han Serif SC',
    'SimSun',
    'Songti SC',
    'DejaVu Serif',
    'serif',
];
const MONO_FONT_STACK = [
    'Cascadia Mono',
    'Consolas',
    'SFMono-Regular',
    'Menlo',
    'Monaco',
    'Liberation Mono',
    'DejaVu Sans Mono',
    'monospace',
];
function cleanFontToken(token) {
    return token.trim().replace(/^['"]+|['"]+$/g, '').trim();
}
function quoteFontToken(token) {
    return /[\s]/.test(token) && !/^(sans-serif|serif|monospace)$/i.test(token) ? `"${token}"` : token;
}
function splitFontFamilyList(raw) {
    return String(raw ?? '')
        .split(',')
        .map((token) => cleanFontToken(token))
        .filter((token) => token.length > 0 && token.toLowerCase() !== 'unknown' && token.toLowerCase() !== 'glyph_proxy');
}
function inferFontClass(primary) {
    const token = String(primary ?? '').toLowerCase();
    if (/mono|code|consolas|cascadia|courier|menlo|monaco/.test(token))
        return 'mono';
    if (/serif|times|georgia|cambria|garamond|baskerville|song|simsun/.test(token))
        return 'serif';
    return 'sans';
}
function buildExportFontFamily(raw) {
    const explicit = splitFontFamilyList(raw);
    const familyClass = inferFontClass(explicit[0]);
    const fallbackStack = familyClass === 'mono' ? MONO_FONT_STACK : familyClass === 'serif' ? SERIF_FONT_STACK : SANS_FONT_STACK;
    const merged = [];
    for (const token of [...explicit, ...fallbackStack]) {
        const cleaned = cleanFontToken(token);
        if (!cleaned)
            continue;
        if (merged.some((entry) => entry.toLowerCase() === cleaned.toLowerCase()))
            continue;
        merged.push(cleaned);
    }
    return merged.length > 0 ? merged.map(quoteFontToken).join(', ') : undefined;
}
function textTransformAttr(obj) {
    const rotate = obj.transform.rotate;
    if (rotate === 0)
        return undefined;
    return `rotate(${rotate} ${obj.position[0]} ${obj.position[1]})`;
}
function renderGlyphProxyText(obj, base) {
    const glyphVector = obj.glyphVector;
    if (!glyphVector || !Array.isArray(glyphVector.uses) || glyphVector.uses.length === 0) {
        return null;
    }
    const wrapperTransform = combineTransformAttrs(transformAttr(obj), glyphVector.wrapperTransform);
    const wrapperStyle = (glyphVector.wrapperStyle ?? {});
    const defsMarkup = Array.isArray(glyphVector.definitions)
        ? glyphVector.definitions
            .map((definition) => {
            const tagName = String(definition?.tagName ?? '').trim();
            if (!tagName)
                return '';
            return `<${tagName} ${attrs({ ...(definition.attributes ?? {}), id: definition.id })} />`;
        })
            .filter((item) => item.length > 0)
            .join('')
        : '';
    const usesMarkup = glyphVector.uses
        .map((useItem) => {
        const useAttrs = { ...(useItem?.attributes ?? {}) };
        if (typeof useAttrs.href === 'string' && !useAttrs['xlink:href']) {
            useAttrs['xlink:href'] = useAttrs.href;
        }
        return `<use ${attrs(useAttrs)} />`;
    })
        .join('');
    return `<g ${attrs({ ...base, transform: wrapperTransform, ...wrapperStyle })}>${defsMarkup ? `<defs>${defsMarkup}</defs>` : ''}${usesMarkup}</g>`;
}
function filterPassthroughShapeAttrs(record, options) {
    const out = {};
    const blocked = new Set([
        'id',
        'style',
        'transform',
        'fill',
        'fill-opacity',
        'stroke',
        'stroke-width',
        'stroke-dasharray',
        'vector-effect',
        'data-fe-bbox-x',
        'data-fe-bbox-y',
        'data-fe-bbox-w',
        'data-fe-bbox-h',
    ]);
    if (options?.omitHref) {
        blocked.add('href');
        blocked.add('xlink:href');
    }
    for (const [key, value] of Object.entries(record)) {
        if (blocked.has(key))
            continue;
        out[key] = value;
    }
    return out;
}
function resolveShapeStyleAttrs(obj, shapeAttrs) {
    const attrStroke = typeof shapeAttrs.stroke === 'string' ? String(shapeAttrs.stroke) : undefined;
    const attrFill = typeof shapeAttrs.fill === 'string' ? String(shapeAttrs.fill) : undefined;
    const hasAttrStroke = Boolean(attrStroke && attrStroke !== 'none');
    const hasAttrFill = Boolean(attrFill && attrFill !== 'none');
    const hasExplicitStroke = Boolean(obj.stroke.color && obj.stroke.color !== 'none');
    const hasExplicitFill = Boolean(obj.fill.color && obj.fill.color !== 'none');
    const hasStroke = hasExplicitStroke || hasAttrStroke;
    const hasFill = hasExplicitFill || hasAttrFill;
    const fallbackStrokeColor = obj.shapeKind === 'line' || obj.shapeKind === 'polyline'
        ? '#0f172a'
        : '#334155';
    const fallbackStrokeWidth = obj.shapeKind === 'line' || obj.shapeKind === 'polyline' ? 1.5 : 1;
    const resolvedStroke = hasExplicitStroke
        ? obj.stroke.color
        : hasAttrStroke
            ? undefined
            : hasFill
                ? undefined
                : fallbackStrokeColor;
    const resolvedStrokeWidth = hasExplicitStroke
        ? obj.stroke.width
        : hasAttrStroke
            ? undefined
            : hasFill
                ? undefined
                : fallbackStrokeWidth;
    const resolvedDasharray = hasExplicitStroke ? obj.stroke.dasharray ?? undefined : undefined;
    const resolvedFill = hasExplicitFill
        ? obj.fill.color ?? undefined
        : hasAttrFill
            ? undefined
            : 'none';
    const resolvedFillOpacity = hasExplicitFill && obj.fill.color !== null && obj.fill.opacity !== 1 ? obj.fill.opacity : undefined;
    const styleAttrs = {};
    if (resolvedStroke !== undefined && resolvedStroke !== null)
        styleAttrs.stroke = resolvedStroke;
    if (resolvedStrokeWidth !== undefined)
        styleAttrs['stroke-width'] = resolvedStrokeWidth;
    if (resolvedDasharray !== undefined && resolvedDasharray !== null)
        styleAttrs['stroke-dasharray'] = resolvedDasharray;
    if (resolvedFill !== undefined && resolvedFill !== null)
        styleAttrs.fill = resolvedFill;
    if (resolvedFillOpacity !== undefined)
        styleAttrs['fill-opacity'] = resolvedFillOpacity;
    if (hasStroke || !hasFill)
        styleAttrs['vector-effect'] = 'non-scaling-stroke';
    return styleAttrs;
}
function renderShapeUse(obj, base, bboxAttrs, shapeAttrs, useReference) {
    const href = String(useReference?.href ?? shapeAttrs.href ?? shapeAttrs['xlink:href'] ?? '').trim();
    if (!href) {
        return '';
    }
    const styleAttrs = resolveShapeStyleAttrs(obj, shapeAttrs);
    const passthroughAttrs = filterPassthroughShapeAttrs(shapeAttrs, { omitHref: true });
    return `<use ${attrs({
        ...base,
        ...bboxAttrs,
        ...passthroughAttrs,
        href,
        'xlink:href': href,
        transform: combineTransformAttrs(shapeAttrs.transform, transformAttr(obj)),
        ...styleAttrs,
    })} />`;
}
function collectUseDefinitions(renderables) {
    const defsById = new Map();
    for (const obj of renderables) {
        if (obj.objectType !== 'shape_node')
            continue;
        const useReference = obj.geometry?.useReference;
        if (!useReference)
            continue;
        const definitionId = String(useReference.definitionId ?? '').trim();
        const definitionTag = String(useReference.definitionTag ?? '').trim();
        const definitionAttributes = (useReference.definitionAttributes ?? {});
        if (!definitionId || !definitionTag)
            continue;
        if (defsById.has(definitionId))
            continue;
        defsById.set(definitionId, `<${definitionTag} ${attrs({ ...definitionAttributes, id: definitionId })} />`);
    }
    return [...defsById.values()];
}
function semanticMarker(obj) {
    if (!['panel', 'legend', 'annotation_block', 'figure_title', 'panel_label'].includes(obj.objectType))
        return '';
    return `<g ${attrs({
        id: obj.id,
        'data-fe-role': obj.objectType === 'annotation_block' ? 'annotation' : obj.objectType,
        'data-fe-object-id': obj.id,
        x: obj.bbox.x,
        y: obj.bbox.y,
        width: obj.bbox.w,
        height: obj.bbox.h,
    })}></g>`;
}
function renderObject(obj) {
    const base = {
        id: obj.id,
        'data-fe-object-type': obj.objectType,
        'data-fe-object-id': obj.id,
    };
    switch (obj.objectType) {
        case 'text_node': {
            if (obj.textKind === 'path_text_proxy') {
                const glyphProxyMarkup = renderGlyphProxyText(obj, base);
                if (glyphProxyMarkup)
                    return glyphProxyMarkup;
            }
            const fontFamily = buildExportFontFamily(obj.font.family);
            return `<text ${attrs({ ...base, x: obj.position[0], y: obj.position[1], transform: textTransformAttr(obj), 'font-family': fontFamily, 'font-size': obj.font.size, fill: obj.fill })}>${esc(obj.content)}</text>`;
        }
        case 'image_node':
            return `<image ${attrs({ ...base, x: obj.bbox.x, y: obj.bbox.y, width: obj.bbox.w, height: obj.bbox.h, href: obj.href, 'xlink:href': obj.href })} />`;
        case 'shape_node': {
            const shapeAttrs = obj.geometry?.attributes ?? {};
            const originalTag = String(obj.geometry?.originalTag ?? '').toLowerCase();
            const useReference = obj.geometry?.useReference ?? null;
            const shapeKind = obj.shapeKind;
            const bboxAttrs = {
                'data-fe-bbox-x': obj.bbox.x,
                'data-fe-bbox-y': obj.bbox.y,
                'data-fe-bbox-w': obj.bbox.w,
                'data-fe-bbox-h': obj.bbox.h,
            };
            const geometryFallback = shapeKind === 'rect'
                ? {
                    x: shapeAttrs.x ?? obj.bbox.x,
                    y: shapeAttrs.y ?? obj.bbox.y,
                    width: shapeAttrs.width ?? obj.bbox.w,
                    height: shapeAttrs.height ?? obj.bbox.h,
                }
                : shapeKind === 'circle'
                    ? {
                        cx: shapeAttrs.cx ?? obj.bbox.x + obj.bbox.w / 2,
                        cy: shapeAttrs.cy ?? obj.bbox.y + obj.bbox.h / 2,
                        r: shapeAttrs.r ?? Math.max(0, Math.min(obj.bbox.w, obj.bbox.h) / 2),
                    }
                    : {};
            if (originalTag === 'use' || useReference) {
                return renderShapeUse(obj, base, bboxAttrs, shapeAttrs, useReference);
            }
            const styleAttrs = resolveShapeStyleAttrs(obj, shapeAttrs);
            return `<${shapeKind} ${attrs({
                ...base,
                ...bboxAttrs,
                ...shapeAttrs,
                ...geometryFallback,
                transform: combineTransformAttrs(typeof shapeAttrs.transform === 'string' ? shapeAttrs.transform : undefined, transformAttr(obj)),
                ...styleAttrs,
            })} />`;
        }
        case 'group_node':
            return `<g ${attrs({ ...base, x: obj.bbox.x, y: obj.bbox.y, width: obj.bbox.w, height: obj.bbox.h, transform: transformAttr(obj) })}></g>`;
        case 'html_block':
            return `<g ${attrs({
                ...base,
                x: obj.bbox.x,
                y: obj.bbox.y,
                width: obj.bbox.w,
                height: obj.bbox.h,
                transform: transformAttr(obj),
                'data-fe-tag': obj.tagName,
                'data-fe-text-content': obj.textContent ?? '',
            })}></g>`;
        default:
            return '';
    }
}
function serializeProjectToSvg(project) {
    const { figure, objects } = project.project;
    const semantic = Object.values(objects).filter(o => ['panel', 'legend', 'annotation_block', 'figure_title', 'panel_label'].includes(o.objectType));
    const renderables = Object.values(objects)
        .filter(o => ['text_node', 'image_node', 'shape_node', 'group_node', 'html_block'].includes(o.objectType))
        .sort((a, b) => a.zIndex - b.zIndex);
    const defs = collectUseDefinitions(renderables);
    const body = [
        ...semantic.map(semanticMarker),
        ...renderables.map(renderObject),
    ].filter(Boolean).join('\n  ');
    const defsBlock = defs.length > 0
        ? `  <defs>\n    ${defs.join('\n    ')}\n  </defs>\n`
        : '';
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg id="${esc(figure.figureId)}" width="${figure.width}" height="${figure.height}" viewBox="${figure.viewBox.join(' ')}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
${defsBlock}  ${body}
</svg>`;
}
