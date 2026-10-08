<p align="center"><img src="docs/assets/banner.svg" alt="eventparity-studio" width="100%"></p>

# eventparity-studio

[![CI](https://github.com/Event-Parity/eventparity-studio/actions/workflows/ci.yml/badge.svg)](https://github.com/Event-Parity/eventparity-studio/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE) [![Release](https://img.shields.io/github/v/release/Event-Parity/eventparity-studio)](https://github.com/Event-Parity/eventparity-studio/releases)

[Documentation](https://stellar-developer-tools.gitbook.io/eventparity-studio/) · [Live demo](https://eventparity-studio-anasamasama.vercel.app) · [Core repository](https://github.com/Event-Parity/eventparity-engine) · [Issues](https://github.com/Event-Parity/eventparity-studio/issues) · [Discussions](https://github.com/Event-Parity/eventparity-studio/discussions)


The report explorer for [EventParity](https://github.com/Event-Parity/eventparity-engine) reports: did changing your Stellar data source change your payment records?

It reads a report produced by `eventparity-engine`, shows the verdict (**parity**, **differences** or **inconclusive**), draws what each source actually covered, and lists every difference with the exact evidence from both sides. It computes no verdict of its own: everything on the page comes from the report JSON, and the page refuses reports that contradict themselves (for example one that claims parity while a source has a coverage gap).

Hosted demo: https://eventparity-studio-anasamasama.vercel.app

## Run

Node 22 or newer and pnpm.

```bash
git clone https://github.com/Event-Parity/eventparity-studio.git
cd eventparity-studio
pnpm install --frozen-lockfile
pnpm dev            # or: pnpm build && pnpm preview
```

Choose a **recorded report** or load your own:

```bash
eventparity compare --reference horizon.jsonl --candidate my-pipeline.jsonl --format json --out report.json
```

Files are read in your browser and never uploaded; the page makes no network requests.

## What you see

- **Verdict** with its plain meaning. Inconclusive is shown as "not a pass".
- **Coverage bars** for the reference and the candidate over the requested ledger range, with hatched segments for gaps, plus the gap reason in text. A gap is never presented as a missing payment.
- **Sources**: adapter, provider origin, covered ranges, payment counts and the SHA-256 of each stream the comparison used.
- **Differences**: each one as a card with side-by-side payments (ledger, order, transaction hash, operation index, from, to, asset with issuer, exact amount). Differing fields of a reinterpreted payment are highlighted. Filter by class or text.
- **Operation types outside version 1** whose counts differ, and the fixed "what this report does not establish" list.

Three real reports are bundled (from the engine's recorded testnet corpus): a candidate with one payment dropped and one duplicated, Horizon vs RPC parity, and an RPC retention gap. They are labeled recorded, not live.

Evidence from a real browser (2026-10-07): [coverage gap, desktop](docs/evidence/coverage-gap-desktop.jpg), [missing-payment card, narrow screen](docs/evidence/missing-payment-card-mobile.jpg).

## Safety properties

- Report content is untrusted: text nodes only, no `innerHTML`. Tests inject hostile strings into names, gap reasons and limitations.
- Strict Content-Security-Policy without `unsafe-eval`; the report validator is precompiled from the schema (`pnpm gen`).
- No RPC access and no URL fetching, so a visitor cannot make the host reach any address.
- Unknown report versions and self-contradicting reports are refused.

## Version pairing with the engine

| studio | eventparity-engine | report version | status |
|---|---|---|---|
| 0.1.2 | 0.1.2 (commit in `vendor/eventparity-engine/VERSION.json`) | 1 | tested |

The report schema, the three golden reports and the engine's own text renderings of them are vendored (`pnpm vendor ../eventparity-engine` refreshes them and the stamp; it runs the engine with Go 1.25). A test parses the engine's text output and asserts the page shows the same verdict, counts, differences and gaps. The repo has no dependency on a sibling path and builds from a clean clone.

## Develop

```bash
pnpm run typecheck && pnpm test && pnpm run build   # 30 tests (jsdom)
```

## Status

- Engineering complete for v0.1; verified in a real browser at desktop and 375 px widths (a narrow-screen overflow from unwrapped transaction keys was found and fixed).
- Pushed to GitHub with CI green; not published to npm.
- No ingestion maintainer has reviewed the explorer or the report format.

MIT licensed.

## Repository layout

- `docs/`: decision records (ADRs), evidence and assets
- `gitbook/`: source of the GitBook documentation
- `scripts/`: build, generation and recording scripts
- `src/`: source
- `test/`: tests
- `vendor/`: pinned artifacts from the paired core repository

## Documentation

The full documentation is at https://stellar-developer-tools.gitbook.io/eventparity-studio/. It is built from the `gitbook/` folder of this repository and synced from `main`, so a fix to a page is a pull request here.

## Contributing

Open issues are scoped so one person can finish one in a single cycle, and each lists acceptance criteria. Read [CONTRIBUTING.md](CONTRIBUTING.md), pick an issue from the [issue list](https://github.com/Event-Parity/eventparity-studio/issues), and say you are taking it before you start. Security reports go through [SECURITY.md](SECURITY.md), not public issues.

## Maintainers

| Maintainer | Role | GitHub |
|---|---|---|
| Anas Abubakar | Lead maintainer | [@Anasabubakar](https://github.com/Anasabubakar) |
| Abdulbasit Fazazi | Co-maintainer | [@fazaziishola-coder](https://github.com/fazaziishola-coder) |

## Community

Questions and design discussion go in [GitHub Discussions](https://github.com/Event-Parity/eventparity-studio/discussions). Bugs and scoped work go in [Issues](https://github.com/Event-Parity/eventparity-studio/issues).

## License

MIT. See [LICENSE](LICENSE).

## Contributors

Thanks to all the contributors who have made this project possible.

<a href="https://github.com/Event-Parity/eventparity-studio/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Event-Parity/eventparity-studio" alt="Contributors to eventparity-studio" />
</a>
