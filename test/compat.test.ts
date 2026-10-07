import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TESTED_ENGINE } from "../src/validate.ts";

const compat = JSON.parse(readFileSync("compat.json", "utf8"));
const vendored = JSON.parse(readFileSync("vendor/eventparity-engine/VERSION.json", "utf8"));
const pkg = JSON.parse(readFileSync("package.json", "utf8"));

describe("engine pairing", () => {
  it("compat.json lists exactly the vendored engine version as tested", () => {
    expect(compat.studio).toBe(pkg.version);
    expect(compat.pairs).toContainEqual({ engine: vendored.package, version: vendored.version, reportVersion: vendored.reportVersion, status: "tested" });
  });
  it("the runtime pairing equals the vendored stamp", () => {
    expect(TESTED_ENGINE).toEqual({ name: vendored.package, version: vendored.version, reportVersion: vendored.reportVersion });
  });
  it("vendored reports were produced by the vendored engine version", () => {
    for (const n of ["report-parity", "report-defective", "report-retention-gap"]) {
      expect(JSON.parse(readFileSync(`vendor/eventparity-engine/reports/${n}.json`, "utf8")).tool.version).toBe(vendored.version);
    }
  });
  it("the generated validator is current with the vendored schema", () => {
    expect(() => execFileSync("node", ["scripts/gen-validator.mjs", "--check"], { stdio: "pipe" })).not.toThrow();
  });
});
