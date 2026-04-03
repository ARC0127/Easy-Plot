const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PNG } = require('pngjs');
const { Resvg } = require('@resvg/resvg-js');

const { createDesktopWorkbench } = require('../apps/desktop/dist/renderer/index.js');

const REPO_ROOT = path.resolve(__dirname, '..');
const CASES_DIR = path.join(REPO_ROOT, 'artifacts', 'release_suite', 'cases', 'originals');
const GENERATED_DIR = path.join(REPO_ROOT, 'artifacts', 'release_suite', 'generated');

function ensureDir(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
}

function esc(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderSvgToPng(svgText, width) {
  return PNG.sync.read(
    new Resvg(svgText, {
      fitTo: { mode: 'width', value: width },
      background: '#ffffff',
      font: { loadSystemFonts: true },
      shapeRendering: 2,
      textRendering: 2,
      imageRendering: 0,
    }).render().asPng()
  );
}

function renderSvgFileToPng(filePath, width) {
  return renderSvgToPng(fs.readFileSync(filePath, 'utf8'), width);
}

function fillRect(png, x, y, width, height, rgba) {
  for (let yy = y; yy < y + height; yy += 1) {
    for (let xx = x; xx < x + width; xx += 1) {
      const idx = (png.width * yy + xx) * 4;
      png.data[idx] = rgba[0];
      png.data[idx + 1] = rgba[1];
      png.data[idx + 2] = rgba[2];
      png.data[idx + 3] = rgba[3];
    }
  }
}

function blit(dst, src, left, top) {
  for (let y = 0; y < src.height; y += 1) {
    for (let x = 0; x < src.width; x += 1) {
      const srcIdx = (src.width * y + x) * 4;
      const dstIdx = (dst.width * (top + y) + (left + x)) * 4;
      dst.data[dstIdx] = src.data[srcIdx];
      dst.data[dstIdx + 1] = src.data[srcIdx + 1];
      dst.data[dstIdx + 2] = src.data[srcIdx + 2];
      dst.data[dstIdx + 3] = src.data[srcIdx + 3];
    }
  }
}

function renderLabelPng(text, width, height, fill, stroke, color) {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect x="4" y="4" width="${width - 8}" height="${height - 8}" rx="18" fill="${fill}" stroke="${stroke}" stroke-width="2" />
  <text x="${width / 2}" y="${height / 2 + 10}" text-anchor="middle" font-size="34" font-weight="700" font-family="Segoe UI, Arial, sans-serif" fill="${color}">${esc(text)}</text>
</svg>`;
  return renderSvgToPng(svg, width);
}

function writeJson(targetPath, payload) {
  fs.writeFileSync(targetPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function expectSelectedId(view, objectId) {
  assert.equal(Array.isArray(view.canvas.selectedIds), true);
  assert.equal(view.canvas.selectedIds.includes(objectId), true);
}

const CASES = [
  {
    id: 'curve_release_case',
    familyHint: 'chart_family',
    originalPath: path.join(CASES_DIR, 'curve_release_case.svg'),
    apply(workbench, log) {
      let view = workbench.importFromFile(this.originalPath, this.familyHint, 'limited');
      log('import');
      view = workbench.selectTextAtPoint(180, 84, 96);
      assert.equal(view.properties?.objectType, 'text_node');
      workbench.editSelectedText('Curve Release Validation (Adjusted)');
      log('select_text_at + edit_text');

      view = workbench.selectById('curve_series_a_group');
      expectSelectedId(view, 'curve_series_a_group');
      workbench.adjustSelectedCurve(-24);
      log('adjust_curve_series_a');

      view = workbench.selectById('curve_series_b_group');
      expectSelectedId(view, 'curve_series_b_group');
      workbench.adjustSelectedCurve(18);
      log('adjust_curve_series_b');

      view = workbench.selectById('curve_legend_group');
      expectSelectedId(view, 'curve_legend_group');
      workbench.moveSelected(-18, 24);
      log('select_by_id + move_group');

      workbench.addTextAtPoint(92, 498, 'Adjusted: legend aligned and release note refreshed');
      log('add_text');

      view = workbench.selectById('curve_note_delete');
      expectSelectedId(view, 'curve_note_delete');
      workbench.deleteSelected();
      workbench.undo();
      workbench.redo();
      log('delete + undo + redo');
    },
  },
  {
    id: 'matrix_release_case',
    familyHint: 'chart_family',
    originalPath: path.join(CASES_DIR, 'matrix_release_case.svg'),
    apply(workbench, log) {
      let view = workbench.importFromFile(this.originalPath, this.familyHint, 'limited');
      log('import');
      view = workbench.selectById('matrix_title');
      expectSelectedId(view, 'matrix_title');
      workbench.editSelectedText('Matrix Release Validation (Adjusted)');
      log('select_by_id + edit_text');

      view = workbench.selectById('matrix_hotspot_group');
      expectSelectedId(view, 'matrix_hotspot_group');
      workbench.moveSelected(24, 18);
      workbench.undo();
      workbench.redo();
      log('move_group + undo + redo');

      workbench.addTextAtPoint(680, 468, 'Adjusted hotspot moved after QA review');
      log('add_text');

      view = workbench.selectById('matrix_note_delete');
      expectSelectedId(view, 'matrix_note_delete');
      workbench.deleteSelected();
      log('delete');
    },
  },
  {
    id: 'flow_release_case',
    familyHint: 'illustration_like',
    originalPath: path.join(CASES_DIR, 'flow_release_case.svg'),
    apply(workbench, log) {
      let view = workbench.importFromFile(this.originalPath, this.familyHint, 'limited');
      log('import');
      view = workbench.multiSelectByIds(['flow_ingest_group', 'flow_publish_group']);
      assert.equal(view.canvas.selectedIds.length, 2);
      log('multi_select');

      view = workbench.selectById('flow_verify_group');
      expectSelectedId(view, 'flow_verify_group');
      workbench.moveSelected(36, 18);
      log('move_group');

      view = workbench.selectById('flow_verify_label');
      expectSelectedId(view, 'flow_verify_label');
      workbench.editSelectedText('Verify & Tune');
      log('edit_text');

      workbench.addTextAtPoint(88, 494, 'Added note: publish only after QA review');
      log('add_text');

      view = workbench.selectById('flow_note_delete');
      expectSelectedId(view, 'flow_note_delete');
      workbench.deleteSelected();
      log('delete');
    },
  },
];

function buildCaseArtifacts(caseConfig) {
  const caseDir = path.join(GENERATED_DIR, caseConfig.id);
  ensureDir(caseDir);

  const workbench = createDesktopWorkbench();
  const operations = [];
  caseConfig.apply(workbench, (name) => operations.push(name));

  const paths = {
    project: path.join(caseDir, `${caseConfig.id}.project.json`),
    svg: path.join(caseDir, `${caseConfig.id}.adjusted.svg`),
    html: path.join(caseDir, `${caseConfig.id}.adjusted.html`),
    png: path.join(caseDir, `${caseConfig.id}.adjusted.png`),
    summary: path.join(caseDir, `${caseConfig.id}.summary.json`),
  };

  workbench.saveProjectToFile(paths.project);
  operations.push('save_project');
  workbench.loadProjectFromFile(paths.project);
  operations.push('load_project');
  workbench.exportSvgToFile(paths.svg);
  operations.push('export_svg');
  workbench.exportHtmlToFile(paths.html);
  operations.push('export_html');
  workbench.exportPngToFile(paths.png);
  operations.push('export_png');

  const adjustedSvg = fs.readFileSync(paths.svg, 'utf8');
  const summary = {
    caseId: caseConfig.id,
    familyHint: caseConfig.familyHint,
    originalPath: caseConfig.originalPath,
    outputs: paths,
    operations,
    selectedIdsAfterBuild: workbench.snapshot().canvas.selectedIds,
    adjustedSvgLength: adjustedSvg.length,
  };
  writeJson(paths.summary, summary);
  return summary;
}

function buildMontage(caseSummaries) {
  const labelWidth = 180;
  const cellWidth = 470;
  const gap = 24;
  const labelHeight = 80;
  const originalLabel = renderLabelPng('Original', labelWidth, labelHeight, '#dbeafe', '#93c5fd', '#1d4ed8');
  const adjustedLabel = renderLabelPng('Adjusted', labelWidth, labelHeight, '#dcfce7', '#86efac', '#166534');

  const originalImages = caseSummaries.map((summary) => renderSvgFileToPng(summary.originalPath, cellWidth));
  const adjustedImages = caseSummaries.map((summary) => renderSvgFileToPng(summary.outputs.svg, cellWidth));

  const rowHeight = originalImages[0].height;
  const canvasWidth = labelWidth + gap * 5 + cellWidth * caseSummaries.length;
  const canvasHeight = gap * 4 + labelHeight + rowHeight * 2;
  const canvas = new PNG({ width: canvasWidth, height: canvasHeight });

  fillRect(canvas, 0, 0, canvasWidth, canvasHeight, [243, 246, 251, 255]);
  fillRect(canvas, 0, 0, canvasWidth, labelHeight + gap * 2, [255, 255, 255, 255]);

  const originalTop = gap + labelHeight;
  const adjustedTop = gap * 2 + labelHeight + rowHeight;

  blit(canvas, originalLabel, gap, gap);
  blit(canvas, adjustedLabel, gap, adjustedTop - labelHeight - gap);

  caseSummaries.forEach((summary, index) => {
    const left = labelWidth + gap * 2 + index * (cellWidth + gap);
    fillRect(canvas, left - 8, originalTop - 8, cellWidth + 16, rowHeight + 16, [255, 255, 255, 255]);
    fillRect(canvas, left - 8, adjustedTop - 8, cellWidth + 16, rowHeight + 16, [255, 255, 255, 255]);
    blit(canvas, originalImages[index], left, originalTop);
    blit(canvas, adjustedImages[index], left, adjustedTop);
  });

  const montagePath = path.join(GENERATED_DIR, 'release_suite_results.png');
  fs.writeFileSync(montagePath, PNG.sync.write(canvas));
  return montagePath;
}

function runBuildReleaseShowcaseSuite() {
  ensureDir(GENERATED_DIR);

  const caseSummaries = CASES.map(buildCaseArtifacts);
  const montagePath = buildMontage(caseSummaries);
  const suiteSummary = {
    generatedAt: new Date().toISOString(),
    cases: caseSummaries,
    montagePath,
    outputDir: GENERATED_DIR,
  };
  writeJson(path.join(GENERATED_DIR, 'release_suite_summary.json'), suiteSummary);
  return suiteSummary;
}

if (require.main === module) {
  const summary = runBuildReleaseShowcaseSuite();
  console.log(JSON.stringify(summary, null, 2));
}

module.exports = {
  runBuildReleaseShowcaseSuite,
};
