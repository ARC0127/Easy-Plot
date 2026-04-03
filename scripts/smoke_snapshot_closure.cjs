const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { exportHTML } = require('../packages/core-export-html/dist/index.js');
const {
  createEditorSession,
  deleteSelected,
  importIntoSession,
  loadProject,
  moveSelected,
  promoteSelected,
  saveProject,
  selectObject,
} = require('../packages/editor-state/dist/index.js');

function sourceRef(filePath) {
  return {
    sourceId: 'src_snapshot_smoke',
    kind: 'html',
    path: filePath,
    sha256: 'dummy',
    familyHint: 'static_html_inline_svg',
    importedAt: new Date().toISOString(),
  };
}

function firstObjectId(session) {
  const ids = Object.keys(session.project.project.objects);
  if (ids.length === 0) throw new Error('Expected imported session to have at least one object.');
  return ids[0];
}

function isReadOnlyError(error) {
  return Boolean(error) && error.code === 'ERR_CAPABILITY_CONFLICT' && String(error.message).includes('Session is read-only');
}

const html = `
<html>
  <body>
    <div data-reactroot="true">
      <script>window.__snapshot=true</script>
      <svg viewBox="0 0 140 70" width="140" height="70">
        <text x="10" y="20">D4 Smoke</text>
        <rect x="10" y="30" width="60" height="24"></rect>
      </svg>
    </div>
  </body>
</html>`;

const snapshot = importIntoSession(
  { path: '/virtual/snapshot_smoke.html', content: html },
  sourceRef('/virtual/snapshot_smoke.html'),
  { htmlMode: 'snapshot' }
);
assert.equal(snapshot.policy.readOnly, true);
assert.equal(snapshot.project.project.figure.metadata.tags.includes('session:snapshot_read_only'), true);
const selected = selectObject(snapshot, firstObjectId(snapshot));
assert.throws(() => moveSelected(selected, 2, 2), isReadOnlyError);

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'figure-editor-snapshot-smoke-'));
const projectFile = path.join(tmpDir, 'snapshot.project.json');
saveProject(snapshot.project, projectFile);
const loadedProject = loadProject(projectFile);
const loadedSession = createEditorSession(loadedProject);
const loadedSelected = selectObject(loadedSession, firstObjectId(loadedSession));
assert.throws(() => deleteSelected(loadedSelected), isReadOnlyError);

const htmlArtifact = exportHTML(snapshot.project);
const reimportedSnapshot = importIntoSession(
  { path: '/virtual/snapshot_smoke_export.html', content: htmlArtifact.content },
  sourceRef('/virtual/snapshot_smoke_export.html'),
  { htmlMode: 'snapshot' }
);
const reimportSelected = selectObject(reimportedSnapshot, firstObjectId(reimportedSnapshot));
assert.throws(() => promoteSelected(reimportSelected, 'panel'), isReadOnlyError);

console.log(
  JSON.stringify(
    {
      projectFile,
      importWarnings: snapshot.warnings.length,
      reimportWarnings: reimportedSnapshot.warnings.length,
      objectCount: Object.keys(snapshot.project.project.objects).length,
    },
    null,
    2
  )
);
console.log('SMOKE_SNAPSHOT_CLOSURE_PASS');
