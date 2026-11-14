# NASA research analytics implementation report

## Architecture and delivered features

Extended the existing TanStack Start application without replacing the standalone health monitor, its medical rules, wellness guidance, or evaluation workspace. Research is available at `/research` through the monitor’s Data options menu.

- Six-step workflow with one selected, session-only dataset: import, inspection, preparation, analysis, visualization, findings.
- Actual CSV, TSV, XLSX and flat JSON parsing; worksheet selection for multi-sheet manual Excel uploads; malformed-file and encoding feedback.
- Separate original and working tables; source/reference tracking; searchable, paginated previews; editable variable classifications.
- Missing-value counts and percentages, unique values, descriptive summaries, potential grouping/time variables.
- Explicit missing-value removal, conditional filtering, variable selection, sample-SD z-score/min–max normalization, IQR outlier screening, supported unit conversions, reset and exports.
- Descriptive statistics, Pearson/Spearman, Welch independent-samples and paired t-tests, Mann–Whitney, one-way ANOVA, Kruskal–Wallis, descriptive group-specific temporal slopes.
- Scatter, line, histogram, Tukey box plot and Pearson correlation heatmap. Heatmap inference uses Holm correction across unique pairs.
- Calculated findings and JSON reports with source, variables, operations, sample counts, effects, intervals where supported, and limitations. No AI-generated research measurements.

## Files

- `src/lib/research/`: types, imports/validation, preparation, statistics, visualization data, deterministic interpretation, invariant helper, distribution declarations and stateless OSDR functions.
- `src/components/research/`: charts and NASA explorer.
- `src/routes/research.tsx`, `src/test/research.test.ts`.
- Updated research-scoped theme in `src/styles.css`, navigation in `public/health-ergonomics.js`, dependency declarations, `AGENTS.md` and roadmap.

## Live NASA verification

Official endpoints returned actual payloads:

- `/osdr/data/search`, with no term, `term=OSD-48`, and keyword search. Only verified `term` is used; a guessed `type=study` was rejected and is not implemented.
- `/osdr/data/osd/meta/48` and `/osdr/data/osd/files/48`.
- `/geode-py/ws/api/experiments` and `/geode-py/ws/api/biospecimens`: verified response structures only; not separate UI features.
- Official OSD-48 file download: `GLDS-48_rna_seq_qc_metrics_GLbulkRNAseq.csv`, containing 14 observations and 118 variables. This is a sequencing quality-metrics table, not raw gene-expression counts.

Browser verification searched OSD-48, read its real mouse-liver study metadata, imported the actual compatible NASA table, and calculated statistics from its measurements. Keyword search returned 25 study entries. No API key was necessary for these public resources.

## Validation

- 31 automated tests passed across five test files, including 18 research tests covering CSV/Excel/JSON, validation, missing data, preprocessing, immutable originals, independently referenced group tests, correlations, temporal slopes and Holm correction.
- Reference Welch t = −2, df = 8, p = 0.08051623796; paired t = −3.655630775; ANOVA F = 4; Kruskal H = 2.844444444; continuity/tie-corrected Mann–Whitney p = 0.113846298.
- Full browser workflow: real CSV upload, inspection, normalization, analysis, chart, findings, NASA metadata/file import and analysis.
- Verified explicit study-design guard and matching Welch result; all five chart modes; visible histogram bars and grouped lines; mobile chart rendering without horizontal page overflow.
- Offline NASA request showed a retryable error; manual import still worked. Categorical-only data showed a meaningful chart empty state. No browser page errors in the completed checks.
- Latest preview build diagnostic: build OK.

## Limitations

- MVP limits: 10 MiB, 50,000 observations, 250 columns, two million cells. Processing is synchronous and session-only; reload clears research datasets. Exports preserve data outside the session.
- Statistical assumption confirmations are researcher attestations, not formal normality/design verification. Biological replicates cannot be established automatically.
- Rank-test p-values are asymptotic; ANOVA uses a variance-ratio screening heuristic. No post-hoc group comparisons, exact permutation tests, mixed models, differential expression, or clinical interpretation.
- Individual analyses use unadjusted p-values; Holm correction is implemented for heatmap pairs only. Repeated testing remains the researcher’s responsibility.
- Temporal slopes are descriptive; repeated observations and autocorrelation are not modeled.
- NASA compatibility filtering is based on file labels/extensions, not proof that a file contains scientifically appropriate measurements. Researchers must review table meaning and units. Unsupported, restricted, oversized, compressed, or nested datasets need external preparation and manual upload.
- NASA XLSX imports default to the first worksheet; multi-sheet selection is available for manual uploads. Search shows the current NASA response, not exhaustive paginated discovery.
- Experiments/biospecimens endpoints are verified but not integrated as separate browsing workflows. Bluetooth hardware and clinical validity remain unverified.