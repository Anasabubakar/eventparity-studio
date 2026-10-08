# Run

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
