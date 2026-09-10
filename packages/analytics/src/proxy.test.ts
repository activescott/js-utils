import { describe, expect, it, vi, afterEach } from "vitest"
import { createPostHogProxy } from "./proxy.js"

const API_HOST = "https://us.i.posthog.com"
const ASSETS_HOST = "https://us-assets.i.posthog.com"

interface CapturedCall {
  url: string
  init: RequestInit
}

function stubFetch(handler: (call: { url: string; init: RequestInit & { signal?: AbortSignal | null } }) => Response | Promise<Response>): CapturedCall[] {
  const calls: CapturedCall[] = []
  vi.stubGlobal(
    "fetch",
    async (url: string, init: RequestInit) => {
      calls.push({ url, init })
      return handler({ url, init })
    },
  )
  return calls
}

function proxy() {
  return createPostHogProxy({ apiHost: API_HOST, assetsHost: ASSETS_HOST })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("createPostHogProxy", () => {
  it("strips Cookie and Authorization before proxying", async () => {
    const calls = stubFetch(() => new Response("{}", { status: 200 }))
    const { action } = proxy()
    await action({
      request: new Request("https://app.example.com/ph/e/?v=1", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: "session=secret",
          authorization: "Bearer secret",
          "x-custom": "drop-me",
        },
        body: JSON.stringify({ event: "x" }),
      }),
    })
    expect(calls).toHaveLength(1)
    const headers = new Headers(calls[0].init.headers)
    expect(headers.get("cookie")).toBeNull()
    expect(headers.get("authorization")).toBeNull()
    expect(headers.get("x-custom")).toBeNull()
    expect(headers.get("content-type")).toBe("application/json")
  })

  it("routes static/ to the assets host and events to the api host", async () => {
    const calls = stubFetch(() => new Response("{}", { status: 200 }))
    const { loader } = proxy()
    await loader({
      request: new Request("https://app.example.com/ph/static/array.js"),
    })
    await loader({
      request: new Request("https://app.example.com/ph/decide/?v=3"),
    })
    expect(calls[0].url).toBe(`${ASSETS_HOST}/static/array.js`)
    expect(calls[1].url).toBe(`${API_HOST}/decide/?v=3`)
  })

  it("routes the ingestion API to the api host", async () => {
    const calls = stubFetch(() => new Response("{}", { status: 200 }))
    const { action } = proxy()
    const response = await action({
      request: new Request("https://app.example.com/ph/i/v0/e/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ event: "x" }),
      }),
    })
    expect(response.status).toBe(200)
    expect(calls[0].url).toBe(`${API_HOST}/i/v0/e/`)
  })

  it("answers 404 for paths outside the allowlist without calling upstream", async () => {
    const calls = stubFetch(() => new Response("{}", { status: 200 }))
    const { loader } = proxy()
    const response = await loader({
      request: new Request("https://app.example.com/ph/api/projects/"),
    })
    expect(response.status).toBe(404)
    expect(calls).toHaveLength(0)
  })

  it("rejects oversized bodies with 413 via Content-Length before reading", async () => {
    const calls = stubFetch(() => new Response("{}", { status: 200 }))
    const { action } = createPostHogProxy({
      apiHost: API_HOST,
      maxBodyBytes: 10,
    })
    const response = await action({
      request: new Request("https://app.example.com/ph/e/", {
        method: "POST",
        headers: { "content-length": "100" },
        body: "hello",
      }),
    })
    expect(response.status).toBe(413)
    expect(calls).toHaveLength(0)
  })

  it("rejects oversized streamed bodies with 413", async () => {
    const calls = stubFetch(() => new Response("{}", { status: 200 }))
    const { action } = createPostHogProxy({
      apiHost: API_HOST,
      maxBodyBytes: 4,
    })
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("way-too-long"))
        controller.close()
      },
    })
    const response = await action({
      request: new Request("https://app.example.com/ph/e/", {
        method: "POST",
        body: stream,
        // @ts-expect-error duplex is required for streamed bodies in Node
        duplex: "half",
      }),
    })
    expect(response.status).toBe(413)
    expect(calls).toHaveLength(0)
  })

  it("accepts sendBeacon text/plain bodies", async () => {
    const calls = stubFetch(() => new Response("{}", { status: 200 }))
    const { action } = proxy()
    const response = await action({
      request: new Request("https://app.example.com/ph/e/", {
        method: "POST",
        headers: { "content-type": "text/plain;charset=UTF-8" },
        body: JSON.stringify({ event: "x" }),
      }),
    })
    expect(response.status).toBe(200)
    expect(new Headers(calls[0].init.headers).get("content-type")).toBe(
      "text/plain;charset=UTF-8",
    )
  })

  it("answers 504 when upstream hangs past the timeout", async () => {
    vi.stubGlobal(
      "fetch",
      (_url: string, init: RequestInit & { signal?: AbortSignal | null }) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(new DOMException("The operation was aborted.", "AbortError")),
          )
        }),
    )
    const { loader } = createPostHogProxy({ apiHost: API_HOST, timeoutMs: 20 })
    const response = await loader({
      request: new Request("https://app.example.com/ph/e/"),
    })
    expect(response.status).toBe(504)
  })

  it("strips set-cookie from upstream responses", async () => {
    stubFetch(
      () =>
        new Response("{}", {
          status: 200,
          headers: { "set-cookie": "ph_x=1; Path=/" },
        }),
    )
    const { loader } = proxy()
    const response = await loader({
      request: new Request("https://app.example.com/ph/decide/?v=3"),
    })
    expect(response.headers.get("set-cookie")).toBeNull()
  })

  it("rejects non-GET/POST/OPTIONS methods with 405", async () => {
    const calls = stubFetch(() => new Response("{}", { status: 200 }))
    const { action } = proxy()
    const response = await action({
      request: new Request("https://app.example.com/ph/e/", { method: "DELETE" }),
    })
    expect(response.status).toBe(405)
    expect(calls).toHaveLength(0)
  })

  it("drops X-Forwarded-For by default", async () => {
    const calls = stubFetch(() => new Response("{}", { status: 200 }))
    const { action } = proxy()
    await action({
      request: new Request("https://app.example.com/ph/e/", {
        method: "POST",
        headers: { "x-forwarded-for": "203.0.113.7" },
        body: JSON.stringify({ event: "x" }),
      }),
    })
    expect(new Headers(calls[0].init.headers).get("x-forwarded-for")).toBeNull()
  })

  it("forwards X-Forwarded-For unchanged when forwardIp is set", async () => {
    const calls = stubFetch(() => new Response("{}", { status: 200 }))
    const { action } = createPostHogProxy({ apiHost: API_HOST, forwardIp: true })
    await action({
      request: new Request("https://app.example.com/ph/e/", {
        method: "POST",
        headers: { "x-forwarded-for": "203.0.113.7, 198.51.100.3" },
        body: JSON.stringify({ event: "x" }),
      }),
    })
    expect(new Headers(calls[0].init.headers).get("x-forwarded-for")).toBe(
      "203.0.113.7, 198.51.100.3",
    )
  })
})
