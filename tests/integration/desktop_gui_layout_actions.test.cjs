const test = require('node:test');
const assert = require('node:assert/strict');

const { startDesktopGuiServer } = require('../../scripts/desktop_gui_server.cjs');

test('desktop gui layout actions can align and distribute multi-selected objects', async () => {
  const { url, server } = await startDesktopGuiServer({
    host: '127.0.0.1',
    port: 0,
    open: false,
  });

  try {
    const sampleSvg = `<svg viewBox="0 0 260 140" width="260" height="140">
  <g id="axes_1">
    <rect id="box_a" x="20" y="20" width="20" height="18" fill="#93c5fd" />
    <rect id="box_b" x="70" y="20" width="20" height="18" fill="#93c5fd" />
    <rect id="box_c" x="150" y="20" width="20" height="18" fill="#93c5fd" />
    <rect id="box_d" x="20" y="72" width="20" height="18" fill="#fca5a5" />
    <rect id="box_e" x="70" y="72" width="20" height="18" fill="#fca5a5" />
    <rect id="box_f" x="150" y="72" width="20" height="18" fill="#fca5a5" />
  </g>
</svg>`;

    const importRes = await fetch(`${url}api/import-content`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        path: 'layout_probe.svg',
        content: sampleSvg,
        kind: 'svg',
        familyHint: 'illustration_like',
        htmlMode: 'limited',
      }),
    });
    const importJson = await importRes.json();
    assert.equal(importRes.ok, true);
    assert.equal(importJson.ok, true);

    const hitARes = await fetch(`${url}api/hit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ x: 30, y: 29 }),
    });
    const hitAJson = await hitARes.json();
    assert.equal(hitARes.ok, true);
    assert.equal(hitAJson.ok, true);

    const hitBRes = await fetch(`${url}api/hit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ x: 80, y: 29, appendSelection: true }),
    });
    const hitBJson = await hitBRes.json();
    assert.equal(hitBRes.ok, true);
    assert.equal(hitBJson.ok, true);
    assert.equal(hitBJson.state?.view?.canvas?.selectedIds?.length, 2);

    const alignRes = await fetch(`${url}api/align-selected`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode: 'align_left' }),
    });
    const alignJson = await alignRes.json();
    assert.equal(alignRes.ok, true);
    assert.equal(alignJson.ok, true);
    const alignOverlays = alignJson.state?.view?.canvas?.overlays || [];
    assert.equal(alignOverlays.length, 2);
    assert.equal(alignOverlays[0].x, alignOverlays[1].x);
    assert.equal(alignOverlays[0].x, 20);

    const reimportRes = await fetch(`${url}api/import-content`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        path: 'layout_probe_again.svg',
        content: sampleSvg,
        kind: 'svg',
        familyHint: 'illustration_like',
        htmlMode: 'limited',
      }),
    });
    const reimportJson = await reimportRes.json();
    assert.equal(reimportRes.ok, true);
    assert.equal(reimportJson.ok, true);

    const hitDRes = await fetch(`${url}api/hit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ x: 30, y: 81 }),
    });
    const hitDJson = await hitDRes.json();
    assert.equal(hitDRes.ok, true);
    assert.equal(hitDJson.ok, true);

    const hitERes = await fetch(`${url}api/hit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ x: 80, y: 81, appendSelection: true }),
    });
    const hitEJson = await hitERes.json();
    assert.equal(hitERes.ok, true);
    assert.equal(hitEJson.ok, true);

    const hitFRes = await fetch(`${url}api/hit`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ x: 160, y: 81, appendSelection: true }),
    });
    const hitFJson = await hitFRes.json();
    assert.equal(hitFRes.ok, true);
    assert.equal(hitFJson.ok, true);
    assert.equal(hitFJson.state?.view?.canvas?.selectedIds?.length, 3);

    const distributeRes = await fetch(`${url}api/distribute-selected`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mode: 'equal_spacing_horizontal' }),
    });
    const distributeJson = await distributeRes.json();
    assert.equal(distributeRes.ok, true);
    assert.equal(distributeJson.ok, true);
    const distributeOverlays = distributeJson.state?.view?.canvas?.overlays || [];
    assert.equal(distributeOverlays.length, 3);
    const xValues = distributeOverlays.map((overlay) => overlay.x);
    assert.deepEqual(xValues, [20, 85, 150]);
    assert.equal(xValues[1] - xValues[0], 65);
    assert.equal(xValues[2] - xValues[1], 65);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
