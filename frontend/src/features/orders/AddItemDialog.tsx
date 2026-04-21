import { useEffect, useState } from "react"
import { toast } from "sonner"
import { isAxiosError } from "axios"
import {
  Search,
  AlertCircle,
  Package,
  Wrench,
  TrendingDown,
  Minus,
  Plus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatCurrency } from "@/lib/format"
import { useDebounce } from "@/hooks/useDebounce"
import { useComponents } from "@/features/components/api"
import { useAddItem, useCompareOptions } from "./api"
import type { ComponentListItem, CompareOption } from "@/lib/types"

type Step = "pick" | "compare" | "quantity"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: number
}

type TypeFilter = "ALL" | "NEW_PART" | "REPAIR_SERVICE"

export function AddItemDialog({ open, onOpenChange, orderId }: Props) {
  const [step, setStep] = useState<Step>("pick")
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL")
  const [picked, setPicked] = useState<ComponentListItem | null>(null)
  const [chosenId, setChosenId] = useState<number | null>(null)
  const [quantity, setQuantity] = useState(1)

  const debouncedSearch = useDebounce(search, 300)
  const componentsQuery = useComponents({
    search: debouncedSearch || undefined,
    component_type: typeFilter === "ALL" ? undefined : typeFilter,
    is_active: true,
  })
  const compareQuery = useCompareOptions(orderId, picked?.id ?? null)
  const addMut = useAddItem(orderId)

  const components = componentsQuery.data?.results ?? []

  useEffect(() => {
    if (!open) {
      setStep("pick")
      setSearch("")
      setTypeFilter("ALL")
      setPicked(null)
      setChosenId(null)
      setQuantity(1)
    }
  }, [open])

  const handlePick = (c: ComponentListItem) => {
    setPicked(c)
    setChosenId(c.id)
    setStep("compare")
  }

  const handleChoose = (id: number) => {
    setChosenId(id)
    setStep("quantity")
  }

  const handleSkipCompare = () => {
    setStep("quantity")
  }

  const handleConfirm = async () => {
    if (chosenId === null) return
    try {
      await addMut.mutateAsync({ component_id: chosenId, quantity })
      toast.success("Item added to order")
      onOpenChange(false)
    } catch (err) {
      const msg =
        isAxiosError(err) && typeof err.response?.data === "object"
          ? JSON.stringify(err.response.data)
          : "Failed to add item"
      toast.error(msg)
    }
  }

  // Compare step: decide what to show based on query result
  const hasComparison =
    compareQuery.isSuccess && compareQuery.data !== undefined
  const compareFailed = compareQuery.isError
  const isNewPartOOS =
    picked?.component_type === "NEW_PART" && picked.stock_quantity === 0

  const chosenComponent: ComponentListItem | CompareOption | null =
    chosenId === null
      ? null
      : hasComparison && compareQuery.data
        ? compareQuery.data.new_part.id === chosenId
          ? compareQuery.data.new_part
          : compareQuery.data.repair_service
        : picked

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-mono uppercase tracking-wider">
            Add Item
            <span className="ml-3 font-mono text-[10px] font-normal text-muted-foreground">
              Step{" "}
              {step === "pick" ? "1" : step === "compare" ? "2" : "3"}{" "}
              of 3
            </span>
          </DialogTitle>
        </DialogHeader>

        {step === "pick" && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search
                  size={14}
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  placeholder="Search components…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                  className="pl-9"
                />
              </div>
              <Select
                value={typeFilter}
                onValueChange={(v) => setTypeFilter(v as TypeFilter)}
              >
                <SelectTrigger className="h-10 w-44">
                  <SelectValue>
                    {typeFilter === "ALL"
                      ? "All types"
                      : typeFilter === "NEW_PART"
                        ? "New Parts"
                        : "Repair Services"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All types</SelectItem>
                  <SelectItem value="NEW_PART">New Parts</SelectItem>
                  <SelectItem value="REPAIR_SERVICE">
                    Repair Services
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="max-h-96 space-y-1 overflow-y-auto">
              {componentsQuery.isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))
              ) : components.length === 0 ? (
                <p className="py-8 text-center font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  No components found
                </p>
              ) : (
                components.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handlePick(c)}
                    className="flex w-full items-center justify-between rounded-md border border-transparent p-3 text-left transition-all hover:border-industrial-border hover:bg-[var(--muted)]/50"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{c.name}</p>
                        <Badge
                          variant={
                            c.component_type === "NEW_PART"
                              ? "secondary"
                              : "outline"
                          }
                          className="text-[10px]"
                        >
                          {c.component_type === "NEW_PART"
                            ? "New Part"
                            : "Repair"}
                        </Badge>
                        {c.component_type === "NEW_PART" &&
                          c.stock_quantity === 0 && (
                            <Badge className="bg-red-100 text-[10px] text-red-800">
                              Out of stock
                            </Badge>
                          )}
                      </div>
                      <p className="font-mono text-xs text-muted-foreground">
                        {c.sku}
                      </p>
                    </div>
                    <p className="font-mono text-sm font-medium">
                      {formatCurrency(c.unit_price)}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {step === "compare" && picked && (
          <div className="space-y-4">
            {compareQuery.isLoading && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
            )}

            {compareFailed && (
              <>
                <div className="rounded-md border border-industrial-border bg-[var(--muted)]/30 p-4">
                  <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    No repair alternative linked for this component. Proceed
                    with the selected option.
                  </p>
                </div>
                <SelectedSummary component={picked} />
              </>
            )}

            {hasComparison && compareQuery.data && (
              <>
                {isNewPartOOS && (
                  <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-50 p-3 text-amber-900">
                    <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider">
                        Out of stock
                      </p>
                      <p className="text-xs">
                        The new part isn't in stock. The repair service is
                        recommended and highlighted below.
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <OptionCard
                    option={compareQuery.data.new_part}
                    icon={<Package size={16} />}
                    label="New Part"
                    onChoose={() => handleChoose(compareQuery.data!.new_part.id)}
                    dimmed={isNewPartOOS}
                    disabled={
                      compareQuery.data.new_part.stock_quantity === 0
                    }
                  />
                  <OptionCard
                    option={compareQuery.data.repair_service}
                    icon={<Wrench size={16} />}
                    label="Repair Service"
                    onChoose={() =>
                      handleChoose(compareQuery.data!.repair_service.id)
                    }
                    highlighted={isNewPartOOS}
                  />
                </div>

                {parseFloat(compareQuery.data.savings_amount) > 0 && (
                  <div className="flex items-center justify-center gap-2 rounded-md bg-emerald-50 p-3 text-emerald-800 shadow-recessed">
                    <TrendingDown size={16} />
                    <p className="font-mono text-xs uppercase tracking-wider">
                      Save{" "}
                      <span className="font-bold">
                        {formatCurrency(compareQuery.data.savings_amount)}
                      </span>{" "}
                      ({compareQuery.data.savings_percent}%) with the repair
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {step === "quantity" && chosenComponent && (
          <div className="space-y-4">
            <div className="rounded-md bg-[var(--muted)]/50 p-4 shadow-recessed">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Selected
              </p>
              <p className="mt-1 font-medium">{chosenComponent.name}</p>
              <div className="mt-2 flex items-center justify-between">
                <p className="font-mono text-xs text-muted-foreground">
                  {chosenComponent.sku}
                </p>
                <p className="font-mono text-sm font-medium">
                  {formatCurrency(chosenComponent.unit_price)} each
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-foreground">
                Quantity
              </label>
              <div className="mt-2 flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus size={14} />
                </Button>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10)
                    if (!Number.isNaN(v) && v >= 1) setQuantity(v)
                  }}
                  className="w-24 text-center font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setQuantity((q) => q + 1)}
                >
                  <Plus size={14} />
                </Button>
                <span className="ml-auto font-mono text-sm">
                  Line total:{" "}
                  <span className="font-bold">
                    {formatCurrency(
                      parseFloat(chosenComponent.unit_price) * quantity
                    )}
                  </span>
                </span>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "pick" && (
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          )}
          {step === "compare" && (
            <>
              <Button variant="ghost" onClick={() => setStep("pick")}>
                Back
              </Button>
              {compareFailed && (
                <Button onClick={handleSkipCompare}>Continue</Button>
              )}
            </>
          )}
          {step === "quantity" && (
            <>
              <Button
                variant="ghost"
                onClick={() => setStep(hasComparison ? "compare" : "pick")}
                disabled={addMut.isPending}
              >
                Back
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={addMut.isPending || quantity < 1}
              >
                {addMut.isPending ? "Adding..." : "Add to Order"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function OptionCard({
  option,
  icon,
  label,
  onChoose,
  highlighted,
  dimmed,
  disabled,
}: {
  option: CompareOption
  icon: React.ReactNode
  label: string
  onChoose: () => void
  highlighted?: boolean
  dimmed?: boolean
  disabled?: boolean
}) {
  return (
    <div
      className={
        "flex flex-col rounded-md border p-4 transition-all " +
        (highlighted
          ? "border-[var(--primary)] bg-[var(--primary)]/5 shadow-card"
          : "border-industrial-border bg-chassis") +
        (dimmed ? " opacity-60" : "")
      }
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-foreground/5">
          {icon}
        </div>
        <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
      </div>
      <p className="font-medium">{option.name}</p>
      <p className="font-mono text-xs text-muted-foreground">{option.sku}</p>
      <p className="mt-3 font-mono text-xl font-bold">
        {formatCurrency(option.unit_price)}
      </p>
      <div className="mt-1 flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>Labor: {option.labor_hours}h</span>
        {option.component_type === "NEW_PART" && (
          <span
            className={
              option.stock_quantity === 0 ? "text-destructive" : undefined
            }
          >
            Stock: {option.stock_quantity}
          </span>
        )}
      </div>
      <Button
        className="mt-4"
        variant={highlighted ? "default" : "outline"}
        onClick={onChoose}
        disabled={disabled}
      >
        {disabled ? "Unavailable" : "Choose This"}
      </Button>
    </div>
  )
}

function SelectedSummary({ component }: { component: ComponentListItem }) {
  return (
    <div className="rounded-md bg-[var(--muted)]/50 p-4 shadow-recessed">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        Selected
      </p>
      <p className="mt-1 font-medium">{component.name}</p>
      <div className="mt-2 flex items-center justify-between">
        <p className="font-mono text-xs text-muted-foreground">
          {component.sku}
        </p>
        <p className="font-mono text-sm font-medium">
          {formatCurrency(component.unit_price)} each
        </p>
      </div>
    </div>
  )
}
