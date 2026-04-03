type Mat2D = [number, number, number, number, number, number];

function identity(): Mat2D {
  return [1, 0, 0, 1, 0, 0];
}

function multiply(a: Mat2D, b: Mat2D): Mat2D {
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

function parseNumbers(rawArgs: string): number[] {
  const matches = rawArgs.match(/[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g) ?? [];
  return matches.map((value) => Number(value)).filter((value) => Number.isFinite(value));
}

function translateMatrix(tx: number, ty: number): Mat2D {
  return [1, 0, 0, 1, tx, ty];
}

function scaleMatrix(sx: number, sy: number): Mat2D {
  return [sx, 0, 0, sy, 0, 0];
}

function rotateMatrix(deg: number): Mat2D {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return [cos, sin, -sin, cos, 0, 0];
}

function skewXMatrix(deg: number): Mat2D {
  const rad = (deg * Math.PI) / 180;
  return [1, 0, Math.tan(rad), 1, 0, 0];
}

function skewYMatrix(deg: number): Mat2D {
  const rad = (deg * Math.PI) / 180;
  return [1, Math.tan(rad), 0, 1, 0, 0];
}

export function normalizeTransform(raw: string | undefined): {
  raw: string | null;
  translate: [number, number] | null;
  scale: [number, number] | null;
  rotate: number | null;
  matrix: Mat2D | null;
} {
  if (!raw || raw.trim().length === 0) {
    return { raw: null, translate: null, scale: null, rotate: null, matrix: null };
  }

  const transformRaw = raw.trim();
  const opRe = /([a-zA-Z]+)\(([^)]*)\)/g;
  let match: RegExpExecArray | null = null;
  let matrix = identity();
  let hasAnyOp = false;
  let lastTranslate: [number, number] | null = null;
  let lastScale: [number, number] | null = null;
  let lastRotate: number | null = null;

  while ((match = opRe.exec(transformRaw)) !== null) {
    const op = match[1].toLowerCase();
    const args = parseNumbers(match[2]);
    let opMatrix: Mat2D | null = null;

    if (op === 'matrix' && args.length >= 6) {
      opMatrix = [args[0], args[1], args[2], args[3], args[4], args[5]];
    } else if (op === 'translate' && args.length >= 1) {
      const tx = args[0];
      const ty = args[1] ?? 0;
      lastTranslate = [tx, ty];
      opMatrix = translateMatrix(tx, ty);
    } else if (op === 'scale' && args.length >= 1) {
      const sx = args[0];
      const sy = args[1] ?? sx;
      lastScale = [sx, sy];
      opMatrix = scaleMatrix(sx, sy);
    } else if (op === 'rotate' && args.length >= 1) {
      const angle = args[0];
      lastRotate = angle;
      if (args.length >= 3) {
        const cx = args[1];
        const cy = args[2];
        opMatrix = multiply(multiply(translateMatrix(cx, cy), rotateMatrix(angle)), translateMatrix(-cx, -cy));
      } else {
        opMatrix = rotateMatrix(angle);
      }
    } else if (op === 'skewx' && args.length >= 1) {
      opMatrix = skewXMatrix(args[0]);
    } else if (op === 'skewy' && args.length >= 1) {
      opMatrix = skewYMatrix(args[0]);
    }

    if (!opMatrix) continue;
    matrix = multiply(matrix, opMatrix);
    hasAnyOp = true;
  }

  if (!hasAnyOp) {
    return { raw: transformRaw, translate: null, scale: null, rotate: null, matrix: null };
  }

  const derivedScale: [number, number] = [
    Math.sqrt(matrix[0] * matrix[0] + matrix[1] * matrix[1]),
    Math.sqrt(matrix[2] * matrix[2] + matrix[3] * matrix[3]),
  ];

  return {
    raw: transformRaw,
    translate: lastTranslate ?? [matrix[4], matrix[5]],
    scale: lastScale ?? derivedScale,
    rotate: lastRotate,
    matrix,
  };
}
