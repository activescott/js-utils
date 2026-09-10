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
boundaries, and error pages intentionally get no pageview):

```tsx
// app/root.tsx
import { PostHogProvider } from "@activescott/analytics"

export function App() {
  const { posthogKey, user } = useLoaderData<typeof loader>()
  // Dynamic-import the provider module only when a key is configured so
  // disabled/self-host installs pay zero bundle cost for posthog-js.
  ...
}
```

Identify by stable id only — never pass emails, phone numbers, or other PII in
`properties` unless your privacy policy explicitly covers it:

```tsx
<PostHogProvider
  apiKey={posthogKey}
  options={{ api_host: "/ph", ui_host: "https://us.posthog.com" }}
  user={user ? { distinctId: user.id } : undefined}
>
  ...
</PostHogProvider>
```

With no `apiKey` the provider renders children with zero PostHog code paths.

### Sibling mounting (dynamic import without remounting the page)

If you code-split the analytics module (so disabled installs pay no bundle
cost), do not wrap the app in the provider once the import resolves —
swapping a wrapper in around mounted UI remounts the whole subtree. Mount it
childless as a sibling instead; pageviews, identification, and the shared
posthog-js singleton (which custom events capture through) all work the same:

```tsx
function Analytics({ posthogKey }: { posthogKey: string }) {
  const [analyticsModule, setAnalyticsModule] = useState<typeof import("@activescott/analytics") | null>(null)
  useEffect(() => {
    if (posthogKey) {
      void import("@activescott/analytics").then(setAnalyticsModule)
    }
  }, [posthogKey])
  if (!analyticsModule) {
    return null
  }
  return <analyticsModule.PostHogProvider apiKey={posthogKey} options={{ api_host: "/ph" }} />
}

// <Analytics posthogKey={key} />
// <Outlet />
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

## Versioning

Independent plain-npm versions with git tags of the form `analytics@<version>`
(see repo README). Consumers pin the versioned package normally — lockfile,
Dependabot, and Docker all work unchanged.
