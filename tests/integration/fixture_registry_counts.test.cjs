const test = require('node:test');
const assert = require('node:assert/strict');
const { getFixturesByFamily, loadFixtureRegistry } = require('../../packages/testing-fixtures/dist/index.js');

test('fixture registry reaches required family minimum counts', () => {
  const all = loadFixtureRegistry();
  assert.equal(all.length, 52);

  assert.equal(getFixturesByFamily('matplotlib').length, 10);
  assert.equal(getFixturesByFamily('chart_family').length, 8);
  assert.equal(getFixturesByFamily('illustration_like').length, 8);
  assert.equal(getFixturesByFamily('llm_svg').length, 10);
  assert.equal(getFixturesByFamily('static_html_inline_svg').length, 8);
  assert.equal(getFixturesByFamily('degraded_svg').length, 8);
});
