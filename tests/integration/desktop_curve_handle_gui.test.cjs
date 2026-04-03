const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { startDesktopGuiServer } = require('../../scripts/desktop_gui_server.cjs');

function extractPathD(svg, objectId) {
  const escaped = String(objectId).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = svg.match(new RegExp(`<path[^>]*id="${escaped}"[^>]*\\sd="([^"]+)"`, 'i'));
  return match ? match[1] : '';
}

test('desktop gui exposes visible curve handles and handle drag updates curve geometry', async () => {
  const { url, server } = await startDesktopGuiServer({
    host: '127.0.0.1',
    port: 0,
    open: false,
  });

  try {
    const samplePath = path.resolve(__dirname, '../../artifacts/release_suite/cases/originals/curve_release_case.svg');
    const sampleSvg = fs.readFileSync(samplePath, 'utf8');

    const importRes = await fetch(`${url}api/import-content`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        path: 'artifacts/release_suite/cases/originals/curve_release_case.svg',
        content: sampleSvg,
        kind: 'svg',
        familyHint: 'chart_family',
        htmlMode: 'limited',
      }),
    });
    const importJson = await importRes.json();
    assert.equal(importRes.ok, true);
    assert.equal(importJson.ok, true);

    const selectRes = await fetch(`${url}api/select`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ objectId: 'curve_series_a_group' }),
    });
    const selectJson = await selectRes.json();
    assert.equal(selectRes.ok, true);
    assert.equal(selectJson.ok, true);

    const handles = selectJson.state?.view?.canvas?.curveHandles ?? [];
    assert.equal(Array.isArray(handles), true);
    assert.equal(handles.length >= 6, true);

    const previewBefore = await (await fetch(`${url}api/preview.svg`)).text();
    const beforeD = extractPathD(previewBefore, 'curve_series_a');
    assert.notEqual(beforeD, '');

    const adjustRes = await fetch(`${url}api/adjust-curve-handle`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        handleId: handles[1].id,
        dx: 0,
        dy: -18,
      }),
    });
    const adjustJson = await adjustRes.json();
    assert.equal(adjustRes.ok, true);
    assert.equal(adjustJson.ok, true);
    assert.equal((adjustJson.state?.view?.canvas?.curveHandles ?? []).length >= 6, true);

    const previewAfter = await (await fetch(`${url}api/preview.svg?rev=curve-handles`)).text();
    const afterD = extractPathD(previewAfter, 'curve_series_a');
    assert.notEqual(afterD, '');
    assert.notEqual(afterD, beforeD);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
