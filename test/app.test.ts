import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

async function boot() {
  document.body.innerHTML = '<main id="app"></main>';
  vi.resetModules();
  await import("../src/main.ts");
}
const pick = (id: string) => {
  const s = document.getElementById("sample") as HTMLSelectElement;
  s.value = id;
  s.dispatchEvent(new Event("change"));
};

describe("report explorer app", () => {
  beforeEach(() => document.body.replaceChildren());

  it("starts empty", async () => {
    await boot();
    expect(document.querySelector(".empty")).not.toBeNull();
    expect(document.querySelector("[data-verdict]")).toBeNull();
  });

  it("shows each recorded report with its verdict", async () => {
    await boot();
    for (const [id, verdict] of [["defective", "differences"], ["parity", "parity"], ["gap", "inconclusive"]] as const) {
      pick(id);
      expect(document.querySelector("[data-verdict]")?.getAttribute("data-verdict"), id).toBe(verdict);
    }
  });

  it("filters differences by class and keeps typing focus in the text filter", async () => {
    await boot();
    pick("defective");
    expect(document.querySelectorAll("article.diff").length).toBe(2);
    const cls = document.getElementById("class-filter") as HTMLSelectElement;
    cls.value = "duplicated_in_candidate";
    cls.dispatchEvent(new Event("change"));
    expect(document.querySelectorAll("article.diff").length).toBe(1);
    const text = document.getElementById("text-filter") as HTMLInputElement;
    text.focus();
    text.value = "zzz-no-match";
    text.dispatchEvent(new Event("input"));
    expect(document.querySelectorAll("article.diff").length).toBe(0);
    expect(document.body.textContent).toMatch(/No difference matches the filter/);
    expect(document.activeElement?.id).toBe("text-filter");
  });

  it("shows readable errors for invalid or inconsistent pasted reports", async () => {
    await boot();
    const paste = () => document.getElementById("paste") as HTMLTextAreaElement;
    const go = () => (document.getElementById("paste-btn") as HTMLButtonElement).click();
    paste().value = "{nope";
    go();
    expect(document.querySelector('[role="alert"]')?.textContent).toMatch(/Not valid JSON/);
    const tampered = JSON.parse(readFileSync("vendor/eventparity-engine/reports/report-retention-gap.json", "utf8"));
    tampered.verdict = "parity";
    paste().value = JSON.stringify(tampered);
    go();
    expect(document.querySelector('[role="alert"]')?.textContent).toMatch(/Parity is impossible with gaps/);
    expect(document.querySelector("[data-verdict]")).toBeNull();
  });

  it("renders a pasted valid report as not recorded", async () => {
    await boot();
    (document.getElementById("paste") as HTMLTextAreaElement).value = readFileSync("vendor/eventparity-engine/reports/report-parity.json", "utf8");
    (document.getElementById("paste-btn") as HTMLButtonElement).click();
    expect(document.querySelector("[data-verdict]")?.getAttribute("data-verdict")).toBe("parity");
    expect(document.body.textContent).not.toMatch(/recorded report from real testnet data/);
  });
});
