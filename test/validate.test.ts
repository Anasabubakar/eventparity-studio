import { describe, expect, it } from "vitest";
import { TESTED_ENGINE, parseReportText, validateReport } from "../src/validate.ts";
import { raw } from "./helpers.ts";

const names = ["report-parity", "report-defective", "report-retention-gap"];

describe("report validation", () => {
  it("accepts the three real reports with no pairing note", () => {
    for (const n of names) {
      const r = validateReport(raw(n));
      expect(r.ok, n).toBe(true);
      if (r.ok) expect(r.notes).toEqual([]);
    }
  });

  it("states the tested engine pairing", () => {
    expect(TESTED_ENGINE.reportVersion).toBe("1");
    expect(TESTED_ENGINE.name).toBe("eventparity-engine");
  });

  it("refuses an unknown report version", () => {
    const r = validateReport({ ...raw("report-parity"), reportVersion: "2" });
    expect(r).toMatchObject({ ok: false });
  });

  it("rejects extra fields such as a risk score", () => {
    expect(validateReport({ ...raw("report-parity"), riskScore: 1 }).ok).toBe(false);
  });

  it("never shows parity when a coverage gap exists (tampered report)", () => {
    const r = raw("report-retention-gap");
    r.verdict = "parity";
    const res = validateReport(r);
    expect(res).toMatchObject({ ok: false });
    if (!res.ok) expect(res.error).toMatch(/parity is impossible with gaps/i);
  });

  it("rejects parity that lists differences, and differences that list none", () => {
    const a = raw("report-defective");
    a.verdict = "parity";
    expect(validateReport(a).ok).toBe(false);
    const b = raw("report-parity");
    b.verdict = "differences";
    expect(validateReport(b).ok).toBe(false);
  });

  it("rejects an inconclusive verdict without gaps or with differences", () => {
    const a = raw("report-parity");
    a.verdict = "inconclusive";
    expect(validateReport(a).ok).toBe(false);
    const b = raw("report-defective");
    b.verdict = "inconclusive";
    expect(validateReport(b).ok).toBe(false);
  });

  it("rejects coverage that does not account for the requested range", () => {
    const r = raw("report-parity");
    r.candidate.covered[0].to -= 1;
    const res = validateReport(r);
    expect(res).toMatchObject({ ok: false });
    if (!res.ok) expect(res.error).toMatch(/account for every requested ledger/);
  });

  it("rejects malformed hashes and amounts", () => {
    const a = raw("report-defective");
    a.differences[0].reference[0].txHash = "XYZ";
    expect(validateReport(a).ok).toBe(false);
    const b = raw("report-defective");
    b.differences[0].reference[0].amount = "5";
    expect(validateReport(b).ok).toBe(false);
  });

  it("notes a different producing version but still shows the report", () => {
    const r = raw("report-parity");
    r.tool.version = "9.9.9";
    const res = validateReport(r);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.notes[0]).toMatch(/9\.9\.9/);
  });

  it("rejects non-JSON and oversized input", () => {
    expect(parseReportText("{nope")).toMatchObject({ ok: false });
    expect(parseReportText(" ".repeat(5_000_001))).toMatchObject({ ok: false });
  });
});
