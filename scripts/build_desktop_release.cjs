const fs = require('node:fs');
const path = require('node:path');

const { createDesktopAppShell } = require('../apps/desktop/dist/main/index.js');

const inputPath = process.argv[2] ? path.resolve(process.argv[2]) : null;
const outputDir = process.argv[3]
  ? path.resolve(process.argv[3])
  : path.resolve(__dirname, '../artifacts/desktop_release_bundle');

const shell = createDesktopAppShell();
shell.launchWindow();

if (inputPath) {
  const ext = path.extname(inputPath).toLowerCase();
  const familyHint = ext === '.html' || ext === '.htm' ? 'static_html_inline_svg' : 'matplotlib';
  shell.importFromFile(inputPath, familyHint, 'limited');
}

const artifact = shell.buildReleaseBundle(outputDir);
const manifest = JSON.parse(fs.readFileSync(artifact.manifestPath, 'utf8'));

console.log(
  JSON.stringify(
    {
      outputDir: artifact.outputDir,
      indexHtmlPath: artifact.indexHtmlPath,
      manifestPath: artifact.manifestPath,
      generatedAt: artifact.generatedAt,
      appName: manifest.productName,
      lifecycle: manifest.window.state,
      layoutRegions: manifest.layout.length,
      sourceImported: inputPath !== null,
    },
    null,
    2
  )
);
console.log('DESKTOP_RELEASE_BUNDLE_BUILT');
