# @activescott/analytics

PostHog analytics integration for React Router apps — SPA pageview tracking, user identification, and a reverse proxy helper to avoid ad blockers.

## Install

```bash
npm install @activescott/analytics posthog-js
```

`posthog-js` is a peer dependency so consumers control its version. When
bumping the peer floor, check the
[posthog-js changelog](https://github.com/PostHog/posthog-js/releases) for
breaking changes to `PostHogConfig` or the `posthog-js/react` exports, then
release a matching minor of this package.

## Quick Start

### 1. Add the provider to your app

Mount it where loader data is available (in React Router v7, that means `App`,
not `Layout` — `Layout` renders with undefined loader data on error
boundaries, and error pages intentionally get no pageview).

For zero bundle cost when disabled, use `LazyPostHogProvider`: it renders
null unless enabled with a key, otherwise suspense-loads the initialized
tree with posthog-js in its own chunk. Mount it as a STABLE SIBLING of your
UI — never as a conditional wrapper around it, which would remount the whole
subtree once the chunk loads:

```tsx
// app/root.tsx
import { LazyPostHogProvider } from "@activescott/analytics"

export function App() {
  const { posthogKey, isAdmin, user } = useLoaderData<typeof loader>()
  return (
    <>
      <LazyPostHogProvider
        enabled={posthogKey !== "" && !isAdmin}
        apiKey={posthogKey || undefined}
        options={{ api_host: "/ph", ui_host: "https://us.posthog.com" }}
        user={user ? { distinctId: user.id } : undefined}
      />
      <Outlet />
    </>
  )
}
```

Identify by stable id only — never pass emails, phone numbers, or other PII in
`properties` unless your privacy policy explicitly covers it.

`PostHogProvider` (same props plus `children`) remains for apps that prefer
a static import and a wrapping provider.

### Custom events

Capture through `captureAnalyticsEvent` or the `useAnalyticsCapture` hook —
both read the client the provider registers on init, so they work anywhere
without a provider ancestor, and drop while disabled or still loading:

```tsx
import { useAnalyticsCapture } from "@activescott/analytics"

const capture = useAnalyticsCapture()
capture("search_results_shown", { result_count: 2 })
```

### 2. Add the reverse proxy route

Create `app/routes/ph.$.ts`:

```ts
import { createPostHogProxy } from "@activescott/analytics/proxy"

export const { loader, action } = createPostHogProxy({
  apiHost: "https://us.i.posthog.com",
  assetsHost: "https://us-assets.i.posthog.com",
  // Opt in only if your privacy policy covers it: forwards the ingress-set
  // X-Forwarded-For chain so PostHog sees client IPs for geoIP.
  forwardIp: true,
})
```

Register the route in `app/routes.ts`:

```ts
route("ph/*", "routes/ph.$.ts"),
```

The proxy hardens the relay for you: upstream origins are fixed at
configuration time, `Cookie`/`Authorization` (and everything but content-type +
user-agent) are stripped, `Set-Cookie` is stripped from responses, request
bodies are capped (default 1 MiB), the upstream call has a timeout (default
10s), and only known PostHog path prefixes (`e`, `batch`, `decide`, `flags`,
`s`, `surveys`, `array`, `static`) are proxied. IP forwarding is deliberately
absent — `X-Forwarded-For` passthrough vs `?ip=` is a privacy decision for you
to make explicitly.

That's it! PostHog will now:

- Track pageviews on every client-side navigation
- Identify logged-in users by id
- Receive events through your own domain (`/ph/*`)

### Deriving sibling origins

`@activescott/analytics/hosts` exports the pure helpers `posthogAssetsHost`
and `posthogUiHost`, which map a PostHog API origin to its assets and app-UI
siblings (`<region>.i.posthog.com` → `<region>-assets.i.posthog.com` /
`<region>.posthog.com`; anything else passes through unchanged) — so a
deployment carries one host knob instead of three.

## Versioning

Independent plain-npm versions with git tags of the form `analytics@<version>`
(see repo README). Consumers pin the versioned package normally — lockfile,
Dependabot, and Docker all work unchanged.
