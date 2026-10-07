import { h } from "./dom.ts";
import type { DiffClass, Difference, Gap, Payment, Range, Report, Side, Verdict } from "./types.ts";

export const VERDICT_LABEL: Record<Verdict, string> = { parity: "Parity", differences: "Differences", inconclusive: "Inconclusive" };

export const VERDICT_MEANING: Record<Verdict, string> = {
  parity: "In every ledger both sources covered, every classic payment matched on all compared fields, and neither source had a coverage gap.",
  differences: "At least one payment is missing, duplicated or interpreted differently in ledgers both sides covered.",
  inconclusive: "Nothing differed in the ledgers that could be compared, but a source did not cover part of the range. This is not a pass.",
};

export const CLASS_LABEL: Record<DiffClass, string> = {
  missing_in_candidate: "Missing in candidate",
  missing_in_reference: "Missing in reference",
  duplicated_in_candidate: "Duplicated in candidate",
  duplicated_in_reference: "Duplicated in reference",
  reinterpreted: "Reinterpreted",
};

export interface ViewOptions {
  sourceLabel: string;
  recorded: boolean;
  notes: string[];
  /** Active difference filters. */
  filter: { cls: DiffClass | "all"; text: string };
  onFilter: (f: { cls: DiffClass | "all"; text: string }) => void;
}

export function rangesText(rs: Range[]): string {
  return rs.length === 0 ? "none" : rs.map((r) => (r.from === r.to ? String(r.from) : `${r.from}-${r.to}`)).join(", ");
}

export function assetText(p: Payment): string {
  return p.asset.type === "native" ? "XLM (native)" : `${p.asset.code}:${p.asset.issuer}`;
}

/** Proportional coverage bar for one side. Covered and gap segments are listed in text as well, never colour alone. */
export function coverageBar(side: Side, requested: Range): HTMLElement {
  const total = requested.to - requested.from + 1;
  const segs: Array<{ r: Range; gap: boolean; reason?: string }> = [
    ...side.covered.map((r) => ({ r, gap: false })),
    ...side.gaps.map((g: Gap) => ({ r: { from: g.from, to: g.to }, gap: true, reason: g.reason })),
  ].sort((a, b) => a.r.from - b.r.from);
  const bar = h(
    "div",
    { class: "bar", role: "img", "aria-label": `${side.name}: covered ${rangesText(side.covered)}; gaps ${rangesText(side.gaps)}` },
    ...segs.map((s) => {
      const len = s.r.to - s.r.from + 1;
      const seg = h("span", { class: s.gap ? "seg gap" : "seg covered", title: s.gap ? `Gap ${s.r.from}-${s.r.to}: ${s.reason}` : `Covered ${s.r.from}-${s.r.to}` });
      seg.style.flexGrow = String(Math.max(len / total, 0.02));
      return seg;
    }),
  );
  return bar;
}

function payment(p: Payment, differing: Set<string>): HTMLElement {
  const field = (name: string, label: string, value: string) =>
    h("div", { class: differing.has(name) ? "field changed" : "field" }, h("span", { class: "k" }, label), h("span", { class: "v" }, value));
  return h(
    "div",
    { class: "pay" },
    field("ledger", "Ledger", String(p.ledger)),
    field("applicationOrder", "Order in ledger", String(p.applicationOrder)),
    h("div", { class: "field" }, h("span", { class: "k" }, "Transaction"), h("code", { class: "v hash" }, p.txHash)),
    h("div", { class: "field" }, h("span", { class: "k" }, "Operation index"), h("span", { class: "v" }, String(p.opIndex))),
    field("from", "From", p.fromMuxedId ? `${p.from} (muxed ${p.fromMuxedId})` : p.from),
    field("to", "To", p.toMuxedId ? `${p.to} (muxed ${p.toMuxedId})` : p.to),
    field("asset", "Asset", assetText(p)),
    field("amount", "Amount", p.amount),
  );
}

function differing(d: Difference): Set<string> {
  const s = new Set(d.fields ?? []);
  if (s.has("fromMuxedId")) s.add("from");
  if (s.has("toMuxedId")) s.add("to");
  return s;
}

function differenceCard(d: Difference): HTMLElement {
  const marks = differing(d);
  const col = (title: string, ps: Payment[] | undefined) =>
    h("div", { class: "col" }, h("h5", {}, title), !ps || ps.length === 0 ? h("p", { class: "muted" }, "Not present") : h("div", {}, ...ps.map((p) => payment(p, marks))));
  return h(
    "article",
    { class: `diff diff-${d.class}`, "data-class": d.class, "data-key": d.key },
    h("header", {}, h("span", { class: "tag" }, CLASS_LABEL[d.class]), h("span", { class: "muted" }, ` ledger ${d.ledger}`)),
    h("p", { class: "key" }, h("code", {}, d.key)),
    h("p", {}, d.note),
    d.fields && d.fields.length > 0 && h("p", {}, "Differing fields: ", h("strong", {}, d.fields.join(", "))),
    h("div", { class: "cols" }, col("Reference", d.reference), col("Candidate", d.candidate)),
  );
}

export function filterDifferences(ds: Difference[], f: { cls: DiffClass | "all"; text: string }): Difference[] {
  const q = f.text.trim().toLowerCase();
  return ds.filter((d) => (f.cls === "all" || d.class === f.cls) && (q === "" || d.key.toLowerCase().includes(q) || JSON.stringify([d.reference, d.candidate]).toLowerCase().includes(q)));
}

function sideRow(label: string, s: Side): HTMLElement {
  return h(
    "tr",
    { "data-side": label.toLowerCase() },
    h("th", { scope: "row" }, label),
    h("td", {}, s.name, h("div", { class: "muted small" }, `${s.adapter} via ${s.provider}`)),
    h("td", {}, rangesText(s.covered)),
    h("td", {}, s.gaps.length === 0 ? "none" : s.gaps.map((g) => `${g.from}-${g.to}`).join(", ")),
    h("td", {}, String(s.payments)),
    h("td", {}, h("code", { class: "hash small" }, s.streamSha256)),
  );
}

export function renderReport(r: Report, opts: ViewOptions): HTMLElement {
  const gaps = [...r.reference.gaps.map((g) => ({ ...g, side: r.reference.name })), ...r.candidate.gaps.map((g) => ({ ...g, side: r.candidate.name }))];
  const shown = filterDifferences(r.differences, opts.filter);

  const select = h(
    "select",
    { id: "class-filter", "aria-label": "Filter differences by class" },
    h("option", { value: "all" }, "All classes"),
    ...(Object.keys(CLASS_LABEL) as DiffClass[]).map((c) => h("option", { value: c }, CLASS_LABEL[c])),
  );
  select.value = opts.filter.cls;
  select.addEventListener("change", () => opts.onFilter({ cls: select.value as DiffClass | "all", text: opts.filter.text }));
  const search = h("input", { id: "text-filter", type: "search", placeholder: "Filter by key, address or amount", "aria-label": "Filter differences by text", value: opts.filter.text });
  search.addEventListener("input", () => opts.onFilter({ cls: opts.filter.cls, text: search.value }));

  return h(
    "section",
    { class: "report", "aria-labelledby": "report-title" },
    opts.notes.length > 0 && h("div", { class: "notice", role: "note" }, ...opts.notes.map((n) => h("p", {}, n))),
    h(
      "header",
      { class: "summary" },
      h("h2", { id: "report-title" }, `Ledgers ${r.requested.from} to ${r.requested.to}`),
      h("p", { class: `verdict verdict-${r.verdict}`, "data-verdict": r.verdict }, h("span", { class: "badge" }, VERDICT_LABEL[r.verdict])),
      h("p", { class: "meaning" }, VERDICT_MEANING[r.verdict]),
      h(
        "ul",
        { class: "counts plain" },
        h("li", { "data-count": "matched" }, h("strong", {}, String(r.matched)), " matched"),
        h("li", { "data-count": "differences" }, h("strong", {}, String(r.differences.length)), " differences"),
        h("li", { "data-count": "gaps" }, h("strong", {}, String(r.notComparedInGaps)), " not compared (coverage gaps)"),
      ),
      h("p", { class: "muted" }, `Generated ${r.generatedAt} by ${r.tool.name} ${r.tool.version}. Scope: classic payments only.`),
      opts.recorded && h("p", { class: "recorded" }, "A recorded report from real testnet data, bundled with the studio. It is not a live check."),
    ),
    h(
      "section",
      { "aria-labelledby": "cov-title" },
      h("h3", { id: "cov-title" }, "Coverage"),
      h("p", { class: "muted small" }, "Solid segments were read; hatched segments were not covered by that source. A gap is never evidence of a missing payment."),
      h("div", { class: "legend" }, h("span", { class: "key-covered" }, "Covered"), h("span", { class: "key-gap" }, "Gap")),
      h("div", { class: "bars" }, h("div", {}, h("strong", {}, "Reference"), coverageBar(r.reference, r.requested)), h("div", {}, h("strong", {}, "Candidate"), coverageBar(r.candidate, r.requested))),
      ...gaps.map((g) => h("p", { class: "gap-note", "data-gap": `${g.from}-${g.to}` }, h("strong", {}, "Gap "), `in ${g.side}: ledgers ${g.from}-${g.to}. ${g.reason}.`)),
      h("p", {}, `Compared ledgers (covered by both): ${rangesText(r.compared)}.`),
    ),
    h(
      "section",
      { "aria-labelledby": "src-title" },
      h("h3", { id: "src-title" }, "Sources"),
      h("div", { class: "table-wrap" }, h("table", {}, h("thead", {}, h("tr", {}, ...["", "Stream", "Covered", "Gaps", "Payments", "Stream SHA-256"].map((t) => h("th", { scope: "col" }, t)))), h("tbody", {}, sideRow("Reference", r.reference), sideRow("Candidate", r.candidate)))),
      h("p", { class: "muted small" }, `Provenance: report source "${opts.sourceLabel}".`),
    ),
    h(
      "section",
      { "aria-labelledby": "diff-title" },
      h("h3", { id: "diff-title" }, `Differences (${shown.length} of ${r.differences.length} shown)`),
      r.differences.length > 0 && h("div", { class: "filters" }, select, search),
      r.differences.length === 0 && h("p", { class: "muted" }, "None in the compared ledgers."),
      r.differences.length > 0 && shown.length === 0 && h("p", { class: "muted" }, "No difference matches the filter."),
      ...shown.map(differenceCard),
    ),
    r.unsupportedNotCompared.length > 0 &&
      h(
        "section",
        { "aria-labelledby": "unsup-title" },
        h("h3", { id: "unsup-title" }, "Operation types outside version 1"),
        h("p", { class: "muted" }, "Counts differ for these types in compared ledgers. They are disclosed, not compared one by one, and do not change the verdict."),
        h("div", { class: "table-wrap" }, h("table", {}, h("thead", {}, h("tr", {}, h("th", { scope: "col" }, "Type"), h("th", { scope: "col" }, "Reference"), h("th", { scope: "col" }, "Candidate"))), h("tbody", {}, ...r.unsupportedNotCompared.map((u) => h("tr", {}, h("td", {}, u.opType), h("td", {}, String(u.reference)), h("td", {}, String(u.candidate))))))),
      ),
    h("section", { class: "limits", "aria-labelledby": "lim-title" }, h("h3", { id: "lim-title" }, "What this report does not establish"), h("ul", {}, ...r.limitations.map((l) => h("li", {}, l)))),
  );
}
