const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { exportHTML } = require('../../packages/core-export-html/dist/index.js');
const {
  createEditorSession,
  deleteSelected,
  importIntoSession,
  loadProject,
  moveSelected,
  promoteSelected,
  saveProject,
  selectObject,
} = require('../../packages/editor-state/dist/index.js');

function sourceRef(filePath = '/virtual/snapshot_case.html') {
  return {
    sourceId: 'src_snapshot_html_e2e',
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

test('snapshot session keeps read-only boundary across save/load and export-reimport loop', () => {
  const html = `
<html>
  <body>
    <div data-reactroot="true">
      <script>window.__snapshot=true</script>
      <svg viewBox="0 0 200 80" width="200" height="80">
        <text x="10" y="22">Snapshot Proof</text>
        <rect x="10" y="30" width="120" height="32"></rect>
      </svg>
    </div>
  </body>
</html>`;

  const snapshot = importIntoSession(
    { path: '/virtual/d4_snapshot.html', content: html },
    sourceRef('/virtual/d4_snapshot.html'),
    { htmlMode: 'snapshot' }
  );
  assert.equal(snapshot.policy.readOnly, true);
  assert.equal(snapshot.policy.sessionMode, 'snapshot_read_only');
  assert.equal(snapshot.project.project.figure.metadata.tags.includes('session:snapshot_read_only'), true);

  const selected = selectObject(snapshot, firstObjectId(snapshot));
  assert.throws(() => moveSelected(selected, 4, 3), isReadOnlyError);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'figure-editor-snapshot-d4-'));
  const projectFile = path.join(tmpDir, 'snapshot.project.json');
  saveProject(snapshot.project, projectFile);

  const loadedProject = loadProject(projectFile);
  const loadedSession = createEditorSession(loadedProject);
  assert.equal(loadedSession.policy.readOnly, true);
  assert.equal(loadedSession.policy.sessionMode, 'snapshot_read_only');
  const loadedSelected = selectObject(loadedSession, firstObjectId(loadedSession));
  assert.throws(() => deleteSelected(loadedSelected), isReadOnlyError);

  const htmlArtifact = exportHTML(snapshot.project);
  const reimportedSnapshot = importIntoSession(
    { path: '/virtual/d4_snapshot_export.html', content: htmlArtifact.content },
    sourceRef('/virtual/d4_snapshot_export.html'),
    { htmlMode: 'snapshot' }
  );
  assert.equal(reimportedSnapshot.policy.readOnly, true);
  const reimportSelected = selectObject(reimportedSnapshot, firstObjectId(reimportedSnapshot));
  assert.throws(() => promoteSelected(reimportSelected, 'panel'), isReadOnlyError);
});
