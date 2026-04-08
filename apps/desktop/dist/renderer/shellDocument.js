"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderDesktopShellDocument = renderDesktopShellDocument;
const { buildFontFaceCss, getBundledFontStackPresets, } = require('../../../../scripts/font_pack.cjs');
function escapeHtml(value) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}
const FONT_STACK_PRESETS = getBundledFontStackPresets();
const FONT_FACE_CSS = buildFontFaceCss('fonts');
function renderTreeNodes(nodes, depth) {
    if (nodes.length === 0)
        return '<li class="tree-empty">No objects</li>';
    const out = [];
    for (const node of nodes) {
        out.push(`<li class="tree-node" data-depth="${depth}" data-object-id="${escapeHtml(node.id)}">` +
            `<span class="tree-label">${escapeHtml(node.label)}</span>` +
            `<span class="tree-meta">${escapeHtml(node.objectType)} · ${escapeHtml(node.id)}</span>` +
            `</li>`);
        if (node.children.length > 0) {
            out.push(renderTreeNodes(node.children, depth + 1));
        }
    }
    return out.join('');
}
function renderObjectTree(view) {
    return `<ul class="tree-list">${renderTreeNodes(view.objectTree, 0)}</ul>`;
}
function renderCanvas(view) {
    if (view.canvas.selectedIds.length === 0) {
        return '<p class="muted">No active selection.</p>';
    }
    const lines = view.canvas.selectedIds.map((id) => `<li>${escapeHtml(id)}</li>`).join('');
    const overlays = view.canvas.overlays
        .map((overlay) => `<li>${escapeHtml(overlay.objectId)} · (${overlay.x}, ${overlay.y}) ${overlay.w}x${overlay.h}</li>`)
        .join('');
    return [
        '<h4>Selected Objects</h4>',
        `<ul>${lines}</ul>`,
        '<h4>Selection Overlay</h4>',
        `<ul>${overlays || '<li class="muted">No overlay</li>'}</ul>`,
    ].join('');
}
function renderProperties(view) {
    if (!view.properties)
        return '<p class="muted">No object selected.</p>';
    const core = [
        `id: ${view.properties.id}`,
        `type: ${view.properties.objectType}`,
        `name: ${view.properties.name}`,
        `bbox: ${JSON.stringify(view.properties.bbox)}`,
        `capabilities: ${view.properties.capabilities.join(', ')}`,
    ].join('\n');
    const extra = JSON.stringify(view.properties.extra, null, 2);
    return `<pre>${escapeHtml(core)}\nextra:\n${escapeHtml(extra)}</pre>`;
}
function renderImportReport(view) {
    if (!view.importReport)
        return '<p class="muted">No import report available.</p>';
    const report = view.importReport;
    const lines = [
        `importId: ${report.importId}`,
        `sourceId: ${report.sourceId}`,
        `family: ${report.familyClassifiedAs}`,
        `liftSuccessCount: ${report.liftSuccessCount}`,
        `liftFailureCount: ${report.liftFailureCount}`,
        `unknownObjectCount: ${report.unknownObjectCount}`,
        `atomicRasterCount: ${report.atomicRasterCount}`,
        `manualAttentionRequired: ${report.manualAttentionRequired.join(', ') || '(none)'}`,
    ].join('\n');
    return `<pre>${escapeHtml(lines)}</pre>`;
}
function renderDesktopShellDocument(input) {
    const statePayload = {
        window: input.window,
        linkedStatus: input.linkedStatus,
        warnings: input.view.warnings,
        selectedIds: input.view.canvas.selectedIds,
    };
    const stateJson = JSON.stringify(statePayload, null, 2);
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(input.appTitle)} - Desktop Shell</title>
  <style>
${FONT_FACE_CSS}
    :root {
      --bg: #f5f7fb;
      --card: #ffffff;
      --line: #d8dfeb;
      --text: #1a2533;
      --muted: #667892;
      --accent: #1762d6;
    }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: ${FONT_STACK_PRESETS.sans}; background: var(--bg); color: var(--text); }
    .topbar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 16px; border-bottom: 1px solid var(--line); background: linear-gradient(90deg, #fff, #eef4ff);
    }
    .topbar h1 { margin: 0; font-size: 16px; font-weight: 600; }
    .badge { font-size: 12px; color: #fff; background: var(--accent); padding: 2px 8px; border-radius: 999px; }
    .workspace {
      display: grid;
      grid-template-columns: 280px 1fr 340px;
      grid-template-rows: minmax(420px, 1fr) 240px;
      gap: 10px;
      padding: 10px;
      min-height: calc(100vh - 56px);
    }
    .region { background: var(--card); border: 1px solid var(--line); border-radius: 8px; overflow: auto; }
    .region h3 { margin: 0; padding: 10px 12px; font-size: 13px; border-bottom: 1px solid var(--line); background: #f9fbff; }
    .region .body { padding: 10px 12px; font-size: 12px; line-height: 1.45; }
    .region-left { grid-column: 1; grid-row: 1; }
    .region-center { grid-column: 2; grid-row: 1; }
    .region-right { grid-column: 3; grid-row: 1; }
    .region-bottom { grid-column: 1 / span 3; grid-row: 2; }
    .tree-list { list-style: none; margin: 0; padding: 0; }
    .tree-node { padding: 6px 8px; border-bottom: 1px dashed #edf1f8; display: flex; flex-direction: column; gap: 2px; }
    .tree-node[data-depth="1"] { padding-left: 18px; }
    .tree-node[data-depth="2"] { padding-left: 28px; }
    .tree-label { font-weight: 600; }
    .tree-meta { color: var(--muted); font-size: 11px; }
    pre { margin: 0; white-space: pre-wrap; word-break: break-word; font-family: ${FONT_STACK_PRESETS.mono}; }
    .muted { color: var(--muted); }
    .status { margin-top: 10px; border-top: 1px solid var(--line); padding-top: 8px; }
  </style>
</head>
<body>
  <div class="topbar">
    <h1>${escapeHtml(input.appTitle)} - Desktop Window Shell</h1>
    <span class="badge">${escapeHtml(input.window.state.toUpperCase())}</span>
  </div>
  <div class="workspace">
    <section class="region region-left">
      <h3>Object Tree</h3>
      <div class="body">${renderObjectTree(input.view)}</div>
    </section>
    <section class="region region-center">
      <h3>Canvas</h3>
      <div class="body">
        ${renderCanvas(input.view)}
        <div class="status">
          <pre>${escapeHtml(stateJson)}</pre>
        </div>
      </div>
    </section>
    <section class="region region-right">
      <h3>Properties</h3>
      <div class="body">${renderProperties(input.view)}</div>
    </section>
    <section class="region region-bottom">
      <h3>Import Report</h3>
      <div class="body">
        ${renderImportReport(input.view)}
        <h4>Warnings</h4>
        <pre>${escapeHtml(input.view.warnings.join('\n') || '(none)')}</pre>
      </div>
    </section>
  </div>
</body>
</html>`;
}
