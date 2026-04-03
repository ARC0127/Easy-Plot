"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesktopWorkbench = void 0;
exports.createDesktopWorkbench = createDesktopWorkbench;
const fs_1 = require("fs");
const path_1 = require("path");
const resvg_js_1 = require("@resvg/resvg-js");
const index_1 = require("../../../../packages/core-export-html/dist/index");
const index_2 = require("../../../../packages/core-export-svg/dist/index");
const index_3 = require("../../../../packages/editor-canvas/dist/index");
const index_4 = require("../../../../packages/core-history/dist/index");
const index_5 = require("../../../../packages/core-history/dist/index");
const index_6 = require("../../../../packages/editor-import-report/dist/index");
const index_7 = require("../../../../packages/editor-properties/dist/index");
const index_8 = require("../../../../packages/editor-state/dist/index");
const index_9 = require("../../../../packages/editor-tree/dist/index");
const projectApi = require('../../../../packages/editor-state/dist/index');
const importApi = index_8.importIntoSession;
function pointToRectDistance(x, y, bbox) {
    const dx = Math.max(bbox.x - x, 0, x - (bbox.x + bbox.w));
    const dy = Math.max(bbox.y - y, 0, y - (bbox.y + bbox.h));
    return Math.hypot(dx, dy);
}
function isTextLikeObject(obj) {
    if (!obj)
        return false;
    return obj.objectType === 'text_node' || obj.objectType === 'figure_title' || obj.objectType === 'panel_label';
}
function isFiniteBBox(bbox) {
    if (!bbox)
        return false;
    return Number.isFinite(bbox.x) && Number.isFinite(bbox.y) && Number.isFinite(bbox.w) && Number.isFinite(bbox.h);
}
function approxTextBBox(obj) {
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
function effectiveHitBBox(obj) {
    if (!obj || !obj.visible)
        return null;
    const b = obj.bbox;
    if (isFiniteBBox(b) && b.w > 0 && b.h > 0) {
        return b;
    }
    if (obj.objectType === 'text_node') {
        return approxTextBBox(obj);
    }
    return isFiniteBBox(b) ? b : null;
}
function normalizeHexColor(token) {
    const raw = String(token ?? '').trim().toLowerCase();
    if (raw === '#fff')
        return '#ffffff';
    if (raw === '#000')
        return '#000000';
    return raw;
}
function ensureSvgNamespaces(svgText) {
    const hasXmlns = /\sxmlns\s*=\s*['"][^'"]+['"]/i.test(svgText);
    const hasXmlnsXlink = /\sxmlns:xlink\s*=\s*['"][^'"]+['"]/i.test(svgText);
    const needsXlinkNs = /xlink:href\s*=/i.test(svgText);
    return svgText.replace(/<svg\b([^>]*)>/i, (_full, attrs) => {
        const additions = [];
        if (!hasXmlns)
            additions.push('xmlns="http://www.w3.org/2000/svg"');
        if (needsXlinkNs && !hasXmlnsXlink)
            additions.push('xmlns:xlink="http://www.w3.org/1999/xlink"');
        const extra = additions.length > 0 ? ` ${additions.join(' ')}` : '';
        return `<svg${attrs}${extra}>`;
    });
}
function isLightBackdropColor(token) {
    const normalized = normalizeHexColor(String(token ?? ''));
    return normalized === '#ffffff' || normalized === '#faf9f6' || normalized === '#f6f5f2' || normalized === 'white';
}
function isBackdropLikeShape(obj, figureWidth, figureHeight) {
    if (!obj || obj.objectType !== 'shape_node')
        return false;
    const bbox = effectiveHitBBox(obj);
    if (!bbox || bbox.w <= 0 || bbox.h <= 0)
        return false;
    const figureArea = Math.max(1, figureWidth * figureHeight);
    const areaRatio = (bbox.w * bbox.h) / figureArea;
    const widthRatio = bbox.w / Math.max(1, figureWidth);
    const heightRatio = bbox.h / Math.max(1, figureHeight);
    const fill = String(obj?.fill?.color ?? obj?.provenance?.originStyleSnapshot?.fill ?? '').trim().toLowerCase();
    return areaRatio >= 0.06 && (widthRatio >= 0.8 || heightRatio >= 0.8) && isLightBackdropColor(fill);
}
function isBackdropLikeGroup(obj, objects, figureWidth, figureHeight) {
    if (!obj || obj.objectType !== 'group_node')
        return false;
    if (!Array.isArray(obj.childObjectIds) || obj.childObjectIds.length === 0)
        return false;
    if (!Array.isArray(obj.capabilities) || !obj.capabilities.includes('group_only'))
        return false;
    const bbox = effectiveHitBBox(obj);
    if (!bbox || bbox.w <= 0 || bbox.h <= 0)
        return false;
    const figureArea = Math.max(1, figureWidth * figureHeight);
    const groupArea = bbox.w * bbox.h;
    const areaRatio = groupArea / figureArea;
    const widthRatio = bbox.w / Math.max(1, figureWidth);
    const heightRatio = bbox.h / Math.max(1, figureHeight);
    const childArea = obj.childObjectIds
        .map((childId) => effectiveHitBBox(objects[childId]))
        .filter(Boolean)
        .reduce((sum, childBBox) => sum + Math.max(0, childBBox.w * childBBox.h), 0);
    return areaRatio >= 0.06 && (widthRatio >= 0.8 || heightRatio >= 0.8) && childArea / Math.max(1, groupArea) <= 0.2;
}
function buildDepthMap(objects) {
    const depthMap = {};
    const queue = [];
    for (const obj of Object.values(objects)) {
        if (!Array.isArray(obj.childObjectIds) || obj.childObjectIds.length === 0)
            continue;
        queue.push(obj.id);
    }
    for (const id of Object.keys(objects)) {
        if (!(id in depthMap))
            depthMap[id] = 0;
    }
    const seen = new Set();
    while (queue.length > 0) {
        const id = queue.shift();
        if (seen.has(id))
            continue;
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
function pickBestObjectAtPoint(objects, x, y, options) {
    const preferText = options?.preferText === true;
    const maxDistance = Number.isFinite(options?.maxDistance) ? Number(options?.maxDistance) : 0;
    const figureWidth = Number.isFinite(options?.figureWidth) ? Number(options?.figureWidth) : 0;
    const figureHeight = Number.isFinite(options?.figureHeight) ? Number(options?.figureHeight) : 0;
    const depthMap = buildDepthMap(objects);
    const scored = Object.values(objects)
        .map((obj) => {
        if (!obj.visible)
            return null;
        const hitBox = effectiveHitBBox(obj);
        if (!hitBox)
            return null;
        const distance = pointToRectDistance(x, y, hitBox);
        if (distance > maxDistance)
            return null;
        const textLike = isTextLikeObject(obj);
        const textEditable = obj.capabilities.includes('text_edit');
        if (preferText && !textLike)
            return null;
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
            backdropLike: figureWidth > 0 && figureHeight > 0 && (isBackdropLikeShape(obj, figureWidth, figureHeight) ||
                isBackdropLikeGroup(obj, objects, figureWidth, figureHeight))
                ? 1
                : 0,
        };
    })
        .filter((item) => item !== null)
        .sort((a, b) => {
        if (a.backdropLike !== b.backdropLike)
            return a.backdropLike - b.backdropLike;
        if (a.distance !== b.distance)
            return a.distance - b.distance;
        if (a.textLike !== b.textLike)
            return b.textLike - a.textLike;
        if (a.textEditable !== b.textEditable)
            return b.textEditable - a.textEditable;
        if (a.notGroup !== b.notGroup)
            return b.notGroup - a.notGroup;
        if (a.leaf !== b.leaf)
            return b.leaf - a.leaf;
        if (a.depth !== b.depth)
            return b.depth - a.depth;
        if (a.area !== b.area)
            return a.area - b.area;
        if (a.zIndex !== b.zIndex)
            return b.zIndex - a.zIndex;
        return 0;
    });
    if (scored.length === 0)
        return null;
    return scored[0].backdropLike === 1 ? null : scored[0].obj;
}
const DEFAULT_EDITOR_FONT_STACK = 'Aptos, Calibri, "Segoe UI", "Helvetica Neue", Arial, "Noto Sans", "Liberation Sans", "DejaVu Sans", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Source Han Sans SC", sans-serif';
const PATH_PARAM_COUNTS = {
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
function isUsableFontFamily(raw) {
    const token = String(raw ?? '').trim().toLowerCase();
    return token.length > 0 && token !== 'unknown' && token !== 'glyph_proxy';
}
function pickPreferredDocumentFontFamily(objects) {
    const candidates = Object.values(objects)
        .filter((obj) => obj?.objectType === 'text_node' && isUsableFontFamily(obj?.font?.family))
        .sort((a, b) => Number(b?.zIndex ?? 0) - Number(a?.zIndex ?? 0));
    return candidates[0]?.font?.family ?? DEFAULT_EDITOR_FONT_STACK;
}
function childObjectIdsOf(obj) {
    const refs = new Set();
    if (Array.isArray(obj?.childObjectIds)) {
        for (const childId of obj.childObjectIds)
            refs.add(String(childId));
    }
    if (obj?.objectType === 'panel') {
        if (obj?.contentRootId)
            refs.add(String(obj.contentRootId));
        if (obj?.titleObjectId)
            refs.add(String(obj.titleObjectId));
    }
    if (obj?.objectType === 'legend' && Array.isArray(obj?.itemObjectIds)) {
        for (const childId of obj.itemObjectIds)
            refs.add(String(childId));
    }
    return [...refs];
}
function roundCoord(value) {
    return Number(Number(value).toFixed(3));
}
function curveWeight(x, minX, maxX) {
    if (!Number.isFinite(x) || !Number.isFinite(minX) || !Number.isFinite(maxX))
        return 1;
    const width = maxX - minX;
    if (width <= 1e-6)
        return 1;
    const t = Math.max(0, Math.min(1, (x - minX) / width));
    return Math.max(0, 1 - Math.pow(2 * t - 1, 2));
}
function unionPointsBBox(points) {
    const valid = points.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
    if (valid.length === 0)
        return null;
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
function tokenizePathData(d) {
    return String(d ?? '').match(/[AaCcHhLlMmQqSsTtVvZz]|[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/g) ?? [];
}
function parsePathCommands(d) {
    const tokens = tokenizePathData(d);
    if (tokens.length === 0)
        return null;
    const commands = [];
    let index = 0;
    let currentCmd = null;
    while (index < tokens.length) {
        const token = tokens[index];
        if (/^[A-Za-z]$/.test(token)) {
            currentCmd = token;
            index += 1;
            const expected = PATH_PARAM_COUNTS[currentCmd.toUpperCase()];
            if (expected === undefined)
                return null;
            if (expected === 0) {
                commands.push({ cmd: currentCmd, values: [] });
                currentCmd = null;
            }
            continue;
        }
        if (!currentCmd)
            return null;
        const expected = PATH_PARAM_COUNTS[currentCmd.toUpperCase()];
        if (!Number.isFinite(expected))
            return null;
        if (index + expected > tokens.length)
            return null;
        const values = [];
        for (let offset = 0; offset < expected; offset += 1) {
            const raw = tokens[index + offset];
            if (/^[A-Za-z]$/.test(raw))
                return null;
            const numeric = Number.parseFloat(raw);
            if (!Number.isFinite(numeric))
                return null;
            values.push(numeric);
        }
        commands.push({ cmd: currentCmd, values });
        index += expected;
        if (currentCmd === 'M')
            currentCmd = 'L';
        else if (currentCmd === 'm')
            currentCmd = 'l';
    }
    return commands;
}
function serializePathCommands(commands) {
    return commands
        .map((entry) => (entry.values.length === 0 ? entry.cmd : `${entry.cmd} ${entry.values.map((value) => roundCoord(value)).join(' ')}`))
        .join(' ');
}
function collectPathDataEntries(commands) {
    const entries = [];
    const xValues = [];
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
function computePathBBox(commands) {
    const points = [];
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
function parsePointList(pointsText) {
    const values = String(pointsText ?? '')
        .trim()
        .split(/[\s,]+/)
        .map((token) => Number.parseFloat(token))
        .filter((token) => Number.isFinite(token));
    if (values.length < 2 || values.length % 2 !== 0)
        return null;
    const points = [];
    for (let index = 0; index < values.length; index += 2) {
        points.push({ x: values[index], y: values[index + 1] });
    }
    return points;
}
function serializePointList(points) {
    return points.map((point) => `${roundCoord(point.x)} ${roundCoord(point.y)}`).join(' ');
}
function collectCurveXValuesForObject(obj) {
    if (!obj || obj.objectType !== 'shape_node')
        return [];
    const attrs = obj.geometry?.attributes ?? {};
    switch (obj.shapeKind) {
        case 'path': {
            const commands = parsePathCommands(String(attrs.d ?? ''));
            if (!commands)
                return [];
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
            if (Number.isFinite(centerX))
                return [centerX];
            const bbox = effectiveHitBBox(obj);
            return bbox ? [bbox.x + bbox.w / 2] : [];
        }
        default: {
            const bbox = effectiveHitBBox(obj);
            return bbox ? [bbox.x + bbox.w / 2] : [];
        }
    }
}
function collectCurveRange(objects, objectId, visited = new Set()) {
    if (visited.has(objectId))
        return null;
    visited.add(objectId);
    const obj = objects[objectId];
    if (!obj)
        return null;
    const xValues = [...collectCurveXValuesForObject(obj)];
    for (const childId of childObjectIdsOf(obj)) {
        const childRange = collectCurveRange(objects, childId, visited);
        if (!childRange)
            continue;
        xValues.push(childRange.minX, childRange.maxX);
    }
    const valid = xValues.filter((value) => Number.isFinite(value));
    if (valid.length === 0)
        return null;
    return { minX: Math.min(...valid), maxX: Math.max(...valid) };
}
function adjustShapeCurveGeometry(obj, deltaY, range) {
    if (!obj || obj.objectType !== 'shape_node')
        return false;
    const attrs = (obj.geometry?.attributes ?? {});
    switch (obj.shapeKind) {
        case 'path': {
            const commands = parsePathCommands(String(attrs.d ?? ''));
            if (!commands)
                return false;
            const { entries } = collectPathDataEntries(commands);
            if (entries.length === 0)
                return false;
            for (const entry of entries) {
                const weight = curveWeight(entry.absX, range.minX, range.maxX);
                commands[entry.commandIndex].values[entry.paramIndex] += deltaY * weight;
            }
            const bbox = computePathBBox(commands);
            attrs.d = serializePathCommands(commands);
            if (bbox)
                obj.bbox = bbox;
            return true;
        }
        case 'polyline':
        case 'polygon': {
            const points = parsePointList(String(attrs.points ?? ''));
            if (!points || points.length === 0)
                return false;
            for (const point of points) {
                point.y = roundCoord(point.y + deltaY * curveWeight(point.x, range.minX, range.maxX));
            }
            attrs.points = serializePointList(points);
            const bbox = unionPointsBBox(points);
            if (bbox)
                obj.bbox = bbox;
            return true;
        }
        case 'line': {
            const x1 = Number(attrs.x1);
            const x2 = Number(attrs.x2);
            const y1 = Number(attrs.y1);
            const y2 = Number(attrs.y2);
            if (![x1, x2, y1, y2].every((value) => Number.isFinite(value)))
                return false;
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
            if (!Number.isFinite(cx) || !Number.isFinite(cy))
                return false;
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
function recomputeCompositeBBox(objects, objectId, visited = new Set()) {
    if (visited.has(objectId))
        return effectiveHitBBox(objects[objectId]);
    visited.add(objectId);
    const obj = objects[objectId];
    if (!obj)
        return null;
    const childIds = childObjectIdsOf(obj);
    if (childIds.length === 0) {
        return effectiveHitBBox(obj);
    }
    const childBoxes = childIds
        .map((childId) => recomputeCompositeBBox(objects, childId, visited))
        .filter((bbox) => Boolean(bbox));
    if (childBoxes.length === 0) {
        return effectiveHitBBox(obj);
    }
    const points = childBoxes.flatMap((bbox) => [
        { x: bbox.x, y: bbox.y },
        { x: bbox.x + bbox.w, y: bbox.y + bbox.h },
    ]);
    const bbox = unionPointsBBox(points);
    if (bbox)
        obj.bbox = bbox;
    return bbox;
}
function adjustCurveObjectTree(objects, objectId, deltaY, range, visited = new Set()) {
    if (visited.has(objectId))
        return false;
    visited.add(objectId);
    const obj = objects[objectId];
    if (!obj)
        return false;
    let changed = adjustShapeCurveGeometry(obj, deltaY, range);
    for (const childId of childObjectIdsOf(obj)) {
        changed = adjustCurveObjectTree(objects, childId, deltaY, range, visited) || changed;
    }
    if (changed && childObjectIdsOf(obj).length > 0) {
        recomputeCompositeBBox(objects, objectId);
    }
    return changed;
}
function collectPathCoordinatePairs(commands) {
    const pairs = [];
    let currentX = 0;
    let currentY = 0;
    for (let commandIndex = 0; commandIndex < commands.length; commandIndex += 1) {
        const entry = commands[commandIndex];
        const upper = entry.cmd.toUpperCase();
        const relative = entry.cmd !== upper;
        const values = entry.values;
        const pushPair = (xParamIndex, yParamIndex, endpoint) => {
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
function encodeCurveHandleId(kind, objectId, ...parts) {
    return [kind, objectId, ...parts.map((part) => String(part))].join(':');
}
function collectDescendantObjectIds(objects, rootId, visited = new Set()) {
    if (visited.has(rootId))
        return [];
    visited.add(rootId);
    const out = [rootId];
    const obj = objects[rootId];
    if (!obj)
        return out;
    for (const childId of childObjectIdsOf(obj)) {
        out.push(...collectDescendantObjectIds(objects, childId, visited));
    }
    return out;
}
function shapeCenter(obj) {
    const attrs = obj?.geometry?.attributes ?? {};
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
function buildCurveHandlesForSelectedObject(objects, objectId) {
    const descendantIds = collectDescendantObjectIds(objects, objectId);
    const pointHandles = descendantIds
        .map((id) => objects[id])
        .filter((obj) => obj?.objectType === 'shape_node' && (obj.shapeKind === 'circle' || obj.shapeKind === 'ellipse'))
        .map((obj) => {
        const center = shapeCenter(obj);
        if (!center)
            return null;
        return {
            id: encodeCurveHandleId('point', obj.id),
            objectId: obj.id,
            x: roundCoord(center.x),
            y: roundCoord(center.y),
            kind: 'point',
        };
    })
        .filter((item) => Boolean(item))
        .sort((a, b) => a.x - b.x || a.y - b.y);
    if (pointHandles.length > 0) {
        return pointHandles;
    }
    return descendantIds
        .map((id) => objects[id])
        .filter((obj) => obj?.objectType === 'shape_node')
        .flatMap((obj) => {
        if (obj.shapeKind === 'path') {
            const commands = parsePathCommands(String(obj.geometry?.attributes?.d ?? ''));
            if (!commands)
                return [];
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
            const points = parsePointList(String(obj.geometry?.attributes?.points ?? ''));
            if (!points)
                return [];
            return points.map((point, index) => ({
                id: encodeCurveHandleId('poly', obj.id, index),
                objectId: obj.id,
                x: roundCoord(point.x),
                y: roundCoord(point.y),
                kind: 'poly',
            }));
        }
        if (obj.shapeKind === 'line') {
            const attrs = obj.geometry?.attributes ?? {};
            const x1 = Number(attrs.x1);
            const y1 = Number(attrs.y1);
            const x2 = Number(attrs.x2);
            const y2 = Number(attrs.y2);
            if (![x1, y1, x2, y2].every((value) => Number.isFinite(value)))
                return [];
            return [
                { id: encodeCurveHandleId('line', obj.id, 1), objectId: obj.id, x: roundCoord(x1), y: roundCoord(y1), kind: 'line' },
                { id: encodeCurveHandleId('line', obj.id, 2), objectId: obj.id, x: roundCoord(x2), y: roundCoord(y2), kind: 'line' },
            ];
        }
        return [];
    })
        .sort((a, b) => a.x - b.x || a.y - b.y);
}
function buildCurveHandles(objects, selectedIds) {
    const handles = selectedIds.flatMap((objectId) => buildCurveHandlesForSelectedObject(objects, objectId));
    const seen = new Set();
    return handles.filter((handle) => {
        if (seen.has(handle.id))
            return false;
        seen.add(handle.id);
        return true;
    });
}
function findSelectionRootForHandle(objects, selectedIds, handleObjectId) {
    for (const selectedId of selectedIds) {
        if (selectedId === handleObjectId)
            return selectedId;
        const descendants = collectDescendantObjectIds(objects, selectedId);
        if (descendants.includes(handleObjectId))
            return selectedId;
    }
    return selectedIds[0] ?? null;
}
function adjustShapeCurveGeometryNearHandle(obj, anchorX, dx, dy, range) {
    if (!obj || obj.objectType !== 'shape_node')
        return false;
    const attrs = (obj.geometry?.attributes ?? {});
    const sigma = Math.max(28, (range.maxX - range.minX) / 7);
    const weightAt = (x) => {
        if (!Number.isFinite(x) || !Number.isFinite(anchorX))
            return 0;
        const dist = x - anchorX;
        return Math.exp(-(dist * dist) / (2 * sigma * sigma));
    };
    switch (obj.shapeKind) {
        case 'path': {
            const commands = parsePathCommands(String(attrs.d ?? ''));
            if (!commands)
                return false;
            const pairs = collectPathCoordinatePairs(commands);
            if (pairs.length === 0)
                return false;
            for (const pair of pairs) {
                const weight = weightAt(pair.absX);
                commands[pair.commandIndex].values[pair.xParamIndex] += dx * weight;
                commands[pair.commandIndex].values[pair.yParamIndex] += dy * weight;
            }
            attrs.d = serializePathCommands(commands);
            const bbox = computePathBBox(commands);
            if (bbox)
                obj.bbox = bbox;
            return true;
        }
        case 'polyline':
        case 'polygon': {
            const points = parsePointList(String(attrs.points ?? ''));
            if (!points)
                return false;
            for (const point of points) {
                const weight = weightAt(point.x);
                point.x = roundCoord(point.x + dx * weight);
                point.y = roundCoord(point.y + dy * weight);
            }
            attrs.points = serializePointList(points);
            const bbox = unionPointsBBox(points);
            if (bbox)
                obj.bbox = bbox;
            return true;
        }
        case 'line': {
            const x1 = Number(attrs.x1);
            const y1 = Number(attrs.y1);
            const x2 = Number(attrs.x2);
            const y2 = Number(attrs.y2);
            if (![x1, y1, x2, y2].every((value) => Number.isFinite(value)))
                return false;
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
function adjustPointShapeHandle(obj, dx, dy) {
    if (!obj || obj.objectType !== 'shape_node')
        return false;
    const attrs = (obj.geometry?.attributes ?? {});
    if (obj.shapeKind === 'circle') {
        const cx = Number(attrs.cx);
        const cy = Number(attrs.cy);
        const r = Number(attrs.r);
        if (![cx, cy, r].every((value) => Number.isFinite(value)))
            return false;
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
        if (![cx, cy, rx, ry].every((value) => Number.isFinite(value)))
            return false;
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
function makeSource(input) {
    return {
        sourceId: `desktop_${Date.now()}`,
        kind: input.kind,
        path: input.path,
        sha256: 'desktop_generated',
        familyHint: input.familyHint ?? 'unknown',
        importedAt: new Date().toISOString(),
    };
}
class DesktopWorkbench {
    state = null;
    lastHit = null;
    lastProjectPath = null;
    importedSourcePath = null;
    importedSourceKind = null;
    hasProjectMutations = false;
    importDocument(input) {
        this.state = importApi({ path: input.path, content: input.content }, makeSource(input), input.kind === 'html' ? { htmlMode: input.htmlMode ?? 'limited' } : undefined);
        this.lastHit = null;
        this.importedSourcePath = input.path || null;
        this.importedSourceKind = input.kind;
        this.hasProjectMutations = false;
        return this.snapshot();
    }
    importFromFile(path, familyHint = 'unknown', htmlMode = 'limited') {
        const content = (0, fs_1.readFileSync)(path, 'utf8');
        const ext = (0, path_1.extname)(path).toLowerCase();
        const kind = ext === '.html' || ext === '.htm' ? 'html' : 'svg';
        return this.importDocument({ path, content, kind, familyHint, htmlMode });
    }
    saveProjectToFile(path) {
        if (!this.state)
            throw new Error('DesktopWorkbench is not initialized. Call importDocument first.');
        if (!projectApi.saveProject)
            throw new Error('saveProject API is unavailable in current editor-state build.');
        projectApi.saveProject(this.state.project, path);
        this.lastProjectPath = path;
        return this.snapshot();
    }
    loadProjectFromFile(path) {
        if (!projectApi.loadProject)
            throw new Error('loadProject API is unavailable in current editor-state build.');
        const project = projectApi.loadProject(path);
        this.state = (0, index_8.createEditorSession)(project);
        this.lastHit = null;
        this.lastProjectPath = path;
        this.importedSourcePath = null;
        this.importedSourceKind = null;
        this.hasProjectMutations = false;
        return this.snapshot();
    }
    exportSvgToFile(path) {
        if (!this.state)
            throw new Error('DesktopWorkbench is not initialized. Call importDocument first.');
        const artifact = (0, index_2.exportSVG)(this.state.project);
        (0, fs_1.writeFileSync)(path, artifact.content, 'utf8');
        return this.snapshot();
    }
    exportHtmlToFile(path) {
        if (!this.state)
            throw new Error('DesktopWorkbench is not initialized. Call importDocument first.');
        const artifact = (0, index_1.exportHTML)(this.state.project);
        (0, fs_1.writeFileSync)(path, artifact.content, 'utf8');
        return this.snapshot();
    }
    exportPngToFile(path, dpi = 300) {
        if (!this.state)
            throw new Error('DesktopWorkbench is not initialized. Call importDocument first.');
        const artifact = (0, index_2.exportSVG)(this.state.project);
        const normalizedSvg = ensureSvgNamespaces(artifact.content);
        const probe = new resvg_js_1.Resvg(normalizedSvg, {
            font: { loadSystemFonts: true },
            shapeRendering: 2,
            textRendering: 2,
            imageRendering: 0,
        });
        const baseWidth = Math.max(1, Math.round(probe.width));
        const baseHeight = Math.max(1, Math.round(probe.height));
        const longestSide = Math.max(baseWidth, baseHeight, 1);
        const targetLongestSide = Math.min(8192, Math.max(longestSide, 4096));
        const zoom = targetLongestSide / longestSide;
        const rendered = new resvg_js_1.Resvg(normalizedSvg, {
            fitTo: { mode: 'zoom', value: zoom },
            font: { loadSystemFonts: true },
            shapeRendering: 2,
            textRendering: 2,
            imageRendering: 0,
        }).render();
        (0, fs_1.writeFileSync)(path, rendered.asPng());
        return this.snapshot();
    }
    suggestDefaultPngPath() {
        if (!this.importedSourcePath)
            return null;
        const sourceMeta = (0, path_1.parse)(this.importedSourcePath);
        const fileBase = sourceMeta.name && sourceMeta.name.trim().length > 0 ? sourceMeta.name.trim() : 'figure';
        const outputDir = sourceMeta.dir
            ? ((0, path_1.isAbsolute)(this.importedSourcePath) ? sourceMeta.dir : (0, path_1.resolve)(process.cwd(), sourceMeta.dir))
            : process.cwd();
        return (0, path_1.join)(outputDir, `${fileBase}_full.png`);
    }
    previewSvgContent() {
        if (!this.state)
            return '';
        const artifact = (0, index_2.exportSVG)(this.state.project);
        return artifact.content;
    }
    selectById(objectId) {
        if (!this.state)
            throw new Error('DesktopWorkbench is not initialized. Call importDocument first.');
        this.state = (0, index_8.selectObject)(this.state, objectId);
        return this.snapshot();
    }
    selectFirstEditableText() {
        if (!this.state)
            throw new Error('DesktopWorkbench is not initialized. Call importDocument first.');
        const editable = Object.values(this.state.project.project.objects).filter((obj) => (obj.objectType === 'text_node' || obj.objectType === 'html_block') && obj.capabilities.includes('text_edit'));
        const candidate = editable.find((obj) => obj.objectType === 'text_node') ?? editable[0];
        if (!candidate)
            return this.snapshot();
        this.state = (0, index_8.selectObject)(this.state, candidate.id);
        return this.snapshot();
    }
    selectAtPoint(x, y) {
        if (!this.state)
            throw new Error('DesktopWorkbench is not initialized. Call importDocument first.');
        const objects = this.state.project.project.objects;
        const figure = this.state.project.project.figure;
        const best = pickBestObjectAtPoint(objects, x, y, {
            maxDistance: 4,
            figureWidth: Number(figure.width ?? figure.viewBox?.[2] ?? 0),
            figureHeight: Number(figure.height ?? figure.viewBox?.[3] ?? 0),
        });
        if (best) {
            this.state = (0, index_8.selectObject)(this.state, best.id);
            this.lastHit = { objectId: best.id, objectType: best.objectType };
            return this.snapshot();
        }
        const backdropOnly = pickBestObjectAtPoint(objects, x, y, { maxDistance: 4 });
        if (backdropOnly) {
            this.lastHit = null;
            return this.snapshot();
        }
        const hit = (0, index_3.hitTestAtPoint)(this.state.project, x, y);
        if (!hit) {
            this.lastHit = null;
            return this.snapshot();
        }
        this.state = (0, index_8.selectObject)(this.state, hit.objectId);
        this.lastHit = hit;
        return this.snapshot();
    }
    selectTextAtPoint(x, y, maxDistance = 32) {
        if (!this.state)
            throw new Error('DesktopWorkbench is not initialized. Call importDocument first.');
        const objects = this.state.project.project.objects;
        const figure = this.state.project.project.figure;
        const best = pickBestObjectAtPoint(objects, x, y, {
            preferText: true,
            maxDistance: Number.isFinite(maxDistance) ? maxDistance : 32,
            figureWidth: Number(figure.width ?? figure.viewBox?.[2] ?? 0),
            figureHeight: Number(figure.height ?? figure.viewBox?.[3] ?? 0),
        });
        if (!best) {
            return this.snapshot();
        }
        this.state = (0, index_8.selectObject)(this.state, best.id);
        this.lastHit = { objectId: best.id, objectType: best.objectType };
        return this.snapshot();
    }
    moveSelected(dx, dy) {
        if (!this.state)
            throw new Error('DesktopWorkbench is not initialized. Call importDocument first.');
        this.state = (0, index_8.moveSelected)(this.state, dx, dy);
        this.hasProjectMutations = true;
        return this.snapshot();
    }
    adjustSelectedCurve(deltaY) {
        if (!this.state)
            throw new Error('DesktopWorkbench is not initialized. Call importDocument first.');
        if (this.state.policy.readOnly) {
            throw new Error(`Session is read-only (${this.state.policy.reason ?? 'snapshot_policy'}); adjustSelectedCurve is blocked.`);
        }
        if (!Number.isFinite(deltaY) || Math.abs(deltaY) <= 0) {
            return this.snapshot();
        }
        const selectedIds = [...this.state.selection.selectedIds];
        if (selectedIds.length === 0)
            return this.snapshot();
        const nextProject = (0, index_4.pushSnapshot)(this.state.project);
        const nextState = structuredClone(this.state);
        nextState.project = nextProject;
        const objects = nextProject.project.objects;
        let changed = false;
        for (const objectId of selectedIds) {
            const range = collectCurveRange(objects, objectId);
            if (!range)
                continue;
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
    adjustSelectedCurveHandle(handleId, dx, dy) {
        if (!this.state)
            throw new Error('DesktopWorkbench is not initialized. Call importDocument first.');
        if (this.state.policy.readOnly) {
            throw new Error(`Session is read-only (${this.state.policy.reason ?? 'snapshot_policy'}); adjustSelectedCurveHandle is blocked.`);
        }
        if (!handleId || (!Number.isFinite(dx) && !Number.isFinite(dy))) {
            return this.snapshot();
        }
        const nextProject = (0, index_4.pushSnapshot)(this.state.project);
        const nextState = structuredClone(this.state);
        nextState.project = nextProject;
        const objects = nextProject.project.objects;
        const parts = String(handleId).split(':');
        const kind = parts[0] ?? '';
        const targetObjectId = parts[1] ?? '';
        const selectedIds = [...this.state.selection.selectedIds];
        let changed = false;
        if (kind === 'point') {
            const pointObject = objects[targetObjectId];
            const pointCenter = shapeCenter(pointObject);
            if (!pointCenter)
                throw new Error('Invalid curve handle target');
            changed = adjustPointShapeHandle(pointObject, dx, dy) || changed;
            const selectionRootId = findSelectionRootForHandle(objects, selectedIds, targetObjectId);
            if (selectionRootId) {
                const range = collectCurveRange(objects, selectionRootId);
                if (range) {
                    for (const objectId of collectDescendantObjectIds(objects, selectionRootId)) {
                        const child = objects[objectId];
                        if (!child || child.id === targetObjectId)
                            continue;
                        if (child.objectType !== 'shape_node')
                            continue;
                        if (!['path', 'polyline', 'polygon', 'line'].includes(String(child.shapeKind)))
                            continue;
                        changed = adjustShapeCurveGeometryNearHandle(child, pointCenter.x, dx, dy, range) || changed;
                    }
                    recomputeCompositeBBox(objects, selectionRootId);
                }
            }
        }
        else if (kind === 'path') {
            const commandIndex = Number(parts[2]);
            const xParamIndex = Number(parts[3]);
            const yParamIndex = Number(parts[4]);
            const obj = objects[targetObjectId];
            const attrs = (obj?.geometry?.attributes ?? {});
            const commands = parsePathCommands(String(attrs.d ?? ''));
            if (!obj || obj.objectType !== 'shape_node' || !commands) {
                throw new Error('Invalid path handle target');
            }
            const entry = commands[commandIndex];
            if (!entry)
                throw new Error('Missing path command for handle');
            entry.values[xParamIndex] += dx;
            entry.values[yParamIndex] += dy;
            attrs.d = serializePathCommands(commands);
            const bbox = computePathBBox(commands);
            if (bbox)
                obj.bbox = bbox;
            const selectionRootId = findSelectionRootForHandle(objects, selectedIds, targetObjectId);
            if (selectionRootId)
                recomputeCompositeBBox(objects, selectionRootId);
            changed = true;
        }
        else if (kind === 'poly') {
            const pointIndex = Number(parts[2]);
            const obj = objects[targetObjectId];
            const attrs = (obj?.geometry?.attributes ?? {});
            const points = parsePointList(String(attrs.points ?? ''));
            if (!obj || obj.objectType !== 'shape_node' || !points || !points[pointIndex]) {
                throw new Error('Invalid poly handle target');
            }
            points[pointIndex].x = roundCoord(points[pointIndex].x + dx);
            points[pointIndex].y = roundCoord(points[pointIndex].y + dy);
            attrs.points = serializePointList(points);
            const bbox = unionPointsBBox(points);
            if (bbox)
                obj.bbox = bbox;
            const selectionRootId = findSelectionRootForHandle(objects, selectedIds, targetObjectId);
            if (selectionRootId)
                recomputeCompositeBBox(objects, selectionRootId);
            changed = true;
        }
        else if (kind === 'line') {
            const endpoint = Number(parts[2]);
            const obj = objects[targetObjectId];
            const attrs = (obj?.geometry?.attributes ?? {});
            if (!obj || obj.objectType !== 'shape_node')
                throw new Error('Invalid line handle target');
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
            if (selectionRootId)
                recomputeCompositeBBox(objects, selectionRootId);
            changed = true;
        }
        if (!changed) {
            throw new Error('Selected curve handle could not be adjusted.');
        }
        this.state = nextState;
        this.hasProjectMutations = true;
        return this.snapshot();
    }
    multiSelectByIds(objectIds) {
        if (!this.state)
            throw new Error('DesktopWorkbench is not initialized. Call importDocument first.');
        this.state = (0, index_8.multiSelectObjects)(this.state, objectIds);
        return this.snapshot();
    }
    editSelectedText(content) {
        if (!this.state)
            throw new Error('DesktopWorkbench is not initialized. Call importDocument first.');
        const selectedId = this.state.selection.selectedIds[0];
        if (!selectedId)
            return this.snapshot();
        this.state = (0, index_8.editSelectedText)(this.state, content);
        this.hasProjectMutations = true;
        return this.snapshot();
    }
    deleteSelected() {
        if (!this.state)
            throw new Error('DesktopWorkbench is not initialized. Call importDocument first.');
        this.state = (0, index_8.deleteSelected)(this.state);
        this.hasProjectMutations = true;
        return this.snapshot();
    }
    promoteSelection(role, reason = 'desktop_manual_promote') {
        if (!this.state)
            throw new Error('DesktopWorkbench is not initialized. Call importDocument first.');
        this.state = (0, index_8.promoteSelected)(this.state, role, reason);
        this.hasProjectMutations = true;
        return this.snapshot();
    }
    undo() {
        if (!this.state)
            throw new Error('DesktopWorkbench is not initialized. Call importDocument first.');
        const project = (0, index_5.undo)(this.state.project);
        const selectedIds = this.state.selection.selectedIds.filter((id) => Boolean(project.project.objects[id]));
        this.state = {
            ...this.state,
            project,
            selection: { ...this.state.selection, selectedIds },
        };
        this.hasProjectMutations = true;
        return this.snapshot();
    }
    redo() {
        if (!this.state)
            throw new Error('DesktopWorkbench is not initialized. Call importDocument first.');
        const project = (0, index_5.redo)(this.state.project);
        const selectedIds = this.state.selection.selectedIds.filter((id) => Boolean(project.project.objects[id]));
        this.state = {
            ...this.state,
            project,
            selection: { ...this.state.selection, selectedIds },
        };
        this.hasProjectMutations = true;
        return this.snapshot();
    }
    addTextAtPoint(x, y, content) {
        if (!this.state)
            throw new Error('DesktopWorkbench is not initialized. Call importDocument first.');
        if (this.state.policy.readOnly) {
            throw new Error(`Session is read-only (${this.state.policy.reason ?? 'snapshot_policy'}); addTextAtPoint is blocked.`);
        }
        const text = String(content ?? '').trim();
        if (!text) {
            return this.snapshot();
        }
        const nextProject = (0, index_4.pushSnapshot)(this.state.project);
        const nextState = structuredClone(this.state);
        nextState.project = nextProject;
        const originSource = nextProject.project.originalSources[0] ?? null;
        const originFileKind = this.importedSourceKind ??
            (originSource?.kind === 'svg' || originSource?.kind === 'html' ? originSource.kind : 'native');
        const id = `obj_manual_text_${Date.now()}`;
        const fontSize = 16;
        const width = Math.max(fontSize * 0.8, fontSize * 0.58 * Math.max(1, text.length));
        const preferredFontFamily = pickPreferredDocumentFontFamily(nextProject.project.objects);
        const node = {
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
    linkedStatus() {
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
    hasLoadedProjectFile() {
        return this.lastProjectPath !== null;
    }
    snapshot() {
        if (!this.state) {
            return {
                objectTree: [],
                canvas: { selectedIds: [], overlays: [], curveHandles: [], lastHit: null },
                properties: null,
                importReport: null,
                warnings: [],
            };
        }
        const selectedId = this.state.selection.selectedIds[0] ?? null;
        return {
            objectTree: (0, index_9.buildTreeViewModel)(this.state.project),
            canvas: {
                selectedIds: [...this.state.selection.selectedIds],
                overlays: (0, index_3.buildSelectionOverlay)(this.state.project, this.state.selection.selectedIds),
                curveHandles: buildCurveHandles(this.state.project.project.objects, this.state.selection.selectedIds),
                lastHit: this.lastHit,
            },
            properties: selectedId ? (0, index_7.buildPropertyViewModel)(this.state.project, selectedId) : null,
            importReport: (0, index_6.buildLatestImportReport)(this.state.project),
            warnings: [...this.state.warnings],
        };
    }
}
exports.DesktopWorkbench = DesktopWorkbench;
function createDesktopWorkbench() {
    return new DesktopWorkbench();
}
