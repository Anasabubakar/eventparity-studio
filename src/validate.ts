import pairing from "../vendor/eventparity-engine/VERSION.json";
import validateSchema from "./generated/validateReport.js";
import type { Report } from "./types.ts";

type SchemaError = { instancePath: string; message?: string };
const check = validateSchema as unknown as ((data: unknown) => boolean) & { errors?: SchemaError[] | null };

/** The engine version this studio was built and tested against. */
export const TESTED_ENGINE = { name: pairing.package, version: pairing.version, reportVersion: pairing.reportVersion } as const;

export type LoadResult = { ok: true; report: Report; notes: string[] } | { ok: false; error: string };

export function parseReportText(text: string): LoadResult {
  if (text.length > 5_000_000) return { ok: false, error: "File is larger than 5 MB; reports are far smaller than that." };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return { ok: false, error: `Not valid JSON: ${e instanceof Error ? e.message : String(e)}` };
  }
  return validateReport(raw);
}

const rangeLen = (rs: Array<{ from: number; to: number }>) => rs.reduce((n, r) => n + (r.to - r.from + 1), 0);

/**
 * Beyond the schema, a report must not claim more than its own evidence supports. In particular a report can never
 * be shown as "parity" if either side has a coverage gap.
 */
export function validateReport(raw: unknown): LoadResult {
  const version = (raw as { reportVersion?: unknown } | null)?.reportVersion;
  if (version !== TESTED_ENGINE.reportVersion) {
    return { ok: false, error: `Unsupported report version ${JSON.stringify(version)}. This studio reads report version ${TESTED_ENGINE.reportVersion} only.` };
  }
  if (!check(raw)) {
    const issues = (check.errors ?? []).slice(0, 5).map((e) => `${e.instancePath || "(root)"} ${e.message ?? ""}`.trim());
    return { ok: false, error: `Report does not match the v1 report schema: ${issues.join("; ")}` };
  }
  const r = raw as unknown as Report;
  const gaps = r.reference.gaps.length + r.candidate.gaps.length;
  if (r.verdict === "parity" && (r.differences.length > 0 || gaps > 0 || r.notComparedInGaps > 0)) {
    return { ok: false, error: "Inconsistent report: it claims parity but lists differences or coverage gaps. Parity is impossible with gaps." };
  }
  if (r.verdict === "differences" && r.differences.length === 0) {
    return { ok: false, error: "Inconsistent report: it claims differences but lists none." };
  }
  if (r.verdict === "inconclusive" && (r.differences.length > 0 || gaps === 0)) {
    return { ok: false, error: "Inconsistent report: an inconclusive verdict requires coverage gaps and no differences." };
  }
  const requested = r.requested.to - r.requested.from + 1;
  for (const side of [r.reference, r.candidate]) {
    if (rangeLen(side.covered) + rangeLen(side.gaps) !== requested) {
      return { ok: false, error: `Inconsistent report: ${side.name} coverage and gaps do not account for every requested ledger.` };
    }
  }
  const notes: string[] = [];
  if (r.tool.version !== TESTED_ENGINE.version) {
    notes.push(`This report was produced by ${r.tool.name} ${r.tool.version}; this studio was tested with ${TESTED_ENGINE.version}. It matches the v1 schema so it is shown, but newer behavior is not covered by this studio's tests.`);
  }
  return { ok: true, report: r, notes };
}
