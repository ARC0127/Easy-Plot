const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  archiveOriginalSource,
  createEmptyProject,
  loadProject,
  saveProject,
  validateProjectState,
} = require('../../packages/editor-state/dist/index.js');

test('project persistence APIs create/save/load/validate/archive work together', () => {
  let project = createEmptyProject({ projectId: 'proj_persistence', figureId: 'fig_persistence', width: 320, height: 180 });
  project = archiveOriginalSource(project, {
    sourceId: 'src_001',
    kind: 'svg',
    path: '/virtual/src.svg',
    sha256: 'generated',
    familyHint: 'matplotlib',
    importedAt: new Date().toISOString(),
  });

  const report = validateProjectState(project);
  assert.equal(report.ok, true);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'figure-editor-project-api-'));
  const projectPath = path.join(tmpDir, 'project.figure.json');
  saveProject(project, projectPath);

  const loaded = loadProject(projectPath);
  assert.equal(loaded.project.projectId, 'proj_persistence');
  assert.equal(loaded.project.figure.figureId, 'fig_persistence');
  assert.equal(loaded.project.originalSources.length, 1);
});
