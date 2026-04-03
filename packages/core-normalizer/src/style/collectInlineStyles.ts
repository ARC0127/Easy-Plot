export function collectInlineStyles(styleValue: string | undefined): Record<string, string> {
  if (!styleValue) return {};

  const declarations: string[] = [];
  let quote: '"' | "'" | null = null;
  let parenDepth = 0;
  let chunk = '';

  for (let idx = 0; idx < styleValue.length; idx += 1) {
    const ch = styleValue[idx];
    if (quote) {
      if (ch === quote && styleValue[idx - 1] !== '\\') quote = null;
      chunk += ch;
      continue;
    }

    if (ch === '"' || ch === "'") {
      quote = ch;
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

    if (ch === ';' && parenDepth === 0) {
      const trimmed = chunk.trim();
      if (trimmed) declarations.push(trimmed);
      chunk = '';
      continue;
    }

    chunk += ch;
  }

  const tail = chunk.trim();
  if (tail) declarations.push(tail);

  return declarations.reduce<Record<string, string>>((acc, part) => {
    let quoteState: '"' | "'" | null = null;
    let parenState = 0;
    let sep = -1;
    for (let i = 0; i < part.length; i += 1) {
      const c = part[i];
      if (quoteState) {
        if (c === quoteState && part[i - 1] !== '\\') quoteState = null;
        continue;
      }
      if (c === '"' || c === "'") {
        quoteState = c;
        continue;
      }
      if (c === '(') {
        parenState += 1;
        continue;
      }
      if (c === ')' && parenState > 0) {
        parenState -= 1;
        continue;
      }
      if (c === ':' && parenState === 0) {
        sep = i;
        break;
      }
    }

    if (sep === -1) return acc;
    const key = part.slice(0, sep).trim();
    const value = part.slice(sep + 1).trim();
    if (key) acc[key] = value;
    return acc;
  }, {});
}
