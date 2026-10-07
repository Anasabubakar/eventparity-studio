import "./style.css";
import defective from "../vendor/eventparity-engine/reports/report-defective.json";
import parity from "../vendor/eventparity-engine/reports/report-parity.json";
import gap from "../vendor/eventparity-engine/reports/report-retention-gap.json";
import pairing from "../vendor/eventparity-engine/VERSION.json";
import { h } from "./dom.ts";
import type { DiffClass, Report } from "./types.ts";
import { parseReportText, validateReport, type LoadResult } from "./validate.ts";
import { renderReport } from "./view.ts";

const SAMPLES = [
  { id: "defective", label: "Candidate that drops one payment and duplicates another (real testnet data)", data: defective },
  { id: "parity", label: "Horizon vs RPC: parity over real testnet ledgers", data: parity },
  { id: "gap", label: "Retention gap: RPC did not cover part of the range", data: gap },
];

interface State {
  report: Report | null;
  label: string;
  recorded: boolean;
  notes: string[];
  error: string | null;
  filter: { cls: DiffClass | "all"; text: string };
}
const state: State = { report: null, label: "", recorded: false, notes: [], error: null, filter: { cls: "all", text: "" } };

function load(r: LoadResult, label: string, recorded: boolean): void {
  if (r.ok) {
    state.report = r.report;
    state.label = label;
    state.recorded = recorded;
    state.notes = r.notes;
    state.error = null;
    state.filter = { cls: "all", text: "" };
  } else {
    state.error = r.error;
    state.report = null;
  }
  render();
}

function render(): void {
  const active = document.activeElement as HTMLInputElement | null;
  const restore = active?.id ? { id: active.id, start: active.selectionStart, end: active.selectionEnd } : null;
  const root = document.getElementById("app")!;
  root.replaceChildren();

  const sample = h("select", { id: "sample", "aria-label": "Choose a recorded report" }, h("option", { value: "" }, "Choose a recorded report…"), ...SAMPLES.map((s) => h("option", { value: s.id }, s.label)));
  sample.addEventListener("change", () => {
    const s = SAMPLES.find((x) => x.id === sample.value);
    if (s) load(validateReport(s.data), s.label, true);
  });
  if (state.report && state.recorded) sample.value = SAMPLES.find((s) => s.label === state.label)?.id ?? "";

  const file = h("input", { id: "file", type: "file", accept: "application/json,.json", "aria-label": "Load a report JSON file" });
  file.addEventListener("change", async () => {
    const f = file.files?.[0];
    if (f) load(parseReportText(await f.text()), f.name, false);
  });
  const paste = h("textarea", { id: "paste", rows: "4", placeholder: "Or paste report JSON here", "aria-label": "Paste report JSON" });
  const pasteBtn = h("button", { type: "button", id: "paste-btn" }, "Show pasted report");
  pasteBtn.addEventListener("click", () => load(parseReportText(paste.value), "Pasted JSON", false));

  root.append(
    h("header", { class: "site" }, h("h1", {}, "EventParity"), h("p", { class: "tag" }, "Did changing your Stellar data source change your payment records?")),
    h(
      "section",
      { class: "controls", "aria-labelledby": "load-title" },
      h("h2", { id: "load-title", class: "visually-hidden" }, "Load a report"),
      h("label", { for: "sample" }, "Recorded reports"),
      sample,
      h("label", { for: "file" }, "Your report file"),
      file,
      h("label", { for: "paste" }, "Paste"),
      paste,
      pasteBtn,
      h("p", { class: "muted small" }, "Reports are produced locally by eventparity-engine. Files you load stay in your browser; nothing is uploaded."),
    ),
  );
  if (state.error) root.append(h("div", { class: "error", role: "alert" }, state.error));
  if (!state.report && !state.error) root.append(h("div", { class: "empty" }, h("p", {}, "Choose a recorded report to explore real testnet results, or load a report you generated with the CLI.")));
  if (state.report) {
    root.append(
      renderReport(state.report, {
        sourceLabel: state.label,
        recorded: state.recorded,
        notes: state.notes,
        filter: state.filter,
        onFilter: (f) => {
          state.filter = f;
          render();
        },
      }),
    );
  }
  root.append(h("footer", { class: "site" }, h("p", { class: "muted small" }, `Built against ${pairing.package} ${pairing.version} (report v${pairing.reportVersion}, commit ${pairing.commit.slice(0, 10)}). Parity is a statement about the ledgers both sources covered, not a guarantee about anything else.`)));

  if (restore) {
    const el = document.getElementById(restore.id) as HTMLInputElement | null;
    if (el) {
      el.focus();
      try {
        el.setSelectionRange(restore.start, restore.end);
      } catch {
        /* selects and file inputs have no selection range */
      }
    }
  }
}

render();
