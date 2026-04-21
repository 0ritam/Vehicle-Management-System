import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { isAxiosError } from "axios"
import { ArrowLeft, Search, Plus, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { IndustrialCard } from "@/components/industrial/IndustrialCard"
import { useDebounce } from "@/hooks/useDebounce"
import { useVehicles } from "@/features/vehicles/api"
import { VehicleForm } from "@/features/vehicles/VehicleForm"
import { useCreateOrder } from "@/features/orders/api"
import type { Vehicle } from "@/lib/types"

const schema = z.object({
  issue_description: z
    .string()
    .min(10, "Describe the issue in at least 10 characters")
    .max(2000),
})

type FormValues = z.infer<typeof schema>

export default function OrderCreatePage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState("")
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [newVehicleOpen, setNewVehicleOpen] = useState(false)

  const debouncedSearch = useDebounce(search, 300)
  const { data, isLoading } = useVehicles({
    search: debouncedSearch || undefined,
  })

  const createMut = useCreateOrder()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { issue_description: "" },
  })

  const vehicles = data?.results ?? []

  const onSubmit = async (values: FormValues) => {
    if (!selectedVehicle) return
    try {
      const order = await createMut.mutateAsync({
        vehicle_id: selectedVehicle.id,
        issue_description: values.issue_description,
      })
      toast.success(`Order ${order.order_number} created`)
      navigate(`/orders/${order.id}`)
    } catch (err) {
      const msg =
        isAxiosError(err) && typeof err.response?.data === "object"
          ? JSON.stringify(err.response.data)
          : "Failed to create order"
      toast.error(msg)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => navigate("/orders")}
          title="Back"
        >
          <ArrowLeft size={16} />
        </Button>
        <div>
          <h1 className="font-mono text-xl font-bold uppercase tracking-[0.06em] text-foreground text-emboss">
            New Service Order
          </h1>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Pick a vehicle and describe the issue
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Vehicle picker */}
        <IndustrialCard className="min-w-0 p-5" hover={false}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
              1. Select Vehicle
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNewVehicleOpen(true)}
            >
              <Plus size={12} />
              New Vehicle
            </Button>
          </div>

          <div className="relative mb-3">
            <Search
              size={14}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search registration or owner…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="max-h-96 space-y-1 overflow-y-auto pr-1">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))
            ) : vehicles.length === 0 ? (
              <p className="py-6 text-center font-mono text-xs uppercase tracking-wider text-muted-foreground">
                No vehicles found
              </p>
            ) : (
              vehicles.map((v) => {
                const selected = selectedVehicle?.id === v.id
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVehicle(v)}
                    className={
                      "w-full rounded-md border p-3 text-left transition-all " +
                      (selected
                        ? "border-[var(--primary)] bg-[var(--primary)]/5 shadow-recessed"
                        : "border-transparent hover:border-industrial-border hover:bg-[var(--muted)]/50")
                    }
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-mono text-sm font-medium">
                          {v.registration_number}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {v.make} {v.model} · {v.year} · {v.owner_name}
                        </p>
                      </div>
                      {selected && (
                        <Check size={16} className="text-[var(--primary)]" />
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </IndustrialCard>

        {/* Issue description */}
        <IndustrialCard className="min-w-0 p-5" hover={false}>
          <h2 className="mb-4 font-mono text-xs font-bold uppercase tracking-wider text-foreground">
            2. Describe the Issue
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {selectedVehicle ? (
              <div className="rounded-md bg-[var(--muted)]/50 p-3 shadow-recessed">
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Selected Vehicle
                </p>
                <p className="mt-1 font-mono text-sm font-medium">
                  {selectedVehicle.registration_number}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedVehicle.make} {selectedVehicle.model} ·{" "}
                  {selectedVehicle.owner_name}
                </p>
              </div>
            ) : (
              <p className="rounded-md bg-[var(--muted)]/30 p-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Select a vehicle first
              </p>
            )}

            <div>
              <Label
                htmlFor="issue_description"
                className="text-xs uppercase tracking-wider"
              >
                Issue Description
              </Label>
              <Textarea
                id="issue_description"
                {...register("issue_description")}
                rows={8}
                placeholder="Describe the issue. Example: grinding noise from front brakes at low speeds, pedal feels soft."
                className="mt-2 w-full resize-y [field-sizing:fixed]"
              />
              {errors.issue_description && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.issue_description.message}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate("/orders")}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!selectedVehicle || isSubmitting}
              >
                {isSubmitting ? "Creating..." : "Create Order"}
              </Button>
            </div>
          </form>
        </IndustrialCard>
      </div>

      <VehicleForm
        open={newVehicleOpen}
        onOpenChange={setNewVehicleOpen}
        vehicle={null}
      />
    </div>
  )
}
