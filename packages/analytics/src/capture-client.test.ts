import { describe, expect, it, vi } from "vitest"
import {
  captureAnalyticsEvent,
  setCaptureClient,
} from "./capture-client.js"

describe("captureAnalyticsEvent", () => {
  it("drops events while no client is registered", () => {
    setCaptureClient(null)
    expect(() =>
      captureAnalyticsEvent("search_results_shown", { result_count: 1 }),
    ).not.toThrow()
  })

  it("delegates to the registered client", () => {
    const capture = vi.fn()
    setCaptureClient(capture)
    try {
      captureAnalyticsEvent("search_result_opened", { result_index: 0 })
      expect(capture).toHaveBeenCalledWith("search_result_opened", {
        result_index: 0,
      })
    } finally {
      setCaptureClient(null)
    }
  })

  it("never throws when the registered client throws", () => {
    setCaptureClient(() => {
      throw new Error("posthog exploded")
    })
    try {
      expect(() =>
        captureAnalyticsEvent("search_no_click", { reason: "escape" }),
      ).not.toThrow()
    } finally {
      setCaptureClient(null)
    }
  })
})
