// @vitest-environment jsdom
import { render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { setCaptureClient } from "./capture-client.js"
import { useAnalyticsCapture } from "./use-analytics-capture.js"

describe("useAnalyticsCapture", () => {
  it("returns a stable function that delegates to the registered client", () => {
    const capture = vi.fn()
    setCaptureClient(capture)
    const seen: ReturnType<typeof useAnalyticsCapture>[] = []
    function Probe() {
      seen.push(useAnalyticsCapture())
      return null
    }
    try {
      const { rerender } = render(<Probe />)
      rerender(<Probe />)
      expect(seen).toHaveLength(2)
      expect(seen[0]).toBe(seen[1])
      seen[0]("search_results_shown", { result_count: 2 })
      expect(capture).toHaveBeenCalledWith("search_results_shown", {
        result_count: 2,
      })
    } finally {
      setCaptureClient(null)
    }
  })

  it("drops events while no client is registered", () => {
    setCaptureClient(null)
    let capture: ReturnType<typeof useAnalyticsCapture> | null = null
    function Probe() {
      capture = useAnalyticsCapture()
      return null
    }
    render(<Probe />)
    expect(() => capture?.("search_no_click", {})).not.toThrow()
  })
})
