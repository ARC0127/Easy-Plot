const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');

const {
  FONT_FAMILY_SPECS,
  ensureFontPackRoot,
  getFontManifestPath,
  getFontPackRoot,
  slugifyFontFamily,
} = require('./font_pack.cjs');

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          'user-agent': 'Mozilla/5.0 (Codex Font Pack Builder)',
        },
      },
      (res) => {
        const statusCode = Number(res.statusCode ?? 0);
        if (statusCode >= 300 && statusCode < 400 && res.headers.location) {
          resolve(fetchText(res.headers.location));
          return;
        }
        if (statusCode < 200 || statusCode >= 300) {
          reject(new Error(`Failed to fetch ${url}: HTTP ${statusCode}`));
          res.resume();
          return;
        }
        res.setEncoding('utf8');
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => resolve(body));
      }
    );
    req.on('error', reject);
  });
}

function downloadBinary(url, outputPath) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          'user-agent': 'Mozilla/5.0 (Codex Font Pack Builder)',
        },
      },
      (res) => {
        const statusCode = Number(res.statusCode ?? 0);
        if (statusCode >= 300 && statusCode < 400 && res.headers.location) {
          downloadBinary(res.headers.location, outputPath).then(resolve, reject);
          return;
        }
        if (statusCode < 200 || statusCode >= 300) {
          reject(new Error(`Failed to download ${url}: HTTP ${statusCode}`));
          res.resume();
          return;
        }
        const chunks = [];
        res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        res.on('end', () => {
          fs.mkdirSync(path.dirname(outputPath), { recursive: true });
          fs.writeFileSync(outputPath, Buffer.concat(chunks));
          resolve();
        });
      }
    );
    req.on('error', reject);
  });
}

function parseFontFaces(css, fallbackFamily) {
  const blocks = [];
  const re = /@font-face\s*{([\s\S]*?)}/g;
  let match = null;
  while ((match = re.exec(css)) !== null) {
    const block = match[1];
    const props = {};
    const propRe = /([a-z-]+)\s*:\s*([^;]+);/g;
    let propMatch = null;
    while ((propMatch = propRe.exec(block)) !== null) {
      props[propMatch[1].trim()] = propMatch[2].trim();
    }
    const family = String(props['font-family'] ?? fallbackFamily).replace(/^['"]|['"]$/g, '');
    const style = String(props['font-style'] ?? 'normal').trim();
    const weight = String(props['font-weight'] ?? '400').trim();
    const srcMatch = String(props.src ?? '').match(/url\(([^)]+)\)\s*format\(([^)]+)\)/i);
    if (!srcMatch) continue;
    const sourceUrl = srcMatch[1].trim().replace(/^['"]|['"]$/g, '');
    const format = srcMatch[2].trim().replace(/^['"]|['"]$/g, '');
    blocks.push({ family, style, weight, sourceUrl, format });
  }
  return blocks;
}

function fileNameForFace(family, style, weight, sourceUrl) {
  const ext = path.extname(new URL(sourceUrl).pathname) || '.ttf';
  return `${slugifyFontFamily(family)}-${String(weight).trim()}-${String(style).trim()}${ext}`;
}

async function buildFontPack() {
  ensureFontPackRoot();
  const rootDir = getFontPackRoot();
  fs.rmSync(rootDir, { recursive: true, force: true });
  fs.mkdirSync(rootDir, { recursive: true });
  const generatedAt = new Date().toISOString();
  const manifest = {
    manifestVersion: '1.0.0',
    generatedAt,
    source: 'Google Fonts',
    license: 'Open Font License / vendor-provided free font licenses',
    families: [],
  };

  for (const spec of FONT_FAMILY_SPECS) {
    console.log(`Fetching CSS for ${spec.family}`);
    const css = await fetchText(spec.cssUrl);
    const faces = parseFontFaces(css, spec.family);
    if (faces.length === 0) {
      throw new Error(`No font faces parsed for ${spec.family}`);
    }
    const familyEntry = {
      family: spec.family,
      category: spec.category,
      priority: spec.priority,
      sourceQueryUrl: spec.cssUrl,
      faces: [],
    };
    for (const face of faces) {
      const file = fileNameForFace(face.family, face.style, face.weight, face.sourceUrl);
      const dstPath = path.join(rootDir, file);
      console.log(`  downloading ${file}`);
      await downloadBinary(face.sourceUrl, dstPath);
      familyEntry.faces.push({
        file,
        style: face.style,
        weight: Number.parseInt(face.weight, 10),
        format: face.format,
        sourceUrl: face.sourceUrl,
      });
    }
    familyEntry.faces.sort((a, b) => Number(a.weight) - Number(b.weight) || String(a.style).localeCompare(String(b.style)));
    manifest.families.push(familyEntry);
  }

  manifest.families.sort((a, b) => Number(a.priority ?? 0) - Number(b.priority ?? 0));
  fs.writeFileSync(getFontManifestPath(), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  fs.writeFileSync(
    path.join(rootDir, 'README.md'),
    [
      '# Bundled Fonts',
      '',
      'This directory is generated from Google Fonts CSS endpoints using `scripts/build_font_pack.cjs`.',
      'The files are copied into `fonts/` in the desktop release bundle and served by `desktop_gui_server.cjs`.',
      '',
      `Generated At: ${generatedAt}`,
      '',
      'Families:',
      ...manifest.families.map((family) => `- ${family.family} (${family.category})`),
    ].join('\n') + '\n',
    'utf8'
  );

  console.log(
    JSON.stringify(
      {
        generatedAt,
        fontPackRoot: rootDir,
        manifestPath: getFontManifestPath(),
        familyCount: manifest.families.length,
        faceCount: manifest.families.reduce((sum, family) => sum + family.faces.length, 0),
      },
      null,
      2
    )
  );
}

if (require.main === module) {
  buildFontPack().catch((error) => {
    console.error(error instanceof Error ? error.stack : String(error));
    process.exit(1);
  });
}

module.exports = {
  buildFontPack,
};
