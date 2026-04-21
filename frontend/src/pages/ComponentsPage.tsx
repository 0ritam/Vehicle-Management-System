import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { isAxiosError } from "axios"
import { Plus, Search, Pencil, Power, PowerOff, Package } from "lucide-react"
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
import { formatCurrency } from "@/lib/format"
import { useDebounce } from "@/hooks/useDebounce"
import {
  useActivateComponent,
  useComponent,
  useComponents,
  useDeactivateComponent,
  type ComponentFilters,
} from "@/features/components/api"
import { ComponentForm } from "@/features/components/ComponentForm"

type TypeFilter = "ALL" | "NEW_PART" | "REPAIR_SERVICE"

const TYPE_LABEL: Record<TypeFilter, string> = {
  ALL: "All types",
  NEW_PART: "New Parts",
  REPAIR_SERVICE: "Repair Services",
}

export default function ComponentsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL")
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditingId(null)
      setFormOpen(true)
      searchParams.delete("new")
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const debouncedSearch = useDebounce(search, 300)

  const filters: ComponentFilters = {
    search: debouncedSearch || undefined,
    component_type: typeFilter === "ALL" ? undefined : typeFilter,
  }

  const { data, isLoading, isError, refetch } = useComponents(filters)
  const { data: editing } = useComponent(editingId)
  const deactivateMut = useDeactivateComponent()
  const activateMut = useActivateComponent()

  const components = data?.results ?? []

  const handleEdit = (id: number) => {
    setEditingId(id)
    setFormOpen(true)
  }

  const handleCreate = () => {
    setEditingId(null)
    setFormOpen(true)
  }

  const handleToggleActive = async (id: number, isActive: boolean) => {
    try {
      if (isActive) {
        await deactivateMut.mutateAsync(id)
        toast.success("Component deactivated")
      } else {
        await activateMut.mutateAsync(id)
        toast.success("Component activated")
      }
    } catch (err) {
      const msg =
        isAxiosError(err) && typeof err.response?.data === "object"
          ? JSON.stringify(err.response.data)
          : "Failed to update component"
      toast.error(msg)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-mono text-xl font-bold uppercase tracking-[0.06em] text-foreground text-emboss">
            Components
          </h1>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Parts inventory and repair services
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus size={14} />
          Add Component
        </Button>
      </div>

      {/* Filters */}
      <IndustrialCard className="p-4" hover={false}>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={14}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search by name or SKU…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={typeFilter}
            onValueChange={(v) => setTypeFilter(v as TypeFilter)}
          >
            <SelectTrigger className="h-10 w-full sm:w-52">
              <SelectValue>{TYPE_LABEL[typeFilter]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All types</SelectItem>
              <SelectItem value="NEW_PART">New Parts</SelectItem>
              <SelectItem value="REPAIR_SERVICE">Repair Services</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </IndustrialCard>

      {/* Table */}
      <IndustrialCard className="p-0 overflow-hidden" hover={false}>
        <Table>
          <TableHeader>
            <TableRow className="bg-[var(--muted)]/50">
              <TableHead className="font-mono text-[10px] uppercase tracking-wider">
                Name
              </TableHead>
              <TableHead className="font-mono text-[10px] uppercase tracking-wider">
                SKU
              </TableHead>
              <TableHead className="font-mono text-[10px] uppercase tracking-wider">
                Type
              </TableHead>
              <TableHead className="font-mono text-[10px] uppercase tracking-wider">
                Unit Price
              </TableHead>
              <TableHead className="font-mono text-[10px] uppercase tracking-wider">
                Stock
              </TableHead>
              <TableHead className="font-mono text-[10px] uppercase tracking-wider">
                Status
              </TableHead>
              <TableHead className="text-right font-mono text-[10px] uppercase tracking-wider">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center">
                  <p className="font-mono text-xs uppercase tracking-wider text-destructive">
                    Failed to load components
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
            ) : components.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-16 text-center">
                  <Package
                    size={32}
                    className="mx-auto mb-3 text-muted-foreground/40"
                  />
                  <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    {debouncedSearch || typeFilter !== "ALL"
                      ? "No components match your filters"
                      : "No components yet"}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              components.map((c) => (
                <TableRow key={c.id} className={!c.is_active ? "opacity-50" : ""}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {c.sku}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        c.component_type === "NEW_PART" ? "secondary" : "outline"
                      }
                    >
                      {c.component_type === "NEW_PART" ? "New Part" : "Repair"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono">
                    {formatCurrency(c.unit_price)}
                  </TableCell>
                  <TableCell>
                    {c.component_type === "NEW_PART" ? (
                      <span
                        className={
                          c.stock_quantity === 0
                            ? "font-mono text-xs text-destructive"
                            : "font-mono text-xs"
                        }
                      >
                        {c.stock_quantity}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {c.is_active ? (
                      <Badge variant="outline" className="border-green-600/30 text-green-700">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleEdit(c.id)}
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleToggleActive(c.id, c.is_active)}
                        title={c.is_active ? "Deactivate" : "Activate"}
                      >
                        {c.is_active ? (
                          <PowerOff size={14} />
                        ) : (
                          <Power size={14} />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </IndustrialCard>

      <ComponentForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditingId(null)
        }}
        component={editingId ? editing : null}
      />
    </div>
  )
}
