const test = require('node:test');
const assert = require('node:assert/strict');

const { parseDocument } = require('../../packages/core-parser/dist/index.js');

const dynamicHtml = '<!DOCTYPE html><html><body><script>window.x=1;</script><div id="root" data-reactroot="1">Hello</div></body></html>';

test('strict_static html mode rejects dynamic html', () => {
  assert.throws(
    () => parseDocument({ path: '/virtual/dynamic.html', content: dynamicHtml }, { htmlMode: 'strict_static' }),
    (error) => error && error.code === 'ERR_DYNAMIC_HTML_NOT_SUPPORTED'
  );
});

test('limited html mode accepts dynamic html with metadata', () => {
  const parsed = parseDocument({ path: '/virtual/dynamic.html', content: dynamicHtml }, { htmlMode: 'limited' });
  assert.equal(parsed.kind, 'html');
  assert.equal(parsed.parseMetadata?.htmlMode, 'limited');
  assert.equal(parsed.parseMetadata?.staticSubset, false);
  assert.ok((parsed.parseMetadata?.dynamicSignals ?? []).length > 0);
});
