import type { PostHogConfig } from "posthog-js"
import { PostHogProvider as PHProvider } from "posthog-js/react"
import { PostHogIdentifier } from "./post-hog-identifier.js"
import { PostHogPageviewTracker } from "./post-hog-pageview-tracker.js"
import { CaptureRegistrar } from "./capture-registrar.js"

interface PostHogInitProps {
  apiKey: string
  options?: Partial<PostHogConfig>
  user?: { distinctId: string; properties?: Record<string, unknown> }
  children?: React.ReactNode
}

/**
 * The initialized PostHog tree: context provider, SPA pageview tracking,
 * user identification, and capture registration. Lives in its own module so
 * React.lazy splits it (and posthog-js with it) into a separate chunk —
 * mount LazyPostHogProvider, not this, which guarantees the split point.
 */
export function PostHogInit({
  apiKey,
  options,
  user,
  children,
}: PostHogInitProps) {
  return (
    <PHProvider
      apiKey={apiKey}
      options={{
        ...options,
        capture_pageview: false,
      }}
    >
      <PostHogPageviewTracker />
      <PostHogIdentifier
        distinctId={user?.distinctId}
        properties={user?.properties}
      />
      <CaptureRegistrar />
      {children}
    </PHProvider>
  )
}
