import { ParsedDocument, ParsedNode } from './types';
import { parseError } from './errors';

const TAG_RE = /<!\[CDATA\[[\s\S]*?\]\]>|<!--([\s\S]*?)-->|<[^>]+>/g;
const ATTR_RE = /([A-Za-z_:\-][A-Za-z0-9_:\-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
const HTML_VOID_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);
const HTML_IMPLICIT_CLOSE_TAGS = new Set(['li', 'p', 'td', 'th', 'tr', 'option']);

function decodeTagName(rawTag: string): { closing: boolean; selfClosing: boolean; tagName: string; attrSource: string } {
  const closing = /^<\//.test(rawTag);
  const selfClosing = /\/\s*>$/.test(rawTag);
  const inner = rawTag.replace(/^<\/?/, '').replace(/\/\s*>$|>$/g, '').trim();
  const firstSpace = inner.search(/\s/);
  const tagName = (firstSpace === -1 ? inner : inner.slice(0, firstSpace)).trim();
  const attrSource = firstSpace === -1 ? '' : inner.slice(firstSpace + 1);
  return { closing, selfClosing, tagName, attrSource };
}

function decodeEntity(value: string): string {
  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex: string) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _m;
    })
    .replace(/&#([0-9]+);/g, (_m, dec: string) => {
      const code = Number.parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _m;
    })
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function splitQualifiedName(tagName: string): { localTagName: string; namespacePrefix: string | null } {
  const idx = tagName.indexOf(':');
  if (idx === -1) return { localTagName: tagName, namespacePrefix: null };
  return {
    namespacePrefix: tagName.slice(0, idx) || null,
    localTagName: tagName.slice(idx + 1),
  };
}

function parseAttributes(attrSource: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  let match: RegExpExecArray | null = null;
  ATTR_RE.lastIndex = 0;
  while ((match = ATTR_RE.exec(attrSource)) !== null) {
    const key = match[1];
    const value = decodeEntity(match[2] ?? match[3] ?? match[4] ?? '');
    attrs[key] = value;
  }
  return attrs;
}

function extractXmlNamespaces(attributes: Record<string, string>): Record<string, string> {
  const namespaces: Record<string, string> = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'xmlns') {
      namespaces[''] = value;
      continue;
    }
    if (key.startsWith('xmlns:')) {
      namespaces[key.slice(6)] = value;
    }
  }
  return namespaces;
}

export function parseXmlLike(content: string, kind: 'svg' | 'html'): ParsedDocument {
  const nodes: Record<string, ParsedNode> = {};
  const stack: Array<{ nodeId: string; tagName: string; localTagName: string; nsContext: Record<string, string> }> = [];
  let nodeCounter = 0;
  let rootNodeId: string | null = null;
  let lastIndex = 0;

  const createNode = (
    tagName: string,
    attributes: Record<string, string>,
    parentNodeId: string | null,
    nsContext: Record<string, string>
  ): ParsedNode => {
    nodeCounter += 1;
    const { localTagName, namespacePrefix } = splitQualifiedName(tagName);
    const node: ParsedNode = {
      nodeId: `n${nodeCounter}`,
      tagName,
      localTagName,
      namespacePrefix,
      namespaceUri: namespacePrefix === null ? nsContext[''] ?? null : nsContext[namespacePrefix] ?? null,
      attributes,
      children: [],
      parentNodeId,
      textContent: null,
    };
    nodes[node.nodeId] = node;
    if (parentNodeId) {
      nodes[parentNodeId]?.children.push(node.nodeId);
    }
    if (!rootNodeId) rootNodeId = node.nodeId;
    return node;
  };

  const appendText = (text: string): void => {
    const currentStack = stack[stack.length - 1];
    if (!currentStack) return;
    const current = nodes[currentStack.nodeId];
    const keepRaw = current.localTagName.toLowerCase() === 'style' || current.localTagName.toLowerCase() === 'script';
    const decoded = keepRaw ? text : decodeEntity(text);
    const cleaned = keepRaw ? decoded : decoded.replace(/\s+/g, ' ').trim();
    if (!cleaned) return;
    if (keepRaw) {
      current.textContent = `${current.textContent ?? ''}${cleaned}`;
      return;
    }
    current.textContent = current.textContent ? `${current.textContent} ${cleaned}` : cleaned;
  };

  let match: RegExpExecArray | null = null;
  while ((match = TAG_RE.exec(content)) !== null) {
    appendText(content.slice(lastIndex, match.index));
    const rawTag = match[0];
    lastIndex = TAG_RE.lastIndex;

    if (rawTag.startsWith('<![CDATA[') && rawTag.endsWith(']]>')) {
      appendText(rawTag.slice('<![CDATA['.length, -']]>'.length));
      continue;
    }
    if (rawTag.startsWith('<!--')) continue;
    if (rawTag.startsWith('<?')) continue;
    if (/^<!DOCTYPE/i.test(rawTag)) continue;

    const { closing, selfClosing, tagName, attrSource } = decodeTagName(rawTag);
    if (!tagName) continue;
    const lowerTagName = tagName.toLowerCase();

    if (closing) {
      const targetIndex = stack.length - 1;
      if (targetIndex < 0) continue;
      const current = nodes[stack[targetIndex].nodeId];
      const matchesTop =
        current && (current.tagName.toLowerCase() === lowerTagName || current.localTagName.toLowerCase() === lowerTagName);
      if (matchesTop) {
        stack.pop();
        continue;
      }

      if (kind === 'html') {
        let found = -1;
        for (let i = stack.length - 1; i >= 0; i -= 1) {
          const candidate = nodes[stack[i].nodeId];
          if (candidate.tagName.toLowerCase() === lowerTagName || candidate.localTagName.toLowerCase() === lowerTagName) {
            found = i;
            break;
          }
        }
        if (found !== -1) {
          stack.splice(found);
        }
        continue;
      }

      throw parseError(`Malformed markup: closing tag </${tagName}> does not match parser stack.`, { tagName });
    }

    if (kind === 'html' && stack.length > 0) {
      const top = nodes[stack[stack.length - 1].nodeId];
      if (top && HTML_IMPLICIT_CLOSE_TAGS.has(lowerTagName) && top.localTagName.toLowerCase() === lowerTagName) {
        stack.pop();
      }
    }

    const effectiveSelfClosing = selfClosing || (kind === 'html' && HTML_VOID_TAGS.has(lowerTagName));

    const attributes = parseAttributes(attrSource);
    const parentStack = stack[stack.length - 1];
    const parentNodeId = parentStack?.nodeId ?? null;
    const nsContext = {
      ...(parentStack?.nsContext ?? {}),
      ...extractXmlNamespaces(attributes),
    };
    const node = createNode(tagName, attributes, parentNodeId, nsContext);
    if (!effectiveSelfClosing) {
      stack.push({ nodeId: node.nodeId, tagName: node.tagName, localTagName: node.localTagName, nsContext });
      continue;
    }
  }

  appendText(content.slice(lastIndex));

  if (stack.length !== 0) {
    throw parseError('Malformed markup: unclosed tags remain after parsing.', { openNodeIds: stack.map((item) => item.nodeId) });
  }
  if (!rootNodeId) {
    throw parseError('No root node could be parsed from input.', {});
  }

  return { kind, rootNodeId, nodes };
}
