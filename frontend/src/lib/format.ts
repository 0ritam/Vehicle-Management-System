import { format, parseISO } from "date-fns"

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatCurrency(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value
  return currencyFormatter.format(num)
}

export function formatDate(dateString: string): string {
  return format(parseISO(dateString), "dd MMM yyyy")
}

export function formatDateTime(dateString: string): string {
  return format(parseISO(dateString), "dd MMM yyyy, hh:mm a")
}
