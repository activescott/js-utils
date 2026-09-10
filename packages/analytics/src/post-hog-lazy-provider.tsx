import { Suspense, lazy } from "react"
import type { PostHogConfig } from "posthog-js"

const PostHogInit = lazy(() =>
  import("./post-hog-init.js").then((module) => ({
    default: module.PostHogInit,
  })),
)

export interface LazyPostHogProviderProps {
  /**
   * Whether capture runs at all. The containing app decides — typically
   * `apiKey` presence plus its own exclusions (e.g. admin traffic). When
   * false (or with no key) this renders null with zero PostHog code paths,
   * and the posthog-js chunk is never fetched.
   */
  enabled: boolean
  apiKey?: string
  options?: Partial<PostHogConfig>
  user?: { distinctId: string; properties?: Record<string, unknown> }
}

/**
 * PostHog with zero bundle cost when disabled. Renders null unless enabled
 * with a key; otherwise suspense-loads the initialized tree — posthog-js
 * travels in its own chunk, fetched only then.
 *
 * Mount as a STABLE SIBLING of your UI (e.g. beside `<Outlet/>`), never as a
 * conditional wrapper around it: swapping a wrapper in after the chunk loads
 * remounts the whole subtree. Custom events go through captureAnalyticsEvent
 * / useAnalyticsCapture (registered on init), so no context ancestor is
 * needed.
 */
export function LazyPostHogProvider({
  enabled,
  apiKey,
  options,
  user,
}: LazyPostHogProviderProps) {
  if (!enabled || !apiKey) {
    return null
  }
  return (
    <Suspense fallback={null}>
      <PostHogInit apiKey={apiKey} options={options} user={user} />
    </Suspense>
  )
}
