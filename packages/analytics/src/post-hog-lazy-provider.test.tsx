// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { LazyPostHogProvider } from "./post-hog-lazy-provider.js"

vi.mock("./post-hog-init.js", () => ({
  PostHogInit: vi.fn(
    (properties: { apiKey: string; user?: { distinctId: string } }) => (
      <div
        data-testid="posthog-init"
        data-api-key={properties.apiKey}
        data-distinct-id={properties.user?.distinctId ?? ""}
      />
    ),
  ),
}))

async function loadInitModule() {
  return import("./post-hog-init.js")
}

describe("LazyPostHogProvider", () => {
  it("renders null without fetching the init chunk when disabled", async () => {
    const { container } = render(
      <LazyPostHogProvider enabled={false} apiKey="phc_key" />,
    )
    expect(container.innerHTML).toBe("")
    const initModule = await loadInitModule()
    expect(initModule.PostHogInit).not.toHaveBeenCalled()
  })

  it("renders null without a key", () => {
    const { container } = render(<LazyPostHogProvider enabled={true} />)
    expect(container.innerHTML).toBe("")
  })

  it("loads the initialized tree with props when enabled", async () => {
    render(
      <LazyPostHogProvider
        enabled={true}
        apiKey="phc_key"
        options={{ api_host: "/ph" }}
        user={{ distinctId: "user-1" }}
      />,
    )
    const init = await screen.findByTestId("posthog-init")
    expect(init.getAttribute("data-api-key")).toBe("phc_key")
    expect(init.getAttribute("data-distinct-id")).toBe("user-1")
  })
})
