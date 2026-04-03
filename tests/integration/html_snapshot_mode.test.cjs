const test = require('node:test');
const assert = require('node:assert/strict');

const {
  deleteSelected,
  editSelectedText,
  importIntoSession,
  moveSelected,
  promoteSelected,
  selectObject,
} = require('../../packages/editor-state/dist/index.js');

function sourceRef() {
  return {
    sourceId: 'src_snapshot_html',
    kind: 'html',
    path: '/virtual/snapshot_case.html',
    sha256: 'dummy',
    familyHint: 'static_html_inline_svg',
    importedAt: new Date().toISOString(),
  };
}

function countCapability(session, capability) {
  return Object.values(session.project.project.objects).filter((obj) => obj.capabilities.includes(capability)).length;
}

function firstObjectId(session) {
  const ids = Object.keys(session.project.project.objects);
  if (ids.length === 0) throw new Error('Expected imported session to have at least one object.');
  return ids[0];
}

function isReadOnlyError(error) {
  return Boolean(error) && error.code === 'ERR_CAPABILITY_CONFLICT' && String(error.message).includes('Session is read-only');
}

test('snapshot html mode strips editable capabilities and leaves warning evidence', () => {
  const html = `
<html>
  <body>
    <div data-reactroot="true">
      <script>window.__x=1</script>
      <svg viewBox="0 0 120 60" width="120" height="60">
        <text x="10" y="20">Snapshot Text</text>
        <rect x="10" y="30" width="40" height="20"></rect>
      </svg>
    </div>
  </body>
</html>`;

  const limited = importIntoSession(
    { path: '/virtual/snapshot_case.html', content: html },
    sourceRef(),
    { htmlMode: 'limited' }
  );
  const snapshot = importIntoSession(
    { path: '/virtual/snapshot_case.html', content: html },
    sourceRef(),
    { htmlMode: 'snapshot' }
  );

  const limitedTextEditCount = countCapability(limited, 'text_edit');
  const snapshotTextEditCount = countCapability(snapshot, 'text_edit');

  assert.equal(snapshotTextEditCount, 0);
  assert.equal(limitedTextEditCount >= snapshotTextEditCount, true);
  assert.equal(snapshot.warnings.some((warning) => warning.includes('snapshot mode')), true);
  assert.equal(snapshot.policy.sessionMode, 'snapshot_read_only');
  assert.equal(snapshot.policy.readOnly, true);
  assert.equal(snapshot.policy.htmlMode, 'snapshot');
});

test('snapshot html mode blocks mutating editor operations through session policy', () => {
  const html = `
<html>
  <body>
    <div data-reactroot="true">
      <script>window.__x=1</script>
      <svg viewBox="0 0 120 60" width="120" height="60">
        <text x="10" y="20">Snapshot Text</text>
        <rect x="10" y="30" width="40" height="20"></rect>
      </svg>
    </div>
  </body>
</html>`;

  const snapshot = importIntoSession(
    { path: '/virtual/snapshot_case.html', content: html },
    sourceRef(),
    { htmlMode: 'snapshot' }
  );
  const selected = selectObject(snapshot, firstObjectId(snapshot));

  assert.throws(() => moveSelected(selected, 2, 1), isReadOnlyError);
  assert.throws(() => deleteSelected(selected), isReadOnlyError);
  assert.throws(() => editSelectedText(selected, 'blocked edit'), isReadOnlyError);
  assert.throws(() => promoteSelected(selected, 'panel'), isReadOnlyError);
});

test('limited html mode keeps session writable', () => {
  const html = `
<html>
  <body>
    <div data-reactroot="true">
      <script>window.__x=1</script>
      <svg viewBox="0 0 120 60" width="120" height="60">
        <text x="10" y="20">Limited Text</text>
        <rect x="10" y="30" width="40" height="20"></rect>
      </svg>
    </div>
  </body>
</html>`;

  const limited = importIntoSession(
    { path: '/virtual/snapshot_case.html', content: html },
    sourceRef(),
    { htmlMode: 'limited' }
  );
  const selected = selectObject(limited, firstObjectId(limited));

  assert.equal(limited.policy.readOnly, false);
  assert.doesNotThrow(() => moveSelected(selected, 1, 1));
});
