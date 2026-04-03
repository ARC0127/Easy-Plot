# coding_engine review (historical record)

- Status: audit
- Primary Source: historical implementation notes prior to 2026-04-02 reconstruction
- Last Verified: 2026-04-02
- Verification Mode: historical only

## Historical Notice

本文件为历史审计记录，保留原始内容用于追溯。  
若与 `docs/audit/current-verification-report.md` 冲突，以当前重验结果为准。

## Scope completed
- `ir-schema`
- `validators`
- `project.schema.json`
- `ground_truth_schema.json`
- `fixture_family_matrix.csv`
- typed errors

## Modified / added files
- repository root baseline files
- `packages/ir-schema/**/*`
- `fixtures/ground_truth_schema.json`
- `fixtures/fixture_family_matrix.csv`
- `fixtures/acceptance_thresholds.md`

## Closed-loop checks executed

### 1. TypeScript compile check
Command:
```bash
tsc --noEmit -p packages/ir-schema/tsconfig.json
```
Result: PASS

### 2. Build check
Command:
```bash
tsc -p packages/ir-schema/tsconfig.json
```
Result: PASS

### 3. Validator smoke check
Command:
```bash
node scripts/smoke_check.cjs
```
Observed output:
```json
{
  "validOk": true,
  "invalidOk": false,
  "invalidIssueCodes": [
    "CAP_CONFLICT_TEXT_EDIT_AND_GROUP_ONLY",
    "CAP_ILLEGAL_FOR_OBJECT_TYPE",
    "INV_PROXY_TEXT_ILLEGAL_TEXT_EDIT"
  ]
}
```
Result: PASS

### 4. JSON/CSV baseline consistency check
Checks executed:
- JSON parse for `packages/ir-schema/src/json-schema/project.schema.json`
- JSON parse for `fixtures/ground_truth_schema.json`
- required-column consistency for `fixtures/fixture_family_matrix.csv`

Result summary:
- JSON files: PASS
- CSV required columns: PASS
- CSV family coverage in current starter matrix: `matplotlib`, `chart_family`, `illustration_like`, `llm_svg`, `static_html_inline_svg`, `degraded_svg`

## Defects found during coding_engine review and fixed
1. **TypeScript module mode mismatch**
   - Original draft used a NodeNext-style configuration that forced explicit `.js` suffixes and broke the initial compile path.
   - Fix: changed the repository baseline to a CommonJS-first TypeScript draft for easier local compile/verification.

2. **Strict typing holes in validators**
   - `Object.values(...)` under strict mode exposed `unknown` / narrowness issues.
   - Fix: added explicit `AnyObject[]` casts and tightened branch logic.

3. **Capability validator too weak**
   - Initial validator did not reject `text_edit` on `legend` objects.
   - Fix: added object-type-level capability allowlists and re-ran smoke check.

## Remaining known limitations
1. `schemaValidator.ts` currently loads the JSON schema and runs invariant validation, but does **not** yet perform full runtime JSON-schema validation via Ajv or an equivalent validator.
2. Parser / importer / exporter packages are not implemented in this draft, so end-to-end workflow is not yet executable.
3. `fixture_family_matrix.csv` is a starter baseline, not a complete acceptance corpus.
4. The current smoke check is synthetic and validates contract consistency, not visual equivalence or importer behavior.

## Risk list
- **Runtime risk:** currently low for `ir-schema` itself, because it is compile-checked and validator-smoke-checked; unknown for future parser/exporter modules.
- **Serialization risk:** medium until full JSON-schema runtime validation is wired in.
- **Config risk:** medium if the repository later migrates back to ESM/NodeNext without simultaneously updating import paths and test runners.

## Verdict
The requested baseline files are now present as a **repository-grade initial draft** and have passed the requested coding-engine-style local closure checks that are possible at this stage.


## Round 2: importer pipeline minimal closure

Added packages: `core-parser`, `core-normalizer`, `importer-adapters`, `core-lifter`, `core-capability`.

Closed-loop checks to run:

```bash
cd /mnt/data/figure-editor-draft
npm run build:ir-schema && npm run build:import-pipeline && npm run smoke:import-pipeline
```

Known intentional limits of this round:
- parser is xml-like and only targets controlled MVP fixtures; not a full HTML5 parser
- adapters are heuristic stubs for smoke closure, not production-accuracy implementations
- exporters remain unimplemented in this round


## Update: editor pipeline round
- Added packages: core-history, editor-state, editor-tree, editor-properties, editor-import-report, editor-canvas.
- Added smoke path: imported project -> editor session -> select -> move -> edit text -> promote -> validate.


## Roundtrip pipeline extension
- Added `core-export-svg`, `core-export-html`, and `testing-metrics` as executable package baselines.
- Extended exporters to preserve `data-fe-object-id` and `data-fe-role` so re-import can retain more semantic/interaction information.
- Added approximate visual equivalence report with explicit `comparisonMode = approx_markup_diff`; this is an honest placeholder, not a real raster renderer.
- Added `smoke_roundtrip_pipeline.cjs` to verify export -> reimport -> metrics -> validation chain.


## Iteration v5: core-constraints + testing-fixtures

Aligned documents (strictly):
- Figure Editor Complete Requirements Spec V1
- Figure Editor Technical Design Impl Draft V1

Work added in this iteration:
- Added `packages/core-constraints` with anchor, align, distribute, keep-inside-bounds, relayout, guides, snapping.
- Added `packages/testing-fixtures` with supported family registry, fixture records, ground truth accessors, and seed data files.
- Added `editor-state` constraint action wrappers.
- Added `smoke:constraints-fixtures` script.

Real failures encountered and fixed:
1. `snapping.ts` was accidentally generated with invalid Python-style syntax. Rewritten and recompiled.
2. Initial smoke test incorrectly attempted to apply `setAnchor` to `text_node`, which violates the design contract. Smoke updated to target `legend` instead.

Checks executed:
- `npm run typecheck:constraints-fixtures`
- `npm run build:constraints-fixtures`
- `npm run typecheck:editor-pipeline`
- `npm run build:editor-pipeline`
- `npm run smoke:constraints-fixtures`

Status:
- constraints package: compile PASS
- fixtures package: compile PASS
- editor-state integration with constraints: PASS
- constraints/fixtures smoke: PASS


## Rendered comparison baseline update

- Replaced `approx_markup_diff` as the primary visual baseline in `packages/testing-metrics/src/visual/rasterDiff.ts`.
- Added `scripts/render_compare.py` using `cairosvg + PIL` to rasterize SVG / inline-SVG HTML and compute union-alpha normalized pixel diff.
- `computeVisualEquivalence(...)` now prefers rendered comparison and only falls back to `approx_markup_diff` when rendering is unavailable or fails.
- Current smoke result confirms `comparisonMode=rendered_svg_cairosvg`; visual pass is still false, which is an honest signal that exporter/render fidelity has not yet reached EQ-L2 threshold.
