const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { spawn } = require('node:child_process');

const distEntry = path.resolve(__dirname, '../apps/desktop/dist/main/index.js');
if (!fs.existsSync(distEntry)) {
  throw new Error('Missing apps/desktop/dist/main/index.js. Run: npm run build:desktop');
}

const { createDesktopAppShell } = require(distEntry);

function parseArgs(argv) {
  const out = {
    host: '127.0.0.1',
    port: 3210,
    open: true,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (item === '--host' && argv[i + 1]) {
      out.host = String(argv[i + 1]);
      i += 1;
      continue;
    }
    if (item.startsWith('--host=')) {
      out.host = item.slice('--host='.length);
      continue;
    }
    if (item === '--port' && argv[i + 1]) {
      out.port = Number.parseInt(String(argv[i + 1]), 10);
      i += 1;
      continue;
    }
    if (item.startsWith('--port=')) {
      out.port = Number.parseInt(item.slice('--port='.length), 10);
      continue;
    }
    if (item === '--no-open') {
      out.open = false;
      continue;
    }
  }
  if (!Number.isFinite(out.port) || out.port <= 0) {
    out.port = 3210;
  }
  return out;
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > 10 * 1024 * 1024) {
        reject(new Error('Payload too large'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve(JSON.parse(text));
      } catch (error) {
        reject(new Error(`Invalid JSON body: ${error instanceof Error ? error.message : String(error)}`));
      }
    });
    req.on('error', (error) => reject(error));
  });
}

function send(res, statusCode, payload, contentType = 'application/json; charset=utf-8') {
  res.statusCode = statusCode;
  res.setHeader('content-type', contentType);
  if (typeof payload === 'string') {
    res.end(payload);
    return;
  }
  res.end(`${JSON.stringify(payload, null, 2)}\n`);
}

function detectKindByPath(filePath) {
  const ext = path.extname(filePath || '').toLowerCase();
  if (ext === '.html' || ext === '.htm') return 'html';
  return 'svg';
}

function detectSaveMode(filePath) {
  const ext = path.extname(String(filePath || '')).toLowerCase();
  if (ext === '.json') return 'project';
  if (ext === '.html' || ext === '.htm') return 'html';
  if (ext === '.svg') return 'svg';
  return 'png';
}

function parseNumericAttr(rawValue) {
  if (typeof rawValue !== 'string') return null;
  const match = rawValue.trim().match(/^[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/);
  if (!match) return null;
  const value = Number.parseFloat(match[0]);
  return Number.isFinite(value) ? value : null;
}

function parseSvgViewport(svg) {
  if (typeof svg !== 'string') return null;

  let minX = 0;
  let minY = 0;
  let width = null;
  let height = null;

  const viewBoxMatch = svg.match(/\bviewBox\s*=\s*["']([^"']+)["']/i);
  if (viewBoxMatch) {
    const parts = viewBoxMatch[1]
      .trim()
      .split(/[\s,]+/)
      .map((item) => Number.parseFloat(item))
      .filter((item) => Number.isFinite(item));
    if (parts.length === 4) {
      minX = parts[0];
      minY = parts[1];
      width = parts[2];
      height = parts[3];
    }
  }

  const widthMatch = svg.match(/\bwidth\s*=\s*["']([^"']+)["']/i);
  const heightMatch = svg.match(/\bheight\s*=\s*["']([^"']+)["']/i);
  const widthAttr = widthMatch ? parseNumericAttr(widthMatch[1]) : null;
  const heightAttr = heightMatch ? parseNumericAttr(heightMatch[1]) : null;

  if (Number.isFinite(widthAttr)) width = widthAttr;
  if (Number.isFinite(heightAttr)) height = heightAttr;

  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    return null;
  }

  return { minX, minY, width, height };
}

function parseTagAttributes(raw) {
  const attrs = {};
  const re = /\b([a-zA-Z_:][\w:.-]*)="([^"]*)"/g;
  let m = null;
  while ((m = re.exec(raw)) !== null) {
    attrs[m[1]] = m[2];
  }
  return attrs;
}

function serializeTagAttributes(attrs) {
  return Object.entries(attrs)
    .filter(([, value]) => value !== undefined && value !== null && String(value).length > 0)
    .map(([key, value]) => `${key}="${String(value).replace(/"/g, '&quot;')}"`)
    .join(' ');
}

function normalizeColorToken(value) {
  return String(value ?? '').trim().toLowerCase();
}

function isBlackLikeColor(value) {
  const token = normalizeColorToken(value);
  return token === '#000' || token === '#000000' || token === 'black' || token === 'rgb(0,0,0)';
}

function parsePositiveNumber(value) {
  const n = Number.parseFloat(String(value ?? '').trim());
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function sanitizePreviewSvgForGui(svg) {
  const viewport = parseSvgViewport(svg);
  if (!viewport || viewport.width <= 0 || viewport.height <= 0) {
    return {
      svg,
      sanitizedCount: 0,
      reason: null,
    };
  }

  const figureArea = viewport.width * viewport.height;
  let sanitizedCount = 0;
  const out = svg.replace(/<(rect|path|polygon|polyline|circle|ellipse|line)\b([^>]*)\/>/g, (full, tagName, rawAttrs) => {
    const attrs = parseTagAttributes(rawAttrs);
    const fill = attrs.fill;
    const stroke = attrs.stroke;
    const width = parsePositiveNumber(attrs.width) || parsePositiveNumber(attrs['data-fe-bbox-w']);
    const height = parsePositiveNumber(attrs.height) || parsePositiveNumber(attrs['data-fe-bbox-h']);
    const areaRatio = width > 0 && height > 0 ? (width * height) / figureArea : 0;
    const hasNoStroke = !stroke || normalizeColorToken(stroke) === 'none';

    const shouldSanitize = isBlackLikeColor(fill) && hasNoStroke && areaRatio >= 0.08;
    if (!shouldSanitize) return full;

    sanitizedCount += 1;
    attrs.fill = 'none';
    attrs.stroke = '#334155';
    attrs['stroke-width'] = attrs['stroke-width'] ?? '1';
    attrs['vector-effect'] = attrs['vector-effect'] ?? 'non-scaling-stroke';
    attrs['data-fe-preview-sanitized'] = 'black-fill-guard';
    return `<${tagName} ${serializeTagAttributes(attrs)} />`;
  });

  return {
    svg: out,
    sanitizedCount,
    reason: sanitizedCount > 0 ? 'black_fill_guard' : null,
  };
}

function buildPreviewSnapshot(shell) {
  let previewSvgDataUrl = null;
  let previewViewport = null;
  let previewSanitizedCount = 0;
  let previewSanitizeReason = null;
  try {
    const rawSvg = shell.getPreviewSvgContent();
    if (typeof rawSvg === 'string' && rawSvg.trim().length > 0) {
      const sanitized = sanitizePreviewSvgForGui(rawSvg);
      previewSvgDataUrl = 'ready';
      previewViewport = parseSvgViewport(sanitized.svg);
      previewSanitizedCount = sanitized.sanitizedCount;
      previewSanitizeReason = sanitized.reason;
    }
  } catch {
    previewSvgDataUrl = null;
    previewViewport = null;
    previewSanitizedCount = 0;
    previewSanitizeReason = null;
  }
  return {
    svgDataUrl: previewSvgDataUrl,
    viewport: previewViewport,
    sanitizedCount: previewSanitizedCount,
    sanitizeReason: previewSanitizeReason,
  };
}

function createSnapshot(shell, previewCache) {
  const windowState = shell.getWindowSession();
  const view = shell.snapshot();
  const linkedStatus = shell.getLinkedStatus();
  const defaultSavePath = shell.suggestDefaultPngPath();
  let preview = previewCache?.payload ?? null;
  if (!previewCache || previewCache.revision !== windowState.renderRevision || !preview) {
    preview = buildPreviewSnapshot(shell);
    if (previewCache) {
      previewCache.revision = windowState.renderRevision;
      previewCache.payload = preview;
    }
  }
  return {
    window: windowState,
    linkedStatus,
    view: {
      canvas: view?.canvas ?? { selectedIds: [], overlays: [], curveHandles: [], lastHit: null },
      properties: view?.properties ?? null,
      warnings: Array.isArray(view?.warnings) ? view.warnings : [],
    },
    preview,
    defaultSavePath,
  };
}

function htmlPage(port) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Easy Plot v0.01</title>
  <style>
    :root {
      --bg: #f3f6fb;
      --card: #ffffff;
      --line: #d8dfeb;
      --text: #1c2635;
      --muted: #6b7c94;
      --accent: #1762d6;
      --ok: #0a7f3f;
      --err: #a92323;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", "PingFang SC", sans-serif;
      background: var(--bg);
      color: var(--text);
    }
    .topbar {
      padding: 12px 16px;
      border-bottom: 1px solid var(--line);
      background: linear-gradient(90deg, #fff, #edf4ff);
    }
    .title { font-size: 16px; font-weight: 700; }
    .meta { font-size: 12px; color: var(--muted); margin-top: 2px; }
    .controls {
      display: grid;
      grid-template-columns: repeat(2, minmax(320px, 1fr));
      gap: 10px;
      padding: 10px;
    }
    .card {
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 10px;
    }
    .card h3 {
      margin: 0 0 8px 0;
      font-size: 13px;
      border-bottom: 1px solid var(--line);
      padding-bottom: 6px;
    }
    .row {
      display: flex;
      gap: 8px;
      align-items: center;
      margin: 6px 0;
      flex-wrap: wrap;
    }
    input, select, button {
      font: inherit;
      font-size: 12px;
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 6px 8px;
      background: #fff;
      color: var(--text);
    }
    input[type="text"] { flex: 1; min-width: 200px; }
    select { flex: 1; min-width: 180px; }
    button { cursor: pointer; }
    button.primary {
      background: var(--accent);
      border-color: var(--accent);
      color: #fff;
    }
    .status {
      margin: 0 10px 10px;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 8px 10px;
      font-size: 12px;
      background: #fff;
    }
    .status.ok { border-color: #b6e1ca; background: #f4fff8; color: var(--ok); }
    .status.err { border-color: #efc7c7; background: #fff6f6; color: var(--err); }
    .preview-card {
      margin: 0 10px 10px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      overflow: hidden;
    }
    .preview-card h3 {
      margin: 0;
      padding: 10px 12px;
      border-bottom: 1px solid var(--line);
      font-size: 13px;
      background: #f8fbff;
    }
    .preview-body {
      padding: 10px;
      max-height: calc(100vh - 250px);
      overflow: auto;
    }
    .preview-surface {
      border: 1px solid var(--line);
      border-radius: 6px;
      background:
        linear-gradient(45deg, #f5f7fb 25%, transparent 25%) 0 0 / 12px 12px,
        linear-gradient(-45deg, #f5f7fb 25%, transparent 25%) 0 0 / 12px 12px,
        linear-gradient(45deg, transparent 75%, #f5f7fb 75%) 0 0 / 12px 12px,
        linear-gradient(-45deg, transparent 75%, #f5f7fb 75%) 0 0 / 12px 12px;
      overflow: auto;
      user-select: none;
      touch-action: none;
      cursor: crosshair;
      outline: none;
    }
    .preview-svg {
      display: block;
      width: 100%;
      height: auto;
    }
    .preview-surface.is-dragging {
      cursor: grabbing;
    }
    .muted { color: var(--muted); }
    .preview-warning {
      margin-top: 8px;
      border: 1px solid #f2ddb2;
      background: #fff8ea;
      color: #7a5310;
      border-radius: 6px;
      padding: 6px 8px;
      font-size: 11px;
    }
    .preview-summary {
      margin-top: 8px;
      color: var(--muted);
      font-size: 11px;
    }
    @media (max-width: 980px) {
      .controls {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <header class="topbar">
    <div class="title">Easy Plot v0.01</div>
    <div class="meta">localhost:${port} · 正式版本 0.01 · 点击选择 / 拖拽移动 / 拖控制点调曲线 / 双击改字 / Delete 删除 / 方向键微调 / Alt+↑↓ 调曲线 / Ctrl+S 保存</div>
  </header>

  <section class="controls">
    <div class="card">
      <h3>选择（导入）</h3>
      <div class="row">
        <input id="import-path" type="text" placeholder="输入文件绝对路径（SVG/HTML）" />
        <button id="btn-import-path" class="primary">导入</button>
      </div>
      <div class="row">
        <input id="import-file" type="file" accept=".svg,.html,.htm,.xml" />
      </div>
    </div>
    <div class="card">
      <h3>保存</h3>
      <div class="row">
        <input id="project-save-path" type="text" placeholder="留空则默认保存到源文件同目录的高清 full-size PNG；*.svg/*.json/*.html 可显式覆盖" />
        <button id="btn-save-project" class="primary">保存</button>
      </div>
    </div>
  </section>

  <div id="status" class="status">准备就绪。</div>

  <section class="preview-card">
    <h3>预览</h3>
    <div id="preview-body" class="preview-body"></div>
  </section>

  <script>
    const statusEl = document.getElementById('status');
    const previewBody = document.getElementById('preview-body');
    let currentState = null;
    let previewRenderToken = 0;
    let mountedPreviewRevision = null;
    let deferredPreviewTimer = null;
    let deferredPreviewState = null;

    function esc(value) {
      return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    }

    function setStatus(text, isError = false) {
      statusEl.className = isError ? 'status err' : 'status ok';
      statusEl.textContent = text;
    }

    function objectTypeOf(props) {
      return props?.objectType ?? props?.type ?? null;
    }

    async function postJson(url, body) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body || {}),
      });
      const payload = await res.json();
      if (!res.ok || payload.ok === false) {
        throw new Error(payload.error || ('request failed: ' + res.status));
      }
      return payload;
    }

    function selectorEscape(value) {
      const raw = String(value ?? '');
      if (window.CSS && typeof window.CSS.escape === 'function') {
        return window.CSS.escape(raw);
      }
      return raw.replace(/["\\\\]/g, '\\\\$&');
    }

    function composeSvgTransform(baseTransform, dx, dy) {
      const move = 'translate(' + dx + ' ' + dy + ')';
      return baseTransform && String(baseTransform).trim().length > 0 ? String(baseTransform).trim() + ' ' + move : move;
    }

    function clearOptimisticDrag(surface) {
      const target = surface && surface._feDragTarget;
      if (target) {
        const baseTransform = surface._feDragBaseTransform;
        if (baseTransform && String(baseTransform).length > 0) {
          target.setAttribute('transform', baseTransform);
        } else {
          target.removeAttribute('transform');
        }
      }
      const svg = surface?.querySelector?.('svg');
      const overlayLayer = svg?.querySelector?.('[data-fe-selection-overlay="1"]');
      if (overlayLayer) {
        overlayLayer.removeAttribute('transform');
      }
      surface._feDragTarget = null;
      surface._feDragBaseTransform = '';
      surface._feDragTargetId = null;
    }

    function applyOptimisticDrag(surface, objectId, dx, dy) {
      if (!surface || !objectId) return;
      const svg = surface.querySelector('svg');
      if (!svg) return;
      const target = svg.querySelector('[data-fe-object-id="' + selectorEscape(objectId) + '"]');
      if (!target) return;
      if (surface._feDragTarget !== target) {
        clearOptimisticDrag(surface);
        surface._feDragTarget = target;
        surface._feDragBaseTransform = target.getAttribute('transform') || '';
        surface._feDragTargetId = objectId;
      }
      target.setAttribute('transform', composeSvgTransform(surface._feDragBaseTransform, dx, dy));
      const overlayLayer = svg.querySelector('[data-fe-selection-overlay="1"]');
      if (overlayLayer) {
        overlayLayer.setAttribute('transform', 'translate(' + dx + ' ' + dy + ')');
      }
    }

    function applySelectionOverlay(svg, state) {
      if (!svg) return;
      const previous = svg.querySelector('[data-fe-selection-overlay="1"]');
      if (previous) previous.remove();
      const overlayItems = Array.isArray(state?.view?.canvas?.overlays) ? state.view.canvas.overlays : [];
      if (overlayItems.length === 0) return;
      const ns = 'http://www.w3.org/2000/svg';
      const overlayLayer = document.createElementNS(ns, 'g');
      overlayLayer.setAttribute('data-fe-selection-overlay', '1');
      overlayLayer.setAttribute('pointer-events', 'none');
      for (const item of overlayItems) {
        const x = Number(item?.x);
        const y = Number(item?.y);
        const w = Number(item?.w);
        const h = Number(item?.h);
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(w) || !Number.isFinite(h)) continue;
        if (w <= 0 || h <= 0) continue;
        const rect = document.createElementNS(ns, 'rect');
        rect.setAttribute('x', String(x));
        rect.setAttribute('y', String(y));
        rect.setAttribute('width', String(w));
        rect.setAttribute('height', String(h));
        rect.setAttribute('fill', 'none');
        rect.setAttribute('stroke', '#1762d6');
        rect.setAttribute('stroke-width', '1.5');
        rect.setAttribute('stroke-dasharray', '5 3');
        rect.setAttribute('vector-effect', 'non-scaling-stroke');
        overlayLayer.appendChild(rect);
      }
      svg.appendChild(overlayLayer);
    }

    function applyCurveHandles(svg, state) {
      if (!svg) return;
      const previous = svg.querySelector('[data-fe-curve-handle-layer="1"]');
      if (previous) previous.remove();
      const handleItems = Array.isArray(state?.view?.canvas?.curveHandles) ? state.view.canvas.curveHandles : [];
      if (handleItems.length === 0) return;
      const ns = 'http://www.w3.org/2000/svg';
      const layer = document.createElementNS(ns, 'g');
      layer.setAttribute('data-fe-curve-handle-layer', '1');
      for (const item of handleItems) {
        const x = Number(item?.x);
        const y = Number(item?.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        const handle = document.createElementNS(ns, 'circle');
        handle.setAttribute('cx', String(x));
        handle.setAttribute('cy', String(y));
        handle.setAttribute('r', '6');
        handle.setAttribute('fill', '#ffffff');
        handle.setAttribute('stroke', '#1762d6');
        handle.setAttribute('stroke-width', '2');
        handle.setAttribute('vector-effect', 'non-scaling-stroke');
        handle.setAttribute('data-fe-curve-handle-id', String(item.id));
        handle.setAttribute('data-fe-curve-handle-object-id', String(item.objectId || ''));
        handle.setAttribute('data-fe-curve-handle-kind', String(item.kind || ''));
        handle.style.cursor = 'grab';
        layer.appendChild(handle);
      }
      svg.appendChild(layer);
    }

    async function mountInteractivePreview(surface, query, renderToken, state) {
      try {
        const res = await fetch('/api/preview.svg' + query);
        if (!res.ok) {
          throw new Error('preview load failed: ' + res.status);
        }
        const svgText = await res.text();
        if (renderToken !== previewRenderToken) return;
        surface.innerHTML = svgText;
      } catch (error) {
        if (renderToken !== previewRenderToken) return;
        surface.innerHTML = '<p class="muted">预览加载失败：' + esc(error?.message || String(error)) + '</p>';
        return;
      }

      if (renderToken !== previewRenderToken) return;
      const svg = surface.querySelector('svg');
      if (!svg) return;
      svg.classList.add('preview-svg');
      surface._fePreviewViewport = state?.preview?.viewport ?? null;
      clearOptimisticDrag(surface);
      applySelectionOverlay(svg, state);
      applyCurveHandles(svg, state);
      if (surface.dataset.interactionBound === '1') {
        return;
      }
      surface.dataset.interactionBound = '1';

      const toSvgPoint = (event) => {
        const viewport = surface._fePreviewViewport ?? null;
        const currentSvg = surface.querySelector('svg');
        if (!viewport) return null;
        if (!Number.isFinite(viewport.minX) || !Number.isFinite(viewport.minY) || !Number.isFinite(viewport.width) || !Number.isFinite(viewport.height)) {
          return null;
        }
        if (viewport.width <= 0 || viewport.height <= 0) return null;
        if (!currentSvg) return null;
        const rect = currentSvg.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return null;
        const relX = (event.clientX - rect.left) / rect.width;
        const relY = (event.clientY - rect.top) / rect.height;
        if (!Number.isFinite(relX) || !Number.isFinite(relY)) return null;
        if (relX < 0 || relX > 1 || relY < 0 || relY > 1) return null;
        return {
          x: viewport.minX + relX * viewport.width,
          y: viewport.minY + relY * viewport.height,
        };
      };

      let drag = null;
      let curveHandleDrag = null;

      surface.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        const handleTarget = event.target?.closest?.('[data-fe-curve-handle-id]');
        if (handleTarget) {
          const start = toSvgPoint(event);
          if (!start) return;
          event.preventDefault();
          event.stopPropagation();
          surface.focus({ preventScroll: true });
          surface.setPointerCapture?.(event.pointerId);
          surface.classList.add('is-dragging');
          curveHandleDrag = {
            pointerId: event.pointerId,
            start,
            current: start,
            moved: false,
            handleId: handleTarget.getAttribute('data-fe-curve-handle-id') || '',
            element: handleTarget,
            baseCx: Number(handleTarget.getAttribute('cx') || 0),
            baseCy: Number(handleTarget.getAttribute('cy') || 0),
          };
          return;
        }
        const start = toSvgPoint(event);
        if (!start) return;
        event.preventDefault();
        surface.focus({ preventScroll: true });
        surface.setPointerCapture?.(event.pointerId);
        surface.classList.add('is-dragging');

        const hitPromise = postJson('/api/hit', { x: start.x, y: start.y }).then((payload) => {
          currentState = payload.state;
          if (drag && drag.pointerId === event.pointerId) {
            drag.selectedObjectId = payload?.state?.view?.properties?.id ?? payload?.state?.view?.canvas?.selectedIds?.[0] ?? null;
          }
          return payload;
        });

        drag = {
          pointerId: event.pointerId,
          start,
          current: start,
          moved: false,
          hitPromise,
          selectedObjectId: null,
        };
      });

      surface.addEventListener('pointermove', (event) => {
        if (curveHandleDrag && event.pointerId === curveHandleDrag.pointerId) {
          const current = toSvgPoint(event);
          if (!current) return;
          curveHandleDrag.current = current;
          const dx = current.x - curveHandleDrag.start.x;
          const dy = current.y - curveHandleDrag.start.y;
          curveHandleDrag.moved = Math.abs(dx) + Math.abs(dy) >= 0.4;
          if (curveHandleDrag.element) {
            curveHandleDrag.element.setAttribute('cx', String(curveHandleDrag.baseCx + dx));
            curveHandleDrag.element.setAttribute('cy', String(curveHandleDrag.baseCy + dy));
          }
          return;
        }
        if (!drag || event.pointerId !== drag.pointerId) return;
        const current = toSvgPoint(event);
        if (!current) return;
        drag.current = current;
        const dx = current.x - drag.start.x;
        const dy = current.y - drag.start.y;
        drag.moved = Math.abs(dx) + Math.abs(dy) >= 0.8;
        if (drag.moved && drag.selectedObjectId) {
          applyOptimisticDrag(surface, drag.selectedObjectId, Number(dx.toFixed(3)), Number(dy.toFixed(3)));
        } else {
          clearOptimisticDrag(surface);
        }
      });

      const finishDrag = async (event, canceled = false) => {
        if (!drag || event.pointerId !== drag.pointerId) return;
        const session = drag;
        drag = null;
        surface.classList.remove('is-dragging');
        surface.releasePointerCapture?.(event.pointerId);

        let hitPayload = null;
        try {
          hitPayload = await session.hitPromise;
          if (hitPayload && hitPayload.state) {
            renderAll(hitPayload.state);
          }
        } catch (error) {
          clearOptimisticDrag(surface);
          setStatus('命中选择失败: ' + (error?.message || String(error)), true);
          return;
        }

        if (canceled || !session.moved) {
          clearOptimisticDrag(surface);
          const selectedType = objectTypeOf(hitPayload?.state?.view?.properties);
          const isTextSelected = selectedType === 'text_node' || selectedType === 'html_block' || selectedType === 'figure_title' || selectedType === 'panel_label';
          if (!isTextSelected) {
            try {
              const textPayload = await postJson('/api/select-text-at', { x: session.start.x, y: session.start.y, maxDistance: 24 });
              const textType = objectTypeOf(textPayload?.state?.view?.properties);
              const textSelected = textType === 'text_node' || textType === 'html_block' || textType === 'figure_title' || textType === 'panel_label';
              if (textSelected) {
                renderAll(textPayload.state);
                setStatus('文本优先选择成功');
                return;
              }
            } catch {
              // ignore text-priority fallback errors
            }
          }
          setStatus('选择成功');
          return;
        }

        const dx = Number((session.current.x - session.start.x).toFixed(3));
        const dy = Number((session.current.y - session.start.y).toFixed(3));
        try {
          const payload = await postJson('/api/move', { dx, dy });
          renderAll(payload.state, { previewMode: 'defer' });
          setStatus('拖拽移动成功');
        } catch (error) {
          clearOptimisticDrag(surface);
          setStatus('拖拽移动失败: ' + (error?.message || String(error)), true);
        }
      };

      const finishCurveHandleDrag = async (event, canceled = false) => {
        if (!curveHandleDrag || event.pointerId !== curveHandleDrag.pointerId) return;
        const session = curveHandleDrag;
        curveHandleDrag = null;
        surface.classList.remove('is-dragging');
        surface.releasePointerCapture?.(event.pointerId);
        if (canceled || !session.moved) {
          renderAll(currentState);
          setStatus('控制点已选中');
          return;
        }
        const dx = Number((session.current.x - session.start.x).toFixed(3));
        const dy = Number((session.current.y - session.start.y).toFixed(3));
        try {
          const payload = await postJson('/api/adjust-curve-handle', {
            handleId: session.handleId,
            dx,
            dy,
          });
          renderAll(payload.state);
          setStatus('控制点调曲线成功');
        } catch (error) {
          renderAll(currentState);
          setStatus('控制点调曲线失败: ' + (error?.message || String(error)), true);
        }
      };

      surface.addEventListener('pointerup', (event) => {
        if (curveHandleDrag && event.pointerId === curveHandleDrag.pointerId) {
          finishCurveHandleDrag(event, false);
          return;
        }
        finishDrag(event, false);
      });
      surface.addEventListener('pointercancel', (event) => {
        if (curveHandleDrag && event.pointerId === curveHandleDrag.pointerId) {
          finishCurveHandleDrag(event, true);
          return;
        }
        finishDrag(event, true);
      });

      surface.addEventListener('dblclick', async (event) => {
        const p = toSvgPoint(event);
        if (!p) return;
        surface.focus({ preventScroll: true });
        try {
          let selectPayload = null;
          try {
            selectPayload = await postJson('/api/select-text-at', { x: p.x, y: p.y, maxDistance: 36 });
          } catch {
            selectPayload = null;
          }
          if (!selectPayload || !selectPayload.state || !selectPayload.state.view?.properties) {
            selectPayload = await postJson('/api/hit', { x: p.x, y: p.y });
          }
          if (selectPayload && selectPayload.state) {
            renderAll(selectPayload.state);
          }
          const props = selectPayload?.state?.view?.properties;
          const currentText =
            typeof props?.extra?.content === 'string'
              ? props.extra.content
              : typeof props?.extra?.textContent === 'string'
                ? props.extra.textContent
                : '';
          const propType = objectTypeOf(props);
          const editableType = propType === 'text_node' || propType === 'html_block';
          if (!editableType && currentText.length === 0) {
            const createText = window.prompt('当前点位没有可编辑文本。输入新文本以在此处创建文本对象', '');
            if (createText === null) {
              setStatus('已取消新增文本');
              return;
            }
            if (String(createText).trim().length === 0) {
              setStatus('新增文本为空，已取消', true);
              return;
            }
            const addPayload = await postJson('/api/add-text', { x: p.x, y: p.y, content: createText });
            renderAll(addPayload.state);
            setStatus('新增文本成功');
            return;
          }
          if (!editableType) {
            setStatus('当前点位没有可编辑文本。请双击空白处新增文本，或先选中文本对象后再编辑。', true);
            return;
          }
          const next = window.prompt('编辑文本内容', currentText);
          if (next === null) return;
          if (next === currentText) {
            setStatus('文本未变化');
            return;
          }
          const editPayload = await postJson('/api/edit-text', { content: next });
          renderAll(editPayload.state);
          setStatus('文本编辑成功');
        } catch (error) {
          setStatus('双击编辑失败: ' + (error?.message || String(error)), true);
        }
      });
    }

    function renderPreview(state) {
      const hasPreview = Boolean(state?.preview?.svgDataUrl);
      const sanitizedCount = Number(state?.preview?.sanitizedCount || 0);
      const treeCount = state?.linkedStatus?.treeNodeCount ?? 0;
      const selectedId = state?.view?.canvas?.selectedIds?.[0] || '(none)';
      const revision = Number(state?.window?.renderRevision || 0);
      const viewport = state?.preview?.viewport || null;
      const aspectRatio = viewport && viewport.width > 0 ? (viewport.height / viewport.width) : 0.62;
      const frameHeight = Math.max(420, Math.min(1200, Math.round(900 * aspectRatio)));

      if (!hasPreview) {
        previewBody.innerHTML = '<p class="muted">暂无可预览内容，请先导入文件。</p>';
        mountedPreviewRevision = null;
        return;
      }

      let surface = previewBody.querySelector('[data-fe-preview-surface="1"]');
      let warningEl = previewBody.querySelector('.preview-warning');
      let summaryEl = previewBody.querySelector('.preview-summary');
      if (!surface || !warningEl || !summaryEl) {
        previewBody.innerHTML =
          '<div data-fe-preview-surface="1" class="preview-surface"></div>' +
          '<div class="preview-warning" style="display:none"></div>' +
          '<div class="preview-summary"></div>';
        surface = previewBody.querySelector('[data-fe-preview-surface="1"]');
        warningEl = previewBody.querySelector('.preview-warning');
        summaryEl = previewBody.querySelector('.preview-summary');
      }
      if (!surface || !warningEl || !summaryEl) return;

      surface.setAttribute('tabindex', '0');
      surface.style.height = frameHeight + 'px';
      if (sanitizedCount > 0) {
        warningEl.style.display = 'block';
        warningEl.textContent = '预览防护已启用：检测到 ' + sanitizedCount + ' 个大面积黑填充 shape，已在 GUI 预览中转为线框显示。';
      } else {
        warningEl.style.display = 'none';
        warningEl.textContent = '';
      }
      summaryEl.textContent = 'objects: ' + treeCount + ' · selected: ' + String(selectedId);

      if (mountedPreviewRevision === revision) {
        clearOptimisticDrag(surface);
        const svg = surface.querySelector('svg');
        if (svg) {
          surface._fePreviewViewport = state?.preview?.viewport ?? null;
          applySelectionOverlay(svg, state);
          applyCurveHandles(svg, state);
        }
        return;
      }

      mountedPreviewRevision = revision;
      const query = '?rev=' + encodeURIComponent(String(revision));
      previewRenderToken += 1;
      const token = previewRenderToken;
      mountInteractivePreview(surface, query, token, state);
    }

    function flushDeferredPreview() {
      if (!deferredPreviewState) return;
      const state = deferredPreviewState;
      deferredPreviewState = null;
      deferredPreviewTimer = null;
      renderPreview(state);
    }

    function schedulePreviewRender(state, delay = 120) {
      deferredPreviewState = state;
      if (deferredPreviewTimer !== null) {
        window.clearTimeout(deferredPreviewTimer);
      }
      deferredPreviewTimer = window.setTimeout(() => {
        flushDeferredPreview();
      }, delay);
    }

    function renderAll(state, options) {
      currentState = state;
      const previewMode = options?.previewMode || 'immediate';
      const saveInput = document.getElementById('project-save-path');
      const suggestedSavePath = String(state?.defaultSavePath || '').trim();
      const currentValue = String(saveInput?.value || '').trim();
      if (saveInput && suggestedSavePath && (!currentValue || saveInput.dataset.feAutoSuggested === '1')) {
        saveInput.value = suggestedSavePath;
        saveInput.dataset.feAutoSuggested = '1';
      }
      if (previewMode === 'defer') {
        schedulePreviewRender(state);
        return;
      }
      if (deferredPreviewTimer !== null) {
        window.clearTimeout(deferredPreviewTimer);
        deferredPreviewTimer = null;
      }
      deferredPreviewState = null;
      renderPreview(state);
    }

    async function refreshState() {
      const res = await fetch('/api/state');
      const payload = await res.json();
      if (!res.ok || payload.ok === false) {
        throw new Error(payload.error || ('request failed: ' + res.status));
      }
      renderAll(payload.state);
      return payload.state;
    }

    async function runAction(label, fn) {
      try {
        const payload = await fn();
        renderAll(payload.state);
        setStatus(label + ' 成功');
      } catch (error) {
        setStatus(label + ' 失败: ' + (error?.message || String(error)), true);
      }
    }

    function saveLabelForPath(filePath) {
      const ext = String(filePath || '').trim().toLowerCase();
      if (!ext) return '保存 full-size PNG';
      if (ext.endsWith('.json')) return '保存工程';
      if (ext.endsWith('.html') || ext.endsWith('.htm')) return '导出 HTML';
      if (ext.endsWith('.svg')) return '导出 SVG';
      return '导出 PNG';
    }

    function saveSuccessMessage(payload, requestedPath) {
      const savedPath = String(payload?.savedPath || requestedPath || '').trim();
      const savedMode = String(payload?.savedMode || detectSaveMode(savedPath || requestedPath));
      if (savedMode === 'project') return '保存工程成功: ' + savedPath;
      if (savedMode === 'html') return '导出 HTML 成功: ' + savedPath;
      if (savedMode === 'svg') return '导出 SVG 成功: ' + savedPath;
      return '导出 full-size PNG 成功: ' + savedPath;
    }

    document.getElementById('btn-import-path').addEventListener('click', async () => {
      const filePath = document.getElementById('import-path').value.trim();
      if (!filePath) {
        setStatus('请先输入文件路径', true);
        return;
      }
      await runAction('导入文件', () =>
        postJson('/api/import-path', { path: filePath, familyHint: 'unknown', htmlMode: 'limited' })
      );
    });

    document.getElementById('import-file').addEventListener('change', async (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      const text = await file.text();
      const name = file.name || ('upload_' + Date.now() + '.svg');
      const hintedPath = document.getElementById('import-path').value.trim();
      const kind = name.toLowerCase().endsWith('.html') || name.toLowerCase().endsWith('.htm') ? 'html' : 'svg';
      await runAction('导入文件', () =>
        postJson('/api/import-content', { path: hintedPath || name, content: text, kind, familyHint: 'unknown', htmlMode: 'limited' })
      );
      event.target.value = '';
    });

    document.getElementById('project-save-path').addEventListener('input', (event) => {
      event.currentTarget.dataset.feAutoSuggested = '0';
    });

    document.getElementById('btn-save-project').addEventListener('click', async () => {
      const filePath = document.getElementById('project-save-path').value.trim();
      try {
        const payload = await postJson('/api/save-artifact', { path: filePath });
        if (payload?.savedPath) {
          document.getElementById('project-save-path').value = payload.savedPath;
          document.getElementById('project-save-path').dataset.feAutoSuggested = '1';
        }
        renderAll(payload.state);
        setStatus(saveSuccessMessage(payload, filePath));
      } catch (error) {
        setStatus(saveLabelForPath(filePath) + '失败: ' + (error?.message || String(error)), true);
      }
    });

    document.addEventListener('keydown', async (event) => {
      const active = document.activeElement;
      const tag = active && active.tagName ? String(active.tagName).toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || active?.isContentEditable) {
        return;
      }

      const selectedCount = Number(currentState?.linkedStatus?.selectedCount || 0);
      const hasSelection = selectedCount > 0;

      if ((event.ctrlKey || event.metaKey) && String(event.key).toLowerCase() === 's') {
        event.preventDefault();
        const filePath = document.getElementById('project-save-path').value.trim();
        try {
          const payload = await postJson('/api/save-artifact', { path: filePath });
          if (payload?.savedPath) {
            document.getElementById('project-save-path').value = payload.savedPath;
            document.getElementById('project-save-path').dataset.feAutoSuggested = '1';
          }
          renderAll(payload.state);
          setStatus(saveSuccessMessage(payload, filePath));
        } catch (error) {
          setStatus(saveLabelForPath(filePath) + '失败: ' + (error?.message || String(error)), true);
        }
        return;
      }

      if ((event.ctrlKey || event.metaKey) && String(event.key).toLowerCase() === 'z') {
        event.preventDefault();
        const endpoint = event.shiftKey ? '/api/redo' : '/api/undo';
        const actionLabel = event.shiftKey ? '重做' : '撤销';
        try {
          const payload = await postJson(endpoint, {});
          renderAll(payload.state);
          setStatus(actionLabel + '成功');
        } catch (error) {
          setStatus(actionLabel + '失败: ' + (error?.message || String(error)), true);
        }
        return;
      }

      if ((event.ctrlKey || event.metaKey) && String(event.key).toLowerCase() === 'y') {
        event.preventDefault();
        try {
          const payload = await postJson('/api/redo', {});
          renderAll(payload.state);
          setStatus('重做成功');
        } catch (error) {
          setStatus('重做失败: ' + (error?.message || String(error)), true);
        }
        return;
      }

      if (!hasSelection) return;

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        try {
          const payload = await postJson('/api/delete', {});
          renderAll(payload.state);
          setStatus('删除成功');
        } catch (error) {
          setStatus('删除失败: ' + (error?.message || String(error)), true);
        }
        return;
      }

      if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
        event.preventDefault();
        const curveDelta = event.key === 'ArrowUp' ? -(event.shiftKey ? 24 : 12) : (event.shiftKey ? 24 : 12);
        try {
          const payload = await postJson('/api/adjust-curve', { deltaY: curveDelta });
          renderAll(payload.state, { previewMode: 'defer' });
          setStatus('曲线调节成功 (' + curveDelta + ')');
        } catch (error) {
          setStatus('曲线调节失败: ' + (error?.message || String(error)), true);
        }
        return;
      }

      let dx = 0;
      let dy = 0;
      const step = event.shiftKey ? 10 : 1;
      if (event.key === 'ArrowLeft') dx = -step;
      if (event.key === 'ArrowRight') dx = step;
      if (event.key === 'ArrowUp') dy = -step;
      if (event.key === 'ArrowDown') dy = step;
      if (dx === 0 && dy === 0) return;
      event.preventDefault();
      try {
        const payload = await postJson('/api/move', { dx, dy });
        renderAll(payload.state, { previewMode: 'defer' });
        setStatus('微调移动成功 (' + dx + ', ' + dy + ')');
      } catch (error) {
        setStatus('微调移动失败: ' + (error?.message || String(error)), true);
      }
    });

    refreshState()
      .then(() => setStatus('GUI Runtime 已连接'))
      .catch((error) => setStatus('初始化失败: ' + (error?.message || String(error)), true));
  </script>
</body>
</html>`;
}

function openBrowser(url) {
  const spawnDetached = (cmd, args) => {
    try {
      const child = spawn(cmd, args, {
        detached: true,
        stdio: 'ignore',
      });
      child.on('error', () => {
        // ignore launcher errors
      });
      child.unref();
      return true;
    } catch {
      return false;
    }
  };

  try {
    const cmdPath = '/mnt/c/Windows/system32/cmd.exe';
    if (fs.existsSync(cmdPath)) {
      return spawnDetached(cmdPath, ['/C', 'start', '', url]);
    }
  } catch {
    // ignore
  }
  return spawnDetached('xdg-open', [url]);
}

function createRouter(shell) {
  const previewCache = {
    revision: -1,
    payload: null,
  };
  return async function handle(req, res) {
    const method = req.method || 'GET';
    const pathname = new URL(req.url || '/', 'http://localhost').pathname;

    if (method === 'GET' && pathname === '/') {
      send(res, 200, htmlPage(server.address().port), 'text/html; charset=utf-8');
      return;
    }

    if (method === 'GET' && pathname === '/api/state') {
      send(res, 200, { ok: true, state: createSnapshot(shell, previewCache) });
      return;
    }

    if (method === 'GET' && pathname === '/api/preview.svg') {
      try {
        const rawSvg = shell.getPreviewSvgContent();
        if (typeof rawSvg !== 'string' || rawSvg.trim().length === 0) {
          send(res, 404, '<svg xmlns="http://www.w3.org/2000/svg"></svg>', 'image/svg+xml; charset=utf-8');
          return;
        }
        const sanitized = sanitizePreviewSvgForGui(rawSvg);
        send(res, 200, sanitized.svg, 'image/svg+xml; charset=utf-8');
      } catch (error) {
        send(
          res,
          500,
          `<svg xmlns="http://www.w3.org/2000/svg"><text x="12" y="24">preview error: ${String(error instanceof Error ? error.message : error)}</text></svg>`,
          'image/svg+xml; charset=utf-8'
        );
      }
      return;
    }

    if (method !== 'POST' || !pathname.startsWith('/api/')) {
      send(res, 404, { ok: false, error: 'Not found' });
      return;
    }

    let body = {};
    try {
      body = await readJson(req);
    } catch (error) {
      send(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
      return;
    }

    try {
      let responseExtra = null;
      switch (pathname) {
        case '/api/import-path': {
          const filePath = String(body.path || '').trim();
          const familyHint = String(body.familyHint || 'unknown');
          const htmlMode = String(body.htmlMode || 'limited');
          if (!filePath) throw new Error('Missing path');
          shell.importFromFile(filePath, familyHint, htmlMode);
          break;
        }
        case '/api/import-content': {
          const content = String(body.content || '');
          const sourcePath = String(body.path || `upload_${Date.now()}.svg`);
          const kindRaw = String(body.kind || detectKindByPath(sourcePath));
          const kind = kindRaw === 'html' ? 'html' : 'svg';
          const familyHint = String(body.familyHint || 'unknown');
          const htmlMode = String(body.htmlMode || 'limited');
          if (!content) throw new Error('Missing content');
          shell.importDocument({
            path: sourcePath,
            content,
            kind,
            familyHint,
            htmlMode,
          });
          break;
        }
        case '/api/select': {
          const objectId = String(body.objectId || '').trim();
          if (!objectId) throw new Error('Missing objectId');
          shell.selectObject(objectId);
          break;
        }
        case '/api/select-first-text':
          shell.selectFirstEditableText();
          break;
        case '/api/hit': {
          const x = Number(body.x);
          const y = Number(body.y);
          if (!Number.isFinite(x) || !Number.isFinite(y)) {
            throw new Error('Invalid hit coordinate');
          }
          shell.selectAtPoint(x, y);
          break;
        }
        case '/api/select-text-at': {
          const x = Number(body.x);
          const y = Number(body.y);
          const maxDistance = Number(body.maxDistance ?? 32);
          if (!Number.isFinite(x) || !Number.isFinite(y)) {
            throw new Error('Invalid text selection coordinate');
          }
          shell.selectTextAtPoint(x, y, Number.isFinite(maxDistance) ? maxDistance : 32);
          break;
        }
        case '/api/move': {
          const dx = Number(body.dx || 0);
          const dy = Number(body.dy || 0);
          shell.moveSelected(dx, dy);
          break;
        }
        case '/api/adjust-curve': {
          const deltaY = Number(body.deltaY || 0);
          shell.adjustSelectedCurve(deltaY);
          break;
        }
        case '/api/adjust-curve-handle': {
          const handleId = String(body.handleId || '').trim();
          const dx = Number(body.dx || 0);
          const dy = Number(body.dy || 0);
          if (!handleId) throw new Error('Missing handleId');
          shell.adjustSelectedCurveHandle(handleId, dx, dy);
          break;
        }
        case '/api/edit-text': {
          const content = String(body.content || '');
          if (!content) throw new Error('Missing content');
          shell.editSelectedText(content);
          break;
        }
        case '/api/add-text': {
          const x = Number(body.x);
          const y = Number(body.y);
          const content = String(body.content ?? '').trim();
          if (!Number.isFinite(x) || !Number.isFinite(y)) {
            throw new Error('Invalid add-text coordinate');
          }
          if (!content) {
            throw new Error('Missing text content');
          }
          shell.addTextAtPoint(x, y, content);
          break;
        }
        case '/api/promote': {
          const role = String(body.role || 'panel');
          shell.promoteSelection(role, 'desktop_gui_server');
          break;
        }
        case '/api/delete':
          shell.deleteSelected();
          break;
        case '/api/undo':
          shell.undo();
          break;
        case '/api/redo':
          shell.redo();
          break;
        case '/api/export-svg': {
          const outPath = String(body.path || '').trim();
          if (!outPath) throw new Error('Missing path');
          shell.exportSvgToFile(outPath);
          break;
        }
        case '/api/export-html': {
          const outPath = String(body.path || '').trim();
          if (!outPath) throw new Error('Missing path');
          shell.exportHtmlToFile(outPath);
          break;
        }
        case '/api/save-project': {
          const outPath = String(body.path || '').trim();
          if (!outPath) throw new Error('Missing path');
          shell.saveProjectToFile(outPath);
          break;
        }
        case '/api/save-artifact': {
          const requestedPath = String(body.path || '').trim();
          const outPath = requestedPath || shell.suggestDefaultPngPath() || path.resolve(process.cwd(), 'figure_full.png');
          const mode = detectSaveMode(outPath);
          if (mode === 'project') {
            shell.saveProjectToFile(outPath);
          } else if (mode === 'html') {
            shell.exportHtmlToFile(outPath);
          } else if (mode === 'svg') {
            shell.exportSvgToFile(outPath);
          } else {
            shell.exportPngToFile(outPath, 300);
          }
          responseExtra = {
            savedPath: outPath,
            savedMode: mode,
            savedDpi: null,
          };
          break;
        }
        case '/api/load-project': {
          const inPath = String(body.path || '').trim();
          if (!inPath) throw new Error('Missing path');
          shell.loadProjectFromFile(inPath);
          break;
        }
        default:
          throw new Error(`Unsupported endpoint: ${pathname}`);
      }
      send(res, 200, { ok: true, state: createSnapshot(shell, previewCache), ...(responseExtra || {}) });
    } catch (error) {
      send(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  };
}

let server = null;

function startDesktopGuiServer(options = {}) {
  const host = options.host || '127.0.0.1';
  const port = Number.isFinite(options.port) ? Number(options.port) : 3210;
  const autoOpen = options.open !== false;

  const shell = createDesktopAppShell();
  shell.launchWindow();

  server = http.createServer();
  const handler = createRouter(shell);
  server.on('request', (req, res) => {
    handler(req, res);
  });

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(port, host, () => {
      const address = server.address();
      const actualPort = typeof address === 'object' && address ? address.port : port;
      const url = `http://${host}:${actualPort}/`;
      if (autoOpen) openBrowser(url);
      resolve({ host, port: actualPort, url, server });
    });
  });
}

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  startDesktopGuiServer(args)
    .then(({ url }) => {
      console.log(JSON.stringify({ url, mode: 'desktop_gui_runtime' }, null, 2));
      console.log('DESKTOP_GUI_SERVER_READY');
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack : String(error));
      process.exit(1);
    });
}

module.exports = {
  startDesktopGuiServer,
};
