// Vendored shape of eventparity-engine report v1 (see vendor/eventparity-engine/VERSION.json for the pairing).
export type Verdict = "parity" | "differences" | "inconclusive";
export type DiffClass = "missing_in_candidate" | "missing_in_reference" | "duplicated_in_candidate" | "duplicated_in_reference" | "reinterpreted";

export interface Range {
  from: number;
  to: number;
}
export interface Gap extends Range {
  reason: string;
}
export interface Asset {
  type: "native" | "credit";
  code?: string;
  issuer?: string;
}
export interface Payment {
  ledger: number;
  applicationOrder: number;
  txHash: string;
  opIndex: number;
  from: string;
  fromMuxedId?: string;
  to: string;
  toMuxedId?: string;
  asset: Asset;
  amount: string;
}
export interface Difference {
  class: DiffClass;
  key: string;
  ledger: number;
  reference?: Payment[];
  candidate?: Payment[];
  fields?: string[];
  note: string;
}
export interface Side {
  name: string;
  adapter: string;
  provider: string;
  network?: string;
  covered: Range[];
  gaps: Gap[];
  payments: number;
  streamSha256: string;
}
export interface Report {
  reportVersion: "1";
  tool: { name: string; version: string };
  generatedAt: string;
  scope: "classic-payments";
  requested: Range;
  compared: Range[];
  reference: Side;
  candidate: Side;
  verdict: Verdict;
  matched: number;
  notComparedInGaps: number;
  differences: Difference[];
  unsupportedNotCompared: Array<{ opType: string; reference: number; candidate: number }>;
  limitations: string[];
}
