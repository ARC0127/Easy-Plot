const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { runBatch } = require('./desktop_pilot_cli.cjs');

const sampleSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg viewBox="0 0 320 180" width="320" height="180">
  <g id="axes_1"><text id="text_title" x="20" y="20">Title</text><rect x="20" y="40" width="100" height="60"/></g>
  <g id="axes_2"><rect x="180" y="40" width="100" height="60"/></g>
  <g id="legend_1"><text id="text_legend" x="220" y="20">Legend</text></g>
</svg>`;

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'figure-editor-desktop-pilot-'));
const inputFile = path.join(tmpDir, 'pilot_input.svg');
const projectFile = path.join(tmpDir, 'pilot.project.json');
const outSvgFile = path.join(tmpDir, 'pilot_out.svg');
const outHtmlFile = path.join(tmpDir, 'pilot_out.html');
const snapshotFile = path.join(tmpDir, 'pilot_snapshot.json');
const commandsFile = path.join(tmpDir, 'pilot_commands.txt');

fs.writeFileSync(inputFile, sampleSvg, 'utf8');
fs.writeFileSync(
  commandsFile,
  [
    `open "${inputFile}" matplotlib`,
    'status',
    'select-first-text',
    'edit "Pilot Updated Title"',
    'move 3 2',
    `save-project "${projectFile}"`,
    `export-svg "${outSvgFile}"`,
    `export-html "${outHtmlFile}"`,
    `snapshot "${snapshotFile}"`,
    'quit',
  ].join('\n'),
  'utf8'
);

const results = runBatch(commandsFile, { print: false });
const errors = results.filter((entry) => entry.ok === false);
assert.equal(errors.length, 0);

const openResult = results.find((entry) => entry.command === 'open');
assert.ok(openResult);
assert.equal(openResult.family, 'matplotlib');
assert.equal(openResult.treeCount > 0, true);

const editResult = results.find((entry) => entry.command === 'edit');
assert.ok(editResult);
assert.equal(String(editResult.text).includes('Pilot Updated Title'), true);

assert.equal(fs.existsSync(projectFile), true);
assert.equal(fs.existsSync(outSvgFile), true);
assert.equal(fs.existsSync(outHtmlFile), true);
assert.equal(fs.existsSync(snapshotFile), true);

const outSvg = fs.readFileSync(outSvgFile, 'utf8');
const outHtml = fs.readFileSync(outHtmlFile, 'utf8');
assert.equal(outSvg.includes('<svg'), true);
assert.equal(outHtml.toLowerCase().includes('<html'), true);

console.log(
  JSON.stringify(
    {
      inputFile,
      projectFile,
      outSvgFile,
      outHtmlFile,
      snapshotFile,
      commandCount: results.length,
      openFamily: openResult.family,
      editedText: editResult.text,
    },
    null,
    2
  )
);
console.log('SMOKE_DESKTOP_PILOT_PASS');
