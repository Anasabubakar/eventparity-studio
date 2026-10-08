# Specification

## User
Someone checking a payment-ingestion migration who wants to see what differed, and what could not be compared, without reading JSON.

## Supported scope
Load an EventParity report v1 (bundled recorded reports, file, paste); validate; render verdict, coverage, sources, differences with evidence, unsupported-type counts, limitations.

## Non-goals
No live fetching or comparison, no stream (JSONL) parsing, no editing, no storage, no accounts, no verdict computation.

## Data model
Exactly `report.v1.schema.json` from eventparity-engine (vendored). The studio adds consistency checks, not fields.

## Failure classes
| Input | Result |
|---|---|
| Not JSON / over 5 MB | readable error |
| Report version other than "1" | refused, version named |
| Fails the schema (extra fields such as a score, bad hash or amount) | refused |
| Verdict parity with differences, gaps or not-compared payments | refused: parity is impossible with gaps |
| Verdict differences with none listed; inconclusive with differences or without gaps | refused |
| Coverage plus gaps not accounting for the requested range on a side | refused |
| Valid, different producing-tool version | shown with a note |

## Acceptance criteria (each tested)
1. Verdict, counts, difference classes and keys, and gap ledgers equal the engine's own text output for all three real reports.
2. Hostile strings render as text.
3. Self-contradicting reports are refused.
4. Coverage bars are proportional and described in text.
5. Filters work and keep keyboard focus while typing.
6. Pairing file, vendored stamp and generated validator agree.
7. Works under a CSP without `unsafe-eval` in a real browser (manual evidence in `docs/evidence`).
