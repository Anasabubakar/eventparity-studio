// Copy the report schema and the golden reports from an eventparity-engine checkout and stamp the pairing.
// Usage: node scripts/vendor-engine.mjs ../eventparity-engine
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { join, resolve } from "node:path";

const engine = resolve(process.argv[2] ?? "../eventparity-engine");
const out = resolve("vendor/eventparity-engine");
mkdirSync(join(out, "reports"), { recursive: true });

const commit = execFileSync("git", ["-C", engine, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const goMod = readFileSync(join(engine, "go.mod"), "utf8");
const toolVersion = JSON.parse(readFileSync(join(engine, "corpus/reports/report-parity.json"), "utf8")).tool.version;

copyFileSync(join(engine, "schema/report.v1.schema.json"), join(out, "report.v1.schema.json"));
for (const f of ["report-parity", "report-defective", "report-retention-gap"]) {
  copyFileSync(join(engine, "corpus/reports", `${f}.json`), join(out, "reports", `${f}.json`));
}
// The engine's own text rendering of the same comparisons, so tests can check the studio agrees with the CLI.
const pairs = {
  "report-parity": ["corpus/testnet-2026-10-07/horizon.jsonl", "corpus/testnet-2026-10-07/rpc.jsonl"],
  "report-defective": ["corpus/testnet-2026-10-07/horizon.jsonl", "corpus/testnet-2026-10-07/candidate-defective.jsonl"],
  "report-retention-gap": ["corpus/retention-gap-2026-10-07/horizon.jsonl", "corpus/retention-gap-2026-10-07/rpc.jsonl"],
};
for (const [name, [ref, cand]] of Object.entries(pairs)) {
  const r = spawnSync("go", ["run", "./cmd/eventparity", "compare", "--reference", ref, "--candidate", cand], {
    cwd: engine, encoding: "utf8", env: { ...process.env, GOTOOLCHAIN: process.env.GOTOOLCHAIN ?? "auto" },
  });
  if (r.status === null || r.status === 2) throw new Error(`engine text rendering failed for ${name}: ${r.stderr}`);
  writeFileSync(join(out, "reports", `${name}.txt`), r.stdout);
}

writeFileSync(
  join(out, "VERSION.json"),
  JSON.stringify({ package: "eventparity-engine", version: toolVersion, commit, reportVersion: "1", module: goMod.split("\n")[0], vendoredFor: "eventparity-studio" }, null, 2) + "\n",
);
console.log(`vendored eventparity-engine@${toolVersion} (${commit.slice(0, 12)})`);
