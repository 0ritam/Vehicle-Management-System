import { describe, expect, it } from "vitest"
import { formatCurrency, formatDate } from "./format"

describe("formatCurrency", () => {
  it("formats small amounts in INR", () => {
    expect(formatCurrency("100")).toMatch(/₹\s?100\.00/)
  })

  it("formats zero", () => {
    expect(formatCurrency("0")).toMatch(/₹\s?0\.00/)
    expect(formatCurrency(0)).toMatch(/₹\s?0\.00/)
  })

  it("uses Indian lakh/crore grouping", () => {
    const out = formatCurrency("100000")
    // 1,00,000 (Indian grouping), not 100,000
    expect(out).toContain("1,00,000")
  })

  it("formats lakh-scale amounts correctly", () => {
    const out = formatCurrency("2534157.20")
    expect(out).toContain("25,34,157.20")
  })

  it("accepts string decimals with two-decimal precision", () => {
    expect(formatCurrency("1234.50")).toContain("1,234.50")
  })

  it("preserves exactly two decimals on whole numbers", () => {
    expect(formatCurrency(500)).toMatch(/500\.00/)
  })
})

describe("formatDate", () => {
  it("formats an ISO date string", () => {
    expect(formatDate("2026-04-21T12:00:00+05:30")).toBe("21 Apr 2026")
  })
})
