# Changelog

## 0.1.0

Initial release as `@activescott/analytics`, moved from RambleFeed's
`@activescott/posthog-react-router` (v0.1.1).

Breaking changes from the RambleFeed package:

- Package renamed to `@activescott/analytics`.
- `createPostHogProxy` takes explicit origins (`{ apiHost, assetsHost? }`)
  instead of `{ region }` — the region choice stays explicit at the call site.
- Proxy hardening: `Cookie`/`Authorization` stripped, `Set-Cookie` stripped
  from responses, path-prefix allowlist, request body cap (413), upstream
  timeout (504), bodies never logged or echoed.
