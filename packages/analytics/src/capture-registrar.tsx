import { useEffect } from "react"
import { usePostHog } from "posthog-js/react"
import { setCaptureClient } from "./capture-client.js"

/**
 * Publishes the initialized client's bound capture into the module registry
 * (and clears it on unmount) so captureAnalyticsEvent / useAnalyticsCapture
 * work without a provider ancestor. Renders nothing; mount once inside the
 * initialized provider tree.
 */
export function CaptureRegistrar() {
  const posthog = usePostHog()

  useEffect(() => {
    setCaptureClient((event, properties) =>
      posthog.capture(event, properties),
    )
    return () => {
      setCaptureClient(null)
    }
  }, [posthog])

  return null
}
