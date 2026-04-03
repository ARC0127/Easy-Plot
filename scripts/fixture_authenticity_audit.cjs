const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ALLOWED_ORIGIN_CLASSES = new Set([
  'synthetic_generated',
  'real_world_collected',
  'mixed_source',
  'manually_redrawn',
]);

const ALLOWED_AUTHENTICITY_TIERS = new Set([
  'synthetic',
  'weak_real',
  'real',
]);

const ALLOWED_CURATION_STATUS = new Set([
  'pending_review',
  'reviewed',
  'approved',
]);

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  const headers = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const cols = line.split(',');
    const row = {};
    for (let i = 0; i < headers.length; i += 1) {
      row[headers[i]] = cols[i] ?? '';
    }
    return row;
  });
}

function fileSha256(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function runFixtureAuthenticityAudit(options = {}) {
  const repoRoot = options.repoRoot ?? path.resolve(__dirname, '..');
  const fixturesRoot = path.join(repoRoot, 'fixtures');
  const matrixPath = path.join(fixturesRoot, 'fixture_family_matrix.csv');
  const provenancePath = path.join(fixturesRoot, 'fixture_provenance_matrix.csv');
  const packageFixtureRoot = path.join(repoRoot, 'packages', 'testing-fixtures', 'data');
  const outPath = path.join(repoRoot, 'docs', 'audit', 'fixture_authenticity_report.json');

  const matrixRows = parseCsv(fs.readFileSync(matrixPath, 'utf8'));
  const provenanceRows = parseCsv(fs.readFileSync(provenancePath, 'utf8'));
  const provenanceMap = new Map(provenanceRows.map((row) => [row.fixture_id, row]));

  const structuralIssues = [];
  const fixtureChecks = [];

  let syntheticCount = 0;
  let nonSyntheticCount = 0;
  let reviewedCount = 0;
  let approvedCount = 0;
  let rootAndPackageHashMatchCount = 0;

  for (const row of matrixRows) {
    const fixtureId = row.fixture_id;
    const family = row.family;
    const kind = row.kind;
    const ext = kind === 'html' ? 'html' : 'svg';

    const provenance = provenanceMap.get(fixtureId);
    if (!provenance) {
      structuralIssues.push(`Missing provenance row for fixture: ${fixtureId}`);
      continue;
    }

    if (provenance.family !== family) {
      structuralIssues.push(`Family mismatch for fixture ${fixtureId}: matrix=${family}, provenance=${provenance.family}`);
    }
    if (!ALLOWED_ORIGIN_CLASSES.has(provenance.origin_class)) {
      structuralIssues.push(`Invalid origin_class for fixture ${fixtureId}: ${provenance.origin_class}`);
    }
    if (!ALLOWED_AUTHENTICITY_TIERS.has(provenance.authenticity_tier)) {
      structuralIssues.push(`Invalid authenticity_tier for fixture ${fixtureId}: ${provenance.authenticity_tier}`);
    }
    if (!ALLOWED_CURATION_STATUS.has(provenance.curation_status)) {
      structuralIssues.push(`Invalid curation_status for fixture ${fixtureId}: ${provenance.curation_status}`);
    }

    if (provenance.authenticity_tier === 'synthetic') syntheticCount += 1;
    else nonSyntheticCount += 1;
    if (provenance.curation_status === 'reviewed' || provenance.curation_status === 'approved') reviewedCount += 1;
    if (provenance.curation_status === 'approved') approvedCount += 1;

    const rootFixturePath = path.join(fixturesRoot, family, `${fixtureId}.${ext}`);
    const packageFixturePath = path.join(packageFixtureRoot, family, `${fixtureId}.${ext}`);
    const groundTruthPath = path.join(fixturesRoot, family, `${fixtureId}.ground_truth.json`);

    if (!fs.existsSync(rootFixturePath)) {
      structuralIssues.push(`Missing root fixture file: ${rootFixturePath}`);
    }
    if (!fs.existsSync(packageFixturePath)) {
      structuralIssues.push(`Missing package fixture file: ${packageFixturePath}`);
    }
    if (!fs.existsSync(groundTruthPath)) {
      structuralIssues.push(`Missing ground truth file: ${groundTruthPath}`);
    }

    let groundTruthValid = false;
    if (fs.existsSync(groundTruthPath)) {
      const gt = JSON.parse(fs.readFileSync(groundTruthPath, 'utf8'));
      const requiredKeys = ['fixtureId', 'family', 'provenanceRef', 'hasLegend', 'panelIds', 'editableRawTextIds', 'atomicRasterIds', 'expectedCapabilities'];
      const missingKeys = requiredKeys.filter((key) => Object.prototype.hasOwnProperty.call(gt, key) === false);
      if (missingKeys.length > 0) {
        structuralIssues.push(`Ground truth missing keys for ${fixtureId}: ${missingKeys.join('|')}`);
      } else if (gt.fixtureId !== fixtureId || gt.family !== family || gt.provenanceRef !== fixtureId) {
        structuralIssues.push(`Ground truth id/family/provenance mismatch for ${fixtureId}: gt.fixtureId=${gt.fixtureId}, gt.family=${gt.family}, gt.provenanceRef=${gt.provenanceRef}`);
      } else {
        groundTruthValid = true;
      }
    }

    let hashMatch = false;
    if (fs.existsSync(rootFixturePath) && fs.existsSync(packageFixturePath)) {
      const rootSha = fileSha256(rootFixturePath);
      const pkgSha = fileSha256(packageFixturePath);
      hashMatch = rootSha === pkgSha;
      if (hashMatch) rootAndPackageHashMatchCount += 1;
    }

    fixtureChecks.push({
      fixtureId,
      family,
      kind,
      originClass: provenance.origin_class,
      authenticityTier: provenance.authenticity_tier,
      curationStatus: provenance.curation_status,
      sourceReference: provenance.source_reference,
      groundTruthValid,
      rootFixtureExists: fs.existsSync(rootFixturePath),
      packageFixtureExists: fs.existsSync(packageFixturePath),
      rootAndPackageHashMatch: hashMatch,
    });
  }

  const total = matrixRows.length;
  const nonSyntheticRatio = total === 0 ? 0 : nonSyntheticCount / total;
  const reviewedRatio = total === 0 ? 0 : reviewedCount / total;
  const approvedRatio = total === 0 ? 0 : approvedCount / total;
  const hashMatchRatio = total === 0 ? 0 : rootAndPackageHashMatchCount / total;

  const targets = {
    minNonSyntheticRatio: 0.35,
    minReviewedRatio: 1,
    minHashMatchRatio: 1,
  };

  const structuralPass = structuralIssues.length === 0;
  const authenticityPass =
    nonSyntheticRatio >= targets.minNonSyntheticRatio &&
    reviewedRatio >= targets.minReviewedRatio &&
    hashMatchRatio >= targets.minHashMatchRatio;

  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalFixtures: total,
      syntheticCount,
      nonSyntheticCount,
      reviewedCount,
      approvedCount,
      rootAndPackageHashMatchCount,
      nonSyntheticRatio,
      reviewedRatio,
      approvedRatio,
      hashMatchRatio,
    },
    targets,
    verdict: {
      structuralPass,
      authenticityPass,
      overallPass: structuralPass && authenticityPass,
      status: !structuralPass ? 'error' : authenticityPass ? 'pass' : 'gap',
    },
    structuralIssues,
    fixtureChecks,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  return { report, outPath };
}

if (require.main === module) {
  const { report, outPath } = runFixtureAuthenticityAudit();
  const verbose = process.argv.includes('--verbose');
  const output = verbose
    ? report
    : {
        generatedAt: report.generatedAt,
        summary: report.summary,
        targets: report.targets,
        verdict: report.verdict,
        structuralIssueCount: report.structuralIssues.length,
      };
  console.log(JSON.stringify(output, null, 2));
  console.log(`FIXTURE_AUTHENTICITY_REPORT_WRITTEN=${outPath}`);
  if (!report.verdict.structuralPass) {
    process.exit(1);
  }
}

module.exports = {
  runFixtureAuthenticityAudit,
};
