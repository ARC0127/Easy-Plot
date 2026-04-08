const test = require('node:test');
const assert = require('node:assert/strict');

const { startDesktopGuiServer } = require('../../scripts/desktop_gui_server.cjs');

test('desktop gui keeps preview revision stable for selection-only interactions', async () => {
  const { url, server } = await startDesktopGuiServer({
    host: '127.0.0.1',
    port: 0,
    open: false,
  });

  try {
    const sampleSvg = `<svg viewBox="0 0 240 120" width="240" height="120">
  <g id="axes_1">
    <text id="text_title" x="20" y="24">Revision Probe</text>
    <rect x="20" y="40" width="90" height="48" fill="#dbeafe" />
  </g>
</svg>`;

    const importRes = await fetch(`${url}api/import-content`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        path: 'revision_probe.svg',
        content: sampleSvg,
        kind: 'svg',
        familyHint: 'unknown',
        htmlMode: 'limited',
      }),
    });
    const importJson = await importRes.json();
    assert.equal(importRes.ok, true);
    assert.equal(importJson.ok, true);
    const baseRevision = Number(importJson.state?.window?.renderRevision ?? -1);
    assert.equal(baseRevision >= 0, true);

    const stateRes = await fetch(`${url}api/state`);
    const stateJson = await stateRes.json();
    assert.equal(stateRes.ok, true);
    assert.equal(stateJson.ok, true);
    assert.equal(Number(stateJson.state?.window?.renderRevision ?? -1), baseRevision);

    const hitRes = await fetch(`${url}api/hit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ x: 24, y: 44 }),
    });
    const hitJson = await hitRes.json();
    assert.equal(hitRes.ok, true);
    assert.equal(hitJson.ok, true);
    assert.equal(Number(hitJson.state?.window?.renderRevision ?? -1), baseRevision);

    const moveRes = await fetch(`${url}api/move`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ dx: 5, dy: 0 }),
    });
    const moveJson = await moveRes.json();
    assert.equal(moveRes.ok, true);
    assert.equal(moveJson.ok, true);
    assert.equal(Number(moveJson.state?.window?.renderRevision ?? -1), baseRevision + 1);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('desktop gui batches concurrent move requests into one render revision', async () => {
  const { url, server } = await startDesktopGuiServer({
    host: '127.0.0.1',
    port: 0,
    open: false,
  });

  try {
    const sampleSvg = `<svg viewBox="0 0 240 120" width="240" height="120">
  <rect x="20" y="40" width="90" height="48" fill="#dbeafe" />
</svg>`;

    const importRes = await fetch(`${url}api/import-content`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        path: 'revision_move_batch.svg',
        content: sampleSvg,
        kind: 'svg',
        familyHint: 'unknown',
        htmlMode: 'limited',
      }),
    });
    const importJson = await importRes.json();
    assert.equal(importRes.ok, true);
    assert.equal(importJson.ok, true);
    const baseRevision = Number(importJson.state?.window?.renderRevision ?? -1);
    assert.equal(baseRevision >= 0, true);

    const hitRes = await fetch(`${url}api/hit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ x: 24, y: 44 }),
    });
    const hitJson = await hitRes.json();
    assert.equal(hitRes.ok, true);
    assert.equal(hitJson.ok, true);
    assert.equal(Number(hitJson.state?.window?.renderRevision ?? -1), baseRevision);

    const moveBodies = Array.from({ length: 8 }, () => ({
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ dx: 1, dy: 0 }),
    }));
    const moveResponses = await Promise.all(moveBodies.map((init) => fetch(`${url}api/move`, init)));
    const movePayloads = await Promise.all(moveResponses.map((response) => response.json()));
    assert.equal(moveResponses.every((response) => response.ok), true);
    assert.equal(movePayloads.every((payload) => payload.ok), true);

    const revisions = new Set(movePayloads.map((payload) => Number(payload.state?.window?.renderRevision ?? -1)));
    assert.deepEqual([...revisions], [baseRevision + 1]);

    const previewRes = await fetch(`${url}api/preview.svg`);
    const previewSvg = await previewRes.text();
    assert.equal(previewRes.ok, true);
    assert.match(previewSvg, /transform="translate\(8 0\)"/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
