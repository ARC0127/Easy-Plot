const test = require('node:test');
const assert = require('node:assert/strict');

const { parseDocument } = require('../../packages/core-parser/dist/index.js');
const { normalizeDocument } = require('../../packages/core-normalizer/dist/index.js');

function findByAttrId(doc, id) {
  return Object.values(doc.nodes).find((node) => String(node.attributes.id || '') === id) || null;
}

test('parser captures namespace/local tag info and normalizer resolves deeper geometry/style contracts', () => {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 120 80">
  <defs>
    <clipPath id="clipA"><rect x="0" y="0" width="50" height="40"/></clipPath>
    <g id="glyph"><rect x="2" y="3" width="10" height="6"/></g>
  </defs>
  <style>
    g .label { font-size: 14; fill: #123456; }
    #title { font-weight: 700; }
  </style>
  <g id="group1" transform="translate(10,5)">
    <svg:rect id="nsRect" class="label" x="1" y="2" width="3" height="4"/>
    <text id="title" class="label" x="5" y="10">Hello</text>
  </g>
  <use id="u1" href="#glyph" x="30" y="20" width="10" height="6"/>
  <rect id="r1" x="0" y="0" width="100" height="80" clip-path="url(#clipA)"/>
  <path id="p1" d="M 0 0 L 5 5 L 10 0 z"/>
</svg>`;

  const parsed = parseDocument({ path: '/virtual/depth.svg', content: svg });
  const normalized = normalizeDocument(parsed);

  const nsRectParsed = findByAttrId(parsed, 'nsRect');
  assert.ok(nsRectParsed);
  assert.equal(nsRectParsed.localTagName, 'rect');
  assert.equal(nsRectParsed.namespacePrefix, 'svg');
  assert.equal(typeof nsRectParsed.namespaceUri, 'string');
  assert.equal(nsRectParsed.namespaceUri.includes('http://www.w3.org/2000/svg'), true);

  const nsRect = findByAttrId(normalized, 'nsRect');
  assert.ok(nsRect);
  assert.equal(nsRect.nodeKind, 'shape');
  assert.equal(nsRect.bbox.x, 11);
  assert.equal(nsRect.bbox.y, 7);
  assert.equal(nsRect.bbox.w, 3);
  assert.equal(nsRect.bbox.h, 4);
  assert.equal(nsRect.styles['font-size'], '14');
  assert.equal(nsRect.styles.fill, '#123456');

  const title = findByAttrId(normalized, 'title');
  assert.ok(title);
  assert.equal(title.styles['font-size'], '14');
  assert.equal(title.styles.fill, '#123456');
  assert.equal(title.styles['font-weight'], '700');

  const useNode = findByAttrId(normalized, 'u1');
  assert.ok(useNode);
  assert.equal(useNode.bbox.x, 30);
  assert.equal(useNode.bbox.y, 20);
  assert.equal(useNode.bbox.w, 10);
  assert.equal(useNode.bbox.h, 6);

  const clipped = findByAttrId(normalized, 'r1');
  assert.ok(clipped);
  assert.equal(clipped.bbox.x, 0);
  assert.equal(clipped.bbox.y, 0);
  assert.equal(clipped.bbox.w, 50);
  assert.equal(clipped.bbox.h, 40);

  const pathNode = findByAttrId(normalized, 'p1');
  assert.ok(pathNode);
  assert.equal(pathNode.bbox.w > 0, true);
  assert.equal(pathNode.bbox.h > 0, true);
});

test('parser handles CDATA and unquoted attributes for style-driven normalization', () => {
  const svg = `
<svg viewBox="0 0 20 20">
  <style><![CDATA[
    .a { fill: #ff0000; stroke: #00ff00; stroke-width: 2; }
  ]]></style>
  <rect id=ru class=a x=1 y=2 width=10 height=12 />
</svg>`;

  const parsed = parseDocument({ path: '/virtual/cdata.svg', content: svg });
  const normalized = normalizeDocument(parsed);
  const rect = findByAttrId(normalized, 'ru');

  assert.ok(rect);
  assert.equal(rect.styles.fill, '#ff0000');
  assert.equal(rect.styles.stroke, '#00ff00');
  assert.equal(rect.styles['stroke-width'], '2');
  assert.equal(rect.bbox.x, 1);
  assert.equal(rect.bbox.y, 2);
  assert.equal(rect.bbox.w, 10);
  assert.equal(rect.bbox.h, 12);
});

test('normalizer handles CSS combinators (> + ~) and inline style values with quoted semicolons', () => {
  const svg = `
<svg viewBox="0 0 60 40">
  <style>
    #groot > .direct { fill: #111111; }
    #groot .deep { stroke: #222222; }
    .a + .b { fill: #333333; }
    .a ~ .c { stroke: #444444; }
  </style>
  <g id="groot">
    <rect id="direct1" class="direct" x="0" y="0" width="5" height="5"/>
    <g id="inner">
      <rect id="direct2" class="direct deep" x="10" y="0" width="5" height="5"/>
    </g>
    <rect id="aa" class="a" x="0" y="10" width="5" height="5"/>
    <rect id="bb" class="b" x="10" y="10" width="5" height="5"/>
    <rect id="cc" class="c" x="20" y="10" width="5" height="5" style="font-family: 'A;B'; fill: #ababab;" />
  </g>
</svg>`;

  const parsed = parseDocument({ path: '/virtual/combinators.svg', content: svg });
  const normalized = normalizeDocument(parsed);
  const direct1 = findByAttrId(normalized, 'direct1');
  const direct2 = findByAttrId(normalized, 'direct2');
  const bb = findByAttrId(normalized, 'bb');
  const cc = findByAttrId(normalized, 'cc');

  assert.ok(direct1);
  assert.ok(direct2);
  assert.ok(bb);
  assert.ok(cc);

  assert.equal(direct1.styles.fill, '#111111');
  assert.equal(direct2.styles.fill, undefined);
  assert.equal(direct2.styles.stroke, '#222222');
  assert.equal(bb.styles.fill, '#333333');
  assert.equal(cc.styles.stroke, '#444444');
  assert.equal(cc.styles['font-family'], "'A;B'");
  assert.equal(cc.styles.fill, '#ababab');
});

test('parser decodes numeric entities in text nodes', () => {
  const svg = `<svg viewBox="0 0 20 20"><text id="t1" x="1" y="2">A&#x26;B&#33;</text></svg>`;
  const parsed = parseDocument({ path: '/virtual/entities.svg', content: svg });
  const text = findByAttrId(parsed, 't1');

  assert.ok(text);
  assert.equal(text.textContent, 'A&B!');
});

test('parseDocument supports content sniffing and html void/implicit-close tolerance', () => {
  const sniffedSvg = parseDocument({
    path: '/virtual/no_extension_input.txt',
    content: `<svg viewBox="0 0 10 10"><rect id="s1" x="1" y="2" width="3" height="4"/></svg>`,
  });
  assert.equal(sniffedSvg.kind, 'svg');
  assert.ok(findByAttrId(sniffedSvg, 's1'));

  const html = `
<html>
  <body>
    <img id="img1" src="a.png">
    <p id="p1">first
    <p id="p2">second</p>
    <div id="d1">ok</div>
  </body>
</html>`;
  const parsedHtml = parseDocument({ path: '/virtual/no_ext_html.data', content: html }, { htmlMode: 'limited' });
  assert.equal(parsedHtml.kind, 'html');
  assert.ok(findByAttrId(parsedHtml, 'img1'));
  assert.ok(findByAttrId(parsedHtml, 'p1'));
  assert.ok(findByAttrId(parsedHtml, 'p2'));
  assert.ok(findByAttrId(parsedHtml, 'd1'));
});

test('normalizer supports attr operators, pseudo classes, and !important cascade semantics', () => {
  const svg = `
<svg id="root" lang="en-US" viewBox="0 0 40 20">
  <style>
    #root:root { stroke: #111111; }
    rect[data-role^="plot"] { fill: #101010; }
    rect[data-role$="main"] { stroke: #202020; }
    rect[data-role*="foo"] { opacity: 0.5; }
    rect[class~="k"] { stroke-width: 7; }
    rect[lang|="en"] { fill-opacity: 0.6; }
    rect[data-exists] { display: none; }
    g > rect:first-child { stroke: #303030; }
    g > rect:last-child { fill: #404040; }
    g > rect:nth-child(2) { fill: #505050; }
    rect:not(.skip) { font-size: 9; }
    rect[data-important="y"] { fill: #666666 !important; }
    rect[data-important="y"] { fill: #777777; }
    rect[data-inline="y"] { fill: #888888 !important; }
  </style>
  <g id="grp">
    <rect id="r1" class="k" data-role="plot-foo-main" data-exists="1" lang="en" x="0" y="0" width="4" height="4"/>
    <rect id="r2" data-important="y" x="6" y="0" width="4" height="4"/>
    <rect id="r3" class="skip" data-inline="y" style="fill: #999999; fill: #aaaaaa !important;" x="12" y="0" width="4" height="4"/>
  </g>
</svg>`;

  const normalized = normalizeDocument(parseDocument({ path: '/virtual/selectors.svg', content: svg }));
  const root = findByAttrId(normalized, 'root');
  const r1 = findByAttrId(normalized, 'r1');
  const r2 = findByAttrId(normalized, 'r2');
  const r3 = findByAttrId(normalized, 'r3');

  assert.ok(root);
  assert.ok(r1);
  assert.ok(r2);
  assert.ok(r3);

  assert.equal(root.styles.stroke, '#111111');
  assert.equal(r1.styles.fill, '#101010');
  assert.equal(r1.styles.stroke, '#303030');
  assert.equal(r1.styles.opacity, '0.5');
  assert.equal(r1.styles['stroke-width'], '7');
  assert.equal(r1.styles['fill-opacity'], '0.6');
  assert.equal(r1.styles.display, 'none');
  assert.equal(r1.styles['font-size'], '9');

  assert.equal(r2.styles.fill, '#666666');
  assert.equal(r2.styles['font-size'], '9');

  assert.equal(r3.styles.fill, '#aaaaaa');
  assert.equal(r3.styles['font-size'], undefined);
});

test('normalizer supports css var(), :lang, :is/:where, :not list, and advanced nth-of-type family', () => {
  const svg = `
<svg id="root" viewBox="0 0 60 20">
  <style>
    :root { --base-fill: #112233; --accent: var(--base-fill); }
    g.theming { --base-fill: #445566; }
    rect.var-use { fill: var(--accent, #000000); stroke: var(--missing, #778899); }
    rect.chain { --a: var(--b, #121212); fill: var(--a); }
    rect.inline-var { --base-fill: #aa00aa; fill: var(--base-fill); }
    g > rect:nth-of-type(2) { stroke-width: 3; }
    g > rect:nth-last-child(1) { display: none; }
    g > rect:first-of-type { font-weight: 700; }
    g > rect:only-of-type { visibility: hidden; }
    rect:is(.var-use, .scope) { text-anchor: middle; }
    rect:where(.scope) { font-style: italic; }
    rect:not(.skip, .other) { fill-opacity: 0.5; }
    rect:lang(en) { opacity: 0.8; }
  </style>
  <g id="g1" class="theming" lang="en-US">
    <rect id="r1" class="var-use" x="0" y="0" width="4" height="4"/>
    <rect id="r2" class="scope" x="6" y="0" width="4" height="4"/>
    <rect id="r3" class="inline-var skip" x="12" y="0" width="4" height="4"/>
  </g>
  <g id="g2">
    <rect id="r4" class="scope chain" x="0" y="8" width="4" height="4"/>
  </g>
</svg>`;

  const normalized = normalizeDocument(parseDocument({ path: '/virtual/advanced_selectors.svg', content: svg }));
  const r1 = findByAttrId(normalized, 'r1');
  const r2 = findByAttrId(normalized, 'r2');
  const r3 = findByAttrId(normalized, 'r3');
  const r4 = findByAttrId(normalized, 'r4');

  assert.ok(r1);
  assert.ok(r2);
  assert.ok(r3);
  assert.ok(r4);

  assert.equal(r1.styles.fill, '#445566');
  assert.equal(r1.styles.stroke, '#778899');
  assert.equal(r1.styles['font-weight'], '700');
  assert.equal(r1.styles['fill-opacity'], '0.5');
  assert.equal(r1.styles.opacity, '0.8');
  assert.equal(r1.styles['text-anchor'], 'middle');

  assert.equal(r2.styles['stroke-width'], '3');
  assert.equal(r2.styles['font-style'], 'italic');
  assert.equal(r2.styles['fill-opacity'], '0.5');
  assert.equal(r2.styles['text-anchor'], 'middle');

  assert.equal(r3.styles.fill, '#aa00aa');
  assert.equal(r3.styles.display, 'none');
  assert.equal(r3.styles['fill-opacity'], undefined);

  assert.equal(r4.styles.fill, '#121212');
  assert.equal(r4.styles.visibility, 'hidden');
  assert.equal(r4.styles['font-style'], 'italic');
  assert.equal(r4.styles['fill-opacity'], '0.5');
});
