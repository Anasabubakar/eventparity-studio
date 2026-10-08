# ADR 0002: Precompile the report validator

Status: accepted, 2026-10-07.

Ajv's default compile step uses `new Function`, which a CSP without `unsafe-eval` blocks. The same failure was found first in contractatlas-studio: the page rendered blank in a real browser while the jsdom tests passed. We keep the strict CSP and generate a standalone validator from the vendored JSON Schema (`vendor/eventparity-engine/report.v1.schema.json`) with `scripts/gen-validator.mjs`. The generated file is committed and a test plus the build script fail if it is out of date with the vendored schema.
