import { describe, expect, it } from "vitest"
import { posthogAssetsHost, posthogUiHost } from "./hosts.js"

describe("posthogAssetsHost", () => {
  it("derives the us assets origin", () => {
    expect(posthogAssetsHost("https://us.i.posthog.com")).toBe(
      "https://us-assets.i.posthog.com",
    )
  })

  it("derives the eu assets origin", () => {
    expect(posthogAssetsHost("https://eu.i.posthog.com")).toBe(
      "https://eu-assets.i.posthog.com",
    )
  })

  it("returns unknown origins unchanged", () => {
    expect(posthogAssetsHost("https://posthog.example.com")).toBe(
      "https://posthog.example.com",
    )
  })

  it("returns garbage unchanged rather than throwing", () => {
    expect(posthogAssetsHost("not-a-url")).toBe("not-a-url")
  })
})

describe("posthogUiHost", () => {
  it("derives the us app origin", () => {
    expect(posthogUiHost("https://us.i.posthog.com")).toBe(
      "https://us.posthog.com",
    )
  })

  it("derives the eu app origin", () => {
    expect(posthogUiHost("https://eu.i.posthog.com")).toBe(
      "https://eu.posthog.com",
    )
  })

  it("returns unknown origins unchanged", () => {
    expect(posthogUiHost("https://posthog.example.com")).toBe(
      "https://posthog.example.com",
    )
  })
})
