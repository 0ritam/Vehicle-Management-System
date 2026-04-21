import { useState } from "react"
import { toast } from "sonner"
import { isAxiosError } from "axios"
import { Plus, Search, Pencil, Trash2, Car } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { IndustrialCard } from "@/components/industrial/IndustrialCard"
import { useDebounce } from "@/hooks/useDebounce"
import {
  useDeleteVehicle,
  useVehicle,
  useVehicles,
} from "@/features/vehicles/api"
import { VehicleForm } from "@/features/vehicles/VehicleForm"

export default function VehiclesPage() {
  const [search, setSearch] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading, isError, refetch } = useVehicles({
    search: debouncedSearch || undefined,
  })
  const { data: editing } = useVehicle(editingId)
  const deleteMut = useDeleteVehicle()

  const vehicles = data?.results ?? []
  const deletingVehicle = vehicles.find((v) => v.id === deletingId) ?? null

  const handleEdit = (id: number) => {
    setEditingId(id)
    setFormOpen(true)
  }

  const handleCreate = () => {
    setEditingId(null)
    setFormOpen(true)
  }

  const confirmDelete = async () => {
    if (deletingId === null) return
    try {
      await deleteMut.mutateAsync(deletingId)
      toast.success("Vehicle deleted")
      setDeletingId(null)
    } catch (err) {
      const msg =
        isAxiosError(err) && typeof err.response?.data === "object"
          ? JSON.stringify(err.response.data)
          : "Failed to delete vehicle. It may have associated orders."
      toast.error(msg)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-mono text-xl font-bold uppercase tracking-[0.06em] text-foreground text-emboss">
            Vehicles
          </h1>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Customer fleet and registrations
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus size={14} />
          Add Vehicle
        </Button>
      </div>

      {/* Search */}
      <IndustrialCard className="p-4" hover={false}>
        <div className="relative">
          <Search
            size={14}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search by registration or owner…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </IndustrialCard>

      {/* Table */}
      <IndustrialCard className="p-0 overflow-hidden" hover={false}>
        <Table>
          <TableHeader>
            <TableRow className="bg-[var(--muted)]/50">
              <TableHead className="font-mono text-[10px] uppercase tracking-wider">
                Registration
              </TableHead>
              <TableHead className="font-mono text-[10px] uppercase tracking-wider">
                Make / Model
              </TableHead>
              <TableHead className="font-mono text-[10px] uppercase tracking-wider">
                Year
              </TableHead>
              <TableHead className="font-mono text-[10px] uppercase tracking-wider">
                Owner
              </TableHead>
              <TableHead className="font-mono text-[10px] uppercase tracking-wider">
                Contact
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
                    Failed to load vehicles
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
            ) : vehicles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center">
                  <Car
                    size={32}
                    className="mx-auto mb-3 text-muted-foreground/40"
                  />
                  <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    {debouncedSearch
                      ? "No vehicles match your search"
                      : "No vehicles yet"}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              vehicles.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-mono text-sm font-medium">
                    {v.registration_number}
                  </TableCell>
                  <TableCell>
                    {v.make} {v.model}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {v.year}
                  </TableCell>
                  <TableCell>{v.owner_name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {v.owner_contact}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleEdit(v.id)}
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeletingId(v.id)}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </IndustrialCard>

      <VehicleForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditingId(null)
        }}
        vehicle={editingId ? editing : null}
      />

      <Dialog
        open={deletingId !== null}
        onOpenChange={(open) => !open && setDeletingId(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono uppercase tracking-wider">
              Delete Vehicle?
            </DialogTitle>
            <DialogDescription>
              This will permanently remove{" "}
              <span className="font-mono font-medium">
                {deletingVehicle?.registration_number}
              </span>
              . This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeletingId(null)}
              disabled={deleteMut.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMut.isPending}
            >
              {deleteMut.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
