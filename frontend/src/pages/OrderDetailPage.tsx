import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import { isAxiosError } from "axios"
import {
  ArrowLeft,
  Plus,
  Trash2,
  FileCheck,
  PlayCircle,
  CheckCircle2,
  XCircle,
  CreditCard,
  Download,
  Wrench,
  Package,
} from "lucide-react"
import { Button } from "@/components/ui/button"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { IndustrialCard } from "@/components/industrial/IndustrialCard"
import { formatCurrency, formatDateTime } from "@/lib/format"
import api from "@/lib/api"
import {
  ORDER_STATUS_TRANSITIONS,
  useOrder,
  useRemoveItem,
  useTransitionOrder,
  useUpdateOrder,
} from "@/features/orders/api"
import { AddItemDialog } from "@/features/orders/AddItemDialog"
import { PayDialog } from "@/features/orders/PayDialog"
import { STATUS_BADGE } from "@/pages/OrdersListPage"
import type { OrderStatus } from "@/lib/types"

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const orderId = id ? Number(id) : NaN

  const { data: order, isLoading, isError } = useOrder(
    Number.isNaN(orderId) ? null : orderId
  )
  const transitionMut = useTransitionOrder(orderId)
  const updateMut = useUpdateOrder(orderId)
  const removeMut = useRemoveItem(orderId)

  const [addItemOpen, setAddItemOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [removingItemId, setRemovingItemId] = useState<number | null>(null)
  const [discountInput, setDiscountInput] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  if (isError || !order) {
    return (
      <IndustrialCard className="p-12 text-center">
        <p className="font-mono text-sm uppercase tracking-wider text-destructive">
          Failed to load order
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate("/orders")}
        >
          Back to Orders
        </Button>
      </IndustrialCard>
    )
  }

  const allowedTransitions = ORDER_STATUS_TRANSITIONS[order.status]
  const canEditItems = ["DRAFT", "QUOTED", "IN_PROGRESS"].includes(order.status)
  const canEditTotals = order.status === "DRAFT"
  const canDownloadInvoice = ["COMPLETED", "PAID"].includes(order.status)
  const badge = STATUS_BADGE[order.status]

  const handleTransition = async (newStatus: OrderStatus) => {
    try {
      await transitionMut.mutateAsync(newStatus)
      toast.success(`Status updated to ${newStatus.replace("_", " ")}`)
      if (newStatus === "CANCELLED") setCancelOpen(false)
    } catch (err) {
      const msg =
        isAxiosError(err) && typeof err.response?.data === "object"
          ? (err.response.data as { detail?: string }).detail ??
            JSON.stringify(err.response.data)
          : "Failed to update status"
      toast.error(msg)
    }
  }

  const handleRemoveItem = async () => {
    if (removingItemId === null) return
    try {
      await removeMut.mutateAsync(removingItemId)
      toast.success("Item removed")
      setRemovingItemId(null)
    } catch {
      toast.error("Failed to remove item")
    }
  }

  const handleDiscountSave = async () => {
    if (discountInput === null) return
    if (!/^\d+(\.\d{1,2})?$/.test(discountInput)) {
      toast.error("Enter a valid amount (up to 2 decimals)")
      return
    }
    try {
      await updateMut.mutateAsync({ discount_amount: discountInput })
      toast.success("Discount updated")
      setDiscountInput(null)
    } catch {
      toast.error("Failed to update discount")
    }
  }

  const handleDownloadInvoice = async () => {
    try {
      const res = await api.get(
        `/service-orders/${orderId}/invoice.pdf/`,
        { responseType: "blob" }
      )
      const url = URL.createObjectURL(res.data as Blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `Invoice-${order.order_number}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 501) {
        toast.error("Invoice generation arrives in Phase 6")
      } else {
        toast.error("Failed to download invoice")
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigate("/orders")}
            title="Back"
            className="mt-1"
          >
            <ArrowLeft size={16} />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-mono text-xl font-bold uppercase tracking-[0.06em] text-foreground text-emboss">
                {order.order_number}
              </h1>
              <Badge className={badge.className}>{badge.label}</Badge>
            </div>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Created {formatDateTime(order.created_at)}
              {order.completed_at &&
                ` · Completed ${formatDateTime(order.completed_at)}`}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {allowedTransitions.includes("QUOTED") && (
            <Button
              variant="outline"
              onClick={() => handleTransition("QUOTED")}
              disabled={transitionMut.isPending || order.items.length === 0}
              title={
                order.items.length === 0
                  ? "Add items before quoting"
                  : undefined
              }
            >
              <FileCheck size={14} />
              Send Quote
            </Button>
          )}
          {allowedTransitions.includes("IN_PROGRESS") && (
            <Button
              variant="outline"
              onClick={() => handleTransition("IN_PROGRESS")}
              disabled={transitionMut.isPending}
            >
              <PlayCircle size={14} />
              Start Work
            </Button>
          )}
          {allowedTransitions.includes("COMPLETED") && (
            <Button
              variant="outline"
              onClick={() => handleTransition("COMPLETED")}
              disabled={transitionMut.isPending}
            >
              <CheckCircle2 size={14} />
              Mark Complete
            </Button>
          )}
          {allowedTransitions.includes("PAID") && (
            <Button onClick={() => setPayOpen(true)}>
              <CreditCard size={14} />
              Record Payment
            </Button>
          )}
          {allowedTransitions.includes("CANCELLED") && (
            <Button variant="ghost" onClick={() => setCancelOpen(true)}>
              <XCircle size={14} />
              Cancel
            </Button>
          )}
          {canDownloadInvoice && (
            <Button variant="outline" onClick={handleDownloadInvoice}>
              <Download size={14} />
              Download Invoice
            </Button>
          )}
        </div>
      </div>

      {/* Vehicle + Issue + Payment cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <IndustrialCard className="p-5" hover={false}>
          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Vehicle
          </p>
          <p className="mt-2 font-mono text-sm font-medium">
            {order.vehicle.registration_number}
          </p>
          <p className="text-xs text-muted-foreground">
            {order.vehicle.make} {order.vehicle.model} · {order.vehicle.year}
          </p>
        </IndustrialCard>
        <IndustrialCard className="p-5" hover={false}>
          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Customer
          </p>
          <p className="mt-2 font-medium">{order.vehicle.owner_name}</p>
          <p className="font-mono text-xs text-muted-foreground">
            {order.vehicle.owner_contact}
          </p>
        </IndustrialCard>
        {order.payment ? (
          <IndustrialCard className="p-5" hover={false}>
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              Payment Received
            </p>
            <p className="mt-2 font-mono text-sm font-medium">
              {formatCurrency(order.payment.amount)} · {order.payment.method}
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              {order.payment.reference}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {formatDateTime(order.payment.paid_at)}
            </p>
          </IndustrialCard>
        ) : (
          <IndustrialCard className="p-5" hover={false}>
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Labor Rate
            </p>
            <p className="mt-2 font-mono text-sm font-medium">
              {formatCurrency(order.labor_rate)} / hour
            </p>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Tax: {order.tax_rate}%
            </p>
          </IndustrialCard>
        )}
      </div>

      {/* Main two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Items + Issue */}
        <div className="space-y-4 lg:col-span-2">
          <IndustrialCard className="p-5" hover={false}>
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Issue Description
            </p>
            <p className="mt-2 whitespace-pre-line text-sm">
              {order.issue_description || (
                <span className="italic text-muted-foreground">
                  No description provided
                </span>
              )}
            </p>
          </IndustrialCard>

          <IndustrialCard className="p-0 overflow-hidden" hover={false}>
            <div className="flex items-center justify-between border-b border-industrial-border p-4">
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider">
                Line Items ({order.items.length})
              </h3>
              {canEditItems && (
                <Button size="sm" onClick={() => setAddItemOpen(true)}>
                  <Plus size={12} />
                  Add Item
                </Button>
              )}
            </div>

            {order.items.length === 0 ? (
              <div className="p-10 text-center">
                <Package
                  size={28}
                  className="mx-auto mb-3 text-muted-foreground/40"
                />
                <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  No items on this order yet
                </p>
                {canEditItems && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-4"
                    onClick={() => setAddItemOpen(true)}
                  >
                    Add the first item
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-[var(--muted)]/50">
                    <TableHead className="font-mono text-[10px] uppercase tracking-wider">
                      Component
                    </TableHead>
                    <TableHead className="font-mono text-[10px] uppercase tracking-wider">
                      Type
                    </TableHead>
                    <TableHead className="text-right font-mono text-[10px] uppercase tracking-wider">
                      Qty
                    </TableHead>
                    <TableHead className="text-right font-mono text-[10px] uppercase tracking-wider">
                      Unit Price
                    </TableHead>
                    <TableHead className="text-right font-mono text-[10px] uppercase tracking-wider">
                      Line Total
                    </TableHead>
                    {canEditItems && <TableHead className="w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {item.item_type === "NEW" ? (
                            <Package size={14} className="text-muted-foreground" />
                          ) : (
                            <Wrench size={14} className="text-muted-foreground" />
                          )}
                          <div>
                            <p className="font-medium">{item.component.name}</p>
                            <p className="font-mono text-[10px] text-muted-foreground">
                              {item.component.sku}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            item.item_type === "NEW" ? "secondary" : "outline"
                          }
                          className="text-[10px]"
                        >
                          {item.item_type === "NEW" ? "New Part" : "Repair"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(item.unit_price_snapshot)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {formatCurrency(item.line_total)}
                      </TableCell>
                      {canEditItems && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setRemovingItemId(item.id)}
                            title="Remove"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </IndustrialCard>
        </div>

        {/* Totals panel */}
        <IndustrialCard className="h-fit p-5" hover={false}>
          <h3 className="mb-4 font-mono text-xs font-bold uppercase tracking-wider">
            Totals
          </h3>
          <dl className="space-y-3">
            <div className="flex justify-between font-mono text-sm">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{formatCurrency(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between font-mono text-sm">
              <dt className="text-muted-foreground">
                Tax ({order.tax_rate}%)
              </dt>
              <dd>{formatCurrency(order.tax_amount)}</dd>
            </div>
            <div className="flex justify-between font-mono text-sm">
              <dt className="text-muted-foreground">Discount</dt>
              <dd>
                {canEditTotals && discountInput === null ? (
                  <button
                    type="button"
                    className="underline decoration-dotted underline-offset-2 hover:text-[var(--primary)]"
                    onClick={() => setDiscountInput(order.discount_amount)}
                  >
                    {formatCurrency(order.discount_amount)}
                  </button>
                ) : canEditTotals && discountInput !== null ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={discountInput}
                      onChange={(e) => setDiscountInput(e.target.value)}
                      className="h-7 w-24 text-right font-mono text-xs"
                      autoFocus
                    />
                    <Button
                      size="xs"
                      onClick={handleDiscountSave}
                      disabled={updateMut.isPending}
                    >
                      Save
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => setDiscountInput(null)}
                    >
                      ×
                    </Button>
                  </div>
                ) : (
                  <span>−{formatCurrency(order.discount_amount)}</span>
                )}
              </dd>
            </div>
            <div className="border-t border-industrial-border pt-3">
              <div className="flex items-end justify-between">
                <dt className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  Total
                </dt>
                <dd className="font-mono text-2xl font-bold">
                  {formatCurrency(order.total)}
                </dd>
              </div>
            </div>
          </dl>

          {canEditTotals && (
            <div className="mt-5 space-y-2">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Labor Rate (₹/hour)
              </Label>
              <div className="flex items-center gap-1">
                <Input
                  defaultValue={order.labor_rate}
                  onBlur={async (e) => {
                    const v = e.target.value
                    if (v !== order.labor_rate && /^\d+(\.\d{1,2})?$/.test(v)) {
                      try {
                        await updateMut.mutateAsync({ labor_rate: v })
                        toast.success("Labor rate updated")
                      } catch {
                        toast.error("Failed to update labor rate")
                      }
                    }
                  }}
                  className="h-8 font-mono text-xs"
                />
              </div>
            </div>
          )}
        </IndustrialCard>
      </div>

      {/* Dialogs */}
      <AddItemDialog
        open={addItemOpen}
        onOpenChange={setAddItemOpen}
        orderId={orderId}
      />
      <PayDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        orderId={orderId}
        total={order.total}
      />
      <Dialog
        open={removingItemId !== null}
        onOpenChange={(o) => !o && setRemovingItemId(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remove item?</DialogTitle>
            <DialogDescription>
              The item will be removed and totals will recalculate.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setRemovingItemId(null)}
              disabled={removeMut.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveItem}
              disabled={removeMut.isPending}
            >
              {removeMut.isPending ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel this order?</DialogTitle>
            <DialogDescription>
              The order will move to CANCELLED and become read-only.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setCancelOpen(false)}
              disabled={transitionMut.isPending}
            >
              Keep Order
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleTransition("CANCELLED")}
              disabled={transitionMut.isPending}
            >
              {transitionMut.isPending ? "Cancelling..." : "Cancel Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
