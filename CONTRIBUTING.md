# Contributing

```bash
pnpm install --frozen-lockfile
pnpm run typecheck && pnpm test && pnpm run build
```

- The studio must not decide anything. Verdicts, counts, differences and coverage come from the report. If a new field is needed, add it to eventparity-engine's schema first, then `pnpm vendor ../eventparity-engine` and `pnpm gen`.
- Never present a coverage gap as a difference, and never show parity for a report with gaps.
- Insert report text with `h()`/text nodes only. No `innerHTML`, no new network requests, CSP without `unsafe-eval`.
- Check UI changes in a real browser at desktop and narrow widths, not only in jsdom.
- One logical change per commit; AI-assisted changes are welcome if you understand and verified them.
