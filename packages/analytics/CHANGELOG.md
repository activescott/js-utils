# Changelog

## 0.2.0

- `createPostHogProxy` gains `forwardIp`: when true, the ingress-set
  `X-Forwarded-For` chain is forwarded unchanged for PostHog geoIP. Default
  remains false — no IP signal leaves your infrastructure unless you opt in.

Initial release as `@activescott/analytics`, moved from RambleFeed's
`@activescott/posthog-react-router` (v0.1.1).

Breaking changes from the RambleFeed package:

- Package renamed to `@activescott/analytics`.
- `createPostHogProxy` takes explicit origins (`{ apiHost, assetsHost? }`)
  instead of `{ region }` — the region choice stays explicit at the call site.
- Proxy hardening: `Cookie`/`Authorization` stripped, `Set-Cookie` stripped
  from responses, path-prefix allowlist, request body cap (413), upstream
  timeout (504), bodies never logged or echoed.
