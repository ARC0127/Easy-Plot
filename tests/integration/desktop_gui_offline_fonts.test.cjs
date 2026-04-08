const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { startDesktopGuiServer } = require('../../scripts/desktop_gui_server.cjs');

test('desktop gui serves bundled offline fonts and exports sidecar font packs', async () => {
  const { url, server } = await startDesktopGuiServer({
    host: '127.0.0.1',
    port: 0,
    open: false,
  });

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'figure-editor-font-pack-'));
  const htmlPath = path.join(tmpDir, 'exported.html');
  const svgPath = path.join(tmpDir, 'exported.svg');

  try {
    const htmlRes = await fetch(url);
    const html = await htmlRes.text();
    assert.equal(htmlRes.ok, true);
    assert.equal(html.includes('@font-face'), true);
    assert.equal(html.includes('/fonts/inter-400-normal.ttf'), true);
    assert.equal(html.includes('/fonts/noto-sans-sc-400-normal.ttf'), true);

    const manifestRes = await fetch(`${url}fonts/manifest.json`);
    const manifest = await manifestRes.json();
    assert.equal(manifestRes.ok, true);
    assert.equal(manifest.manifestVersion, '1.0.0');
    assert.equal(manifest.families.length >= 16, true);

    const sampleSvg = `<svg viewBox="0 0 220 120" width="220" height="120">
  <g id="axes_1"><text id="text_title" x="20" y="24">Offline Font Probe</text><rect x="20" y="40" width="90" height="48" fill="#dbeafe" /></g>
</svg>`;

    const importRes = await fetch(`${url}api/import-content`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        path: 'offline-font-probe.svg',
        content: sampleSvg,
        kind: 'svg',
        familyHint: 'matplotlib',
        htmlMode: 'limited',
      }),
    });
    const importJson = await importRes.json();
    assert.equal(importRes.ok, true);
    assert.equal(importJson.ok, true);

    const exportHtmlRes = await fetch(`${url}api/export-html`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: htmlPath }),
    });
    const exportHtmlJson = await exportHtmlRes.json();
    assert.equal(exportHtmlRes.ok, true);
    assert.equal(exportHtmlJson.ok, true);

    const exportSvgRes = await fetch(`${url}api/export-svg`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path: svgPath }),
    });
    const exportSvgJson = await exportSvgRes.json();
    assert.equal(exportSvgRes.ok, true);
    assert.equal(exportSvgJson.ok, true);

    assert.equal(fs.existsSync(path.join(tmpDir, 'fonts', 'manifest.json')), true);
    assert.equal(fs.existsSync(path.join(tmpDir, 'fonts', 'inter-400-normal.ttf')), true);
    assert.equal(fs.existsSync(path.join(tmpDir, 'fonts', 'noto-sans-sc-400-normal.ttf')), true);

    const exportedHtml = fs.readFileSync(htmlPath, 'utf8');
    const exportedSvg = fs.readFileSync(svgPath, 'utf8');
    assert.equal(exportedHtml.includes('fonts/inter-400-normal.ttf'), true);
    assert.equal(exportedSvg.includes('fonts/inter-400-normal.ttf'), true);
    assert.equal(exportedSvg.includes('<style>'), true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
