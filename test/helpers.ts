import { readFileSync } from "node:fs";
import type { Report } from "../src/types.ts";
import { validateReport } from "../src/validate.ts";

export const raw = (n: string) => JSON.parse(readFileSync(`vendor/eventparity-engine/reports/${n}.json`, "utf8"));
export const text = (n: string) => readFileSync(`vendor/eventparity-engine/reports/${n}.txt`, "utf8");
export const load = (n: string): Report => {
  const r = validateReport(raw(n));
  if (!r.ok) throw new Error(r.error);
  return r.report;
};
export const NOOP = { cls: "all" as const, text: "" };
export const opts = (over: Record<string, unknown> = {}) => ({ sourceLabel: "test", recorded: true, notes: [] as string[], filter: NOOP, onFilter: () => {}, ...over });
