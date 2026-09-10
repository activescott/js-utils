import { useCallback } from "react"
import {
  captureAnalyticsEvent,
  type AnalyticsCapture,
} from "./capture-client.js"

/**
 * Returns the analytics capture function. Stable across renders; backed by
 * the initialized provider's registered client, so it works anywhere in the
 * app without a provider ancestor. Drops events while analytics is disabled
 * or the client chunk is still loading.
 */
export function useAnalyticsCapture(): AnalyticsCapture {
  return useCallback((event: string, properties?: Record<string, unknown>) => {
    captureAnalyticsEvent(event, properties)
  }, [])
}
