function toNumber(value: string | undefined, fallback = 0): number {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number.parseFloat(String(value).trim());
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parsePoints(pointsRaw: string): Array<[number, number]> {
  const cleaned = pointsRaw
    .trim()
    .replace(/,/g, ' ')
    .split(/\s+/)
    .map((token) => Number(token))
    .filter((token) => Number.isFinite(token));
  const points: Array<[number, number]> = [];
  for (let idx = 0; idx + 1 < cleaned.length; idx += 2) {
    points.push([cleaned[idx], cleaned[idx + 1]]);
  }
  return points;
}

function bboxFromPoints(points: Array<[number, number]>): { x: number; y: number; w: number; h: number } | null {
  if (points.length === 0) return null;
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function parsePathBBox(pathData: string): { x: number; y: number; w: number; h: number } | null {
  const tokens = pathData.match(/[a-zA-Z]|[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g);
  if (!tokens || tokens.length === 0) return null;

  let idx = 0;
  let cmd = '';
  let x = 0;
  let y = 0;
  let subpathStart: [number, number] = [0, 0];
  const points: Array<[number, number]> = [];

  const has = () => idx < tokens.length;
  const isCommand = (token: string) => /^[a-zA-Z]$/.test(token);
  const nextNumber = () => (has() && !isCommand(tokens[idx]) ? Number(tokens[idx++]) : null);

  while (has()) {
    const token = tokens[idx];
    if (isCommand(token)) {
      cmd = token;
      idx += 1;
    } else if (!cmd) {
      return bboxFromPoints(points);
    }

    const lower = cmd.toLowerCase();
    const relative = cmd === lower;
    const getAbs = (dx: number, dy: number): [number, number] => (relative ? [x + dx, y + dy] : [dx, dy]);

    if (lower === 'm' || lower === 'l' || lower === 't') {
      const n1 = nextNumber();
      const n2 = nextNumber();
      if (n1 === null || n2 === null) continue;
      [x, y] = getAbs(n1, n2);
      points.push([x, y]);
      if (lower === 'm') subpathStart = [x, y];
      while (has() && !isCommand(tokens[idx])) {
        const x2 = nextNumber();
        const y2 = nextNumber();
        if (x2 === null || y2 === null) break;
        [x, y] = getAbs(x2, y2);
        points.push([x, y]);
      }
      continue;
    }

    if (lower === 'h') {
      while (has() && !isCommand(tokens[idx])) {
        const vx = nextNumber();
        if (vx === null) break;
        x = relative ? x + vx : vx;
        points.push([x, y]);
      }
      continue;
    }

    if (lower === 'v') {
      while (has() && !isCommand(tokens[idx])) {
        const vy = nextNumber();
        if (vy === null) break;
        y = relative ? y + vy : vy;
        points.push([x, y]);
      }
      continue;
    }

    if (lower === 'c') {
      while (has() && !isCommand(tokens[idx])) {
        const c1x = nextNumber();
        const c1y = nextNumber();
        const c2x = nextNumber();
        const c2y = nextNumber();
        const ex = nextNumber();
        const ey = nextNumber();
        if ([c1x, c1y, c2x, c2y, ex, ey].some((value) => value === null)) break;
        const [p1x, p1y] = getAbs(c1x as number, c1y as number);
        const [p2x, p2y] = getAbs(c2x as number, c2y as number);
        [x, y] = getAbs(ex as number, ey as number);
        points.push([p1x, p1y], [p2x, p2y], [x, y]);
      }
      continue;
    }

    if (lower === 's' || lower === 'q') {
      const step = lower === 's' ? 4 : 4;
      while (has() && !isCommand(tokens[idx])) {
        const values: number[] = [];
        for (let j = 0; j < step; j += 1) {
          const value = nextNumber();
          if (value === null) break;
          values.push(value);
        }
        if (values.length !== step) break;
        const [c1x, c1y, ex, ey] = values;
        const [p1x, p1y] = getAbs(c1x, c1y);
        [x, y] = getAbs(ex, ey);
        points.push([p1x, p1y], [x, y]);
      }
      continue;
    }

    if (lower === 'a') {
      while (has() && !isCommand(tokens[idx])) {
        const values: number[] = [];
        for (let j = 0; j < 7; j += 1) {
          const value = nextNumber();
          if (value === null) break;
          values.push(value);
        }
        if (values.length !== 7) break;
        const [rx, ry, _rot, _laf, _sf, ex, ey] = values;
        points.push([x - Math.abs(rx), y - Math.abs(ry)], [x + Math.abs(rx), y + Math.abs(ry)]);
        [x, y] = getAbs(ex, ey);
        points.push([x, y]);
      }
      continue;
    }

    if (lower === 'z') {
      [x, y] = subpathStart;
      points.push([x, y]);
      continue;
    }

    while (has() && !isCommand(tokens[idx])) idx += 1;
  }

  return bboxFromPoints(points);
}

export function parseBBox(
  tagName: string,
  localTagName: string,
  attributes: Record<string, string>
): { x: number; y: number; w: number; h: number } | null {
  const lowerTag = localTagName.toLowerCase() || tagName.toLowerCase();
  const x = toNumber(attributes.x ?? attributes.cx);
  const y = toNumber(attributes.y ?? attributes.cy);
  const widthRaw = attributes.width ?? null;
  const heightRaw = attributes.height ?? null;

  if (lowerTag === 'line' || attributes.x1 !== undefined || attributes.y1 !== undefined || attributes.x2 !== undefined || attributes.y2 !== undefined) {
    const x1 = toNumber(attributes.x1, x);
    const y1 = toNumber(attributes.y1, y);
    const x2 = toNumber(attributes.x2, x1);
    const y2 = toNumber(attributes.y2, y1);
    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);
    return { x: minX, y: minY, w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) };
  }

  if (attributes.viewBox) {
    const parts = attributes.viewBox.split(/[ ,]+/).map(Number);
    if (parts.length === 4 && parts.every((value) => Number.isFinite(value))) {
      return { x: parts[0], y: parts[1], w: parts[2], h: parts[3] };
    }
  }

  if (lowerTag === 'polyline' || lowerTag === 'polygon' || attributes.points) {
    const points = parsePoints(attributes.points ?? '');
    const bbox = bboxFromPoints(points);
    if (bbox) return bbox;
  }

  if (lowerTag === 'circle' && attributes.cx !== undefined && attributes.cy !== undefined && attributes.r !== undefined) {
    const cx = toNumber(attributes.cx);
    const cy = toNumber(attributes.cy);
    const r = Math.max(toNumber(attributes.r), 0);
    return { x: cx - r, y: cy - r, w: r * 2, h: r * 2 };
  }

  if (lowerTag === 'ellipse' && attributes.cx !== undefined && attributes.cy !== undefined) {
    const cx = toNumber(attributes.cx);
    const cy = toNumber(attributes.cy);
    const rx = Math.max(toNumber(attributes.rx), 0);
    const ry = Math.max(toNumber(attributes.ry), 0);
    return { x: cx - rx, y: cy - ry, w: rx * 2, h: ry * 2 };
  }

  if (lowerTag === 'path' && attributes.d) {
    const bbox = parsePathBBox(attributes.d);
    if (bbox) return bbox;
    return { x, y, w: 0, h: 0 };
  }

  if (lowerTag === 'text' || lowerTag === 'tspan') {
    const textX = toNumber(attributes.x, 0);
    const textY = toNumber(attributes.y, 0);
    if (attributes.x !== undefined || attributes.y !== undefined) {
      return { x: textX, y: textY, w: 0, h: 0 };
    }
  }

  if (lowerTag === 'use') {
    const w = toNumber(widthRaw ?? undefined, 0);
    const h = toNumber(heightRaw ?? undefined, 0);
    if (w > 0 || h > 0) {
      return { x, y, w, h };
    }
  }

  if (widthRaw === null && heightRaw === null) return null;
  return { x, y, w: toNumber(widthRaw ?? undefined), h: toNumber(heightRaw ?? undefined) };
}
