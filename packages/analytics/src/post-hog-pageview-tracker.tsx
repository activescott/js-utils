import { useEffect } from "react"
import { useLocation } from "react-router"
import { usePostHog } from "posthog-js/react"

/**
 * Captures `$pageview` events on client-side route changes.
 * Required because `capture_pageview` is set to `false` in the PostHog config
 * (the built-in capture only fires on initial page load, missing SPA navigations).
 */
export function PostHogPageviewTracker() {
  const location = useLocation()
  const posthog = usePostHog()

  useEffect(() => {
    posthog.capture("$pageview")
  }, [location.pathname, location.search, posthog])

  return null
}
