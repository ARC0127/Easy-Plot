const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { startDesktopGuiServer } = require('./desktop_gui_server.cjs');

async function postJson(url, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok || json.ok === false) {
    throw new Error(json.error || `request failed: ${res.status}`);
  }
  return json;
}

async function runSmokeDesktopGui() {
  const sampleSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg viewBox="0 0 220 120" width="220" height="120">
  <g id="axes_1"><text id="text_title" x="20" y="24">GUI Smoke Title</text><rect x="20" y="40" width="80" height="40"/></g>
  <g id="legend_1"><text id="text_legend" x="130" y="24">Legend</text></g>
</svg>`;
  const blackOverlaySvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg viewBox="0 0 320 180" width="320" height="180">
  <rect x="0" y="0" width="320" height="180" fill="#000000" />
  <rect x="20" y="20" width="80" height="40" fill="#4f46e5" />
</svg>`;
  const glyphProxySvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg viewBox="0 0 320 180" width="320" height="180" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <path id="DejaVuSans-32" d="M0 0 L8 0 L8 12 L0 12 Z" />
    <path id="DejaVuSans-2e" d="M0 0 L4 0 L4 4 L0 4 Z" />
    <path id="DejaVuSans-35" d="M0 0 L8 0 L8 12 L0 12 Z" />
  </defs>
  <g id="axes_1">
    <g id="text_1">
      <g transform="translate(120 48)">
        <use xlink:href="#DejaVuSans-32" />
        <use xlink:href="#DejaVuSans-2e" x="10" />
        <use xlink:href="#DejaVuSans-35" x="18" />
      </g>
    </g>
    <rect x="20" y="80" width="100" height="40" fill="#dbeafe" />
  </g>
</svg>`;
  const markerUseSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg viewBox="0 0 220 140" width="220" height="140" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <g id="axes_1">
    <defs>
      <path id="m123abc" d="M 0 2.5 C 1.3807 2.5 2.5 1.3807 2.5 0 C 2.5 -1.3807 1.3807 -2.5 0 -2.5 C -1.3807 -2.5 -2.5 -1.3807 -2.5 0 C -2.5 1.3807 -1.3807 2.5 0 2.5 z" />
    </defs>
    <g id="PathCollection_1">
      <use xlink:href="#m123abc" x="40" y="40" style="fill: #5d7087; fill-opacity: 0.46" />
      <use xlink:href="#m123abc" x="92" y="74" style="fill: #2a9d8f; fill-opacity: 0.76" />
    </g>
  </g>
</svg>`;

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'figure-editor-desktop-gui-'));
  const outSvgPath = path.join(tmpDir, 'gui-smoke-out.svg');
  const outHtmlPath = path.join(tmpDir, 'gui-smoke-out.html');

  const { url, server } = await startDesktopGuiServer({
    host: '127.0.0.1',
    port: 0,
    open: false,
  });

  try {
    const stateRes = await fetch(`${url}api/state`);
    const stateJson = await stateRes.json();
    assert.equal(stateJson.ok, true);
    assert.equal(stateJson.state.window.state, 'running');

    const importJson = await postJson(`${url}api/import-content`, {
      path: 'smoke_gui.svg',
      content: sampleSvg,
      kind: 'svg',
      familyHint: 'matplotlib',
      htmlMode: 'limited',
    });
    assert.equal(importJson.state.linkedStatus.treeNodeCount > 0, true);
    assert.equal(importJson.state.linkedStatus.hasImportReport, true);
    assert.equal(importJson.state.preview.viewport !== null, true);

    const hitJson = await postJson(`${url}api/hit`, { x: 24, y: 22 });
    assert.equal(hitJson.state.linkedStatus.selectedCount > 0, true);

    const selectedJson = await postJson(`${url}api/select-first-text`, {});
    assert.equal(Array.isArray(selectedJson.state.view.canvas.selectedIds), true);
    assert.equal(selectedJson.state.view.canvas.selectedIds.length > 0, true);

    const editJson = await postJson(`${url}api/edit-text`, {
      content: 'GUI Smoke Updated',
    });
    const editedText = editJson.state.view.properties?.extra?.content ?? '';
    assert.equal(String(editedText).includes('GUI Smoke Updated'), true);

    const addTextJson = await postJson(`${url}api/add-text`, {
      x: 36,
      y: 96,
      content: 'GUI Added',
    });
    assert.equal(addTextJson.state.view.properties?.objectType, 'text_node');
    assert.equal(addTextJson.state.view.properties?.extra?.content, 'GUI Added');

    await postJson(`${url}api/move`, { dx: 4, dy: 2 });
    await postJson(`${url}api/export-svg`, { path: outSvgPath });
    await postJson(`${url}api/export-html`, { path: outHtmlPath });

    const sanitizedJson = await postJson(`${url}api/import-content`, {
      path: 'black_overlay.svg',
      content: blackOverlaySvg,
      kind: 'svg',
      familyHint: 'unknown',
      htmlMode: 'limited',
    });
    assert.equal(Number(sanitizedJson.state.preview.sanitizedCount || 0) > 0, true);

    const glyphJson = await postJson(`${url}api/import-content`, {
      path: 'glyph_proxy.svg',
      content: glyphProxySvg,
      kind: 'svg',
      familyHint: 'matplotlib',
      htmlMode: 'limited',
    });
    assert.equal(glyphJson.state.linkedStatus.treeNodeCount > 0, true);

    const glyphSelectJson = await postJson(`${url}api/select-text-at`, { x: 121, y: 49, maxDistance: 24 });
    assert.equal(glyphSelectJson.state.view.properties?.objectType, 'text_node');
    assert.equal(glyphSelectJson.state.view.properties?.extra?.content, '2.5');
    assert.equal(glyphSelectJson.state.view.properties?.capabilities?.includes('text_edit'), false);

    const glyphPreviewRes = await fetch(`${url}api/preview.svg`);
    assert.equal(glyphPreviewRes.ok, true);
    const glyphPreviewSvg = await glyphPreviewRes.text();
    assert.equal(/<use\b/i.test(glyphPreviewSvg), true);
    assert.equal(glyphPreviewSvg.includes('font-family="glyph_proxy"'), false);

    const markerJson = await postJson(`${url}api/import-content`, {
      path: 'marker_use.svg',
      content: markerUseSvg,
      kind: 'svg',
      familyHint: 'matplotlib',
      htmlMode: 'limited',
    });
    assert.equal(markerJson.state.linkedStatus.treeNodeCount > 0, true);

    const markerHitJson = await postJson(`${url}api/hit`, { x: 40, y: 40 });
    assert.equal(markerHitJson.state.view.properties?.objectType, 'shape_node');

    const markerPreviewRes = await fetch(`${url}api/preview.svg`);
    assert.equal(markerPreviewRes.ok, true);
    const markerPreviewSvg = await markerPreviewRes.text();
    assert.match(markerPreviewSvg, /<defs>[\s\S]*id="m123abc"/);
    assert.match(markerPreviewSvg, /<use\b[^>]*xlink:href="#m123abc"/);

    assert.equal(fs.existsSync(outSvgPath), true);
    assert.equal(fs.existsSync(outHtmlPath), true);

    return {
      url,
      outSvgPath,
      outHtmlPath,
      treeNodeCount: importJson.state.linkedStatus.treeNodeCount,
      selectedAfterHit: hitJson.state.linkedStatus.selectedCount,
      selectedCount: selectedJson.state.linkedStatus.selectedCount,
      editedText,
      addedText: addTextJson.state.view.properties?.extra?.content ?? null,
      previewSanitizedCount: sanitizedJson.state.preview.sanitizedCount,
      glyphProxyText: glyphSelectJson.state.view.properties?.extra?.content ?? null,
      markerSelectedType: markerHitJson.state.view.properties?.objectType ?? null,
    };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

if (require.main === module) {
  runSmokeDesktopGui()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      console.log('SMOKE_DESKTOP_GUI_PASS');
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.stack : String(error));
      process.exit(1);
    });
}

module.exports = {
  runSmokeDesktopGui,
};
