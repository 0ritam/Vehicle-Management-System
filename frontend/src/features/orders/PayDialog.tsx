import { useEffect, useState } from "react"
import { toast } from "sonner"
import { isAxiosError } from "axios"
import { CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { formatCurrency } from "@/lib/format"
import { usePayOrder } from "./api"

const METHODS = ["CASH", "CARD", "UPI", "SIMULATED"] as const
type Method = (typeof METHODS)[number]

const METHOD_LABEL: Record<Method, string> = {
  CASH: "Cash",
  CARD: "Card",
  UPI: "UPI",
  SIMULATED: "Simulated",
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: number
  total: string
}

export function PayDialog({ open, onOpenChange, orderId, total }: Props) {
  const [method, setMethod] = useState<Method>("SIMULATED")
  const payMut = usePayOrder(orderId)

  useEffect(() => {
    if (open) setMethod("SIMULATED")
  }, [open])

  const handleConfirm = async () => {
    try {
      await payMut.mutateAsync(method)
      toast.success("Payment recorded")
      onOpenChange(false)
    } catch (err) {
      const msg =
        isAxiosError(err) && typeof err.response?.data === "object"
          ? JSON.stringify(err.response.data)
          : "Failed to record payment"
      toast.error(msg)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono uppercase tracking-wider">
            Record Payment
          </DialogTitle>
          <DialogDescription>
            Payments are recorded without a real gateway. A reference ID is
            generated automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md bg-[var(--muted)]/50 p-4 text-center shadow-recessed">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Amount Due
            </p>
            <p className="mt-1 font-mono text-3xl font-bold">
              {formatCurrency(total)}
            </p>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider">
              Payment Method
            </Label>
            <Select value={method} onValueChange={(v) => setMethod(v as Method)}>
              <SelectTrigger className="mt-2 h-10 w-full">
                <SelectValue>{METHOD_LABEL[method]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {METHOD_LABEL[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={payMut.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={payMut.isPending}>
            <CreditCard size={14} />
            {payMut.isPending ? "Processing..." : "Record Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
