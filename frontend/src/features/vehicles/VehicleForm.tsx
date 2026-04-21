import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { isAxiosError } from "axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  useCreateVehicle,
  useUpdateVehicle,
  type VehiclePayload,
} from "./api"
import type { Vehicle } from "@/lib/types"

const currentYear = new Date().getFullYear()

const schema = z.object({
  registration_number: z
    .string()
    .min(1, "Registration number is required")
    .max(20)
    .regex(
      /^[A-Za-z0-9-]+$/,
      "Only letters, numbers, and hyphens allowed"
    ),
  make: z.string().min(1, "Make is required").max(40),
  model: z.string().min(1, "Model is required").max(40),
  year: z
    .number({ error: "Year is required" })
    .int()
    .min(1900, "Year too old")
    .max(currentYear + 1, `Year cannot exceed ${currentYear + 1}`),
  owner_name: z.string().min(1, "Owner name is required").max(80),
  owner_contact: z.string().min(1, "Contact is required").max(40),
})

type FormValues = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  vehicle?: Vehicle | null
}

export function VehicleForm({ open, onOpenChange, vehicle }: Props) {
  const isEdit = Boolean(vehicle)
  const createMut = useCreateVehicle()
  const updateMut = useUpdateVehicle(vehicle?.id ?? 0)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      registration_number: "",
      make: "",
      model: "",
      year: currentYear,
      owner_name: "",
      owner_contact: "",
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        registration_number: vehicle?.registration_number ?? "",
        make: vehicle?.make ?? "",
        model: vehicle?.model ?? "",
        year: vehicle?.year ?? currentYear,
        owner_name: vehicle?.owner_name ?? "",
        owner_contact: vehicle?.owner_contact ?? "",
      })
    }
  }, [open, vehicle, reset])

  const onSubmit = async (values: FormValues) => {
    const payload: VehiclePayload = {
      ...values,
      registration_number: values.registration_number.toUpperCase(),
    }
    try {
      if (isEdit && vehicle) {
        await updateMut.mutateAsync(payload)
        toast.success("Vehicle updated")
      } else {
        await createMut.mutateAsync(payload)
        toast.success("Vehicle created")
      }
      onOpenChange(false)
    } catch (err) {
      if (isAxiosError(err) && err.response?.data && typeof err.response.data === "object") {
        const data = err.response.data as Record<string, string[] | string>
        let mapped = false
        for (const [field, msgs] of Object.entries(data)) {
          if (field in values) {
            const message = Array.isArray(msgs) ? msgs[0] : msgs
            setError(field as keyof FormValues, { message })
            mapped = true
          }
        }
        if (mapped) return
      }
      toast.error(isEdit ? "Failed to update vehicle" : "Failed to create vehicle")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-mono uppercase tracking-wider">
            {isEdit ? "Edit Vehicle" : "New Vehicle"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="registration_number" className="text-xs uppercase tracking-wider">
                Registration Number
              </Label>
              <Input
                id="registration_number"
                {...register("registration_number")}
                placeholder="KA-01-AB-1234"
                autoFocus
                className="uppercase"
              />
              {errors.registration_number && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.registration_number.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="make" className="text-xs uppercase tracking-wider">
                Make
              </Label>
              <Input id="make" {...register("make")} placeholder="Maruti" />
              {errors.make && (
                <p className="mt-1 text-xs text-destructive">{errors.make.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="model" className="text-xs uppercase tracking-wider">
                Model
              </Label>
              <Input id="model" {...register("model")} placeholder="Swift" />
              {errors.model && (
                <p className="mt-1 text-xs text-destructive">{errors.model.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="year" className="text-xs uppercase tracking-wider">
                Year
              </Label>
              <Input
                id="year"
                type="number"
                min="1900"
                max={currentYear + 1}
                step="1"
                {...register("year", { valueAsNumber: true })}
              />
              {errors.year && (
                <p className="mt-1 text-xs text-destructive">{errors.year.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="owner_contact" className="text-xs uppercase tracking-wider">
                Owner Contact
              </Label>
              <Input
                id="owner_contact"
                {...register("owner_contact")}
                placeholder="+91 98765 43210"
              />
              {errors.owner_contact && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.owner_contact.message}
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="owner_name" className="text-xs uppercase tracking-wider">
                Owner Name
              </Label>
              <Input id="owner_name" {...register("owner_name")} />
              {errors.owner_name && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.owner_name.message}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
