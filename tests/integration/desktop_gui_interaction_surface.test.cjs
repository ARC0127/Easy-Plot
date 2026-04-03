const test = require('node:test');
const assert = require('node:assert/strict');

const { startDesktopGuiServer } = require('../../scripts/desktop_gui_server.cjs');

test('desktop gui page keeps interaction hooks and preview text payload', async () => {
  const { url, server } = await startDesktopGuiServer({
    host: '127.0.0.1',
    port: 0,
    open: false,
  });

  try {
    const htmlRes = await fetch(url);
    assert.equal(htmlRes.ok, true);
    const html = await htmlRes.text();
    const inlineScriptMatch = html.match(/<script>([\s\S]*?)<\/script>/i);
    assert.notEqual(inlineScriptMatch, null);
    assert.doesNotThrow(() => {
      new Function(String(inlineScriptMatch[1]));
    });
    assert.equal(html.includes('preview-surface'), true);
    assert.equal(html.includes('postJson(\'/api/hit\''), true);
    assert.equal(html.includes('postJson(\'/api/move\''), true);
    assert.equal(html.includes('postJson(\'/api/add-text\''), true);
    assert.equal(html.includes('postJson(\'/api/adjust-curve-handle\''), true);
    assert.equal(html.includes('data-fe-curve-handle-id'), true);
    assert.equal(html.includes('surface.focus({ preventScroll: true })'), true);
    assert.equal(html.includes('点击选择'), true);
    assert.equal(html.includes('拖拽移动'), true);

    const sampleSvg = `<svg viewBox="0 0 240 120" width="240" height="120">
  <g id="axes_1"><text id="text_title" x="20" y="24">Interaction Probe Text</text><rect x="20" y="40" width="90" height="48" fill="#dbeafe" /></g>
  <g id="legend_1"><text id="text_legend" x="132" y="24">Legend</text></g>
</svg>`;

    const importRes = await fetch(`${url}api/import-content`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        path: 'interaction_probe.svg',
        content: sampleSvg,
        kind: 'svg',
        familyHint: 'unknown',
        htmlMode: 'limited',
      }),
    });
    const importJson = await importRes.json();
    assert.equal(importRes.ok, true);
    assert.equal(importJson.ok, true);

    const stateRes = await fetch(`${url}api/state`);
    const stateJson = await stateRes.json();
    assert.equal(stateRes.ok, true);
    assert.equal(stateJson.ok, true);
    assert.equal('objectTree' in (stateJson.state?.view ?? {}), false);
    assert.equal('importReport' in (stateJson.state?.view ?? {}), false);
    assert.equal(Array.isArray(stateJson.state?.view?.canvas?.selectedIds), true);

    const selectTextRes = await fetch(`${url}api/select-text-at`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ x: 20, y: 24, maxDistance: 40 }),
    });
    const selectTextJson = await selectTextRes.json();
    assert.equal(selectTextRes.ok, true);
    assert.equal(selectTextJson.ok, true);
    assert.equal(
      ['text_node', 'html_block', 'figure_title', 'panel_label'].includes(selectTextJson.state?.view?.properties?.objectType ?? ''),
      true
    );

    const moveRes = await fetch(`${url}api/move`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ dx: 3, dy: 0 }),
    });
    const moveJson = await moveRes.json();
    assert.equal(moveRes.ok, true);
    assert.equal(moveJson.ok, true);

    const undoRes = await fetch(`${url}api/undo`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    const undoJson = await undoRes.json();
    assert.equal(undoRes.ok, true);
    assert.equal(undoJson.ok, true);

    const redoRes = await fetch(`${url}api/redo`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    const redoJson = await redoRes.json();
    assert.equal(redoRes.ok, true);
    assert.equal(redoJson.ok, true);

    const addTextRes = await fetch(`${url}api/add-text`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ x: 42, y: 92, content: 'Added by GUI' }),
    });
    const addTextJson = await addTextRes.json();
    assert.equal(addTextRes.ok, true);
    assert.equal(addTextJson.ok, true);
    assert.equal(addTextJson.state?.view?.properties?.objectType, 'text_node');
    assert.equal(addTextJson.state?.view?.properties?.extra?.content, 'Added by GUI');

    const previewRes = await fetch(`${url}api/preview.svg`);
    assert.equal(previewRes.ok, true);
    const previewSvg = await previewRes.text();
    assert.equal(previewSvg.includes('Interaction Probe Text'), true);
    assert.equal(previewSvg.includes('Added by GUI'), true);
    assert.equal(previewSvg.includes('<text'), true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('desktop gui can edit glyph proxy text by upgrading it to raw text', async () => {
  const { url, server } = await startDesktopGuiServer({
    host: '127.0.0.1',
    port: 0,
    open: false,
  });

  try {
    const glyphSvg = `<?xml version="1.0" encoding="UTF-8"?>
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
  </g>
</svg>`;

    const importRes = await fetch(`${url}api/import-content`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        path: 'glyph_proxy_edit_gui.svg',
        content: glyphSvg,
        kind: 'svg',
        familyHint: 'matplotlib',
        htmlMode: 'limited',
      }),
    });
    const importJson = await importRes.json();
    assert.equal(importRes.ok, true);
    assert.equal(importJson.ok, true);

    const selectRes = await fetch(`${url}api/select-text-at`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ x: 121, y: 49, maxDistance: 40 }),
    });
    const selectJson = await selectRes.json();
    assert.equal(selectRes.ok, true);
    assert.equal(selectJson.ok, true);
    assert.equal(selectJson.state?.view?.properties?.objectType, 'text_node');
    assert.equal(selectJson.state?.view?.properties?.extra?.content, '2.5');
    assert.equal(selectJson.state?.view?.properties?.capabilities?.includes('text_edit'), false);

    const editRes = await fetch(`${url}api/edit-text`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: '9.8' }),
    });
    const editJson = await editRes.json();
    assert.equal(editRes.ok, true);
    assert.equal(editJson.ok, true);
    assert.equal(editJson.state?.view?.properties?.extra?.content, '9.8');
    assert.equal(editJson.state?.view?.properties?.capabilities?.includes('text_edit'), true);

    const previewRes = await fetch(`${url}api/preview.svg`);
    assert.equal(previewRes.ok, true);
    const previewSvg = await previewRes.text();
    assert.equal(previewSvg.includes('>9.8<'), true);
    assert.equal(previewSvg.includes('DejaVuSans-32'), false);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
