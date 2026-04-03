const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createDesktopAppShell, createDesktopBootstrap } = require('../../apps/desktop/dist/main/index.js');
const { createDesktopBridge } = require('../../apps/desktop/dist/preload/index.js');

test('desktop shell exposes lifecycle, bridge, and release bundle artifacts', () => {
  const bootstrap = createDesktopBootstrap();
  assert.equal(bootstrap.supportsWindowLifecycle, true);
  assert.equal(bootstrap.supportsReleaseBundle, true);
  assert.equal(bootstrap.layout.length, 4);

  const shell = createDesktopAppShell();
  const launched = shell.launchWindow();
  assert.equal(launched.state, 'running');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'figure-editor-desktop-shell-test-'));
  const svgPath = path.join(tmpDir, 'desktop_shell.svg');
  const bundleDir = path.join(tmpDir, 'bundle');
  fs.writeFileSync(
    svgPath,
    `<?xml version="1.0" encoding="UTF-8"?>
<svg viewBox="0 0 120 80" width="120" height="80">
  <text x="8" y="18">Desktop Shell Test</text>
  <rect x="8" y="26" width="60" height="24" />
</svg>`,
    'utf8'
  );

  shell.importFromFile(svgPath, 'matplotlib');
  shell.selectFirstEditableText();
  shell.editSelectedText('Desktop Shell Edited');

  const bridge = createDesktopBridge();
  bridge.setCommandHandler((command) => {
    if (command === 'state.snapshot') return shell.snapshot();
    if (command === 'window.close') return shell.closeWindow();
    throw new Error(`Unhandled bridge command: ${command}`);
  });
  const bridgeSnapshot = bridge.invoke('state.snapshot');
  assert.equal(Array.isArray(bridgeSnapshot.objectTree), true);

  const rendered = shell.renderWindowDocument();
  assert.equal(rendered.includes('Desktop Window Shell'), true);
  assert.equal(rendered.includes('Desktop Shell Edited'), true);

  const artifact = shell.buildReleaseBundle(bundleDir);
  assert.equal(fs.existsSync(artifact.indexHtmlPath), true);
  assert.equal(fs.existsSync(artifact.manifestPath), true);

  const closed = bridge.invoke('window.close');
  assert.equal(closed.state, 'closed');
});
