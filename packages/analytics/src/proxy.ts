const HTTP_NO_CONTENT = 204
const HTTP_NOT_MODIFIED = 304
const HTTP_NOT_FOUND = 404
const HTTP_METHOD_NOT_ALLOWED = 405
const HTTP_PAYLOAD_TOO_LARGE = 413
const HTTP_BAD_GATEWAY = 502
const HTTP_GATEWAY_TIMEOUT = 504
const HTTP_INTERNAL_SERVER_ERROR = 500

const DEFAULT_MOUNT_PATH = "/ph"
const DEFAULT_MAX_BODY_BYTES = 1024 * 1024
const DEFAULT_TIMEOUT_MS = 10_000

/**
 * First path segments (after the mount prefix) that may be proxied. Everything
 * else answers 404 so this route can never become a generic relay. Covers
 * posthog-js capture (`e`, `batch`), flags (`decide`, `flags`), session
 * replay (`s`), surveys (`surveys`), autotrack/toolbar helpers (`array`),
 * static assets (`static`, routed to the assets host), and the `i` ingestion
 * API — which PostHog Cloud's remote config selects as the capture endpoint
 * for current clients, so without it every event past the first seconds 404s.
 * Widen with care.
 */
const ALLOWED_PREFIXES = [
  "e",
  "batch",
  "decide",
  "flags",
  "s",
  "surveys",
  "array",
  "static",
  "i",
] as const

const ALLOWED_METHODS = ["GET", "POST", "OPTIONS"] as const

interface PostHogProxyOptions {
  /**
   * PostHog API origin, e.g. `"https://us.i.posthog.com"`. Full origin, not a
   * region — the region choice stays explicit at the call site.
   */
  apiHost: string
  /**
   * PostHog static-assets origin. Defaults to `apiHost`. PostHog cloud serves
   * assets from `<region>-assets.i.posthog.com`; pass it explicitly when the
   * `static/` prefix must not hit the API origin.
   */
  assetsHost?: string
  /**
   * Path prefix this route is mounted at. Defaults to `"/ph"`.
   */
  mountPath?: string
  /**
   * Maximum proxied request body in bytes, enforced BEFORE buffering (the
   * Content-Length header is rejected first, then the stream is accumulated
   * with a running cap). Defaults to 1 MiB — events are kilobytes.
   */
  maxBodyBytes?: number
  /**
   * Upstream timeout in milliseconds. Defaults to 10s; a hung PostHog must
   * never pin server resources.
   */
  timeoutMs?: number
  /**
   * Forward the incoming `X-Forwarded-For` header unchanged so PostHog sees
   * the client IP chain (set by your ingress, used for geoIP). Defaults to
   * false — no IP signal leaves your infrastructure unless you opt in.
   * Spoofing caveat: clients can prepend entries to the chain; PostHog
   * parses it per its own rules, same as every PostHog proxy setup.
   */
  forwardIp?: boolean
}

/**
 * Creates React Router `loader` and `action` handlers that proxy requests to
 * PostHog. Use this in a splat route (e.g. `ph.$.ts`) to reverse-proxy all
 * PostHog requests through your own domain, preventing CSP/CORS issues and ad
 * blocker interference.
 *
 * Hardening (this route is same-origin, so browsers attach your session
 * cookie to every `/ph` request):
 *
 * - Upstream origins are fixed at configuration time, never derived from
 *   request input.
 * - `Cookie` and `Authorization` headers are stripped before proxying; only a
 *   deliberate allowlist of headers is forwarded.
 * - Response `Set-Cookie` is stripped so PostHog can never plant cookies on
 *   your domain.
 * - Request bodies are capped and the upstream call has a timeout.
 * - Bodies are never logged or echoed back in error responses.
 * - Client IPs are NOT forwarded by default; pass `forwardIp: true` to send
 *   the ingress-set `X-Forwarded-For` chain upstream for geoIP.
 *
 * @example
 * ```ts
 * // app/routes/ph.$.ts
 * import { createPostHogProxy } from "@activescott/analytics/proxy"
 * export const { loader, action } = createPostHogProxy({
 *   apiHost: "https://us.i.posthog.com",
 *   assetsHost: "https://us-assets.i.posthog.com",
 * })
 * ```
 */
export function createPostHogProxy(options: PostHogProxyOptions): {
  loader: (loaderArguments: { request: Request }) => Promise<Response>
  action: (actionArguments: { request: Request }) => Promise<Response>
} {
  const apiHost = normalizeOrigin(options.apiHost)
  const assetsHost = normalizeOrigin(options.assetsHost ?? options.apiHost)
  const mountPath = (options.mountPath ?? DEFAULT_MOUNT_PATH).replace(/\/$/, "")
  const maxBodyBytes = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const forwardIp = options.forwardIp ?? false

  async function proxyRequest(request: Request): Promise<Response> {
    if (!ALLOWED_METHODS.includes(request.method as (typeof ALLOWED_METHODS)[number])) {
      return new Response("Method Not Allowed", {
        status: HTTP_METHOD_NOT_ALLOWED,
      })
    }

    let pathname: string
    try {
      const url = new URL(request.url)
      pathname = url.pathname
      if (!pathname.startsWith(`${mountPath}/`) && pathname !== mountPath) {
        return new Response("Not Found", { status: HTTP_NOT_FOUND })
      }
      const stripped = pathname.slice(mountPath.length).replace(/^\//, "")
      const firstSegment = stripped.split("/", 1)[0] ?? ""
      const isAllowed = (ALLOWED_PREFIXES as readonly string[]).includes(firstSegment)
      if (!isAllowed) {
        return new Response("Not Found", { status: HTTP_NOT_FOUND })
      }

      const targetHost = firstSegment === "static" ? assetsHost : apiHost
      const targetUrl = new URL(`${stripped}${url.search}`, `${targetHost}/`)

      const headers = new Headers()
      const contentType = request.headers.get("content-type")
      // Accept whatever content type the client sent (posthog-js uses
      // `text/plain` for sendBeacon fallbacks) — the body is opaque bytes.
      if (contentType) {
        headers.set("content-type", contentType)
      }
      const userAgent = request.headers.get("user-agent")
      if (userAgent) {
        headers.set("user-agent", userAgent)
      }
      // Opt-in only: pass the ingress-set client IP chain through for
      // PostHog geoIP. Forwarded unchanged (never synthesized here) and never
      // logged. See the `forwardIp` option docs for the spoofing caveat.
      if (forwardIp) {
        const forwardedFor = request.headers.get("x-forwarded-for")
        if (forwardedFor) {
          headers.set("x-forwarded-for", forwardedFor)
        }
      }
      // Deliberately NOT forwarded: Cookie, Authorization, and everything
      // else.

      let body: Uint8Array<ArrayBuffer> | undefined
      if (request.method !== "GET" && request.method !== "HEAD") {
        const contentLength = request.headers.get("content-length")
        if (contentLength && Number(contentLength) > maxBodyBytes) {
          return new Response("Payload Too Large", {
            status: HTTP_PAYLOAD_TOO_LARGE,
          })
        }
        body = await readCappedBody(request.body, maxBodyBytes)
        if (!body) {
          return new Response("Payload Too Large", {
            status: HTTP_PAYLOAD_TOO_LARGE,
          })
        }
      }

      const phResponse = await fetch(targetUrl.toString(), {
        method: request.method,
        headers,
        body,
        signal: AbortSignal.timeout(timeoutMs),
      })

      if (
        phResponse.status === HTTP_NO_CONTENT ||
        phResponse.status === HTTP_NOT_MODIFIED ||
        !phResponse.body
      ) {
        return new Response(null, {
          status: phResponse.status,
          statusText: phResponse.statusText,
        })
      }

      const responseHeaders = new Headers(phResponse.headers)
      responseHeaders.delete("content-encoding")
      responseHeaders.delete("content-length")
      responseHeaders.delete("set-cookie")

      return new Response(phResponse.body, {
        status: phResponse.status,
        statusText: phResponse.statusText,
        headers: responseHeaders,
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === "TimeoutError") {
        return new Response("Gateway Timeout", {
          status: HTTP_GATEWAY_TIMEOUT,
        })
      }
      if (error instanceof Error && error.name === "AbortError") {
        return new Response("Gateway Timeout", {
          status: HTTP_GATEWAY_TIMEOUT,
        })
      }
      return new Response("Bad Gateway", { status: HTTP_BAD_GATEWAY })
    }
  }

  return {
    loader({ request }: { request: Request }): Promise<Response> {
      return proxyRequest(request)
    },
    action({ request }: { request: Request }): Promise<Response> {
      return proxyRequest(request)
    },
  }
}

function normalizeOrigin(origin: string): string {
  const url = new URL(origin)
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`PostHog origin must be http(s): received ${url.protocol}`)
  }
  return url.origin
}

/**
 * Accumulates a request stream up to `maxBytes`. Returns undefined when the
 * body exceeds the cap (caller answers 413 without ever buffering it whole).
 */
async function readCappedBody(
  stream: ReadableStream<Uint8Array> | null,
  maxBytes: number,
): Promise<Uint8Array<ArrayBuffer> | undefined> {
  if (!stream) {
    return new Uint8Array(0)
  }
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      total += value.byteLength
      if (total > maxBytes) {
        await reader.cancel().catch(() => {})
        return undefined
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const merged = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.byteLength
  }
  return merged
}
