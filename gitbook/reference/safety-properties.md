# Safety properties

- Report content is untrusted: text nodes only, no `innerHTML`. Tests inject hostile strings into names, gap reasons and limitations.
- Strict Content-Security-Policy without `unsafe-eval`; the report validator is precompiled from the schema (`pnpm gen`).
- No RPC access and no URL fetching, so a visitor cannot make the host reach any address.
- Unknown report versions and self-contradicting reports are refused.
