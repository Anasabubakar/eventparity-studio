# What you see

- **Verdict** with its plain meaning. Inconclusive is shown as "not a pass".
- **Coverage bars** for the reference and the candidate over the requested ledger range, with hatched segments for gaps, plus the gap reason in text. A gap is never presented as a missing payment.
- **Sources**: adapter, provider origin, covered ranges, payment counts and the SHA-256 of each stream the comparison used.
- **Differences**: each one as a card with side-by-side payments (ledger, order, transaction hash, operation index, from, to, asset with issuer, exact amount). Differing fields of a reinterpreted payment are highlighted. Filter by class or text.
- **Operation types outside version 1** whose counts differ, and the fixed "what this report does not establish" list.

Three real reports are bundled (from the engine's recorded testnet corpus): a candidate with one payment dropped and one duplicated, Horizon vs RPC parity, and an RPC retention gap. They are labeled recorded, not live.

Evidence from a real browser (2026-10-07): [coverage gap, desktop](https://github.com/Event-Parity/eventparity-studio/blob/main/docs/evidence/coverage-gap-desktop.jpg), [missing-payment card, narrow screen](https://github.com/Event-Parity/eventparity-studio/blob/main/docs/evidence/missing-payment-card-mobile.jpg).
