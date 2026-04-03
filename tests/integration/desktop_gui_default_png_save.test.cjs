const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { PNG } = require('pngjs');

const { startDesktopGuiServer } = require('../../scripts/desktop_gui_server.cjs');

test('desktop gui default save writes full-size png beside imported source file', async () => {
  const { url, server } = await startDesktopGuiServer({
    host: '127.0.0.1',
    port: 0,
    open: false,
  });

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'figure-editor-gui-default-png-'));
  const sourceSvgPath = path.join(tmpDir, 'default_png_probe.svg');
  const sampleSvg = `<svg viewBox="0 0 240 120" width="240" height="120">
  <text x="24" y="32">PNG Probe</text>
  <rect x="20" y="44" width="120" height="50" fill="#dbeafe" />
</svg>`;
  fs.writeFileSync(sourceSvgPath, sampleSvg, 'utf8');

  try {
    const importRes = await fetch(`${url}api/import-path`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        path: sourceSvgPath,
        familyHint: 'unknown',
        htmlMode: 'limited',
      }),
    });
    const importJson = await importRes.json();
    assert.equal(importRes.ok, true);
    assert.equal(importJson.ok, true);

    const saveRes = await fetch(`${url}api/save-artifact`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    const saveJson = await saveRes.json();
    assert.equal(saveRes.ok, true);
    assert.equal(saveJson.ok, true);
    assert.equal(saveJson.savedMode, 'png');

    const expectedPath = path.join(tmpDir, 'default_png_probe_full.png');
    assert.equal(saveJson.savedPath, expectedPath);
    assert.equal(fs.existsSync(expectedPath), true);

    const savedPng = fs.readFileSync(expectedPath);
    assert.deepEqual(Array.from(savedPng.subarray(0, 8)), [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.ok(savedPng.length > 1000);
    const parsed = PNG.sync.read(savedPng);
    assert.ok(parsed.width >= 4096);
    assert.ok(parsed.height >= 2048);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
