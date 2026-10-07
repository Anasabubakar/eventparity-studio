import { beforeEach, describe, expect, it } from "vitest";
import type { Difference } from "../src/types.ts";
import { CLASS_LABEL, filterDifferences, renderReport } from "../src/view.ts";
import { load, opts, text } from "./helpers.ts";

beforeEach(() => document.body.replaceChildren());

describe("renderReport", () => {
  it("shows verdict, counts and coverage straight from the report", () => {
    const el = renderReport(load("report-retention-gap"), opts());
    expect(el.querySelector("[data-verdict]")?.getAttribute("data-verdict")).toBe("inconclusive");
    expect(el.querySelector('[data-count="matched"] strong')?.textContent).toBe("10");
    expect(el.querySelector('[data-count="gaps"] strong')?.textContent).toBe("11");
    expect(el.textContent).toMatch(/This is not a pass/);
    expect(el.querySelector('[data-gap="4950790-4950801"]')?.textContent).toMatch(/before the provider's oldest available ledger \(4950802\)/);
  });

  it("agrees with the engine's own text output for every real report", () => {
    for (const n of ["report-parity", "report-defective", "report-retention-gap"]) {
      const el = renderReport(load(n), opts());
      const t = text(n);
      expect(t.match(/^Verdict: (\w+)/m)![1]!.toLowerCase(), n).toBe(el.querySelector("[data-verdict]")!.getAttribute("data-verdict"));
      const counts = /Matched payments: (\d+)\s+Differences: (\d+)\s+Not compared \(coverage gaps\): (\d+)/.exec(t)!;
      expect(el.querySelector('[data-count="matched"] strong')!.textContent, n).toBe(counts[1]);
      expect(el.querySelector('[data-count="differences"] strong')!.textContent, n).toBe(counts[2]);
      expect(el.querySelector('[data-count="gaps"] strong')!.textContent, n).toBe(counts[3]);
      // Every difference the CLI printed (class + key) appears as a card here, and vice versa.
      const printed = [...t.matchAll(/^([A-Z_]+)  ([0-9a-f]{64}:\d+)$/gm)].map((m) => `${m[1]!.toLowerCase()} ${m[2]}`).sort();
      const shown = [...el.querySelectorAll("article.diff")].map((a) => `${a.getAttribute("data-class")} ${a.getAttribute("data-key")}`).sort();
      expect(shown, n).toEqual(printed);
      // Every coverage gap line the CLI printed is shown with the same ledgers.
      for (const g of t.matchAll(/^COVERAGE GAP \(.*?\): ledgers (\d+-\d+):/gm)) expect(el.querySelector(`[data-gap="${g[1]}"]`), n).not.toBeNull();
    }
  });

  it("shows the dropped and the duplicated payment with the exact evidence", () => {
    const el = renderReport(load("report-defective"), opts());
    const missing = el.querySelector('article[data-class="missing_in_candidate"]')!;
    expect(missing.textContent).toMatch(/5\.0000000/);
    expect(missing.textContent).toMatch(/USDX:G[A-Z2-7]{55}/);
    expect(missing.textContent).toMatch(/Not present/);
    const dup = el.querySelector('article[data-class="duplicated_in_candidate"]')!;
    expect(dup.querySelectorAll(".col")[1]!.querySelectorAll(".pay").length).toBe(2);
  });

  it("labels a recorded report as not live and a parity report without any gap language", () => {
    const el = renderReport(load("report-parity"), opts());
    expect(el.textContent).toMatch(/recorded report from real testnet data/);
    expect(el.querySelector(".gap-note")).toBeNull();
    expect(renderReport(load("report-parity"), opts({ recorded: false })).textContent).not.toMatch(/recorded report from real/);
  });

  it("draws one proportional bar per side and describes it in text", () => {
    const el = renderReport(load("report-retention-gap"), opts());
    const bars = [...el.querySelectorAll(".bar")];
    expect(bars.length).toBe(2);
    expect(bars[0]!.getAttribute("aria-label")).toMatch(/covered 4950790-4950810; gaps none/);
    expect(bars[1]!.getAttribute("aria-label")).toMatch(/covered 4950802-4950810; gaps 4950790-4950801/);
    expect(bars[1]!.querySelectorAll(".seg.gap").length).toBe(1);
    const gapGrow = Number((bars[1]!.querySelector(".seg.gap") as HTMLElement).style.flexGrow);
    const covGrow = Number((bars[1]!.querySelector(".seg.covered") as HTMLElement).style.flexGrow);
    expect(gapGrow / covGrow).toBeCloseTo(12 / 9, 5);
  });

  it("highlights exactly the differing fields of a reinterpreted payment", () => {
    const rep = structuredClone(load("report-defective"));
    const base = rep.differences[0]!.reference![0]!;
    const d: Difference = {
      class: "reinterpreted", key: `${base.txHash}:${base.opIndex}`, ledger: base.ledger, note: "n", fields: ["amount", "toMuxedId"],
      reference: [base], candidate: [{ ...base, amount: "9.0000000", toMuxedId: "42" }],
    };
    rep.differences = [d];
    rep.verdict = "differences";
    const el = renderReport(rep, opts());
    const changed = [...el.querySelectorAll(".field.changed .k")].map((k) => k.textContent);
    expect(changed.sort()).toEqual(["Amount", "Amount", "To", "To"].sort());
    expect(el.textContent).toMatch(/Differing fields: amount, toMuxedId/);
  });

  it("renders hostile strings from a report as text, never markup", () => {
    const rep = structuredClone(load("report-retention-gap"));
    rep.reference.name = '<img src=x onerror="window.__pwned=1">';
    rep.candidate.gaps[0]!.reason = "<script>window.__pwned=1</script>";
    rep.limitations[0] = "<b>bold</b>";
    const el = renderReport(rep, opts());
    document.body.append(el);
    expect(document.querySelector("img")).toBeNull();
    expect(document.querySelector("script")).toBeNull();
    expect(document.querySelector("b")).toBeNull();
    expect((window as unknown as { __pwned?: number }).__pwned).toBeUndefined();
    expect(el.textContent).toContain("<script>window.__pwned=1</script>");
  });

  it("states what the report does not establish", () => {
    expect(renderReport(load("report-parity"), opts()).textContent).toMatch(/RPC events do not reproduce every Horizon effect/);
  });
});

describe("filterDifferences", () => {
  const ds = load("report-defective").differences;
  it("filters by class and by text over keys and evidence", () => {
    expect(filterDifferences(ds, { cls: "all", text: "" }).length).toBe(2);
    expect(filterDifferences(ds, { cls: "missing_in_candidate", text: "" }).length).toBe(1);
    expect(filterDifferences(ds, { cls: "all", text: "5.0000000" }).length).toBe(1);
    expect(filterDifferences(ds, { cls: "all", text: ds[0]!.key.slice(0, 12).toUpperCase() }).length).toBe(1);
    expect(filterDifferences(ds, { cls: "reinterpreted", text: "" }).length).toBe(0);
  });
  it("has a label for every class", () => {
    for (const c of ["missing_in_candidate", "missing_in_reference", "duplicated_in_candidate", "duplicated_in_reference", "reinterpreted"] as const) expect(CLASS_LABEL[c]).toBeTruthy();
  });
});
