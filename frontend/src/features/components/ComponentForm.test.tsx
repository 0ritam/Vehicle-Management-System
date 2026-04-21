import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest"

// Mock axios instance BEFORE importing ComponentForm
vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn().mockResolvedValue({
      data: { count: 0, next: null, previous: null, results: [] },
    }),
    post: vi.fn(),
    patch: vi.fn(),
  },
}))

// Mock sonner so we don't try to render a Toaster
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

// Silence the act() warnings from base-ui popovers running outside interactive state
const origError = console.error
beforeEach(() => {
  console.error = (...args: unknown[]) => {
    const msg = String(args[0] ?? "")
    if (msg.includes("not wrapped in act") || msg.includes("base-ui")) return
    origError(...args)
  }
})
afterAll(() => {
  console.error = origError
})

import { ComponentForm } from "./ComponentForm"

function renderForm() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return render(
    <ComponentForm open={true} onOpenChange={vi.fn()} component={null} />,
    { wrapper: Wrapper }
  )
}

describe("ComponentForm validation", () => {
  it("shows an error when name is empty", async () => {
    const user = userEvent.setup()
    renderForm()

    const createBtn = await screen.findByRole("button", { name: /create/i })
    await user.click(createBtn)

    await waitFor(() => {
      expect(screen.getByText("Name is required")).toBeInTheDocument()
    })
  })

  it("rejects non-numeric unit_price", async () => {
    const user = userEvent.setup()
    renderForm()

    const priceInput = await screen.findByLabelText(/unit price/i)
    await user.clear(priceInput)
    await user.type(priceInput, "abc")

    const createBtn = screen.getByRole("button", { name: /create/i })
    await user.click(createBtn)

    await waitFor(() => {
      expect(
        screen.getByText(/valid price \(up to 2 decimals\)/i)
      ).toBeInTheDocument()
    })
  })

  it("rejects SKU containing invalid characters", async () => {
    const user = userEvent.setup()
    renderForm()

    const skuInput = await screen.findByLabelText(/^sku$/i)
    await user.clear(skuInput)
    await user.type(skuInput, "bad sku!")

    const createBtn = screen.getByRole("button", { name: /create/i })
    await user.click(createBtn)

    await waitFor(() => {
      expect(
        screen.getByText(/letters, numbers, and hyphens/i)
      ).toBeInTheDocument()
    })
  })
})
