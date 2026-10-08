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
    if (!res.ok) expect(res.error).toMatch(/neither covered nor reported as gaps/);
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

  describe("coverage must tile the requested range exactly", () => {
    const rejected = (mutate: (r: any) => void, pattern: RegExp) => {
      const r = raw("report-parity");
      mutate(r);
      const res = validateReport(r);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error).toMatch(pattern);
    };
    it("overlapping covered ranges whose lengths still sum to the request (5 of 9 ledgers)", () => {
      rejected((r) => {
        const { from } = r.requested;
        r.reference.covered = [{ from, to: from + 4 }, { from, to: from + 3 }];
        r.candidate.covered = [{ from, to: from + 4 }, { from, to: from + 3 }];
        r.compared = [{ from, to: from + 4 }];
      }, /overlapping/);
    });
    it("coverage entirely outside the requested range", () => {
      rejected((r) => {
        const n = r.requested.to - r.requested.from;
        for (const s of [r.reference, r.candidate]) s.covered = [{ from: 5071750, to: 5071750 + n }];
        r.compared = [{ from: 5071750, to: 5071750 + n }];
      }, /outside the requested range/);
    });
    it("a reversed range", () => {
      rejected((r) => {
        r.reference.covered = [{ from: r.requested.to, to: r.requested.from }];
      }, /reversed/);
    });
    it("a reversed or empty requested range", () => {
      rejected((r) => {
        r.requested = { from: r.requested.to, to: r.requested.from };
      }, /empty or reversed/);
    });
    it("a hole between covered ranges", () => {
      rejected((r) => {
        const { from, to } = r.requested;
        r.candidate.covered = [{ from, to: from + 1 }, { from: from + 3, to }];
      }, /neither covered nor reported/);
    });
    it("an inconsistent compared list", () => {
      rejected((r) => {
        r.compared = [{ from: r.requested.from, to: r.requested.from }];
      }, /compared ledgers/);
    });
    it("accepts the same coverage given in a different order and split into adjacent pieces", () => {
      const r = raw("report-parity");
      const { from, to } = r.requested;
      const mid = from + 2;
      r.reference.covered = [{ from: mid + 1, to }, { from, to: mid }];
      expect(validateReport(r).ok).toBe(true);
    });
  });
});
