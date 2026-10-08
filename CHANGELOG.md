# Changelog

## 0.1.2
- Coverage validation is now exact: covered ranges and gaps must tile the requested range with no overlap, hole, reversed range or range outside the request, and `compared` must equal the intersection of both sides' covered ledgers. Previously only the summed lengths were checked, so overlapping or out-of-range coverage could be shown as parity.
- Re-paired with eventparity-engine 0.1.2 (vendored reports and stamp regenerated). No 0.1.1 studio was released; the version skips to match the engine.

## 0.1.0 (unreleased)
- Report explorer for EventParity report v1: verdict, coverage bars, sources, differences with side-by-side evidence, filters.
- Bundled recorded real testnet reports.
- Consistency checks that refuse self-contradicting reports (no parity with gaps).
- Precompiled schema validator; strict CSP; untrusted-content-safe rendering.
- Pairing with eventparity-engine 0.1.0.
