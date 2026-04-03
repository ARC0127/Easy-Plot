export function classifyNodeKind(tagName: string, localTagName?: string): 'group' | 'text' | 'shape' | 'image' | 'html_block' | 'unknown' {
  const resolved = localTagName ?? (tagName.includes(':') ? tagName.split(':').pop() ?? tagName : tagName);
  const t = resolved.toLowerCase();
  if (['svg', 'g', 'defs', 'symbol', 'clippath', 'mask', 'marker', 'pattern'].includes(t)) return 'group';
  if (['text', 'tspan'].includes(t)) return 'text';
  if (['path', 'line', 'rect', 'circle', 'polyline', 'polygon', 'ellipse', 'use'].includes(t)) return 'shape';
  if (['image', 'img'].includes(t)) return 'image';
  if (['div', 'span', 'p', 'section', 'figure', 'figcaption', 'foreignobject'].includes(t)) return 'html_block';
  return 'unknown';
}
