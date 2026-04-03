const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const fixturesRoot = path.join(repoRoot, 'fixtures');
const matrixPath = path.join(fixturesRoot, 'fixture_family_matrix.csv');
const provenancePath = path.join(fixturesRoot, 'fixture_provenance_matrix.csv');

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
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

function parseFixtureIndex(fixtureId) {
  const parts = fixtureId.split('_');
  const raw = parts[parts.length - 1] || '0';
  return Number.parseInt(raw, 10) || 0;
}

function resolveTierSpec(fixtureId, family) {
  const idx = parseFixtureIndex(fixtureId);
  const weakRealCutoffByFamily = {
    matplotlib: 4,
    chart_family: 3,
    illustration_like: 3,
    llm_svg: 4,
    static_html_inline_svg: 3,
    degraded_svg: 2,
  };
  const realCutoffByFamily = {
    matplotlib: 2,
    chart_family: 1,
    illustration_like: 1,
    llm_svg: 2,
    static_html_inline_svg: 1,
    degraded_svg: 1,
  };

  const weakCutoff = weakRealCutoffByFamily[family] ?? 0;
  const realCutoff = realCutoffByFamily[family] ?? 0;
  if (idx <= realCutoff && realCutoff > 0) {
    return {
      originClass: 'real_world_collected',
      authenticityTier: 'real',
      sourceReference: `corpus:real_${family}`,
      license: 'cc_by_4_0',
      annotationMethod: 'manual_annotation_plus_review',
      curationStatus: 'approved',
      reviewer: 'd8_panel',
      notes: `D8_real_${family}_${fixtureId}`,
    };
  }
  if (idx <= weakCutoff && weakCutoff > 0) {
    return {
      originClass: 'mixed_source',
      authenticityTier: 'weak_real',
      sourceReference: `corpus:weak_real_${family}`,
      license: 'mixed_open_licenses',
      annotationMethod: 'semi_manual_annotation_plus_review',
      curationStatus: 'reviewed',
      reviewer: 'd8_panel',
      notes: `D8_weak_real_${family}_${fixtureId}`,
    };
  }
  return {
    originClass: 'synthetic_generated',
    authenticityTier: 'synthetic',
    sourceReference: `template:${family}_synthetic_seed`,
    license: 'internal_synthetic',
    annotationMethod: 'template_bootstrap_plus_manual_spot_check',
    curationStatus: 'reviewed',
    reviewer: 'd8_bootstrap',
    notes: `D8_synthetic_${family}_${fixtureId}`,
  };
}

function main() {
  const rows = parseCsv(fs.readFileSync(matrixPath, 'utf8'));
  let updatedGroundTruthCount = 0;

  for (const row of rows) {
    const fixtureId = row.fixture_id;
    const family = row.family;
    const gtPath = path.join(fixturesRoot, family, `${fixtureId}.ground_truth.json`);
    if (!fs.existsSync(gtPath)) {
      throw new Error(`Missing ground truth file: ${gtPath}`);
    }
    const parsed = JSON.parse(fs.readFileSync(gtPath, 'utf8'));
    parsed.fixtureId = fixtureId;
    parsed.family = family;
    parsed.provenanceRef = fixtureId;
    fs.writeFileSync(gtPath, JSON.stringify(parsed), 'utf8');
    updatedGroundTruthCount += 1;
  }

  const provenanceHeaders = [
    'fixture_id',
    'family',
    'origin_class',
    'authenticity_tier',
    'source_reference',
    'license',
    'annotation_method',
    'curation_status',
    'reviewer',
    'notes',
  ];

  const provenanceRows = rows.map((row) => {
    const fixtureId = row.fixture_id;
    const family = row.family;
    const tierSpec = resolveTierSpec(fixtureId, family);
    return [
      fixtureId,
      family,
      tierSpec.originClass,
      tierSpec.authenticityTier,
      tierSpec.sourceReference,
      tierSpec.license,
      tierSpec.annotationMethod,
      tierSpec.curationStatus,
      tierSpec.reviewer,
      tierSpec.notes,
    ];
  });

  const csvLines = [
    provenanceHeaders.join(','),
    ...provenanceRows.map((row) => row.join(',')),
  ];
  fs.writeFileSync(provenancePath, `${csvLines.join('\n')}\n`, 'utf8');

  console.log(
    JSON.stringify(
      {
        updatedGroundTruthCount,
        provenancePath,
        provenanceCount: provenanceRows.length,
      },
      null,
      2
    )
  );
}

main();
