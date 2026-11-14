# NASA integration stabilization

## Implemented
- `public/nasa-integrations.js`: versioned 30-minute local response caches, credential-specific hashed cache identities, request deduplication, stale fallback, UTC dates, checked message responses, independent telemetry provenance.
- `src/lib/nasa.functions.ts`, `src/lib/nasa-fetch.server.ts`: stateless DONKI/NOAA calls, optional private NASA key, optional device-configured override, date validation, sanitized responses/errors, bounded retries respecting Retry-After.
- `src/lib/nasa-bridge.ts`, `src/components/nasa-bridge.tsx`, `src/routes/index.tsx`: origin/source/schema-checked iframe requests reusing `searchStudies` and the weather function.
- `src/lib/research/osdr-normalization.ts`, `src/lib/research/osdr.functions.ts`: exact/versioned study records, newest-version fallback, relaxed restriction flags, study-specific safe download paths, deduplicated normalized search results.
- `public/astro-health-monitor.html`: independent weather loading, server-backed Body search, stale-response protection, partial ISS updates, 15-second timeout, snapshots only for missing parameters, reconnection/stale display.
- `public/health-ergonomics.js`: optional device NASA key setting and retained source timestamps/limitations.
- `src/test/nasa-integrations.test.ts`: focused cache, source errors, normalization, security and telemetry tests.
- `AGENTS.md`, `roadmap.md`: integration isolation and task tracking.

## Verification
Real browser testing returned five Body-tab OSDR studies and OSD-48 metadata with 658 files. No direct browser NASA/NOAA API requests were observed. SEP and NOAA succeeded while FLR returned HTTP 404; successful results remained visible. Research, evaluation and monitor routes were reached without browser runtime errors. Desktop and 390-pixel phone screenshots were inspected.

The existing medical thresholds, baseline, anomaly and research-statistical calculations were not edited. Environment-source eligibility now checks each parameter independently so sample snapshots and stale data cannot enter live-source rules; fresh successful SEP/FLR endpoints remain eligible independently. No operational records, database tables or existing settings were overwritten. No Mission Control implementation existed in the inspected repository; no duplicate simulator was introduced.

Full Vitest suite: 61 tests passed across six files (30 new integration tests). Latest automatic preview validation: build OK. A separate manual production build/typecheck was not run.

## Limitations
- NASA FLR returned HTTP 404 during verification; its upstream availability remains outside the app's control.
- Existing ISS item mappings produced approximately 759 °C and 16.8 kPa. Item identifiers and units are explicitly unverified and were preserved rather than inventing replacement measurements. This is not operationally validated station telemetry.
- No private NASA key was configured; the server uses DEMO_KEY unless an optional device key is supplied. Rate limits can still occur, especially across many devices.
- Device keys are optional localStorage configuration, not secure credential storage.
- Bridge-backed integrations require opening the monitor inside the app, not directly as a standalone document.
- Live reconnection and partial ordering are covered by deterministic state tests; all real-world connection-loss scenarios have not been exercised.
- Automatic preview checks are used; no separate manual production build or typecheck was run.