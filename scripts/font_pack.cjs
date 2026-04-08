const fs = require('node:fs');
const path = require('node:path');

const FONT_PACK_ROOT = path.resolve(__dirname, '../resources/fonts');
const FONT_MANIFEST_PATH = path.join(FONT_PACK_ROOT, 'manifest.json');

const FONT_FAMILY_SPECS = [
  {
    family: 'Inter',
    category: 'sans',
    cssUrl: 'https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,700;1,400;1,700&display=swap',
    priority: 10,
  },
  {
    family: 'Source Sans 3',
    category: 'sans',
    cssUrl: 'https://fonts.googleapis.com/css2?family=Source+Sans+3:ital,wght@0,400;0,700;1,400;1,700&display=swap',
    priority: 20,
  },
  {
    family: 'IBM Plex Sans',
    category: 'sans',
    cssUrl: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap',
    priority: 30,
  },
  {
    family: 'Roboto',
    category: 'sans',
    cssUrl: 'https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,400;0,700;1,400;1,700&display=swap',
    priority: 40,
  },
  {
    family: 'Open Sans',
    category: 'sans',
    cssUrl: 'https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap',
    priority: 50,
  },
  {
    family: 'Source Serif 4',
    category: 'serif',
    cssUrl: 'https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,400;0,700;1,400;1,700&display=swap',
    priority: 60,
  },
  {
    family: 'IBM Plex Serif',
    category: 'serif',
    cssUrl: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Serif:ital,wght@0,400;0,700;1,400;1,700&display=swap',
    priority: 70,
  },
  {
    family: 'Merriweather',
    category: 'serif',
    cssUrl: 'https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,400;0,700;1,400;1,700&display=swap',
    priority: 80,
  },
  {
    family: 'Lora',
    category: 'serif',
    cssUrl: 'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,700;1,400;1,700&display=swap',
    priority: 90,
  },
  {
    family: 'PT Serif',
    category: 'serif',
    cssUrl: 'https://fonts.googleapis.com/css2?family=PT+Serif:ital,wght@0,400;0,700;1,400;1,700&display=swap',
    priority: 100,
  },
  {
    family: 'Source Code Pro',
    category: 'mono',
    cssUrl: 'https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;700&display=swap',
    priority: 110,
  },
  {
    family: 'IBM Plex Mono',
    category: 'mono',
    cssUrl: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&display=swap',
    priority: 120,
  },
  {
    family: 'JetBrains Mono',
    category: 'mono',
    cssUrl: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap',
    priority: 130,
  },
  {
    family: 'Fira Code',
    category: 'mono',
    cssUrl: 'https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;700&display=swap',
    priority: 140,
  },
  {
    family: 'Noto Sans SC',
    category: 'cjk',
    cssUrl: 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700&display=swap',
    priority: 150,
  },
  {
    family: 'Noto Serif SC',
    category: 'cjk',
    cssUrl: 'https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700&display=swap',
    priority: 160,
  },
];

const FONT_STACK_PRESETS = {
  sans: 'Inter, "Source Sans 3", "IBM Plex Sans", Roboto, "Open Sans", "Noto Sans SC", sans-serif',
  serif: 'Source Serif 4, "IBM Plex Serif", Merriweather, Lora, "PT Serif", "Noto Serif SC", serif',
  cjkSans: '"Noto Sans SC", Inter, "Source Sans 3", "IBM Plex Sans", sans-serif',
  cjkSerif: '"Noto Serif SC", "Source Serif 4", "IBM Plex Serif", serif',
  mono: '"Source Code Pro", "IBM Plex Mono", "JetBrains Mono", "Fira Code", monospace',
};

function escapeCssString(value) {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function escapeHtmlAttribute(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function slugifyFontFamily(family) {
  return String(family ?? '')
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'font';
}

function ensureFontPackRoot() {
  fs.mkdirSync(FONT_PACK_ROOT, { recursive: true });
}

function getFontPackRoot() {
  return FONT_PACK_ROOT;
}

function getFontManifestPath() {
  return FONT_MANIFEST_PATH;
}

function readFontManifest() {
  if (!fs.existsSync(FONT_MANIFEST_PATH)) {
    throw new Error(`Missing font manifest at ${FONT_MANIFEST_PATH}. Run scripts/build_font_pack.cjs.`);
  }
  return JSON.parse(fs.readFileSync(FONT_MANIFEST_PATH, 'utf8'));
}

function getBundledFontFamilies(manifest = readFontManifest()) {
  return [...manifest.families]
    .sort((a, b) => Number(a.priority ?? 0) - Number(b.priority ?? 0))
    .map((entry) => entry.family);
}

function getBundledFontPresetOptions(manifest = readFontManifest()) {
  const families = getBundledFontFamilies(manifest);
  return [
    FONT_STACK_PRESETS.sans,
    FONT_STACK_PRESETS.serif,
    FONT_STACK_PRESETS.cjkSans,
    FONT_STACK_PRESETS.cjkSerif,
    FONT_STACK_PRESETS.mono,
    ...families,
  ];
}

function getBundledFontStackPresets() {
  return { ...FONT_STACK_PRESETS };
}

function buildFontFaceCss(baseUrl, manifest = readFontManifest()) {
  const prefix = String(baseUrl ?? '').trim().replace(/\/+$/g, '');
  const entries = [...manifest.families].sort((a, b) => Number(a.priority ?? 0) - Number(b.priority ?? 0));
  return entries
    .flatMap((family) => {
      const familyName = escapeCssString(family.family);
      const faces = Array.isArray(family.faces) ? family.faces : [];
      return faces.map((face) => {
        const srcPath = prefix ? `${prefix}/${face.file}` : face.file;
        return [
          '@font-face {',
          `  font-family: "${familyName}";`,
          `  font-style: ${face.style};`,
          `  font-weight: ${face.weight};`,
          '  font-display: swap;',
          `  src: url("${escapeCssString(srcPath)}") format("${escapeCssString(face.format || 'truetype')}");`,
          '}',
        ].join('\n');
      });
    })
    .join('\n\n');
}

function collectFilesRecursive(rootDir) {
  if (!fs.existsSync(rootDir)) return [];
  const out = [];
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      for (const child of collectFilesRecursive(fullPath)) {
        out.push({ srcPath: child.srcPath, relPath: path.join(entry.name, child.relPath) });
      }
    } else {
      out.push({ srcPath: fullPath, relPath: entry.name });
    }
  }
  return out;
}

function copyFontPack(targetDir) {
  ensureFontPackRoot();
  const outDir = path.join(targetDir, 'fonts');
  fs.mkdirSync(outDir, { recursive: true });
  const entries = collectFilesRecursive(FONT_PACK_ROOT);
  for (const entry of entries) {
    const srcPath = entry.srcPath;
    const relPath = entry.relPath;
    const dstPath = path.join(outDir, relPath);
    fs.mkdirSync(path.dirname(dstPath), { recursive: true });
    fs.copyFileSync(srcPath, dstPath);
  }
  return outDir;
}

module.exports = {
  FONT_FAMILY_SPECS,
  FONT_STACK_PRESETS,
  getBundledFontFamilies,
  getBundledFontPresetOptions,
  getBundledFontStackPresets,
  getFontManifestPath,
  getFontPackRoot,
  buildFontFaceCss,
  copyFontPack,
  ensureFontPackRoot,
  escapeHtmlAttribute,
  slugifyFontFamily,
  readFontManifest,
};
