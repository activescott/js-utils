import { useEffect, useRef } from "react"
import { usePostHog } from "posthog-js/react"

interface PostHogIdentifierProps {
  distinctId?: string | null
  properties?: Record<string, unknown>
}

/**
 * Identifies the current user to PostHog for analytics tracking.
 * When `distinctId` is provided, calls `posthog.identify()`.
 * When transitioning from identified to anonymous (distinctId removed), calls `posthog.reset()`.
 */
export function PostHogIdentifier({
  distinctId,
  properties,
}: PostHogIdentifierProps) {
  const posthog = usePostHog()
  const previousDistinctIdReference = useRef(distinctId)

  useEffect(() => {
    const previousDistinctId = previousDistinctIdReference.current

    if (distinctId) {
      posthog.identify(distinctId, properties)
    } else if (previousDistinctId && !distinctId) {
      posthog.reset()
    }

    previousDistinctIdReference.current = distinctId
  }, [distinctId, properties, posthog])

  return null
}
