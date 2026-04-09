const test = require('node:test');
const assert = require('node:assert/strict');

const { startDesktopGuiServer } = require('../../scripts/desktop_gui_server.cjs');

test('desktop gui text style sidebar updates font family, size, color, weight, and style', async () => {
  const { url, server } = await startDesktopGuiServer({
    host: '127.0.0.1',
    port: 0,
    open: false,
  });

  try {
    const sampleSvg = `<svg viewBox="0 0 240 120" width="240" height="120">
  <g id="axes_1">
    <text id="text_title" x="20" y="24">Styled Text</text>
    <rect x="20" y="40" width="90" height="48" fill="#dbeafe" />
  </g>
</svg>`;

    const importRes = await fetch(`${url}api/import-content`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        path: 'styled_text_probe.svg',
        content: sampleSvg,
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
      body: JSON.stringify({ x: 20, y: 24, maxDistance: 40 }),
    });
    const selectJson = await selectRes.json();
    assert.equal(selectRes.ok, true);
    assert.equal(selectJson.ok, true);
    assert.equal(selectJson.state?.view?.properties?.objectType, 'text_node');
    assert.equal(typeof selectJson.state?.view?.properties?.textStyle?.fontFamily, 'string');

    const styleRes = await fetch(`${url}api/update-appearance`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        fontFamily: 'Georgia',
        fontSize: 28,
        fill: '#ff0000',
        fontWeight: '700',
        fontStyle: 'italic',
      }),
    });
    const styleJson = await styleRes.json();
    assert.equal(styleRes.ok, true);
    assert.equal(styleJson.ok, true);
    assert.equal(styleJson.state?.view?.properties?.textStyle?.fontFamily, 'Georgia');
    assert.equal(styleJson.state?.view?.properties?.textStyle?.fontSize, 28);
    assert.equal(styleJson.state?.view?.properties?.textStyle?.fill, '#ff0000');
    assert.equal(styleJson.state?.view?.properties?.textStyle?.fontWeight, '700');
    assert.equal(styleJson.state?.view?.properties?.textStyle?.fontStyle, 'italic');

    const previewRes = await fetch(`${url}api/preview.svg`);
    assert.equal(previewRes.ok, true);
    const previewSvg = await previewRes.text();
    assert.equal(previewSvg.includes('Styled Text'), true);
    assert.equal(previewSvg.includes('font-family="Georgia,'), true);
    assert.equal(previewSvg.includes('font-size="28"'), true);
    assert.equal(previewSvg.includes('font-weight="700"'), true);
    assert.equal(previewSvg.includes('font-style="italic"'), true);
    assert.equal(previewSvg.includes('fill="#ff0000"'), true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('desktop gui color-only changes keep glyph proxy text format unchanged', async () => {
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
        path: 'glyph_color_only.svg',
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

    const before = selectJson.state?.view?.properties?.textStyle;
    assert.equal(selectJson.state?.view?.properties?.capabilities?.includes('text_edit'), false);
    assert.equal(typeof before?.fontFamily, 'string');
    assert.equal(typeof before?.fontWeight, 'string');
    assert.equal(typeof before?.fontStyle, 'string');

    const styleRes = await fetch(`${url}api/update-appearance`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        fill: '#00ff00',
      }),
    });
    const styleJson = await styleRes.json();
    assert.equal(styleRes.ok, true);
    assert.equal(styleJson.ok, true);
    assert.equal(styleJson.state?.view?.properties?.textStyle?.fontFamily, before.fontFamily);
    assert.equal(styleJson.state?.view?.properties?.textStyle?.fontSize, before.fontSize);
    assert.equal(styleJson.state?.view?.properties?.textStyle?.fontWeight, before.fontWeight);
    assert.equal(styleJson.state?.view?.properties?.textStyle?.fontStyle, before.fontStyle);
    assert.equal(styleJson.state?.view?.properties?.textStyle?.fill, '#00ff00');
    assert.equal(styleJson.state?.view?.properties?.capabilities?.includes('text_edit'), false);

    const previewRes = await fetch(`${url}api/preview.svg`);
    assert.equal(previewRes.ok, true);
    const previewSvg = await previewRes.text();
    assert.equal(previewSvg.includes('fill="#00ff00"'), true);
    assert.equal(previewSvg.includes('font-family="glyph_proxy"'), false);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('desktop gui appearance sidebar updates fill and stroke colors for shape objects', async () => {
  const { url, server } = await startDesktopGuiServer({
    host: '127.0.0.1',
    port: 0,
    open: false,
  });

  try {
    const sampleSvg = `<svg viewBox="0 0 240 120" width="240" height="120">
  <g id="axes_1">
    <path id="icon_1" d="M40 90 L70 30 L100 90 Z" fill="#dbeafe" stroke="#1d4ed8" stroke-width="3" />
  </g>
</svg>`;

    const importRes = await fetch(`${url}api/import-content`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        path: 'shape_color_probe.svg',
        content: sampleSvg,
        kind: 'svg',
        familyHint: 'illustration_like',
        htmlMode: 'limited',
      }),
    });
    const importJson = await importRes.json();
    assert.equal(importRes.ok, true);
    assert.equal(importJson.ok, true);

    const selectRes = await fetch(`${url}api/hit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ x: 70, y: 60 }),
    });
    const selectJson = await selectRes.json();
    assert.equal(selectRes.ok, true);
    assert.equal(selectJson.ok, true);
    assert.equal(selectJson.state?.view?.properties?.objectType, 'shape_node');
    assert.equal(selectJson.state?.view?.properties?.appearance?.fillTargetCount > 0, true);
    assert.equal(selectJson.state?.view?.properties?.appearance?.strokeTargetCount > 0, true);

    const styleRes = await fetch(`${url}api/update-appearance`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        fill: '#00ff00',
        stroke: '#ff00ff',
      }),
    });
    const styleJson = await styleRes.json();
    assert.equal(styleRes.ok, true);
    assert.equal(styleJson.ok, true);
    assert.equal(styleJson.state?.view?.properties?.appearance?.fillColor, '#00ff00');
    assert.equal(styleJson.state?.view?.properties?.appearance?.strokeColor, '#ff00ff');

    const previewRes = await fetch(`${url}api/preview.svg`);
    assert.equal(previewRes.ok, true);
    const previewSvg = await previewRes.text();
    assert.equal(previewSvg.includes('fill="#00ff00"'), true);
    assert.equal(previewSvg.includes('stroke="#ff00ff"'), true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('desktop gui multi selection applies text and color updates to every selected target', async () => {
  const { url, server } = await startDesktopGuiServer({
    host: '127.0.0.1',
    port: 0,
    open: false,
  });

  try {
    const sampleSvg = `<svg viewBox="0 0 260 150" width="260" height="150">
  <g id="axes_1">
    <text id="text_title" x="20" y="24">Batch Text</text>
    <rect id="shape_1" x="20" y="40" width="90" height="48" fill="#dbeafe" stroke="#1d4ed8" stroke-width="3" />
  </g>
</svg>`;

    const importRes = await fetch(`${url}api/import-content`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        path: 'multi_select_batch.svg',
        content: sampleSvg,
        kind: 'svg',
        familyHint: 'matplotlib',
        htmlMode: 'limited',
      }),
    });
    const importJson = await importRes.json();
    assert.equal(importRes.ok, true);
    assert.equal(importJson.ok, true);

    const textSelectRes = await fetch(`${url}api/select-text-at`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ x: 20, y: 24, maxDistance: 40 }),
    });
    const textSelectJson = await textSelectRes.json();
    assert.equal(textSelectRes.ok, true);
    assert.equal(textSelectJson.ok, true);
    assert.equal(textSelectJson.state?.view?.canvas?.selectedIds?.length, 1);
    assert.equal(typeof textSelectJson.state?.view?.properties?.textStyle?.fontFamily, 'string');

    const appendSelectRes = await fetch(`${url}api/hit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ x: 40, y: 60, appendSelection: true }),
    });
    const appendSelectJson = await appendSelectRes.json();
    assert.equal(appendSelectRes.ok, true);
    assert.equal(appendSelectJson.ok, true);
    assert.equal(appendSelectJson.state?.view?.canvas?.selectedIds?.length, 2);
    assert.equal(appendSelectJson.state?.view?.properties?.objectType, 'multi_selection');
    assert.equal(appendSelectJson.state?.view?.properties?.extra?.selectedCount, 2);
    assert.equal(appendSelectJson.state?.view?.properties?.textStyle !== null, true);
    assert.equal(appendSelectJson.state?.view?.properties?.appearance !== null, true);

    const styleRes = await fetch(`${url}api/update-appearance`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        fontFamily: 'Georgia',
        fontSize: 24,
        fill: '#ff0000',
        stroke: '#00ff00',
        fontWeight: '700',
        fontStyle: 'italic',
      }),
    });
    const styleJson = await styleRes.json();
    assert.equal(styleRes.ok, true);
    assert.equal(styleJson.ok, true);
    assert.equal(styleJson.state?.view?.canvas?.selectedIds?.length, 2);
    assert.equal(styleJson.state?.view?.properties?.textStyle?.fontFamily, 'Georgia');
    assert.equal(styleJson.state?.view?.properties?.textStyle?.fontSize, 24);
    assert.equal(styleJson.state?.view?.properties?.textStyle?.fontWeight, '700');
    assert.equal(styleJson.state?.view?.properties?.textStyle?.fontStyle, 'italic');
    assert.equal(styleJson.state?.view?.properties?.appearance?.fillColor, '#ff0000');
    assert.equal(styleJson.state?.view?.properties?.appearance?.strokeColor, '#00ff00');

    const previewRes = await fetch(`${url}api/preview.svg`);
    assert.equal(previewRes.ok, true);
    const previewSvg = await previewRes.text();
    assert.equal(previewSvg.includes('font-family="Georgia,'), true);
    assert.equal(previewSvg.includes('font-size="24"'), true);
    assert.equal(previewSvg.includes('font-weight="700"'), true);
    assert.equal(previewSvg.includes('font-style="italic"'), true);
    assert.equal(previewSvg.includes('fill="#ff0000"'), true);
    assert.equal(previewSvg.includes('stroke="#00ff00"'), true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('desktop gui unify document font updates every text node without changing size or weight', async () => {
  const { url, server } = await startDesktopGuiServer({
    host: '127.0.0.1',
    port: 0,
    open: false,
  });

  try {
    const sampleSvg = `<?xml version="1.0" encoding="UTF-8"?>
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
        path: 'document_font_family.svg',
        content: sampleSvg,
        kind: 'svg',
        familyHint: 'matplotlib',
        htmlMode: 'limited',
      }),
    });
    const importJson = await importRes.json();
    assert.equal(importRes.ok, true);
    assert.equal(importJson.ok, true);

    const selectARes = await fetch(`${url}api/select-text-at`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ x: 121, y: 49, maxDistance: 40 }),
    });
    const selectAJson = await selectARes.json();
    assert.equal(selectARes.ok, true);
    assert.equal(selectAJson.ok, true);

    const styledRes = await fetch(`${url}api/update-appearance`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        fontFamily: 'Georgia',
        fontSize: 30,
        fontWeight: '700',
        fontStyle: 'italic',
        fill: '#111111',
      }),
    });
    const styledJson = await styledRes.json();
    assert.equal(styledRes.ok, true);
    assert.equal(styledJson.ok, true);

    const selectBeforeBRes = await fetch(`${url}api/select-text-at`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ x: 121, y: 49, maxDistance: 40 }),
    });
    const selectBeforeBJson = await selectBeforeBRes.json();
    assert.equal(selectBeforeBRes.ok, true);
    assert.equal(selectBeforeBJson.ok, true);
    const beforeB = selectBeforeBJson.state?.view?.properties?.textStyle;
    assert.equal(typeof beforeB?.fontFamily, 'string');
    assert.equal(typeof beforeB?.fontSize, 'number');
    assert.equal(typeof beforeB?.fontWeight, 'string');
    assert.equal(typeof beforeB?.fontStyle, 'string');

    const unifyRes = await fetch(`${url}api/unify-document-font`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fontFamily: 'Times New Roman' }),
    });
    const unifyJson = await unifyRes.json();
    assert.equal(unifyRes.ok, true);
    assert.equal(unifyJson.ok, true);

    const selectAfterARes = await fetch(`${url}api/select-text-at`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ x: 121, y: 49, maxDistance: 40 }),
    });
    const selectAfterAJson = await selectAfterARes.json();
    assert.equal(selectAfterARes.ok, true);
    assert.equal(selectAfterAJson.ok, true);
    assert.equal(selectAfterAJson.state?.view?.properties?.textStyle?.fontFamily, 'Times New Roman');
    assert.equal(selectAfterAJson.state?.view?.properties?.textStyle?.fontSize, 30);
    assert.equal(selectAfterAJson.state?.view?.properties?.textStyle?.fontWeight, '700');
    assert.equal(selectAfterAJson.state?.view?.properties?.textStyle?.fontStyle, 'italic');

    const selectBRes = await fetch(`${url}api/select-text-at`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ x: 121, y: 49, maxDistance: 40 }),
    });
    const selectBJson = await selectBRes.json();
    assert.equal(selectBRes.ok, true);
    assert.equal(selectBJson.ok, true);
    assert.equal(selectBJson.state?.view?.properties?.textStyle?.fontFamily, 'Times New Roman');
    assert.equal(selectBJson.state?.view?.properties?.textStyle?.fontSize, beforeB.fontSize);
    assert.equal(selectBJson.state?.view?.properties?.textStyle?.fontWeight, beforeB.fontWeight);
    assert.equal(selectBJson.state?.view?.properties?.textStyle?.fontStyle, beforeB.fontStyle);

    const previewRes = await fetch(`${url}api/preview.svg`);
    assert.equal(previewRes.ok, true);
    const previewSvg = await previewRes.text();
    assert.equal(previewSvg.includes('Times New Roman'), true);
    assert.equal(previewSvg.includes('font-size="30"'), true);
    assert.equal(previewSvg.includes('font-weight="700"'), true);
    assert.equal(previewSvg.includes('font-style="italic"'), true);
    assert.equal(previewSvg.includes('<use '), false);
    assert.equal(previewSvg.includes('<text '), true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
