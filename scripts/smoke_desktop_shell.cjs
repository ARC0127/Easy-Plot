const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createDesktopAppShell, createDesktopBootstrap } = require('../apps/desktop/dist/main/index.js');
const { createDesktopBridge } = require('../apps/desktop/dist/preload/index.js');

const sampleSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg viewBox="0 0 320 180" width="320" height="180">
  <g id="axes_1"><text id="text_title" x="20" y="20">Shell Title</text><rect x="20" y="40" width="100" height="60"/></g>
  <g id="axes_2"><rect x="180" y="40" width="100" height="60"/></g>
  <g id="legend_1"><text id="text_legend" x="220" y="20">Legend</text></g>
</svg>`;

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'figure-editor-desktop-shell-'));
const sourcePath = path.join(tmpDir, 'desktop-shell-source.svg');
const bundleDir = path.join(tmpDir, 'release-bundle');
fs.writeFileSync(sourcePath, sampleSvg, 'utf8');

const bootstrap = createDesktopBootstrap();
assert.equal(bootstrap.supportsWindowLifecycle, true);
assert.equal(bootstrap.supportsReleaseBundle, true);
assert.equal(bootstrap.layout.length, 4);

const shell = createDesktopAppShell();
const launched = shell.launchWindow();
assert.equal(launched.state, 'running');

shell.importFromFile(sourcePath, 'matplotlib');
shell.selectFirstEditableText();
shell.editSelectedText('Desktop Shell Updated');

const bridge = createDesktopBridge();
bridge.setCommandHandler((command, payload) => {
  switch (command) {
    case 'state.snapshot':
      return shell.snapshot();
    case 'window.close':
      return shell.closeWindow();
    default:
      throw new Error(`Unsupported command in smoke bridge: ${command}`);
  }
});
const snapshot = bridge.invoke('state.snapshot');
assert.equal(Array.isArray(snapshot.objectTree), true);

const rendered = shell.renderWindowDocument();
assert.equal(rendered.includes('Desktop Window Shell'), true);
assert.equal(rendered.includes('Desktop Shell Updated'), true);
assert.equal(rendered.includes('region region-left'), true);
assert.equal(rendered.includes('region region-bottom'), true);

const artifact = shell.buildReleaseBundle(bundleDir);
assert.equal(fs.existsSync(artifact.indexHtmlPath), true);
assert.equal(fs.existsSync(artifact.manifestPath), true);
const manifest = JSON.parse(fs.readFileSync(artifact.manifestPath, 'utf8'));
assert.equal(manifest.entrypoint, 'index.html');
assert.equal(manifest.window.state, 'running');
assert.equal(manifest.layout.length, 4);

const closed = bridge.invoke('window.close');
assert.equal(closed.state, 'closed');

console.log(
  JSON.stringify(
    {
      windowId: launched.windowId,
      bundleDir: artifact.outputDir,
      indexHtmlPath: artifact.indexHtmlPath,
      manifestPath: artifact.manifestPath,
      renderRevision: artifact.renderRevision,
    },
    null,
    2
  )
);
console.log('SMOKE_DESKTOP_SHELL_PASS');
