const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

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
    assert.equal(html.includes('postJson(\'/api/update-appearance\''), true);
    assert.equal(html.includes('postJson(\'/api/adjust-curve-handle\''), true);
    assert.equal(html.includes('data-fe-curve-handle-id'), true);
    assert.equal(html.includes('surface.focus({ preventScroll: true })'), true);
    assert.equal(html.includes('点击选择'), true);
    assert.equal(html.includes('拖拽移动'), true);
    assert.equal(html.includes('对象外观'), true);
    assert.equal(html.includes('布局整理'), true);
    assert.equal(html.includes('@font-face'), true);
    assert.equal(html.includes('/fonts/inter-400-normal.ttf'), true);
    assert.equal(html.includes('<select id="style-font-family">'), true);
    assert.equal(html.includes('font-family-presets'), false);
    assert.equal(html.includes('Aa 默认 Sans 栈'), true);
    assert.equal(html.includes('Aa 默认 Serif 栈'), true);
    assert.equal(html.includes('Aa Times New Roman'), true);
    assert.equal(html.includes('双击改字或空白新建'), true);
    assert.equal(html.includes('右键拖动对象或容器改位置'), true);
    assert.equal(html.includes('Shift+点击可加入多选'), true);
    assert.equal(html.includes('Ctrl+滚轮缩放预览'), true);
    assert.equal(html.includes("surface.addEventListener('wheel'"), true);
    assert.equal(html.includes('contextmenu'), true);
    assert.equal(html.includes('event.button === 2'), true);
    assert.equal(html.includes('data-fe-parent-id'), true);
    assert.equal(html.includes("postJson('/api/hit', { x: start.x, y: start.y, appendSelection: event.shiftKey === true })"), true);
    assert.equal(html.includes('/api/align-selected'), true);
    assert.equal(html.includes('/api/distribute-selected'), true);
    assert.equal(html.includes('if (!editableType) {'), true);
    assert.equal(html.includes('currentText.length === 0'), false);
    assert.equal(html.includes('Source Sans 3'), true);
    assert.equal(html.includes('Source Serif 4'), true);
    assert.equal(html.includes('IBM Plex Sans'), true);
    assert.equal(html.includes('Noto Serif SC'), true);
    assert.equal(html.includes("postJson('/api/copy-selection'"), true);
    assert.equal(html.includes("postJson('/api/paste-selection'"), true);
    assert.equal(html.includes("postJson('/api/clear-selection'"), true);
    assert.equal(html.includes("surface.addEventListener('keydown'"), true);
    assert.equal(html.includes('Ctrl+C 复制，Ctrl+V 粘贴'), true);
    assert.equal(html.includes('Esc 可清空当前选择'), true);
    assert.equal(html.includes('Ctrl+V 可粘贴已复制对象'), true);

    const fontManifestRes = await fetch(`${url}fonts/manifest.json`);
    const fontManifestJson = await fontManifestRes.json();
    assert.equal(fontManifestRes.ok, true);
    assert.equal(fontManifestJson.manifestVersion, '1.0.0');
    assert.equal(fontManifestJson.families.some((family) => family.family === 'Inter'), true);
    assert.equal(fontManifestJson.families.some((family) => family.family === 'Noto Sans SC'), true);

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

test('desktop gui preview exports parent ids for movable container chains', async () => {
  const { url, server } = await startDesktopGuiServer({
    host: '127.0.0.1',
    port: 0,
    open: false,
  });

  try {
    const fixturePath = path.resolve(__dirname, '../../packages/testing-fixtures/data/llm_svg/llm_001.svg');
    const fixtureSvg = fs.readFileSync(fixturePath, 'utf8');
    const importRes = await fetch(`${url}api/import-content`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        path: 'llm_001.svg',
        content: fixtureSvg,
        kind: 'svg',
        familyHint: 'llm_svg',
        htmlMode: 'limited',
      }),
    });
    const importJson = await importRes.json();
    assert.equal(importRes.ok, true);
    assert.equal(importJson.ok, true);

    const previewRes = await fetch(`${url}api/preview.svg`);
    assert.equal(previewRes.ok, true);
    const previewSvg = await previewRes.text();
    assert.notEqual(previewSvg.match(/data-fe-parent-id="[^"]+"/), null);
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

test('desktop gui can select and move image nodes through the preview surface path', async () => {
  const { url, server } = await startDesktopGuiServer({
    host: '127.0.0.1',
    port: 0,
    open: false,
  });

  try {
    const imageSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg viewBox="0 0 240 140" width="240" height="140" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <image id="image_1" x="30" y="40" width="80" height="50" xlink:href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO3Zr+QAAAAASUVORK5CYII=" />
</svg>`;

    const importRes = await fetch(`${url}api/import-content`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        path: 'image_drag_probe.svg',
        content: imageSvg,
        kind: 'svg',
        familyHint: 'unknown',
        htmlMode: 'limited',
      }),
    });
    const importJson = await importRes.json();
    assert.equal(importRes.ok, true);
    assert.equal(importJson.ok, true);

    const previewBeforeRes = await fetch(`${url}api/preview.svg`);
    assert.equal(previewBeforeRes.ok, true);
    const previewBefore = await previewBeforeRes.text();
    assert.equal(previewBefore.includes('data-fe-object-type="image_node"'), true);

    const hitRes = await fetch(`${url}api/hit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ x: 34, y: 44 }),
    });
    const hitJson = await hitRes.json();
    assert.equal(hitRes.ok, true);
    assert.equal(hitJson.ok, true);
    assert.equal(hitJson.state?.view?.properties?.objectType, 'image_node');

    const objectId = hitJson.state?.view?.properties?.id;
    const bboxBefore = hitJson.state?.view?.properties?.bbox;
    assert.equal(typeof objectId, 'string');
    assert.equal(Number.isFinite(bboxBefore?.x), true);
    assert.equal(Number.isFinite(bboxBefore?.y), true);

    const selectRes = await fetch(`${url}api/select`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ objectId }),
    });
    const selectJson = await selectRes.json();
    assert.equal(selectRes.ok, true);
    assert.equal(selectJson.ok, true);
    assert.equal(selectJson.state?.view?.properties?.id, objectId);

    const moveRes = await fetch(`${url}api/move`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ dx: 12, dy: 8 }),
    });
    const moveJson = await moveRes.json();
    assert.equal(moveRes.ok, true);
    assert.equal(moveJson.ok, true);
    assert.equal(moveJson.state?.view?.properties?.objectType, 'image_node');
    assert.equal(moveJson.state?.view?.properties?.bbox?.x, bboxBefore.x + 12);
    assert.equal(moveJson.state?.view?.properties?.bbox?.y, bboxBefore.y + 8);

    const previewAfterRes = await fetch(`${url}api/preview.svg`);
    assert.equal(previewAfterRes.ok, true);
    const previewAfter = await previewAfterRes.text();
    assert.equal(previewAfter.includes('data-fe-object-type="image_node"'), true);
    assert.equal(previewAfter.includes('x="42"'), true);
    assert.equal(previewAfter.includes('y="48"'), true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('desktop gui can copy and paste selected elements with ctrl shortcuts', async () => {
  const { url, server } = await startDesktopGuiServer({
    host: '127.0.0.1',
    port: 0,
    open: false,
  });

  try {
    const imageSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg viewBox="0 0 240 140" width="240" height="140" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <image id="image_1" x="30" y="40" width="80" height="50" xlink:href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO3Zr+QAAAAASUVORK5CYII=" />
</svg>`;

    const importRes = await fetch(`${url}api/import-content`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        path: 'copy_paste_probe.svg',
        content: imageSvg,
        kind: 'svg',
        familyHint: 'unknown',
        htmlMode: 'limited',
      }),
    });
    const importJson = await importRes.json();
    assert.equal(importRes.ok, true);
    assert.equal(importJson.ok, true);

    const hitRes = await fetch(`${url}api/hit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ x: 34, y: 44 }),
    });
    const hitJson = await hitRes.json();
    assert.equal(hitRes.ok, true);
    assert.equal(hitJson.ok, true);
    assert.equal(hitJson.state?.view?.properties?.objectType, 'image_node');

    const originalId = hitJson.state?.view?.properties?.id;
    const bboxBefore = hitJson.state?.view?.properties?.bbox;
    assert.equal(typeof originalId, 'string');

    const copyRes = await fetch(`${url}api/copy-selection`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    const copyJson = await copyRes.json();
    assert.equal(copyRes.ok, true);
    assert.equal(copyJson.ok, true);

    const pasteRes = await fetch(`${url}api/paste-selection`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    const pasteJson = await pasteRes.json();
    assert.equal(pasteRes.ok, true);
    assert.equal(pasteJson.ok, true);
    assert.equal(pasteJson.state?.view?.canvas?.selectedIds?.length, 1);
    assert.equal(pasteJson.state?.linkedStatus?.treeNodeCount, 2);
    assert.equal(pasteJson.state?.view?.properties?.objectType, 'image_node');
    assert.notEqual(pasteJson.state?.view?.properties?.id, originalId);
    assert.equal(pasteJson.state?.view?.properties?.bbox?.x, bboxBefore.x + 12);
    assert.equal(pasteJson.state?.view?.properties?.bbox?.y, bboxBefore.y + 12);

    const previewRes = await fetch(`${url}api/preview.svg`);
    assert.equal(previewRes.ok, true);
    const previewSvg = await previewRes.text();
    assert.equal((previewSvg.match(/data-fe-object-type="image_node"/g) || []).length, 2);
    assert.equal(previewSvg.includes('x="42"'), true);
    assert.equal(previewSvg.includes('y="52"'), true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('desktop gui clears selection from the preview surface', async () => {
  const { url, server } = await startDesktopGuiServer({
    host: '127.0.0.1',
    port: 0,
    open: false,
  });

  try {
    const imageSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg viewBox="0 0 240 140" width="240" height="140" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <image id="image_1" x="30" y="40" width="80" height="50" xlink:href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO3Zr+QAAAAASUVORK5CYII=" />
</svg>`;

    const importRes = await fetch(`${url}api/import-content`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        path: 'clear_selection_probe.svg',
        content: imageSvg,
        kind: 'svg',
        familyHint: 'unknown',
        htmlMode: 'limited',
      }),
    });
    const importJson = await importRes.json();
    assert.equal(importRes.ok, true);
    assert.equal(importJson.ok, true);

    const hitRes = await fetch(`${url}api/hit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ x: 34, y: 44 }),
    });
    const hitJson = await hitRes.json();
    assert.equal(hitRes.ok, true);
    assert.equal(hitJson.ok, true);
    assert.equal(hitJson.state?.view?.canvas?.selectedIds?.length, 1);

    const clearRes = await fetch(`${url}api/clear-selection`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    const clearJson = await clearRes.json();
    assert.equal(clearRes.ok, true);
    assert.equal(clearJson.ok, true);
    assert.equal(clearJson.state?.view?.canvas?.selectedIds?.length, 0);
    assert.equal(clearJson.state?.view?.properties, null);
    assert.equal(clearJson.state?.linkedStatus?.selectedCount, 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
