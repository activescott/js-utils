/**
 * Code-split-safe entry point. Nothing in this module graph statically
 * imports posthog-js — the initialized tree (and posthog-js with it) loads
 * behind React.lazy inside LazyPostHogProvider — so consumers bundling from
 * here never pay for the library until it is enabled. Import the static
 * PostHogProvider from the package root instead when tree-shaking the barrel
 * is acceptable.
 */
export {
  LazyPostHogProvider,
  type LazyPostHogProviderProps,
} from "./post-hog-lazy-provider.js"
export {
  captureAnalyticsEvent,
  type AnalyticsCapture,
} from "./capture-client.js"
export { useAnalyticsCapture } from "./use-analytics-capture.js"
