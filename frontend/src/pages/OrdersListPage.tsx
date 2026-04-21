import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, Search, ClipboardList } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { IndustrialCard } from "@/components/industrial/IndustrialCard"
import { formatCurrency, formatDate } from "@/lib/format"
import { useDebounce } from "@/hooks/useDebounce"
import { useOrders } from "@/features/orders/api"
import type { OrderStatus } from "@/lib/types"

type StatusFilter = "ALL" | OrderStatus

const STATUS_LABEL: Record<StatusFilter, string> = {
  ALL: "All statuses",
  DRAFT: "Draft",
  QUOTED: "Quoted",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  PAID: "Paid",
  CANCELLED: "Cancelled",
}

export const STATUS_BADGE: Record<
  OrderStatus,
  { label: string; className: string }
> = {
  DRAFT: { label: "Draft", className: "bg-gray-200 text-gray-800" },
  QUOTED: { label: "Quoted", className: "bg-blue-100 text-blue-800" },
  IN_PROGRESS: {
    label: "In Progress",
    className: "bg-amber-100 text-amber-800",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-emerald-100 text-emerald-800",
  },
  PAID: { label: "Paid", className: "bg-green-600 text-white" },
  CANCELLED: { label: "Cancelled", className: "bg-red-100 text-red-800" },
}

export default function OrdersListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL")

  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading, isError, refetch } = useOrders({
    search: debouncedSearch || undefined,
    status: statusFilter === "ALL" ? undefined : statusFilter,
  })

  const orders = data?.results ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-mono text-xl font-bold uppercase tracking-[0.06em] text-foreground text-emboss">
            Service Orders
          </h1>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Active and historical service work
          </p>
        </div>
        <Button onClick={() => navigate("/orders/new")}>
          <Plus size={14} />
          New Order
        </Button>
      </div>

      <IndustrialCard className="p-4" hover={false}>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={14}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search by order #, registration, or owner…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          >
            <SelectTrigger className="h-10 w-full sm:w-52">
              <SelectValue>{STATUS_LABEL[statusFilter]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(STATUS_LABEL) as StatusFilter[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </IndustrialCard>

      <IndustrialCard className="p-0 overflow-hidden" hover={false}>
        <Table>
          <TableHeader>
            <TableRow className="bg-[var(--muted)]/50">
              <TableHead className="font-mono text-[10px] uppercase tracking-wider">
                Order #
              </TableHead>
              <TableHead className="font-mono text-[10px] uppercase tracking-wider">
                Vehicle
              </TableHead>
              <TableHead className="font-mono text-[10px] uppercase tracking-wider">
                Customer
              </TableHead>
              <TableHead className="font-mono text-[10px] uppercase tracking-wider">
                Status
              </TableHead>
              <TableHead className="font-mono text-[10px] uppercase tracking-wider">
                Total
              </TableHead>
              <TableHead className="font-mono text-[10px] uppercase tracking-wider">
                Created
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skel-${i}`}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center">
                  <p className="font-mono text-xs uppercase tracking-wider text-destructive">
                    Failed to load orders
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => refetch()}
                  >
                    Retry
                  </Button>
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center">
                  <ClipboardList
                    size={32}
                    className="mx-auto mb-3 text-muted-foreground/40"
                  />
                  <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    {debouncedSearch || statusFilter !== "ALL"
                      ? "No orders match your filters"
                      : "No orders yet"}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              orders.map((o) => {
                const badge = STATUS_BADGE[o.status]
                return (
                  <TableRow
                    key={o.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/orders/${o.id}`)}
                  >
                    <TableCell className="font-mono text-sm font-medium">
                      {o.order_number}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {o.vehicle.registration_number}
                    </TableCell>
                    <TableCell>{o.vehicle.owner_name}</TableCell>
                    <TableCell>
                      <Badge className={badge.className}>{badge.label}</Badge>
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatCurrency(o.total)}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {formatDate(o.created_at)}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </IndustrialCard>
    </div>
  )
}
