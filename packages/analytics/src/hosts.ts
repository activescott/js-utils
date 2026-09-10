/**
 * Derives the sibling PostHog origins from the configured API origin, so a
 * deployment carries one host knob instead of three.
 *
 * PostHog cloud serves each region from `<region>.i.posthog.com` (events),
 * `<region>-assets.i.posthog.com` (static assets) and `<region>.posthog.com`
 * (app UI, the posthog-js `ui_host`). Any other origin — a self-hosted
 * instance, a future region layout — is returned unchanged for both, which
 * keeps proxy and client on the one configured host.
 */

/**
 * Returns the static-assets origin for a PostHog API origin.
 */
export function posthogAssetsHost(apiHost: string): string {
  const region = posthogCloudRegion(apiHost)
  return region ? `https://${region}-assets.i.posthog.com` : apiHost
}

/**
 * Returns the app-UI origin for a PostHog API origin (the `ui_host`
 * posthog-js option).
 */
export function posthogUiHost(apiHost: string): string {
  const region = posthogCloudRegion(apiHost)
  return region ? `https://${region}.posthog.com` : apiHost
}

function posthogCloudRegion(apiHost: string): string | null {
  let hostname: string
  try {
    hostname = new URL(apiHost).hostname
  } catch {
    return null
  }
  const match = /^([a-z0-9-]+)\.i\.posthog\.com$/.exec(hostname)
  return match ? match[1] : null
}
