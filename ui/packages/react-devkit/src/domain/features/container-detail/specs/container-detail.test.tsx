import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { ContainerDetail } from "../container-detail"
import { ContainerDetailPlaceholder } from "../container-detail-placeholder"

const TABS = [
  { key: "home", label: "Home" },
  { key: "pdu", label: "PDU Layout" },
  { key: "charts", label: "Charts" },
]

describe("containerDetail", () => {
  it("renders the name and every tab in the strip", () => {
    render(
      <ContainerDetail name="Container 2a" tabs={TABS} activeTab="home" onTabChange={vi.fn()} onBack={vi.fn()}>
        <div>body</div>
      </ContainerDetail>,
    )
    expect(screen.getByText("Container 2a")).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Home" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "PDU Layout" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Charts" })).toBeInTheDocument()
    expect(screen.getByText("body")).toBeInTheDocument()
  })

  it("marks the active tab as selected", () => {
    render(
      <ContainerDetail name="c" tabs={TABS} activeTab="pdu" onTabChange={vi.fn()} onBack={vi.fn()} />,
    )
    expect(screen.getByRole("tab", { name: "PDU Layout" })).toHaveAttribute("aria-selected", "true")
  })

  it("fires onTabChange when another tab is clicked", () => {
    const onTabChange = vi.fn()
    render(
      <ContainerDetail name="c" tabs={TABS} activeTab="home" onTabChange={onTabChange} onBack={vi.fn()} />,
    )
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Charts" }))
    expect(onTabChange).toHaveBeenCalledWith("charts")
  })

  it("fires onBack when the back link is clicked", () => {
    const onBack = vi.fn()
    render(
      <ContainerDetail
        name="c"
        tabs={TABS}
        activeTab="home"
        onTabChange={vi.fn()}
        onBack={onBack}
        backLabel="Explorer"
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: /Explorer/ }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it("shows an empty state when there are no tabs", () => {
    render(<ContainerDetail name="c" tabs={[]} activeTab="" onTabChange={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByText("This container type has no detail tabs.")).toBeInTheDocument()
    expect(screen.queryByRole("tab")).not.toBeInTheDocument()
  })
})

describe("containerDetailPlaceholder", () => {
  it("renders a coming-soon message for its tab", () => {
    render(<ContainerDetailPlaceholder label="PDU Layout" />)
    expect(screen.getByText("PDU Layout — coming soon")).toBeInTheDocument()
  })
})
