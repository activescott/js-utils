/**
 * Registry bridging the initialized posthog-js client to code that cannot
 * (or should not) sit under the provider's React context.
 *
 * LazyPostHogProvider mounts childless as a stable sibling of the app UI —
 * conditionally wrapping UI would remount the subtree when the chunk loads —
 * so custom events cannot reach the client through context. Instead the
 * registrar inside the initialized tree publishes the bound capture here on
 * mount (and clears it on unmount); captureAnalyticsEvent and
 * useAnalyticsCapture read it back. Unregistered (disabled, or not yet
 * loaded) captures are dropped, never queued: analytics must not delay
 * interaction.
 */

export type AnalyticsCapture = (
  event: string,
  properties?: Record<string, unknown>,
) => void

let captureImplementation: AnalyticsCapture | null = null

/**
 * Publishes (or clears, with null) the bound capture function. Called by the
 * registrar inside the initialized provider tree; package-internal.
 */
export function setCaptureClient(
  implementation: AnalyticsCapture | null,
): void {
  captureImplementation = implementation
}

/**
 * Fire-and-forget event capture. Drops when analytics is disabled or the
 * client has not initialized yet, and never throws: a capture failure must
 * not break the UI.
 */
export function captureAnalyticsEvent(
  event: string,
  properties?: Record<string, unknown>,
): void {
  try {
    captureImplementation?.(event, properties)
  } catch {
    // Dropped by design.
  }
}
