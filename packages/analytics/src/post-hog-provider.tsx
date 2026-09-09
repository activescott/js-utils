import type { PostHogConfig } from "posthog-js"
import { PostHogProvider as PHProvider } from "posthog-js/react"
import { PostHogPageviewTracker } from "./post-hog-pageview-tracker.js"
import { PostHogIdentifier } from "./post-hog-identifier.js"

interface PostHogProviderProps {
  apiKey?: string
  options?: Partial<PostHogConfig>
  user?: { distinctId: string; properties?: Record<string, unknown> }
  children: React.ReactNode
}

/**
 * All-in-one PostHog provider for React Router apps.
 * Wraps children with PostHog context, tracks SPA pageviews, and identifies users.
 * If `apiKey` is omitted, renders children without any PostHog functionality.
 */
export function PostHogProvider({
  apiKey,
  options,
  user,
  children,
}: PostHogProviderProps) {
  if (!apiKey) {
    return <>{children}</>
  }

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
      {children}
    </PHProvider>
  )
}
