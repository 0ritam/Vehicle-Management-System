import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AuthProvider, useAuth } from "./useAuth"

// Mock the axios instance used inside useAuth
vi.mock("@/lib/api", () => ({
  default: {
    post: vi.fn(),
  },
}))

// Re-import to get the mocked version
import api from "@/lib/api"

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
)

describe("useAuth", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it("starts unauthenticated when no token in storage", () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current.isAuthenticated).toBe(false)
  })

  it("starts authenticated when a token already exists", () => {
    localStorage.setItem("access_token", "seed-token")
    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current.isAuthenticated).toBe(true)
  })

  it("persists tokens on login and flips isAuthenticated", async () => {
    vi.mocked(api.post).mockResolvedValueOnce({
      data: { access: "a-token", refresh: "r-token" },
    })

    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current.isAuthenticated).toBe(false)

    await act(async () => {
      await result.current.login("ritam", "pass")
    })

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true)
    })
    expect(localStorage.getItem("access_token")).toBe("a-token")
    expect(localStorage.getItem("refresh_token")).toBe("r-token")
  })

  it("clears tokens on logout", () => {
    localStorage.setItem("access_token", "seed")
    localStorage.setItem("refresh_token", "seed-r")

    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current.isAuthenticated).toBe(true)

    act(() => {
      result.current.logout()
    })

    expect(result.current.isAuthenticated).toBe(false)
    expect(localStorage.getItem("access_token")).toBeNull()
    expect(localStorage.getItem("refresh_token")).toBeNull()
  })

  it("throws when used outside AuthProvider", () => {
    // Suppress React's error logging for this intentional throw
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    expect(() => renderHook(() => useAuth())).toThrow(
      /must be used within AuthProvider/
    )
    spy.mockRestore()
  })
})
