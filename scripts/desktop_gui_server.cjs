const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { spawn } = require('node:child_process');
const {
  buildFontFaceCss,
  getBundledFontFamilies,
  getBundledFontPresetOptions,
  getBundledFontStackPresets,
  getFontPackRoot,
} = require('./font_pack.cjs');

const distEntry = path.resolve(__dirname, '../apps/desktop/dist/main/index.js');
if (!fs.existsSync(distEntry)) {
  throw new Error('Missing apps/desktop/dist/main/index.js. Run: npm run build:desktop');
}

const { createDesktopAppShell } = require(distEntry);
const FONT_PACK_ROOT = getFontPackRoot();
const FONT_PRESET_OPTIONS = getBundledFontPresetOptions();
const FONT_FAMILIES = getBundledFontFamilies();
const FONT_STACK_PRESETS = getBundledFontStackPresets();
const FONT_FACE_CSS = buildFontFaceCss('/fonts');
const ROOT_PACKAGE_JSON = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8'));
const DISPLAY_VERSION = String(ROOT_PACKAGE_JSON.displayVersion ?? ROOT_PACKAGE_JSON.version ?? '0.0.2');
const SYSTEM_FONT_OPTIONS = [
  {
    value: 'Times New Roman',
    label: 'Times New Roman',
    family: 'Times New Roman, Times, serif',
  },
];

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
  if (Buffer.isBuffer(payload)) {
    res.end(payload);
    return;
  }
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

function escapeHtmlAttribute(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderFontSelectOptions() {
  const renderOption = (value, label, family = value) =>
    `            <option value="${escapeHtmlAttribute(value)}" style="font-family: ${escapeHtmlAttribute(family)};">Aa ${escapeHtmlAttribute(label)}</option>`;

  return [
    '          <optgroup label="默认字体栈">',
    renderOption(FONT_STACK_PRESETS.sans, '默认 Sans 栈'),
    renderOption(FONT_STACK_PRESETS.serif, '默认 Serif 栈'),
    renderOption(FONT_STACK_PRESETS.cjkSans, '默认 CJK Sans 栈'),
    renderOption(FONT_STACK_PRESETS.cjkSerif, '默认 CJK Serif 栈'),
    renderOption(FONT_STACK_PRESETS.mono, '默认 Mono 栈'),
    '          </optgroup>',
    '          <optgroup label="常用免费字体">',
    ...FONT_FAMILIES.map((fontFamily) => renderOption(fontFamily, fontFamily)),
    '          </optgroup>',
    '          <optgroup label="系统常用字体">',
    ...SYSTEM_FONT_OPTIONS.map((item) => renderOption(item.value, item.label, item.family)),
    '          </optgroup>',
  ].join('\n');
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
  let previewSvgMarkup = '';
  try {
    const rawSvg = shell.getPreviewSvgContent();
    if (typeof rawSvg === 'string' && rawSvg.trim().length > 0) {
      const sanitized = sanitizePreviewSvgForGui(rawSvg);
      previewSvgDataUrl = 'ready';
      previewViewport = parseSvgViewport(sanitized.svg);
      previewSanitizedCount = sanitized.sanitizedCount;
      previewSanitizeReason = sanitized.reason;
      previewSvgMarkup = sanitized.svg;
    }
  } catch {
    previewSvgDataUrl = null;
    previewViewport = null;
    previewSanitizedCount = 0;
    previewSanitizeReason = null;
    previewSvgMarkup = '';
  }
  return {
    preview: {
      svgDataUrl: previewSvgDataUrl,
      viewport: previewViewport,
      sanitizedCount: previewSanitizedCount,
      sanitizeReason: previewSanitizeReason,
    },
    svg: previewSvgMarkup,
  };
}

function ensurePreviewPayload(shell, previewCache, windowState) {
  if (previewCache && previewCache.revision === windowState.renderRevision && previewCache.payload) {
    return previewCache.payload;
  }
  const built = buildPreviewSnapshot(shell);
  if (previewCache) {
    previewCache.revision = windowState.renderRevision;
    previewCache.payload = built.preview;
    previewCache.svg = built.svg;
  }
  return built.preview;
}

function createSnapshot(shell, previewCache) {
  const windowState = shell.getWindowSession();
  const view = shell.snapshot();
  const linkedStatus = shell.getLinkedStatus();
  const defaultSavePath = shell.suggestDefaultPngPath();
  const preview = ensurePreviewPayload(shell, previewCache, windowState);
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
  <title>Easy Plot v${DISPLAY_VERSION}</title>
  <style>
${FONT_FACE_CSS}
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
      font-family: ${FONT_STACK_PRESETS.sans};
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
    .workspace {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 360px;
      gap: 10px;
      padding: 0 10px 10px;
      align-items: start;
    }
    .workspace-main,
    .workspace-sidebar {
      min-width: 0;
    }
    .preview-card {
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
    .sidebar-card + .sidebar-card {
      margin-top: 10px;
    }
    .sidebar-card h4 {
      margin: 10px 0 6px;
      font-size: 12px;
      color: #2c3d55;
    }
    .sidebar-copy {
      font-size: 12px;
      line-height: 1.5;
      color: var(--muted);
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
      min-width: 120px;
    }
    .field span {
      font-size: 11px;
      color: var(--muted);
    }
    .field input[type="number"],
    .field input[type="text"],
    .field input[type="color"] {
      width: 100%;
      min-width: 0;
    }
    .field input[type="color"] {
      min-height: 34px;
      padding: 4px;
    }
    .toolbar {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
      margin: 8px 0;
    }
    .toolbar button {
      min-width: 36px;
      font-weight: 700;
    }
    .toolbar button.is-active {
      background: #e8f0ff;
      border-color: #9cbef4;
      color: #0b4bb3;
    }
    .toolbar button:disabled,
    .field input:disabled {
      opacity: 0.55;
      cursor: not-allowed;
      background: #f7f9fc;
    }
    .selection-summary {
      display: grid;
      gap: 6px;
      font-size: 12px;
    }
    .selection-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      border-radius: 999px;
      background: #eef4ff;
      color: #2957a4;
      font-size: 11px;
      font-weight: 600;
    }
    .style-preview {
      margin-top: 10px;
      padding: 10px 12px;
      border: 1px dashed #c8d7f2;
      border-radius: 8px;
      background: linear-gradient(180deg, #fbfdff, #f4f8ff);
      min-height: 72px;
      display: flex;
      align-items: center;
    }
    .style-preview-text {
      word-break: break-word;
    }
    @media (max-width: 980px) {
      .controls {
        grid-template-columns: 1fr;
      }
      .workspace {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <header class="topbar">
    <div class="title">Easy Plot v${DISPLAY_VERSION}</div>
    <div class="meta">localhost:${port} · 正式版本 ${DISPLAY_VERSION} · 点击选择 / Shift+点击多选 / 拖拽移动 / 右键拖动对象或容器改位置 / 拖控制点调曲线 / 双击改字或空白新建 / Ctrl+滚轮缩放预览 / Esc 取消选择 / Delete 删除 / 方向键微调 / Alt+↑↓ 调曲线 / Ctrl+S 保存</div>
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

  <section class="workspace">
    <div class="workspace-main">
      <section class="preview-card">
        <h3>预览</h3>
        <div id="preview-body" class="preview-body"></div>
      </section>
    </div>
    <aside class="workspace-sidebar">
      <section class="card sidebar-card">
        <h3>选择摘要</h3>
        <div id="selection-summary" class="selection-summary">
          <div class="sidebar-copy">当前未选中对象。Esc 可清空当前选择，Ctrl+V 可粘贴已复制对象。</div>
        </div>
      </section>
      <section class="card sidebar-card">
        <h3>对象外观</h3>
        <div class="sidebar-copy">颜色控制会作用到当前对象及其可着色子对象；文本对象额外支持字体、字号、粗体、斜体。字体库已预置常用论文和开源字体，预览图里可右键拖动对象或其外层容器改位置。</div>
        <div class="row">
          <label class="field">
            <span>填充 / 文本颜色</span>
            <input id="style-fill-color" type="color" value="#111827" />
          </label>
          <label class="field">
            <span>描边颜色</span>
            <input id="style-stroke-color" type="color" value="#334155" />
          </label>
        </div>
        <h4>文本格式</h4>
        <div class="row">
          <label class="field">
            <span>字体</span>
            <select id="style-font-family">
${renderFontSelectOptions()}
            </select>
          </label>
        </div>
        <div class="row">
          <label class="field">
            <span>字号</span>
            <input id="style-font-size" type="number" min="6" max="256" step="1" />
          </label>
        </div>
        <div class="toolbar">
          <button id="style-bold" type="button" title="粗体">B</button>
          <button id="style-italic" type="button" title="斜体"><em>I</em></button>
          <button id="btn-apply-appearance" class="primary" type="button">应用外观</button>
          <button id="btn-unify-document-font" type="button">统一全文档字体</button>
        </div>
        <div id="appearance-hint" class="sidebar-copy">请先选中对象。</div>
        <div class="style-preview">
          <div id="style-preview-text" class="style-preview-text">Aa 文本预览</div>
        </div>
      </section>
      <section class="card sidebar-card">
        <h3>布局整理</h3>
        <div class="sidebar-copy">Shift+点击可加入多选。至少选中 2 个对象可以对齐，至少 3 个对象可以分布。</div>
        <h4>对齐</h4>
        <div class="toolbar">
          <button id="btn-align-left" type="button">左对齐</button>
          <button id="btn-align-right" type="button">右对齐</button>
          <button id="btn-align-top" type="button">上对齐</button>
          <button id="btn-align-bottom" type="button">下对齐</button>
          <button id="btn-align-center-h" type="button">水平居中</button>
          <button id="btn-align-center-v" type="button">垂直居中</button>
        </div>
        <h4>分布</h4>
        <div class="toolbar">
          <button id="btn-distribute-h" type="button">水平分布</button>
          <button id="btn-distribute-v" type="button">垂直分布</button>
        </div>
        <div id="layout-hint" class="sidebar-copy">请至少选中 2 个对象。</div>
      </section>
    </aside>
  </section>

  <script>
    const statusEl = document.getElementById('status');
    const previewBody = document.getElementById('preview-body');
    const selectionSummaryEl = document.getElementById('selection-summary');
    const fillColorInput = document.getElementById('style-fill-color');
    const strokeColorInput = document.getElementById('style-stroke-color');
    const fontFamilyInput = document.getElementById('style-font-family');
    const fontSizeInput = document.getElementById('style-font-size');
    const boldButton = document.getElementById('style-bold');
    const italicButton = document.getElementById('style-italic');
    const applyAppearanceButton = document.getElementById('btn-apply-appearance');
    const documentFontButton = document.getElementById('btn-unify-document-font');
    const appearanceHintEl = document.getElementById('appearance-hint');
    const stylePreviewTextEl = document.getElementById('style-preview-text');
    const alignLeftButton = document.getElementById('btn-align-left');
    const alignRightButton = document.getElementById('btn-align-right');
    const alignTopButton = document.getElementById('btn-align-top');
    const alignBottomButton = document.getElementById('btn-align-bottom');
    const alignCenterHButton = document.getElementById('btn-align-center-h');
    const alignCenterVButton = document.getElementById('btn-align-center-v');
    const distributeHButton = document.getElementById('btn-distribute-h');
    const distributeVButton = document.getElementById('btn-distribute-v');
    const layoutHintEl = document.getElementById('layout-hint');
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

    function normalizeColorForInput(value) {
      const raw = String(value ?? '').trim();
      if (/^#([0-9a-f]{6})$/i.test(raw)) return raw.toLowerCase();
      const shortHex = raw.match(/^#([0-9a-f]{3})$/i);
      if (shortHex) {
        return '#' + shortHex[1].split('').map((part) => part + part).join('').toLowerCase();
      }
      const rgb = raw.match(/^rgb\\(\\s*(\\d{1,3})\\s*,\\s*(\\d{1,3})\\s*,\\s*(\\d{1,3})\\s*\\)$/i);
      if (rgb) {
        const clamp = (item) => Math.max(0, Math.min(255, Number(item)));
        return '#' + [clamp(rgb[1]), clamp(rgb[2]), clamp(rgb[3])]
          .map((item) => item.toString(16).padStart(2, '0'))
          .join('');
      }
      return '#111827';
    }

    function setToggleButtonState(button, active) {
      button.dataset.active = active ? '1' : '0';
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    }

    function setTextStyleControlsDisabled(disabled) {
      fontSizeInput.disabled = disabled;
      boldButton.disabled = disabled;
      italicButton.disabled = disabled;
    }

    function setDocumentFontButtonDisabled(disabled) {
      documentFontButton.disabled = disabled;
    }

    function setAppearanceColorControlsDisabled(disabled) {
      fillColorInput.disabled = disabled;
      strokeColorInput.disabled = disabled;
    }

    function ensureFontFamilyOption(value) {
      const normalized = String(value ?? '').trim();
      if (!normalized) return;
      const existing = fontFamilyInput.querySelector('option[value="' + selectorEscape(normalized) + '"]');
      if (existing) return;
      const option = document.createElement('option');
      option.value = normalized;
      option.textContent = 'Aa 当前: ' + normalized;
      option.style.fontFamily = normalized;
      option.title = normalized;
      option.dataset.dynamic = '1';
      fontFamilyInput.appendChild(option);
    }

    function setFontFamilySelectValue(value) {
      const nextValue = String(value ?? '').trim() || ${JSON.stringify(FONT_STACK_PRESETS.sans)};
      ensureFontFamilyOption(nextValue);
      fontFamilyInput.value = nextValue;
      fontFamilyInput.style.fontFamily = nextValue;
    }

    function setApplyAppearanceDisabled(disabled) {
      applyAppearanceButton.disabled = disabled;
    }

    function setLayoutControlsDisabled(disabled, selectedCount = 0) {
      const canAlign = !disabled && selectedCount >= 2;
      const canDistribute = !disabled && selectedCount >= 3;
      alignLeftButton.disabled = !canAlign;
      alignRightButton.disabled = !canAlign;
      alignTopButton.disabled = !canAlign;
      alignBottomButton.disabled = !canAlign;
      alignCenterHButton.disabled = !canAlign;
      alignCenterVButton.disabled = !canAlign;
      distributeHButton.disabled = !canDistribute;
      distributeVButton.disabled = !canDistribute;
      if (layoutHintEl) {
        if (disabled || selectedCount === 0) {
          layoutHintEl.textContent = '请至少选中 2 个对象。Shift+点击可加入多选。';
        } else if (selectedCount === 1) {
          layoutHintEl.textContent = '当前只选中了 1 个对象。继续 Shift+点击可追加多选。';
        } else if (selectedCount === 2) {
          layoutHintEl.textContent = '可执行对齐；分布需要至少 3 个对象。';
        } else {
          layoutHintEl.textContent = '可执行对齐和分布。';
        }
      }
    }

    function applyPreviewTextStyle(textStyle) {
      const previewText = textStyle?.content?.trim() || 'Aa 文本预览';
      stylePreviewTextEl.textContent = previewText;
      stylePreviewTextEl.style.fontFamily = textStyle?.fontFamily || ${JSON.stringify(FONT_STACK_PRESETS.sans)};
      stylePreviewTextEl.style.fontSize = String(Math.max(10, Number(textStyle?.fontSize || 16))) + 'px';
      stylePreviewTextEl.style.fontWeight = String(textStyle?.fontWeight || '400');
      stylePreviewTextEl.style.fontStyle = String(textStyle?.fontStyle || 'normal');
      stylePreviewTextEl.style.color = String(textStyle?.fill || fillColorInput.value || '#111827');
    }

    function syncSelectionSidebar(state) {
      const props = state?.view?.properties || null;
      const textStyle = props?.textStyle || null;
      const appearance = props?.appearance || null;
      const selectedIds = Array.isArray(state?.view?.canvas?.selectedIds) ? state.view.canvas.selectedIds : [];
      const hasDocument = Boolean(state);
      const selectedCount = selectedIds.length;
      fontFamilyInput.disabled = !hasDocument;
      setDocumentFontButtonDisabled(!hasDocument);
      if (!props) {
        selectionSummaryEl.innerHTML = '<div class="sidebar-copy">当前未选中对象。拖拽画布、双击文本或点击对象后，这里会显示摘要。Esc 可清空当前选择，Ctrl+V 可粘贴已复制对象。若要统一全文档字体，请先在字体下拉中选好字体，再点击“统一全文档字体”。</div>';
        setTextStyleControlsDisabled(true);
        setAppearanceColorControlsDisabled(true);
        setApplyAppearanceDisabled(true);
        setLayoutControlsDisabled(true, 0);
        fillColorInput.value = '#111827';
        strokeColorInput.value = '#334155';
        const nextFontFamily = String(fontFamilyInput.value || ${JSON.stringify(FONT_STACK_PRESETS.sans)}).trim() || ${JSON.stringify(FONT_STACK_PRESETS.sans)};
        ensureFontFamilyOption(nextFontFamily);
        fontFamilyInput.value = nextFontFamily;
        fontFamilyInput.style.fontFamily = nextFontFamily;
        fontSizeInput.value = '';
        setToggleButtonState(boldButton, false);
        setToggleButtonState(italicButton, false);
        appearanceHintEl.textContent = hasDocument
          ? '当前没有选择对象；可直接使用“统一全文档字体”批量更新所有文本。'
          : '请先导入文档。';
        applyPreviewTextStyle({
          fontFamily: fontFamilyInput.value,
          fill: fillColorInput.value,
        });
        return;
      }

      const contentPreview = typeof props?.extra?.content === 'string' ? props.extra.content : '';
      const selectionLabel = selectedCount > 1 ? '多选' : (props.objectType || 'unknown');
      const textTargetCount = Number(props?.extra?.textTargetCount || (textStyle ? 1 : 0));
      const appearanceTargetCount = Number(props?.extra?.appearanceTargetCount || 0);
      selectionSummaryEl.innerHTML =
        '<span class="selection-pill">' + esc(selectionLabel) + '</span>' +
        '<div><strong>ID</strong>: ' + esc(props.id || '(none)') + '</div>' +
        '<div><strong>名称</strong>: ' + esc(props.name || '(unnamed)') + '</div>' +
        '<div><strong>当前选择数</strong>: ' + String(selectedCount) + '</div>' +
        '<div><strong>文本</strong>: ' + (contentPreview ? esc(contentPreview) : '<span class="muted">当前对象没有文本内容</span>') + '</div>' +
        '<div><strong>可编辑文本目标</strong>: ' + String(textTargetCount) + '</div>' +
        '<div><strong>可着色对象数</strong>: ' + String(
          Number(appearance?.fillTargetCount || 0) + Number(appearance?.strokeTargetCount || 0)
        ) + '</div>' +
        '<div><strong>批量对象数</strong>: ' + String(appearanceTargetCount || selectedCount) + '</div>' +
        '<div><strong>快捷键</strong>: Ctrl+C 复制，Ctrl+V 粘贴</div>';

      if (!appearance) {
        setAppearanceColorControlsDisabled(true);
        setApplyAppearanceDisabled(true);
        fillColorInput.value = '#111827';
        strokeColorInput.value = '#334155';
      } else {
        setAppearanceColorControlsDisabled(false);
        setApplyAppearanceDisabled(false);
        fillColorInput.value = normalizeColorForInput(appearance.fillColor || '#111827');
        strokeColorInput.value = normalizeColorForInput(appearance.strokeColor || '#334155');
      }

      if (!textStyle) {
        setTextStyleControlsDisabled(true);
        const nextFontFamily = String(fontFamilyInput.value || ${JSON.stringify(FONT_STACK_PRESETS.sans)}).trim() || ${JSON.stringify(FONT_STACK_PRESETS.sans)};
        ensureFontFamilyOption(nextFontFamily);
        fontFamilyInput.value = nextFontFamily;
        fontFamilyInput.style.fontFamily = nextFontFamily;
        fontSizeInput.value = '';
        setToggleButtonState(boldButton, false);
        setToggleButtonState(italicButton, false);
        appearanceHintEl.textContent = selectedCount > 1
          ? '当前为多选；颜色修改会批量作用于所有可着色对象。若要统一全文档字体，请使用“统一全文档字体”。'
          : (appearance
              ? '当前选择可调颜色；字体选项仅对文本对象生效。'
              : '当前选择没有可编辑外观。');
        applyPreviewTextStyle({
          fontFamily: fontFamilyInput.value,
          fill: fillColorInput.value,
        });
        setLayoutControlsDisabled(false, selectedIds.length);
        return;
      }

      setTextStyleControlsDisabled(false);
      setFontFamilySelectValue(String(textStyle.fontFamily || ${JSON.stringify(FONT_STACK_PRESETS.sans)}));
      fontSizeInput.value = String(textStyle.fontSize || 16);
      setToggleButtonState(boldButton, Number(textStyle.fontWeight || '400') >= 600 || String(textStyle.fontWeight).toLowerCase() === 'bold');
      setToggleButtonState(italicButton, String(textStyle.fontStyle || '').toLowerCase() === 'italic');
      appearanceHintEl.textContent = selectedCount > 1
        ? '当前为多选；应用外观会批量作用于所有选中对象。统一全文档字体只改字体本身，不改字号或粗细。'
        : (appearance
            ? '颜色会作用到当前对象及其可着色子对象；字体设置仅作用到文本。'
            : '格式会直接作用到当前所选文本，并可通过撤销/重做回退。');
      setLayoutControlsDisabled(false, selectedIds.length);
      applyPreviewTextStyle({
        content: textStyle.content,
        fontFamily: fontFamilyInput.value,
        fontSize: Number(fontSizeInput.value || textStyle.fontSize || 16),
        fontWeight: boldButton.dataset.active === '1' ? '700' : '400',
        fontStyle: italicButton.dataset.active === '1' ? 'italic' : 'normal',
        fill: fillColorInput.value,
      });
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

    function resolveMovableObjectTarget(surface, startTarget) {
      let current = startTarget?.closest?.('[data-fe-object-id]') || null;
      if (!current) return null;
      const visited = new Set();
      while (current && !visited.has(current)) {
        visited.add(current);
        const parentId = current.getAttribute('data-fe-parent-id');
        if (!parentId) break;
        const parent = surface.querySelector('[data-fe-object-id="' + selectorEscape(parentId) + '"]');
        if (!parent) break;
        current = parent;
      }
      return current;
    }

    function getPreviewScale(surface) {
      const raw = Number(surface?.dataset?.fePreviewScale || '1');
      return Number.isFinite(raw) && raw > 0 ? raw : 1;
    }

    function clampPreviewScale(value) {
      const numeric = Number(value);
      if (!Number.isFinite(numeric) || numeric <= 0) return 1;
      return Math.max(0.25, Math.min(4, numeric));
    }

    function previewSummaryText(state, scale) {
      const treeCount = state?.linkedStatus?.treeNodeCount ?? 0;
      const selectedId = state?.view?.canvas?.selectedIds?.[0] || '(none)';
      return 'objects: ' + treeCount + ' · selected: ' + String(selectedId) + ' · zoom: ' + Math.round(scale * 100) + '%';
    }

    function syncPreviewScale(surface, svg, summaryEl, state, nextScale, anchorEvent) {
      if (!surface || !svg || !summaryEl) return 1;
      const previousScale = getPreviewScale(surface);
      const clampedScale = clampPreviewScale(nextScale);
      const anchor = anchorEvent && Number.isFinite(anchorEvent.clientX) && Number.isFinite(anchorEvent.clientY)
        ? {
            clientX: anchorEvent.clientX,
            clientY: anchorEvent.clientY,
            surfaceRect: surface.getBoundingClientRect(),
          }
        : null;
      surface.dataset.fePreviewScale = String(clampedScale);
      svg.style.transformOrigin = '0 0';
      svg.style.transformBox = 'fill-box';
      svg.style.transform = 'scale(' + clampedScale + ')';
      if (anchor && previousScale > 0) {
        const relX = anchor.clientX - anchor.surfaceRect.left;
        const relY = anchor.clientY - anchor.surfaceRect.top;
        const contentX = (surface.scrollLeft + relX) / previousScale;
        const contentY = (surface.scrollTop + relY) / previousScale;
        window.requestAnimationFrame(() => {
          surface.scrollLeft = Math.max(0, contentX * clampedScale - relX);
          surface.scrollTop = Math.max(0, contentY * clampedScale - relY);
        });
      }
      summaryEl.textContent = previewSummaryText(state, clampedScale);
      return clampedScale;
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
      const summaryEl = previewBody.querySelector('.preview-summary');
      const currentScale = getPreviewScale(surface);
      syncPreviewScale(surface, svg, summaryEl, state, currentScale);
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

      surface.addEventListener('contextmenu', (event) => {
        event.preventDefault();
      });

      surface.addEventListener('keydown', async (event) => {
        if (String(event.key || '').toLowerCase() !== 'escape') return;
        const selectedCount = Number(currentState?.linkedStatus?.selectedCount || 0);
        if (selectedCount <= 0) return;
        event.preventDefault();
        event.stopPropagation();
        try {
          const payload = await postJson('/api/clear-selection', {});
          renderAll(payload.state);
          setStatus('已清空选择');
        } catch (error) {
          setStatus('清空选择失败: ' + (error?.message || String(error)), true);
        }
      });

      surface.addEventListener('pointerdown', (event) => {
        if (event.button === 2) {
          const movableTarget = resolveMovableObjectTarget(surface, event.target);
          const movableObjectId = movableTarget?.getAttribute?.('data-fe-object-id') || '';
          if (!movableObjectId) return;
          const start = toSvgPoint(event);
          if (!start) return;
          event.preventDefault();
          event.stopPropagation();
          surface.focus({ preventScroll: true });
          surface.setPointerCapture?.(event.pointerId);
          surface.classList.add('is-dragging');
          const selectPromise = postJson('/api/select', { objectId: movableObjectId }).then((payload) => {
            currentState = payload.state;
            if (drag && drag.pointerId === event.pointerId) {
              drag.selectedObjectId = payload?.state?.view?.properties?.id ?? payload?.state?.view?.canvas?.selectedIds?.[0] ?? movableObjectId;
            }
            return payload;
          });
          drag = {
            pointerId: event.pointerId,
            start,
            current: start,
            moved: false,
            hitPromise: selectPromise,
            selectedObjectId: movableObjectId,
            appendSelection: false,
            skipTextFallback: true,
          };
          return;
        }
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

        const hitPromise = postJson('/api/hit', { x: start.x, y: start.y, appendSelection: event.shiftKey === true }).then((payload) => {
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
          appendSelection: event.shiftKey === true,
          skipTextFallback: false,
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
        if (drag.moved && drag.selectedObjectId && !drag.appendSelection) {
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
          if (!isTextSelected && !session.appendSelection && !session.skipTextFallback) {
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
        event.preventDefault();
        event.stopPropagation();
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
          const props = selectPayload?.state?.view?.properties;
          const currentText =
            typeof props?.extra?.content === 'string'
              ? props.extra.content
              : typeof props?.extra?.textContent === 'string'
                ? props.extra.textContent
                : '';
          const propType = objectTypeOf(props);
          const editableType = propType === 'text_node' || propType === 'html_block';
          if (!editableType) {
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
          if (selectPayload && selectPayload.state) {
            renderAll(selectPayload.state);
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

      surface.addEventListener('wheel', (event) => {
        if (!(event.ctrlKey || event.metaKey)) return;
        const svgEl = surface.querySelector('svg');
        const summaryEl = previewBody.querySelector('.preview-summary');
        if (!svgEl || !summaryEl) return;
        event.preventDefault();
        event.stopPropagation();
        const currentScale = getPreviewScale(surface);
        const direction = event.deltaY > 0 ? -1 : 1;
        const magnitude = Math.min(120, Math.abs(event.deltaY));
        const factor = Math.exp(direction * Math.max(0.04, magnitude / 320));
        syncPreviewScale(surface, svgEl, summaryEl, currentState || state, currentScale * factor, event);
      }, { passive: false, capture: true });
    }

    function renderPreview(state) {
      const hasPreview = Boolean(state?.preview?.svgDataUrl);
      const sanitizedCount = Number(state?.preview?.sanitizedCount || 0);
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
      summaryEl.textContent = previewSummaryText(state, getPreviewScale(surface));

      if (mountedPreviewRevision === revision) {
        clearOptimisticDrag(surface);
        const svg = surface.querySelector('svg');
        if (svg) {
          surface._fePreviewViewport = state?.preview?.viewport ?? null;
          applySelectionOverlay(svg, state);
          applyCurveHandles(svg, state);
          syncPreviewScale(surface, svg, summaryEl, state, getPreviewScale(surface));
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
      syncSelectionSidebar(state);
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

    async function runAction(label, fn, options) {
      try {
        const payload = await fn();
        renderAll(payload.state, options?.renderOptions);
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

    function updateStylePreviewFromDraft() {
      const currentTextStyle = currentState?.view?.properties?.textStyle || null;
      const nextFontFamily = String(fontFamilyInput.value || currentTextStyle?.fontFamily || ${JSON.stringify(FONT_STACK_PRESETS.sans)}).trim() || ${JSON.stringify(FONT_STACK_PRESETS.sans)};
      ensureFontFamilyOption(nextFontFamily);
      fontFamilyInput.style.fontFamily = nextFontFamily;
      applyPreviewTextStyle({
        content: currentTextStyle?.content || '',
        fontFamily: nextFontFamily,
        fontSize: Number(fontSizeInput.value || currentTextStyle?.fontSize || 16),
        fontWeight: boldButton.dataset.active === '1' ? '700' : '400',
        fontStyle: italicButton.dataset.active === '1' ? 'italic' : 'normal',
        fill: fillColorInput.value || normalizeColorForInput(currentTextStyle?.fill),
      });
    }

    function buildAppearancePatch(currentTextStyle, currentAppearance, isMultiSelection) {
      const patch = {
        fill: fillColorInput.value || normalizeColorForInput(currentTextStyle?.fill || currentAppearance?.fillColor),
        stroke: strokeColorInput.value || normalizeColorForInput(currentAppearance?.strokeColor),
      };

      if (currentTextStyle) {
        const nextFontFamily = fontFamilyInput.value.trim();
        if (isMultiSelection) {
          patch.fontFamily = nextFontFamily || ${JSON.stringify(FONT_STACK_PRESETS.sans)};
        } else if (nextFontFamily && nextFontFamily !== String(currentTextStyle.fontFamily || '')) {
          patch.fontFamily = nextFontFamily;
        }

        const nextFontSize = Number(fontSizeInput.value || currentTextStyle.fontSize || 16);
        if (isMultiSelection || (Number.isFinite(nextFontSize) && nextFontSize !== Number(currentTextStyle.fontSize || 16))) {
          patch.fontSize = nextFontSize;
        }

        const currentFontWeight = String(currentTextStyle.fontWeight || '').trim().toLowerCase();
        const currentFontStyle = String(currentTextStyle.fontStyle || '').trim().toLowerCase();
        const nextFontWeight = boldButton.dataset.active === '1' ? '700' : '400';
        const nextFontStyle = italicButton.dataset.active === '1' ? 'italic' : 'normal';
        const knownWeight = currentFontWeight === 'bold' || currentFontWeight === 'normal' || /^[1-9]00$/.test(currentFontWeight);
        const knownStyle = currentFontStyle === 'italic' || currentFontStyle === 'normal' || currentFontStyle === 'oblique';

        if (isMultiSelection || (knownWeight && nextFontWeight !== currentFontWeight) || (!knownWeight && nextFontWeight === '700')) {
          patch.fontWeight = nextFontWeight;
        }

        if (isMultiSelection || (knownStyle && nextFontStyle !== currentFontStyle) || (!knownStyle && nextFontStyle === 'italic')) {
          patch.fontStyle = nextFontStyle;
        }
      }

      return patch;
    }

    fontFamilyInput.addEventListener('input', updateStylePreviewFromDraft);
    fontFamilyInput.addEventListener('change', updateStylePreviewFromDraft);
    fontSizeInput.addEventListener('input', updateStylePreviewFromDraft);
    fillColorInput.addEventListener('input', updateStylePreviewFromDraft);
    strokeColorInput.addEventListener('input', updateStylePreviewFromDraft);
    boldButton.addEventListener('click', () => {
      if (boldButton.disabled) return;
      setToggleButtonState(boldButton, boldButton.dataset.active !== '1');
      updateStylePreviewFromDraft();
    });
    italicButton.addEventListener('click', () => {
      if (italicButton.disabled) return;
      setToggleButtonState(italicButton, italicButton.dataset.active !== '1');
      updateStylePreviewFromDraft();
    });
    applyAppearanceButton.addEventListener('click', async () => {
      const currentAppearance = currentState?.view?.properties?.appearance || null;
      const currentTextStyle = currentState?.view?.properties?.textStyle || null;
      const isMultiSelection = Number(currentState?.view?.canvas?.selectedIds?.length || 0) > 1;
      if (!currentAppearance && !currentTextStyle) {
        setStatus('请先选中可编辑对象。', true);
        return;
      }
      const fontSize = Number(fontSizeInput.value || currentTextStyle?.fontSize || 16);
      if (currentTextStyle && (!Number.isFinite(fontSize) || fontSize < 6 || fontSize > 256)) {
        setStatus('字号必须在 6 到 256 之间。', true);
        return;
      }
      try {
        const payload = await postJson('/api/update-appearance', buildAppearancePatch(currentTextStyle, currentAppearance, isMultiSelection));
        renderAll(payload.state, { previewMode: 'defer' });
        setStatus('对象外观已应用');
      } catch (error) {
        setStatus('对象外观应用失败: ' + (error?.message || String(error)), true);
      }
    });

    documentFontButton.addEventListener('click', async () => {
      const fontFamily = String(fontFamilyInput.value || '').trim();
      if (!fontFamily) {
        setStatus('请先选择一个字体。', true);
        return;
      }
      try {
        const payload = await postJson('/api/unify-document-font', { fontFamily });
        renderAll(payload.state, { previewMode: 'defer' });
        setStatus('全文档字体已统一');
      } catch (error) {
        setStatus('统一全文档字体失败: ' + (error?.message || String(error)), true);
      }
    });

    async function runLayoutAction(label, endpoint, body) {
      try {
        const payload = await postJson(endpoint, body || {});
        renderAll(payload.state, { previewMode: 'defer' });
        setStatus(label + '成功');
      } catch (error) {
        setStatus(label + '失败: ' + (error?.message || String(error)), true);
      }
    }

    alignLeftButton.addEventListener('click', () => runLayoutAction('左对齐', '/api/align-selected', { mode: 'align_left' }));
    alignRightButton.addEventListener('click', () => runLayoutAction('右对齐', '/api/align-selected', { mode: 'align_right' }));
    alignTopButton.addEventListener('click', () => runLayoutAction('上对齐', '/api/align-selected', { mode: 'align_top' }));
    alignBottomButton.addEventListener('click', () => runLayoutAction('下对齐', '/api/align-selected', { mode: 'align_bottom' }));
    alignCenterHButton.addEventListener('click', () => runLayoutAction('水平居中', '/api/align-selected', { mode: 'center_horizontal' }));
    alignCenterVButton.addEventListener('click', () => runLayoutAction('垂直居中', '/api/align-selected', { mode: 'center_vertical' }));
    distributeHButton.addEventListener('click', () => runLayoutAction('水平分布', '/api/distribute-selected', { mode: 'equal_spacing_horizontal' }));
    distributeVButton.addEventListener('click', () => runLayoutAction('垂直分布', '/api/distribute-selected', { mode: 'equal_spacing_vertical' }));

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

    let pendingKeyboardMoveDx = 0;
    let pendingKeyboardMoveDy = 0;
    let keyboardMoveInFlight = null;
    let keyboardMoveFrame = 0;
    let pendingKeyboardCurveDelta = 0;
    let keyboardCurveInFlight = null;
    let keyboardCurveFrame = 0;

    function hasPendingKeyboardMove() {
      return Math.abs(pendingKeyboardMoveDx) > 0.0001 || Math.abs(pendingKeyboardMoveDy) > 0.0001;
    }

    function hasPendingKeyboardCurveDelta() {
      return Math.abs(pendingKeyboardCurveDelta) > 0.0001;
    }

    function scheduleKeyboardMoveFlush() {
      if (keyboardMoveFrame) return;
      keyboardMoveFrame = window.requestAnimationFrame(() => {
        keyboardMoveFrame = 0;
        flushKeyboardMoveQueue().catch(() => {});
      });
    }

    function scheduleKeyboardCurveFlush() {
      if (keyboardCurveFrame) return;
      keyboardCurveFrame = window.requestAnimationFrame(() => {
        keyboardCurveFrame = 0;
        flushKeyboardCurveQueue().catch(() => {});
      });
    }

    async function flushKeyboardMoveQueue() {
      if (keyboardMoveInFlight) return keyboardMoveInFlight;
      if (!hasPendingKeyboardMove()) return null;
      const dx = Number(pendingKeyboardMoveDx.toFixed(3));
      const dy = Number(pendingKeyboardMoveDy.toFixed(3));
      pendingKeyboardMoveDx = 0;
      pendingKeyboardMoveDy = 0;
      keyboardMoveInFlight = (async () => {
        try {
          const payload = await postJson('/api/move', { dx, dy });
          renderAll(payload.state, { previewMode: 'defer' });
          if (!hasPendingKeyboardMove()) {
            setStatus('微调移动成功 (' + dx + ', ' + dy + ')');
          }
          return payload;
        } catch (error) {
          setStatus('微调移动失败: ' + (error?.message || String(error)), true);
          throw error;
        } finally {
          keyboardMoveInFlight = null;
          if (hasPendingKeyboardMove()) {
            scheduleKeyboardMoveFlush();
          }
        }
      })();
      return keyboardMoveInFlight;
    }

    async function flushKeyboardCurveQueue() {
      if (keyboardCurveInFlight) return keyboardCurveInFlight;
      if (!hasPendingKeyboardCurveDelta()) return null;
      const deltaY = Number(pendingKeyboardCurveDelta.toFixed(3));
      pendingKeyboardCurveDelta = 0;
      keyboardCurveInFlight = (async () => {
        try {
          const payload = await postJson('/api/adjust-curve', { deltaY });
          renderAll(payload.state, { previewMode: 'defer' });
          if (!hasPendingKeyboardCurveDelta()) {
            setStatus('曲线调节成功 (' + deltaY + ')');
          }
          return payload;
        } catch (error) {
          setStatus('曲线调节失败: ' + (error?.message || String(error)), true);
          throw error;
        } finally {
          keyboardCurveInFlight = null;
          if (hasPendingKeyboardCurveDelta()) {
            scheduleKeyboardCurveFlush();
          }
        }
      })();
      return keyboardCurveInFlight;
    }

    async function flushPendingKeyboardMutations() {
      const movePromise = flushKeyboardMoveQueue();
      if (movePromise) {
        try {
          await movePromise;
        } catch {
          // status already surfaced by the queue
        }
      }
      const curvePromise = flushKeyboardCurveQueue();
      if (curvePromise) {
        try {
          await curvePromise;
        } catch {
          // status already surfaced by the queue
        }
      }
    }

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
        await flushPendingKeyboardMutations();
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
        await flushPendingKeyboardMutations();
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
        await flushPendingKeyboardMutations();
        try {
          const payload = await postJson('/api/redo', {});
          renderAll(payload.state);
          setStatus('重做成功');
        } catch (error) {
          setStatus('重做失败: ' + (error?.message || String(error)), true);
        }
        return;
      }

      if ((event.ctrlKey || event.metaKey) && String(event.key).toLowerCase() === 'c') {
        event.preventDefault();
        if (!hasSelection) {
          setStatus('请先选中对象。', true);
          return;
        }
        await flushPendingKeyboardMutations();
        try {
          await postJson('/api/copy-selection', {});
          setStatus('复制对象成功');
        } catch (error) {
          setStatus('复制对象失败: ' + (error?.message || String(error)), true);
        }
        return;
      }

      if ((event.ctrlKey || event.metaKey) && String(event.key).toLowerCase() === 'v') {
        event.preventDefault();
        await flushPendingKeyboardMutations();
        try {
          const payload = await postJson('/api/paste-selection', {});
          renderAll(payload.state, { previewMode: 'defer' });
          setStatus('粘贴对象成功');
        } catch (error) {
          setStatus('粘贴对象失败: ' + (error?.message || String(error)), true);
        }
        return;
      }

      if (!hasSelection) return;

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        await flushPendingKeyboardMutations();
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
        pendingKeyboardCurveDelta += curveDelta;
        scheduleKeyboardCurveFlush();
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
      pendingKeyboardMoveDx += dx;
      pendingKeyboardMoveDy += dy;
      scheduleKeyboardMoveFlush();
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

function createRouter(shell, server) {
  const previewCache = {
    revision: -1,
    payload: null,
    svg: '',
  };
  let queuedMoveBatch = null;
  let queuedMoveTimer = null;

  function clearQueuedMoveTimer() {
    if (queuedMoveTimer !== null) {
      clearTimeout(queuedMoveTimer);
      queuedMoveTimer = null;
    }
  }

  async function flushQueuedMoveBatch() {
    if (!queuedMoveBatch) {
      clearQueuedMoveTimer();
      return null;
    }
    const batch = queuedMoveBatch;
    queuedMoveBatch = null;
    clearQueuedMoveTimer();
    try {
      if (Math.abs(batch.dx) > 0.0001 || Math.abs(batch.dy) > 0.0001) {
        shell.moveSelected(batch.dx, batch.dy);
      }
      const state = createSnapshot(shell, previewCache);
      for (const waiter of batch.waiters) {
        waiter.resolve(state);
      }
      return state;
    } catch (error) {
      for (const waiter of batch.waiters) {
        waiter.reject(error);
      }
      throw error;
    }
  }

  function queueMoveMutation(dx, dy) {
    return new Promise((resolve, reject) => {
      if (!queuedMoveBatch) {
        queuedMoveBatch = { dx: 0, dy: 0, waiters: [] };
      }
      queuedMoveBatch.dx += dx;
      queuedMoveBatch.dy += dy;
      queuedMoveBatch.waiters.push({ resolve, reject });
      if (queuedMoveTimer === null) {
        queuedMoveTimer = setTimeout(() => {
          flushQueuedMoveBatch().catch(() => {
            // request-level handlers will surface the error via their own promise rejection
          });
        }, 12);
      }
    });
  }

  return async function handle(req, res) {
    const method = req.method || 'GET';
    const pathname = new URL(req.url || '/', 'http://localhost').pathname;

    if (method === 'GET' && pathname === '/') {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      send(res, 200, htmlPage(port), 'text/html; charset=utf-8');
      return;
    }

    if (method === 'GET' && pathname.startsWith('/fonts/')) {
      const relPath = pathname.slice('/fonts/'.length).trim();
      if (!relPath || relPath.includes('..') || relPath.includes('\\')) {
        send(res, 400, { ok: false, error: 'Invalid font asset path' });
        return;
      }
      const fontRoot = path.resolve(FONT_PACK_ROOT);
      const resolvedPath = path.resolve(FONT_PACK_ROOT, relPath);
      if (resolvedPath !== fontRoot && !resolvedPath.startsWith(`${fontRoot}${path.sep}`)) {
        send(res, 400, { ok: false, error: 'Invalid font asset path' });
        return;
      }
      if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
        send(res, 404, { ok: false, error: 'Font asset not found' });
        return;
      }
      const ext = path.extname(resolvedPath).toLowerCase();
      const contentType =
        ext === '.css'
          ? 'text/css; charset=utf-8'
          : ext === '.json'
            ? 'application/json; charset=utf-8'
            : ext === '.woff2'
              ? 'font/woff2'
              : ext === '.woff'
                ? 'font/woff'
                : ext === '.ttf'
                  ? 'font/ttf'
                  : 'application/octet-stream';
      send(res, 200, fs.readFileSync(resolvedPath), contentType);
      return;
    }

    if (pathname !== '/api/move') {
      await flushQueuedMoveBatch();
    }

    if (method === 'GET' && pathname === '/api/state') {
      send(res, 200, { ok: true, state: createSnapshot(shell, previewCache) });
      return;
    }

    if (method === 'GET' && pathname === '/api/preview.svg') {
      try {
        const windowState = shell.getWindowSession();
        ensurePreviewPayload(shell, previewCache, windowState);
        if (typeof previewCache.svg !== 'string' || previewCache.svg.trim().length === 0) {
          send(res, 404, '<svg xmlns="http://www.w3.org/2000/svg"></svg>', 'image/svg+xml; charset=utf-8');
          return;
        }
        send(res, 200, previewCache.svg, 'image/svg+xml; charset=utf-8');
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
        case '/api/select-multi': {
          const objectIds = Array.isArray(body.objectIds) ? body.objectIds.map((value) => String(value || '').trim()).filter(Boolean) : [];
          if (objectIds.length === 0) throw new Error('Missing objectIds');
          shell.multiSelectByIds(objectIds);
          break;
        }
        case '/api/select-first-text':
          shell.selectFirstEditableText();
          break;
        case '/api/clear-selection': {
          shell.clearSelection();
          break;
        }
        case '/api/hit': {
          const x = Number(body.x);
          const y = Number(body.y);
          const appendSelection = body.appendSelection === true;
          if (!Number.isFinite(x) || !Number.isFinite(y)) {
            throw new Error('Invalid hit coordinate');
          }
          shell.selectAtPoint(x, y, { appendSelection });
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
        case '/api/copy-selection': {
          shell.copySelection();
          break;
        }
        case '/api/paste-selection': {
          shell.pasteSelection();
          break;
        }
        case '/api/move': {
          const dx = Number(body.dx || 0);
          const dy = Number(body.dy || 0);
          if (!Number.isFinite(dx) || !Number.isFinite(dy)) {
            throw new Error('Invalid move delta');
          }
          if (Math.abs(dx) <= 0.0001 && Math.abs(dy) <= 0.0001) {
            send(res, 200, { ok: true, state: createSnapshot(shell, previewCache) });
            return;
          }
          const state = await queueMoveMutation(dx, dy);
          send(res, 200, { ok: true, state });
          return;
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
        case '/api/update-appearance':
        case '/api/update-text-style': {
          shell.updateSelectedAppearance({
            fontFamily: body.fontFamily,
            fontSize: Number(body.fontSize),
            fontWeight: body.fontWeight,
            fontStyle: body.fontStyle,
            fill: body.fill,
            stroke: body.stroke,
          });
          break;
        }
        case '/api/unify-document-font': {
          const fontFamily = String(body.fontFamily || '').trim();
          if (!fontFamily) throw new Error('Missing fontFamily');
          shell.updateDocumentFontFamily(fontFamily);
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
        case '/api/align-selected': {
          const mode = String(body.mode || '').trim();
          const allowed = new Set([
            'align_left',
            'align_right',
            'align_top',
            'align_bottom',
            'center_horizontal',
            'center_vertical',
          ]);
          if (!allowed.has(mode)) throw new Error('Invalid align mode');
          shell.alignSelected(mode);
          break;
        }
        case '/api/distribute-selected': {
          const mode = String(body.mode || '').trim();
          const allowed = new Set(['equal_spacing_horizontal', 'equal_spacing_vertical']);
          if (!allowed.has(mode)) throw new Error('Invalid distribute mode');
          shell.distributeSelected(mode);
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

function startDesktopGuiServer(options = {}) {
  const host = options.host || '127.0.0.1';
  const port = Number.isFinite(options.port) ? Number(options.port) : 3210;
  const autoOpen = options.open !== false;

  const shell = createDesktopAppShell();
  shell.launchWindow();

  const server = http.createServer();
  const handler = createRouter(shell, server);
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
