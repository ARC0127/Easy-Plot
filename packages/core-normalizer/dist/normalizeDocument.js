"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeDocument = normalizeDocument;
const basicNodeKinds_1 = require("./classify/basicNodeKinds");
const bbox_1 = require("./geometry/bbox");
const collectInlineStyles_1 = require("./style/collectInlineStyles");
const normalizeTransform_1 = require("./transform/normalizeTransform");
const INHERITABLE_STYLE_KEYS = new Set([
    'font-family',
    'font-size',
    'font-style',
    'font-weight',
    'fill',
    'stroke',
    'stroke-width',
    'opacity',
    'text-anchor',
    'visibility',
    'display',
]);
function normalizeTagName(tagName) {
    const lower = tagName.toLowerCase();
    if (lower.includes('|'))
        return lower.split('|').pop() ?? lower;
    if (lower.includes(':'))
        return lower.split(':').pop() ?? lower;
    return lower;
}
function getLocalTagName(node) {
    const ext = node;
    return normalizeTagName(ext.localTagName ?? node.tagName);
}
function getNamespacePrefix(node) {
    const ext = node;
    return ext.namespacePrefix ?? null;
}
function getNamespaceUri(node) {
    const ext = node;
    return ext.namespaceUri ?? null;
}
function parseStyleDeclarationBlock(raw) {
    const out = {};
    const normalized = raw.replace(/\/\*[\s\S]*?\*\//g, '');
    for (const [key, value] of Object.entries((0, collectInlineStyles_1.collectInlineStyles)(normalized.replace(/\n/g, ';')))) {
        if (!key)
            continue;
        const trimmed = value.trim();
        const important = /\s*!important\s*$/i.test(trimmed);
        out[key.trim().toLowerCase()] = {
            value: trimmed.replace(/\s*!important\s*$/i, '').trim(),
            important,
        };
    }
    return out;
}
function splitSelectorList(rawSelectors) {
    const selectors = [];
    let quote = null;
    let bracketDepth = 0;
    let parenDepth = 0;
    let chunk = '';
    const flush = () => {
        const trimmed = chunk.trim();
        if (trimmed)
            selectors.push(trimmed);
        chunk = '';
    };
    for (let i = 0; i < rawSelectors.length; i += 1) {
        const ch = rawSelectors[i];
        if (quote) {
            if (ch === quote && rawSelectors[i - 1] !== '\\')
                quote = null;
            chunk += ch;
            continue;
        }
        if (ch === '"' || ch === "'") {
            quote = ch;
            chunk += ch;
            continue;
        }
        if (ch === '[') {
            bracketDepth += 1;
            chunk += ch;
            continue;
        }
        if (ch === ']' && bracketDepth > 0) {
            bracketDepth -= 1;
            chunk += ch;
            continue;
        }
        if (ch === '(') {
            parenDepth += 1;
            chunk += ch;
            continue;
        }
        if (ch === ')' && parenDepth > 0) {
            parenDepth -= 1;
            chunk += ch;
            continue;
        }
        if (ch === ',' && bracketDepth === 0 && parenDepth === 0) {
            flush();
            continue;
        }
        chunk += ch;
    }
    flush();
    return selectors;
}
function parseStyleRules(parsed) {
    const rules = [];
    let order = 0;
    const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
    for (const node of Object.values(parsed.nodes)) {
        if (getLocalTagName(node) !== 'style' || !node.textContent)
            continue;
        const styleText = node.textContent.replace(/\/\*[\s\S]*?\*\//g, '');
        let match = null;
        while ((match = ruleRe.exec(styleText)) !== null) {
            const rawSelectors = match[1];
            const rawDeclarations = match[2];
            const declarations = parseStyleDeclarationBlock(rawDeclarations);
            if (Object.keys(declarations).length === 0)
                continue;
            const selectors = splitSelectorList(rawSelectors);
            for (const selector of selectors) {
                const specificity = computeSelectorSpecificity(selector);
                rules.push({ selector, declarations, specificity, order });
                order += 1;
            }
        }
    }
    return rules;
}
function tokenizeSelector(selector) {
    const tokens = [];
    let buffer = '';
    let quote = null;
    let bracketDepth = 0;
    let parenDepth = 0;
    const flushBuffer = () => {
        const trimmed = buffer.trim();
        if (trimmed)
            tokens.push(trimmed);
        buffer = '';
    };
    for (let i = 0; i < selector.length; i += 1) {
        const ch = selector[i];
        if (quote) {
            if (ch === quote && selector[i - 1] !== '\\')
                quote = null;
            buffer += ch;
            continue;
        }
        if (ch === '"' || ch === "'") {
            quote = ch;
            buffer += ch;
            continue;
        }
        if (ch === '[') {
            bracketDepth += 1;
            buffer += ch;
            continue;
        }
        if (ch === ']' && bracketDepth > 0) {
            bracketDepth -= 1;
            buffer += ch;
            continue;
        }
        if (ch === '(') {
            parenDepth += 1;
            buffer += ch;
            continue;
        }
        if (ch === ')' && parenDepth > 0) {
            parenDepth -= 1;
            buffer += ch;
            continue;
        }
        if (bracketDepth === 0 && parenDepth === 0 && (ch === '>' || ch === '+' || ch === '~')) {
            flushBuffer();
            tokens.push(ch);
            continue;
        }
        if (bracketDepth === 0 && parenDepth === 0 && /\s/.test(ch)) {
            flushBuffer();
            if (tokens.length > 0 && ![' ', '>', '+', '~'].includes(tokens[tokens.length - 1])) {
                tokens.push(' ');
            }
            continue;
        }
        buffer += ch;
    }
    flushBuffer();
    const normalized = [];
    for (let i = 0; i < tokens.length; i += 1) {
        const token = tokens[i];
        if (token === ' ') {
            const prev = normalized[normalized.length - 1];
            const next = tokens[i + 1];
            if (!prev || [' ', '>', '+', '~'].includes(prev))
                continue;
            if (!next || [' ', '>', '+', '~'].includes(next))
                continue;
        }
        normalized.push(token);
    }
    while (normalized.length > 0 && [' ', '>', '+', '~'].includes(normalized[0]))
        normalized.shift();
    while (normalized.length > 0 && [' ', '>', '+', '~'].includes(normalized[normalized.length - 1]))
        normalized.pop();
    return normalized;
}
function parseSelector(selector) {
    const tokens = tokenizeSelector(selector.trim());
    if (tokens.length === 0)
        return null;
    const selectors = [];
    const combinators = [];
    let expectSelector = true;
    for (const token of tokens) {
        if (token === ' ' || token === '>' || token === '+' || token === '~') {
            if (expectSelector)
                return null;
            combinators.push(token === ' '
                ? 'descendant'
                : token === '>'
                    ? 'child'
                    : token === '+'
                        ? 'adjacent'
                        : 'sibling');
            expectSelector = true;
            continue;
        }
        selectors.push(token);
        expectSelector = false;
    }
    if (expectSelector)
        return null;
    if (combinators.length !== selectors.length - 1)
        return null;
    return { selectors, combinators };
}
function computeSelectorSpecificity(selector) {
    const parsed = parseSelector(selector);
    const parts = parsed ? parsed.selectors : selector.trim().split(/\s+/).filter(Boolean);
    let idCount = 0;
    let classAndAttrCount = 0;
    let tagCount = 0;
    for (const token of parts) {
        const tokenWithoutPseudo = token.replace(/:{1,2}[A-Za-z0-9_-]+(?:\([^)]*\))?/g, '');
        idCount += (token.match(/#/g) ?? []).length;
        classAndAttrCount += (token.match(/\./g) ?? []).length;
        classAndAttrCount += (token.match(/\[[^\]]+\]/g) ?? []).length;
        classAndAttrCount += (token.match(/:[A-Za-z0-9_-]+(?:\([^)]*\))?/g) ?? []).length;
        const stripped = tokenWithoutPseudo
            .replace(/\[[^\]]+\]/g, '')
            .replace(/#[A-Za-z0-9_-]+/g, '')
            .replace(/\.[A-Za-z0-9_-]+/g, '');
        if (stripped && stripped !== '*')
            tagCount += 1;
    }
    return idCount * 100 + classAndAttrCount * 10 + tagCount;
}
function parseToken(token) {
    const attrs = [];
    const attrMatches = token.match(/\[[^\]]+\]/g) ?? [];
    let work = token;
    for (const attrToken of attrMatches) {
        work = work.replace(attrToken, '');
        const body = attrToken.slice(1, -1).trim();
        const opMatch = body.match(/^([A-Za-z0-9_:\-]+)\s*(~=|\|=|\^=|\$=|\*=|=)?\s*(.*)$/);
        if (!opMatch)
            continue;
        const key = opMatch[1].trim().toLowerCase();
        const op = (opMatch[2] ?? 'exists');
        const rawValue = op === 'exists' ? '' : opMatch[3].trim();
        const value = op === 'exists' ? null : rawValue.replace(/^['"]|['"]$/g, '');
        attrs.push({ key, operator: op, value });
    }
    const pseudo = [];
    const pseudoRe = /:{1,2}([A-Za-z0-9_-]+)(?:\(([^)]*)\))?/g;
    let pseudoMatch = null;
    while ((pseudoMatch = pseudoRe.exec(work)) !== null) {
        pseudo.push({ name: pseudoMatch[1].toLowerCase(), arg: pseudoMatch[2]?.trim() ?? null });
    }
    work = work.replace(/:{1,2}[A-Za-z0-9_-]+(?:\([^)]*\))?/g, '');
    const idMatch = work.match(/#([A-Za-z0-9_-]+)/);
    const classMatches = Array.from(work.matchAll(/\.([A-Za-z0-9_-]+)/g)).map((m) => m[1]);
    const base = work
        .replace(/#[A-Za-z0-9_-]+/g, '')
        .replace(/\.[A-Za-z0-9_-]+/g, '')
        .trim();
    return {
        tagName: base && base !== '*' ? normalizeTagName(base) : null,
        id: idMatch ? idMatch[1].toLowerCase() : null,
        classes: classMatches.map((value) => value.toLowerCase()),
        attrs,
        pseudo,
    };
}
function matchesNthExpression(rawExpr, position) {
    const expr = rawExpr.replace(/\s+/g, '').toLowerCase();
    if (!expr)
        return false;
    if (expr === 'odd')
        return position % 2 === 1;
    if (expr === 'even')
        return position % 2 === 0;
    if (/^[+-]?\d+$/.test(expr)) {
        const n = Number.parseInt(expr, 10);
        return Number.isFinite(n) && position === n;
    }
    const ab = expr.match(/^([+-]?\d*)n([+-]\d+)?$/);
    if (!ab)
        return false;
    let aRaw = ab[1];
    const bRaw = ab[2];
    if (aRaw === '' || aRaw === '+')
        aRaw = '1';
    if (aRaw === '-')
        aRaw = '-1';
    const a = Number.parseInt(aRaw, 10);
    const b = bRaw ? Number.parseInt(bRaw, 10) : 0;
    if (!Number.isFinite(a) || !Number.isFinite(b))
        return false;
    if (a === 0)
        return position === b;
    const n = (position - b) / a;
    return Number.isFinite(n) && Number.isInteger(n) && n >= 0;
}
function isSimpleSelectorExpression(selector) {
    const parsed = parseSelector(selector);
    return Boolean(parsed && parsed.selectors.length === 1 && parsed.combinators.length === 0);
}
function matchesLang(node, arg, allNodes) {
    const target = arg.trim().toLowerCase();
    if (!target)
        return false;
    let cursor = node;
    while (cursor) {
        const langRaw = String(cursor.attributes.lang ?? '').trim().toLowerCase();
        if (langRaw && (langRaw === target || langRaw.startsWith(`${target}-`))) {
            return true;
        }
        cursor = cursor.parentNodeId ? allNodes[cursor.parentNodeId] : undefined;
    }
    return false;
}
function tokenMatches(node, token, allNodes) {
    const parsed = parseToken(token);
    const tag = getLocalTagName(node);
    const id = String(node.attributes.id ?? '').toLowerCase();
    const classList = String(node.attributes.class ?? '')
        .split(/\s+/)
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);
    if (parsed.tagName && parsed.tagName !== tag)
        return false;
    if (parsed.id && parsed.id !== id)
        return false;
    for (const className of parsed.classes) {
        if (!classList.includes(className))
            return false;
    }
    for (const attr of parsed.attrs) {
        const hit = Object.entries(node.attributes).find(([key]) => key.toLowerCase() === attr.key);
        const actual = hit ? String(hit[1]) : null;
        const actualLower = actual?.toLowerCase() ?? null;
        const expected = attr.value?.toLowerCase() ?? null;
        if (attr.operator === 'exists') {
            if (!hit)
                return false;
            continue;
        }
        if (!hit || expected === null)
            return false;
        const actualValue = actualLower ?? '';
        if (attr.operator === '=' && actualValue !== expected)
            return false;
        if (attr.operator === '~=' && !actualValue.split(/\s+/).includes(expected))
            return false;
        if (attr.operator === '|=' && !(actualValue === expected || actualValue.startsWith(`${expected}-`)))
            return false;
        if (attr.operator === '^=' && !actualValue.startsWith(expected))
            return false;
        if (attr.operator === '$=' && !actualValue.endsWith(expected))
            return false;
        if (attr.operator === '*=' && !actualValue.includes(expected))
            return false;
    }
    for (const pseudo of parsed.pseudo) {
        if (pseudo.name.startsWith(':'))
            continue;
        const parent = node.parentNodeId ? allNodes[node.parentNodeId] : undefined;
        const siblings = parent ? parent.children.map((id) => allNodes[id]).filter(Boolean) : [node];
        const selfIndex = siblings.findIndex((item) => item.nodeId === node.nodeId);
        if (selfIndex === -1)
            return false;
        if (pseudo.name === 'root') {
            if (node.parentNodeId !== null)
                return false;
            continue;
        }
        if (pseudo.name === 'first-child') {
            if (selfIndex !== 0)
                return false;
            continue;
        }
        if (pseudo.name === 'last-child') {
            if (selfIndex !== siblings.length - 1)
                return false;
            continue;
        }
        if (pseudo.name === 'only-child') {
            if (siblings.length !== 1)
                return false;
            continue;
        }
        if (pseudo.name === 'empty') {
            const text = (node.textContent ?? '').trim();
            if (node.children.length > 0 || text.length > 0)
                return false;
            continue;
        }
        if (pseudo.name === 'nth-child') {
            const pos = selfIndex + 1;
            const arg = (pseudo.arg ?? '').toLowerCase();
            if (!matchesNthExpression(arg, pos))
                return false;
            continue;
        }
        if (pseudo.name === 'nth-last-child') {
            const pos = siblings.length - selfIndex;
            const arg = (pseudo.arg ?? '').toLowerCase();
            if (!matchesNthExpression(arg, pos))
                return false;
            continue;
        }
        if (pseudo.name === 'first-of-type' || pseudo.name === 'last-of-type' || pseudo.name === 'only-of-type') {
            const sameType = siblings.filter((item) => getLocalTagName(item) === tag);
            const typeIndex = sameType.findIndex((item) => item.nodeId === node.nodeId);
            if (typeIndex === -1)
                return false;
            if (pseudo.name === 'first-of-type' && typeIndex !== 0)
                return false;
            if (pseudo.name === 'last-of-type' && typeIndex !== sameType.length - 1)
                return false;
            if (pseudo.name === 'only-of-type' && sameType.length !== 1)
                return false;
            continue;
        }
        if (pseudo.name === 'nth-of-type' || pseudo.name === 'nth-last-of-type') {
            const sameType = siblings.filter((item) => getLocalTagName(item) === tag);
            const typeIndex = sameType.findIndex((item) => item.nodeId === node.nodeId);
            if (typeIndex === -1)
                return false;
            const pos = pseudo.name === 'nth-of-type' ? typeIndex + 1 : sameType.length - typeIndex;
            const arg = (pseudo.arg ?? '').toLowerCase();
            if (!matchesNthExpression(arg, pos))
                return false;
            continue;
        }
        if (pseudo.name === 'lang') {
            if (!matchesLang(node, pseudo.arg ?? '', allNodes))
                return false;
            continue;
        }
        if (pseudo.name === 'is' || pseudo.name === 'where') {
            const selectors = splitSelectorList(pseudo.arg ?? '').filter(isSimpleSelectorExpression);
            if (selectors.length === 0)
                return false;
            if (!selectors.some((selector) => tokenMatches(node, selector, allNodes)))
                return false;
            continue;
        }
        if (pseudo.name === 'not') {
            const selectors = splitSelectorList(pseudo.arg ?? '').filter(isSimpleSelectorExpression);
            if (selectors.length === 0)
                return false;
            if (selectors.some((selector) => tokenMatches(node, selector, allNodes)))
                return false;
            continue;
        }
        return false;
    }
    return true;
}
function selectorMatches(node, selector, allNodes) {
    const parsed = parseSelector(selector);
    if (!parsed || parsed.selectors.length === 0)
        return false;
    const getPreviousSibling = (currentNode) => {
        if (!currentNode.parentNodeId)
            return undefined;
        const parent = allNodes[currentNode.parentNodeId];
        if (!parent)
            return undefined;
        const index = parent.children.indexOf(currentNode.nodeId);
        if (index <= 0)
            return undefined;
        const siblingId = parent.children[index - 1];
        return allNodes[siblingId];
    };
    let current = node;
    const { selectors, combinators } = parsed;
    if (!current || !tokenMatches(current, selectors[selectors.length - 1], allNodes))
        return false;
    for (let i = selectors.length - 2; i >= 0; i -= 1) {
        const needed = selectors[i];
        const combinator = combinators[i];
        if (!current)
            return false;
        if (combinator === 'child') {
            const parent = current.parentNodeId ? allNodes[current.parentNodeId] : undefined;
            if (!parent || !tokenMatches(parent, needed, allNodes))
                return false;
            current = parent;
            continue;
        }
        if (combinator === 'adjacent') {
            const sibling = getPreviousSibling(current);
            if (!sibling || !tokenMatches(sibling, needed, allNodes))
                return false;
            current = sibling;
            continue;
        }
        if (combinator === 'sibling') {
            let sibling = getPreviousSibling(current);
            let matched;
            while (sibling) {
                if (tokenMatches(sibling, needed, allNodes)) {
                    matched = sibling;
                    break;
                }
                sibling = getPreviousSibling(sibling);
            }
            if (!matched)
                return false;
            current = matched;
            continue;
        }
        let ancestor = current.parentNodeId ? allNodes[current.parentNodeId] : undefined;
        let found = false;
        while (ancestor) {
            if (tokenMatches(ancestor, needed, allNodes)) {
                current = ancestor;
                found = true;
                break;
            }
            ancestor = ancestor.parentNodeId ? allNodes[ancestor.parentNodeId] : undefined;
        }
        if (!found)
            return false;
    }
    return true;
}
function collectPresentationStyles(attributes) {
    const presentationKeys = [
        ['fill', 'fill'],
        ['fill-opacity', 'fill-opacity'],
        ['stroke', 'stroke'],
        ['stroke-width', 'stroke-width'],
        ['stroke-opacity', 'stroke-opacity'],
        ['stroke-dasharray', 'stroke-dasharray'],
        ['font-family', 'font-family'],
        ['font-size', 'font-size'],
        ['font-style', 'font-style'],
        ['font-weight', 'font-weight'],
        ['opacity', 'opacity'],
        ['display', 'display'],
        ['visibility', 'visibility'],
        ['text-anchor', 'text-anchor'],
    ];
    const styles = {};
    for (const [attr, key] of presentationKeys) {
        if (attributes[attr] !== undefined)
            styles[key] = attributes[attr];
    }
    return styles;
}
function applyMatrixToPoint(x, y, matrix) {
    const [a, b, c, d, e, f] = matrix;
    return [a * x + c * y + e, b * x + d * y + f];
}
function multiplyMatrices(a, b) {
    const [a1, b1, c1, d1, e1, f1] = a;
    const [a2, b2, c2, d2, e2, f2] = b;
    return [
        a1 * a2 + c1 * b2,
        b1 * a2 + d1 * b2,
        a1 * c2 + c1 * d2,
        b1 * c2 + d1 * d2,
        a1 * e2 + c1 * f2 + e1,
        b1 * e2 + d1 * f2 + f1,
    ];
}
function applyTransformToBBox(bbox, matrix) {
    if (!bbox || !matrix)
        return bbox;
    const corners = [
        [bbox.x, bbox.y],
        [bbox.x + bbox.w, bbox.y],
        [bbox.x, bbox.y + bbox.h],
        [bbox.x + bbox.w, bbox.y + bbox.h],
    ].map(([x, y]) => applyMatrixToPoint(x, y, matrix));
    const xs = corners.map(([x]) => x);
    const ys = corners.map(([, y]) => y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}
function intersectBBoxes(a, b) {
    if (!a || !b)
        return a ?? b;
    const x1 = Math.max(a.x, b.x);
    const y1 = Math.max(a.y, b.y);
    const x2 = Math.min(a.x + a.w, b.x + b.w);
    const y2 = Math.min(a.y + a.h, b.y + b.h);
    if (x2 < x1 || y2 < y1)
        return { x: x1, y: y1, w: 0, h: 0 };
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}
function resolveUseReferenceBBox(parsedNode, parsed, baseBBox) {
    if (getLocalTagName(parsedNode) !== 'use')
        return baseBBox;
    const hrefRaw = parsedNode.attributes.href ?? parsedNode.attributes['xlink:href'] ?? '';
    if (!hrefRaw.startsWith('#'))
        return baseBBox;
    const targetId = hrefRaw.slice(1);
    const target = Object.values(parsed.nodes).find((node) => String(node.attributes.id ?? '') === targetId);
    if (!target)
        return baseBBox;
    const targetBBox = (0, bbox_1.parseBBox)(target.tagName, getLocalTagName(target), target.attributes);
    if (!targetBBox)
        return baseBBox;
    const x = Number(parsedNode.attributes.x ?? 0);
    const y = Number(parsedNode.attributes.y ?? 0);
    const w = Number(parsedNode.attributes.width ?? targetBBox.w);
    const h = Number(parsedNode.attributes.height ?? targetBBox.h);
    return {
        x: Number.isFinite(x) ? x : targetBBox.x,
        y: Number.isFinite(y) ? y : targetBBox.y,
        w: Number.isFinite(w) ? w : targetBBox.w,
        h: Number.isFinite(h) ? h : targetBBox.h,
    };
}
function collectSpecialRegionBBox(parsed, bboxes, localTag) {
    const out = {};
    for (const node of Object.values(parsed.nodes)) {
        if (getLocalTagName(node) !== localTag)
            continue;
        const nodeId = String(node.attributes.id ?? '');
        if (!nodeId)
            continue;
        const childBoxes = node.children
            .map((childId) => bboxes[childId])
            .filter((bbox) => Boolean(bbox));
        if (childBoxes.length === 0)
            continue;
        let merged = childBoxes[0];
        for (let i = 1; i < childBoxes.length; i += 1) {
            const b = childBoxes[i];
            const minX = Math.min(merged.x, b.x);
            const minY = Math.min(merged.y, b.y);
            const maxX = Math.max(merged.x + merged.w, b.x + b.w);
            const maxY = Math.max(merged.y + merged.h, b.y + b.h);
            merged = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
        }
        out[nodeId] = merged;
    }
    return out;
}
function getUrlRefId(value) {
    if (!value)
        return null;
    const match = value.match(/url\(\s*#([^)]+)\s*\)/i);
    return match ? match[1].trim() : null;
}
function parseStyleValue(raw) {
    const trimmed = raw.trim();
    const important = /\s*!important\s*$/i.test(trimmed);
    return {
        value: trimmed.replace(/\s*!important\s*$/i, '').trim(),
        important,
    };
}
function applyStyleEntry(merged, importance, key, entry) {
    if (!key || !entry.value)
        return;
    if (entry.important) {
        merged[key] = entry.value;
        importance[key] = true;
        return;
    }
    if (importance[key])
        return;
    merged[key] = entry.value;
    importance[key] = false;
}
function findMatchingParen(input, openParenIndex) {
    let depth = 0;
    let quote = null;
    for (let i = openParenIndex; i < input.length; i += 1) {
        const ch = input[i];
        if (quote) {
            if (ch === quote && input[i - 1] !== '\\')
                quote = null;
            continue;
        }
        if (ch === '"' || ch === "'") {
            quote = ch;
            continue;
        }
        if (ch === '(') {
            depth += 1;
            continue;
        }
        if (ch === ')') {
            depth -= 1;
            if (depth === 0)
                return i;
            continue;
        }
    }
    return -1;
}
function splitVarArguments(raw) {
    let depth = 0;
    let quote = null;
    for (let i = 0; i < raw.length; i += 1) {
        const ch = raw[i];
        if (quote) {
            if (ch === quote && raw[i - 1] !== '\\')
                quote = null;
            continue;
        }
        if (ch === '"' || ch === "'") {
            quote = ch;
            continue;
        }
        if (ch === '(') {
            depth += 1;
            continue;
        }
        if (ch === ')' && depth > 0) {
            depth -= 1;
            continue;
        }
        if (ch === ',' && depth === 0) {
            return {
                name: raw.slice(0, i).trim(),
                fallback: raw.slice(i + 1).trim(),
            };
        }
    }
    return {
        name: raw.trim(),
        fallback: null,
    };
}
function resolveCssVarValue(rawValue, customProps, stack = new Set(), depth = 0) {
    if (!rawValue || depth > 12 || !rawValue.includes('var('))
        return rawValue;
    let cursor = 0;
    let output = '';
    while (cursor < rawValue.length) {
        const start = rawValue.indexOf('var(', cursor);
        if (start === -1) {
            output += rawValue.slice(cursor);
            break;
        }
        output += rawValue.slice(cursor, start);
        const openParenIndex = start + 3;
        const closeParenIndex = findMatchingParen(rawValue, openParenIndex);
        if (closeParenIndex === -1) {
            output += rawValue.slice(start);
            break;
        }
        const body = rawValue.slice(openParenIndex + 1, closeParenIndex);
        const { name, fallback } = splitVarArguments(body);
        const varName = name.trim();
        let replacement = '';
        if (/^--[A-Za-z0-9_-]+$/.test(varName)) {
            if (stack.has(varName)) {
                replacement = fallback ? resolveCssVarValue(fallback, customProps, new Set(stack), depth + 1) : '';
            }
            else if (customProps[varName] !== undefined) {
                const nextStack = new Set(stack);
                nextStack.add(varName);
                replacement = resolveCssVarValue(customProps[varName], customProps, nextStack, depth + 1);
            }
            else {
                replacement = fallback ? resolveCssVarValue(fallback, customProps, new Set(stack), depth + 1) : '';
            }
        }
        else {
            replacement = fallback ? resolveCssVarValue(fallback, customProps, new Set(stack), depth + 1) : '';
        }
        output += replacement;
        cursor = closeParenIndex + 1;
    }
    if (output.includes('var(') && output !== rawValue) {
        return resolveCssVarValue(output, customProps, new Set(stack), depth + 1);
    }
    return output;
}
function normalizeDocument(parsed) {
    const parserMetadata = parsed.parseMetadata;
    const styleRules = parseStyleRules(parsed);
    const resolvedStyleCache = {};
    const resolvedCustomPropCache = {};
    const resolveCascadeForNode = (nodeId) => {
        if (resolvedStyleCache[nodeId] && resolvedCustomPropCache[nodeId])
            return;
        const node = parsed.nodes[nodeId];
        if (!node) {
            resolvedStyleCache[nodeId] = {};
            resolvedCustomPropCache[nodeId] = {};
            return;
        }
        const parentStyles = node.parentNodeId ? resolveStylesForNode(node.parentNodeId) : {};
        const parentCustomProps = node.parentNodeId ? resolveCustomPropsForNode(node.parentNodeId) : {};
        const inheritedStyles = Object.fromEntries(Object.entries(parentStyles).filter(([key]) => INHERITABLE_STYLE_KEYS.has(key)));
        const matched = styleRules
            .filter((rule) => selectorMatches(node, rule.selector, parsed.nodes))
            .sort((a, b) => (a.specificity === b.specificity ? a.order - b.order : a.specificity - b.specificity));
        const mergedStyles = {};
        const styleImportance = {};
        const mergedCustomProps = { ...parentCustomProps };
        const customImportance = {};
        for (const key of Object.keys(mergedCustomProps)) {
            customImportance[key] = false;
        }
        for (const [key, value] of Object.entries(inheritedStyles)) {
            applyStyleEntry(mergedStyles, styleImportance, key, { value, important: false });
        }
        const applyDeclaration = (key, entry) => {
            const normalizedKey = key.toLowerCase();
            if (!normalizedKey)
                return;
            if (normalizedKey.startsWith('--')) {
                applyStyleEntry(mergedCustomProps, customImportance, normalizedKey, entry);
            }
            else {
                applyStyleEntry(mergedStyles, styleImportance, normalizedKey, entry);
            }
        };
        for (const rule of matched) {
            for (const [key, entry] of Object.entries(rule.declarations)) {
                applyDeclaration(key, entry);
            }
        }
        const presentationStyles = collectPresentationStyles(node.attributes);
        for (const [key, value] of Object.entries(presentationStyles)) {
            applyDeclaration(key, parseStyleValue(value));
        }
        const inlineStyles = (0, collectInlineStyles_1.collectInlineStyles)(node.attributes.style);
        for (const [key, value] of Object.entries(inlineStyles)) {
            applyDeclaration(key, parseStyleValue(value));
        }
        const resolvedStyles = {};
        for (const [key, rawValue] of Object.entries(mergedStyles)) {
            const resolved = resolveCssVarValue(rawValue, mergedCustomProps).trim();
            if (!resolved)
                continue;
            resolvedStyles[key] = resolved;
        }
        resolvedStyleCache[nodeId] = resolvedStyles;
        resolvedCustomPropCache[nodeId] = mergedCustomProps;
    };
    const resolveStylesForNode = (nodeId) => {
        resolveCascadeForNode(nodeId);
        return resolvedStyleCache[nodeId] ?? {};
    };
    const resolveCustomPropsForNode = (nodeId) => {
        resolveCascadeForNode(nodeId);
        return resolvedCustomPropCache[nodeId] ?? {};
    };
    const rawBBoxes = {};
    const transforms = {};
    const globalMatrices = {};
    for (const parsedNode of Object.values(parsed.nodes)) {
        transforms[parsedNode.nodeId] = (0, normalizeTransform_1.normalizeTransform)(parsedNode.attributes.transform);
    }
    const resolveGlobalMatrix = (nodeId) => {
        if (globalMatrices[nodeId] !== undefined)
            return globalMatrices[nodeId];
        const node = parsed.nodes[nodeId];
        if (!node)
            return null;
        const localMatrix = transforms[nodeId]?.matrix ?? null;
        const parentMatrix = node.parentNodeId ? resolveGlobalMatrix(node.parentNodeId) : null;
        let out = null;
        if (parentMatrix && localMatrix)
            out = multiplyMatrices(parentMatrix, localMatrix);
        else if (parentMatrix)
            out = parentMatrix;
        else if (localMatrix)
            out = localMatrix;
        globalMatrices[nodeId] = out;
        return out;
    };
    for (const parsedNode of Object.values(parsed.nodes)) {
        const baseBBox = (0, bbox_1.parseBBox)(parsedNode.tagName, getLocalTagName(parsedNode), parsedNode.attributes);
        const useResolvedBBox = resolveUseReferenceBBox(parsedNode, parsed, baseBBox);
        const globalMatrix = resolveGlobalMatrix(parsedNode.nodeId);
        rawBBoxes[parsedNode.nodeId] = applyTransformToBBox(useResolvedBBox, globalMatrix);
    }
    const clipPathBBoxes = collectSpecialRegionBBox(parsed, rawBBoxes, 'clippath');
    const maskBBoxes = collectSpecialRegionBBox(parsed, rawBBoxes, 'mask');
    const nodes = {};
    for (const parsedNode of Object.values(parsed.nodes)) {
        let bbox = rawBBoxes[parsedNode.nodeId];
        const clipId = getUrlRefId(parsedNode.attributes['clip-path']);
        if (clipId && clipPathBBoxes[clipId]) {
            bbox = intersectBBoxes(bbox, clipPathBBoxes[clipId]);
        }
        const maskId = getUrlRefId(parsedNode.attributes.mask);
        if (maskId && maskBBoxes[maskId]) {
            bbox = intersectBBoxes(bbox, maskBBoxes[maskId]);
        }
        nodes[parsedNode.nodeId] = {
            nodeId: parsedNode.nodeId,
            tagName: parsedNode.tagName,
            localTagName: getLocalTagName(parsedNode),
            namespacePrefix: getNamespacePrefix(parsedNode),
            namespaceUri: getNamespaceUri(parsedNode),
            nodeKind: (0, basicNodeKinds_1.classifyNodeKind)(parsedNode.tagName, getLocalTagName(parsedNode)),
            bbox,
            styles: resolveStylesForNode(parsedNode.nodeId),
            transform: transforms[parsedNode.nodeId],
            textContent: parsedNode.textContent,
            children: [...parsedNode.children],
            attributes: { ...parsedNode.attributes },
        };
    }
    return {
        kind: parsed.kind,
        rootNodeId: parsed.rootNodeId,
        nodes,
        parseMetadata: parserMetadata,
    };
}
