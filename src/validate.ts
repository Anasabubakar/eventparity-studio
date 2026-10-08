import pairing from "../vendor/eventparity-engine/VERSION.json";
import validateSchema from "./generated/validateReport.js";
import type { Range, Report } from "./types.ts";

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

const sortedRanges = (rs: Range[]): Range[] => [...rs].sort((a, b) => a.from - b.from || a.to - b.to);

/** Merge ranges that touch or overlap into the smallest equivalent list. */
function coalesce(rs: Range[]): Range[] {
  const out: Range[] = [];
  for (const r of rs) {
    const last = out[out.length - 1];
    if (last && r.from <= last.to + 1) last.to = Math.max(last.to, r.to);
    else out.push({ from: r.from, to: r.to });
  }
  return out;
}

function intersect(a: Range[], b: Range[]): Range[] {
  const out: Range[] = [];
  for (const x of a) {
    for (const y of b) {
      const from = Math.max(x.from, y.from);
      const to = Math.min(x.to, y.to);
      if (from <= to) out.push({ from, to });
    }
  }
  return coalesce(sortedRanges(out));
}

const sameRanges = (a: Range[], b: Range[]) => a.length === b.length && a.every((r, i) => r.from === b[i]!.from && r.to === b[i]!.to);

/**
 * Covered ranges and gaps must tile the requested range exactly: every range well formed and inside the request,
 * no two ranges overlapping, no ledger left unaccounted for. Summed lengths alone prove none of that.
 */
function partitionProblem(req: Range, covered: Range[], gaps: Range[]): string | null {
  const all = sortedRanges([...covered, ...gaps]);
  let next = req.from;
  for (const r of all) {
    if (!Number.isInteger(r.from) || !Number.isInteger(r.to) || r.from > r.to) return "has a reversed or non-integer ledger range";
    if (r.from < req.from || r.to > req.to) return "has coverage or a gap outside the requested range";
    if (r.from < next) return "has overlapping coverage and gap ranges";
    if (r.from > next) return "leaves requested ledgers neither covered nor reported as gaps";
    next = r.to + 1;
  }
  return next === req.to + 1 ? null : "leaves requested ledgers neither covered nor reported as gaps";
}

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
  const req = r.requested;
  if (!Number.isInteger(req.from) || !Number.isInteger(req.to) || req.from > req.to) {
    return { ok: false, error: "Inconsistent report: the requested ledger range is empty or reversed." };
  }
  const coveredBySide: Range[][] = [];
  for (const side of [r.reference, r.candidate]) {
    const problem = partitionProblem(req, side.covered, side.gaps);
    if (problem) return { ok: false, error: `Inconsistent report: ${side.name} ${problem}.` };
    coveredBySide.push(coalesce(sortedRanges(side.covered)));
  }
  const expected = intersect(coveredBySide[0]!, coveredBySide[1]!);
  const claimed = coalesce(sortedRanges(r.compared));
  if (!sameRanges(expected, claimed)) {
    return { ok: false, error: "Inconsistent report: the compared ledgers are not exactly the ledgers both sides covered." };
  }
  const notes: string[] = [];
  if (r.tool.version !== TESTED_ENGINE.version) {
    notes.push(`This report was produced by ${r.tool.name} ${r.tool.version}; this studio was tested with ${TESTED_ENGINE.version}. It matches the v1 schema so it is shown, but newer behavior is not covered by this studio's tests.`);
  }
  return { ok: true, report: r, notes };
}
