const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const { createDesktopAppShell } = require('../apps/desktop/dist/main/index.js');

function sha256File(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function mkdirp(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeText(filePath, text) {
  mkdirp(path.dirname(filePath));
  fs.writeFileSync(filePath, text, 'utf8');
}

function writeJson(filePath, value) {
  writeText(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function copyDir(srcDir, dstDir) {
  mkdirp(dstDir);
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const dstPath = path.join(dstDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, dstPath);
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

function extractSchemaVersion(projectTsPath) {
  const content = fs.readFileSync(projectTsPath, 'utf8');
  const match = content.match(/schemaVersion:\s*'([^']+)'/);
  if (!match) {
    throw new Error(`Cannot extract schemaVersion from ${projectTsPath}`);
  }
  return match[1];
}

function buildReleaseAssets(options = {}) {
  const repoRoot = options.repoRoot ?? path.resolve(__dirname, '..');
  const packageJsonPath = path.join(repoRoot, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const generatedAt = new Date().toISOString();
  const productName = 'Easy Plot';
  const displayVersion = String(packageJson.displayVersion ?? '0.01');

  const artifactsDir = path.join(repoRoot, 'artifacts');
  const docsOpsDir = path.join(repoRoot, 'docs', 'operations');
  const docsAuditDir = path.join(repoRoot, 'docs', 'audit');
  const installersDir = path.join(artifactsDir, 'installers');
  mkdirp(artifactsDir);
  mkdirp(installersDir);

  const schemaVersion = extractSchemaVersion(path.join(repoRoot, 'packages', 'ir-schema', 'src', 'project.ts'));
  const releaseVersion = displayVersion;

  const shell = createDesktopAppShell();
  shell.launchWindow();
  const releaseBundle = shell.buildReleaseBundle(path.join(artifactsDir, 'desktop_release_bundle'));

  const supportedFamilies = [
    { family: 'matplotlib', level: 'supported' },
    { family: 'chart_family', level: 'supported' },
    { family: 'illustration_like', level: 'supported' },
    { family: 'llm_svg', level: 'supported' },
    { family: 'static_html_inline_svg', level: 'supported' },
    { family: 'degraded_svg', level: 'weak_supported' },
  ];

  const unsupportedCases = [
    'dynamic_html_full_editable_mode',
    'browser_runtime_dom_script_execution',
    'full_fidelity_token_level_html_patching',
    'multi_store_signed_release_approval',
  ];

  const knownLimitationsLines = [
    '# Known Limitations',
    '',
    '- 超出当前 D3 合同的长尾 SVG/CSS 语义仍在持续增强。',
    '- dynamic HTML 当前仅支持 `limited/snapshot` 导入，`snapshot` 为只读策略。',
    '- 已提供 store-grade 分发分渠道打包与凭据发布 CI 通道；多商店签名审批编排仍在后续计划。',
    '- 性能基线与真实样例稳定性报告已建立，复杂输入分布仍需持续回归。',
  ];

  const releaseNotesLines = [
    `# ${productName} Release Notes v${releaseVersion}`,
    '',
    `- Generated At: ${generatedAt}`,
    `- Schema Version: ${schemaVersion}`,
    '',
    '## Highlights',
    '',
    '- D3 parser/normalizer 深度合同已收口并通过回归。',
    '- D4 snapshot 独立闭环已完成（save/load + export/reimport）。',
    '- D7 desktop GUI 壳与发布壳产物已完成。',
    '- D8 fixture/ground truth 真实性门禁已通过（nonSyntheticRatio >= 0.35）。',
    '- 新增 store-grade 分发自动化（channel staging + upload queue manifest）。',
    '- 新增复杂真实样例稳定性报告（real/weak_real 子集）。',
    '- 新增长尾 CSS 语义扩展（var() + advanced pseudo）与 store 凭据发布 CI 基线。',
    '',
    '## Release Assets',
    '',
    '- desktop_release_bundle: `artifacts/desktop_release_bundle/index.html` + `shell-manifest.json`',
    '- installer package: `artifacts/installers/easy-plot-desktop-linux-x64.tar.gz`',
    '- version manifest: `artifacts/version-manifest.json`',
    '- supported/unsupported/limitations assets: `artifacts/*.json|*.md`',
    '',
    '## Notes',
    '',
    '- 本版本为文档重建与闭环验证版本，面向仓库内验收与工程审计。',
  ];

  const releaseNotesArtifactPath = path.join(artifactsDir, 'release_notes.md');
  const releaseNotesDocPath = path.join(docsOpsDir, 'release-notes.md');
  const supportedFamiliesPath = path.join(artifactsDir, 'supported_families.json');
  const unsupportedCasesPath = path.join(artifactsDir, 'unsupported_cases.json');
  const knownLimitationsPath = path.join(artifactsDir, 'known_limitations.md');

  writeText(releaseNotesArtifactPath, `${releaseNotesLines.join('\n')}\n`);
  writeText(
    releaseNotesDocPath,
    [
      '# 发布说明',
      '',
      '- Status: implemented',
      "- Primary Source: `scripts/build_release_assets.cjs`, `artifacts/release_notes.md`, `artifacts/version-manifest.json`",
      `- Last Verified: ${generatedAt.slice(0, 10)}`,
      '- Verification Mode: smoke rerun',
      '',
      '本文件由 `release:assets` 自动刷新，正式发布说明如下。',
      '',
      ...releaseNotesLines,
    ].join('\n') + '\n'
  );
  writeJson(supportedFamiliesPath, supportedFamilies);
  writeJson(unsupportedCasesPath, unsupportedCases);
  writeText(knownLimitationsPath, `${knownLimitationsLines.join('\n')}\n`);

  const versionedSchemaDir = path.join(artifactsDir, 'versioned_schema');
  mkdirp(versionedSchemaDir);
  const schemaSourcePath = path.join(repoRoot, 'packages', 'ir-schema', 'src', 'json-schema', 'project.schema.json');
  const schemaTargetPath = path.join(versionedSchemaDir, `project.schema.${schemaVersion}.json`);
  fs.copyFileSync(schemaSourcePath, schemaTargetPath);

  const installerRootDir = path.join(installersDir, 'easy-plot-desktop-linux-x64');
  const installerBundleDir = path.join(installerRootDir, 'release_bundle');
  mkdirp(installerRootDir);
  copyDir(releaseBundle.outputDir, installerBundleDir);

  const installScriptPath = path.join(installerRootDir, 'install.sh');
  const runScriptPath = path.join(installerRootDir, 'run-easy-plot.sh');
  const installerReadmePath = path.join(installerRootDir, 'README.md');

  writeText(
    installScriptPath,
    [
      '#!/usr/bin/env bash',
      'set -euo pipefail',
      'TARGET_DIR="${1:-$HOME/.local/share/easy-plot}"',
      'mkdir -p "$TARGET_DIR"',
      'cp -R "./release_bundle/." "$TARGET_DIR/"',
      'chmod +x "$TARGET_DIR/run-easy-plot.sh" || true',
      'echo "Easy Plot installed to: $TARGET_DIR"',
    ].join('\n') + '\n'
  );

  writeText(
    runScriptPath,
    [
      '#!/usr/bin/env bash',
      'set -euo pipefail',
      'BASE_DIR="$(cd "$(dirname "$0")" && pwd)"',
      'if command -v xdg-open >/dev/null 2>&1; then',
      '  xdg-open "$BASE_DIR/release_bundle/index.html" >/dev/null 2>&1 || true',
      'fi',
      'echo "Open this file in a browser if not auto-opened: $BASE_DIR/release_bundle/index.html"',
    ].join('\n') + '\n'
  );

  writeText(
    installerReadmePath,
    [
      '# Easy Plot Linux Installer Package',
      '',
      '- 解压后执行 `./install.sh [target_dir]` 完成安装。',
      '- 默认安装目录：`~/.local/share/easy-plot`。',
      '- 安装后执行 `run-easy-plot.sh` 打开应用入口。',
      '',
      `Generated At: ${generatedAt}`,
    ].join('\n') + '\n'
  );

  fs.chmodSync(installScriptPath, 0o755);
  fs.chmodSync(runScriptPath, 0o755);

  const installerArchivePath = path.join(installersDir, 'easy-plot-desktop-linux-x64.tar.gz');
  execFileSync('tar', ['-czf', installerArchivePath, '-C', installersDir, 'easy-plot-desktop-linux-x64'], {
    stdio: 'pipe',
  });

  const performanceReportPath = path.join(docsAuditDir, 'performance_baseline_report.json');

  const versionManifest = {
    manifestVersion: '1.0.0',
    generatedAt,
    productName,
    releaseVersion,
    schemaVersion,
    platformTargets: ['linux-x64'],
    artifacts: {
      releaseBundle: {
        indexHtmlPath: path.relative(repoRoot, releaseBundle.indexHtmlPath).replace(/\\/g, '/'),
        manifestPath: path.relative(repoRoot, releaseBundle.manifestPath).replace(/\\/g, '/'),
        indexHtmlSha256: sha256File(releaseBundle.indexHtmlPath),
        manifestSha256: sha256File(releaseBundle.manifestPath),
      },
      installer: {
        archivePath: path.relative(repoRoot, installerArchivePath).replace(/\\/g, '/'),
        archiveSha256: sha256File(installerArchivePath),
      },
      releaseNotes: path.relative(repoRoot, releaseNotesArtifactPath).replace(/\\/g, '/'),
      versionedSchema: path.relative(repoRoot, schemaTargetPath).replace(/\\/g, '/'),
      supportedFamilies: path.relative(repoRoot, supportedFamiliesPath).replace(/\\/g, '/'),
      unsupportedCases: path.relative(repoRoot, unsupportedCasesPath).replace(/\\/g, '/'),
      knownLimitations: path.relative(repoRoot, knownLimitationsPath).replace(/\\/g, '/'),
      acceptanceReport: 'docs/audit/family_acceptance_report.json',
      fixtureAuthenticityReport: 'docs/audit/fixture_authenticity_report.json',
      performanceBaselineReport: path.relative(repoRoot, performanceReportPath).replace(/\\/g, '/'),
      importCapabilityReport: 'docs/implementation/import-capability-report.md',
      realSampleStabilityReport: 'docs/audit/real_sample_stability_report.json',
      distributionManifest: 'artifacts/distribution/distribution-manifest.json',
    },
  };

  const versionManifestPath = path.join(artifactsDir, 'version-manifest.json');
  writeJson(versionManifestPath, versionManifest);

  return {
    generatedAt,
    releaseVersion,
    schemaVersion,
    releaseNotesArtifactPath,
    releaseNotesDocPath,
    supportedFamiliesPath,
    unsupportedCasesPath,
    knownLimitationsPath,
    versionManifestPath,
    versionedSchemaPath: schemaTargetPath,
    installerArchivePath,
    releaseBundle,
  };
}

if (require.main === module) {
  const summary = buildReleaseAssets();
  console.log(
    JSON.stringify(
      {
        generatedAt: summary.generatedAt,
        releaseVersion: summary.releaseVersion,
        schemaVersion: summary.schemaVersion,
        releaseNotesArtifactPath: summary.releaseNotesArtifactPath,
        versionManifestPath: summary.versionManifestPath,
        installerArchivePath: summary.installerArchivePath,
        releaseBundleDir: summary.releaseBundle.outputDir,
      },
      null,
      2
    )
  );
  console.log('RELEASE_ASSETS_BUILT');
}

module.exports = {
  buildReleaseAssets,
};
