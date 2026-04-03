const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { PNG } = require('pngjs');

const { startDesktopGuiServer } = require('../../scripts/desktop_gui_server.cjs');

test('desktop gui save dispatch exports svg/html and keeps json for project saves', async () => {
  const { url, server } = await startDesktopGuiServer({
    host: '127.0.0.1',
    port: 0,
    open: false,
  });

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'figure-editor-gui-save-'));
  const svgOut = path.join(tmpDir, 'saved_from_gui.svg');
  const jsonOut = path.join(tmpDir, 'saved_from_gui.json');
  const pngOut = path.join(tmpDir, 'saved_from_gui.png');

  try {
    const sampleSvg = `<svg viewBox="0 0 240 120" width="240" height="120">
  <g id="axes_1"><text id="text_title" x="20" y="24">Save Probe</text><rect x="20" y="40" width="90" height="48" fill="#dbeafe" /></g>
</svg>`;

    const importRes = await fetch(`${url}api/import-content`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        path: 'save_probe.svg',
        content: sampleSvg,
        kind: 'svg',
        familyHint: 'unknown',
        htmlMode: 'limited',
      }),
    });
    const importJson = await importRes.json();
    assert.equal(importRes.ok, true);
    assert.equal(importJson.ok, true);

    const saveSvgRes = await fetch(`${url}api/save-artifact`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: svgOut }),
    });
    const saveSvgJson = await saveSvgRes.json();
    assert.equal(saveSvgRes.ok, true);
    assert.equal(saveSvgJson.ok, true);

    const savedSvg = fs.readFileSync(svgOut, 'utf8');
    assert.equal(savedSvg.startsWith('<?xml'), true);
    assert.equal(savedSvg.includes('<svg'), true);
    assert.equal(savedSvg.includes('Save Probe'), true);

    const savePngRes = await fetch(`${url}api/save-artifact`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: pngOut }),
    });
    const savePngJson = await savePngRes.json();
    assert.equal(savePngRes.ok, true);
    assert.equal(savePngJson.ok, true);
    assert.equal(savePngJson.savedMode, 'png');

    const savedPng = fs.readFileSync(pngOut);
    assert.deepEqual(Array.from(savedPng.subarray(0, 8)), [137, 80, 78, 71, 13, 10, 26, 10]);
    const parsedPng = PNG.sync.read(savedPng);
    assert.ok(parsedPng.width >= 4096);

    const saveProjectRes = await fetch(`${url}api/save-artifact`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: jsonOut }),
    });
    const saveProjectJson = await saveProjectRes.json();
    assert.equal(saveProjectRes.ok, true);
    assert.equal(saveProjectJson.ok, true);

    const savedProject = fs.readFileSync(jsonOut, 'utf8');
    assert.equal(savedProject.trim().startsWith('{'), true);
    assert.equal(savedProject.includes('"schemaVersion"'), true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
