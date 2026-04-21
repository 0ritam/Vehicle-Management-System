import { useEffect, useMemo } from "react"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  useComponents,
  useCreateComponent,
  useUpdateComponent,
  type ComponentPayload,
} from "./api"
import type { Component } from "@/lib/types"

const schema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  sku: z
    .string()
    .min(1, "SKU is required")
    .max(40)
    .regex(/^[A-Za-z0-9-]+$/, "SKU can only contain letters, numbers, and hyphens"),
  component_type: z.enum(["NEW_PART", "REPAIR_SERVICE"]),
  unit_price: z
    .string()
    .min(1, "Unit price is required")
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), "Enter a valid price (up to 2 decimals)")
    .refine((v) => parseFloat(v) >= 0, "Price cannot be negative"),
  labor_hours: z
    .string()
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), "Enter valid hours (up to 2 decimals)")
    .refine((v) => parseFloat(v) >= 0, "Labor hours cannot be negative"),
  stock_quantity: z
    .number({ error: "Stock quantity must be a number" })
    .int("Must be a whole number")
    .min(0, "Cannot be negative"),
  repair_alternative: z.number().nullable(),
})

type FormValues = z.infer<typeof schema>

const TYPE_LABEL: Record<FormValues["component_type"], string> = {
  NEW_PART: "New Part",
  REPAIR_SERVICE: "Repair Service",
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  component?: Component | null
}

export function ComponentForm({ open, onOpenChange, component }: Props) {
  const isEdit = Boolean(component)
  const createMut = useCreateComponent()
  const updateMut = useUpdateComponent(component?.id ?? 0)

  const { data: repairsData } = useComponents({
    component_type: "REPAIR_SERVICE",
    is_active: true,
  })

  const repairOptions = useMemo(
    () => repairsData?.results ?? [],
    [repairsData]
  )

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      sku: "",
      component_type: "NEW_PART",
      unit_price: "0.00",
      labor_hours: "0.00",
      stock_quantity: 0,
      repair_alternative: null,
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        name: component?.name ?? "",
        sku: component?.sku ?? "",
        component_type: component?.component_type ?? "NEW_PART",
        unit_price: component?.unit_price ?? "0.00",
        labor_hours: component?.labor_hours ?? "0.00",
        stock_quantity: component?.stock_quantity ?? 0,
        repair_alternative: component?.repair_alternative ?? null,
      })
    }
  }, [open, component, reset])

  const componentType = watch("component_type")

  const onSubmit = async (values: FormValues) => {
    const payload: ComponentPayload = {
      ...values,
      repair_alternative:
        values.component_type === "NEW_PART" ? values.repair_alternative : null,
    }
    try {
      if (isEdit && component) {
        await updateMut.mutateAsync(payload)
        toast.success("Component updated")
      } else {
        await createMut.mutateAsync(payload)
        toast.success("Component created")
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
        if (!mapped) {
          const detail = typeof data === "string" ? data : JSON.stringify(data)
          toast.error(detail)
          return
        }
      }
      toast.error(isEdit ? "Failed to update component" : "Failed to create component")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-mono uppercase tracking-wider">
            {isEdit ? "Edit Component" : "New Component"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="name" className="text-xs uppercase tracking-wider">
                Name
              </Label>
              <Input id="name" {...register("name")} autoFocus />
              {errors.name && (
                <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="sku" className="text-xs uppercase tracking-wider">
                SKU
              </Label>
              <Input id="sku" {...register("sku")} placeholder="BRK-001" />
              {errors.sku && (
                <p className="mt-1 text-xs text-destructive">{errors.sku.message}</p>
              )}
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wider">Type</Label>
              <Select
                value={componentType}
                onValueChange={(v) =>
                  setValue("component_type", v as FormValues["component_type"], {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger className="mt-2 w-full">
                  <SelectValue>{TYPE_LABEL[componentType]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NEW_PART">New Part</SelectItem>
                  <SelectItem value="REPAIR_SERVICE">Repair Service</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="unit_price" className="text-xs uppercase tracking-wider">
                Unit Price (₹)
              </Label>
              <Input
                id="unit_price"
                {...register("unit_price")}
                inputMode="decimal"
              />
              {errors.unit_price && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.unit_price.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="labor_hours" className="text-xs uppercase tracking-wider">
                Labor Hours
              </Label>
              <Input
                id="labor_hours"
                {...register("labor_hours")}
                inputMode="decimal"
              />
              {errors.labor_hours && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.labor_hours.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="stock_quantity" className="text-xs uppercase tracking-wider">
                Stock Quantity
              </Label>
              <Input
                id="stock_quantity"
                type="number"
                min="0"
                step="1"
                {...register("stock_quantity", { valueAsNumber: true })}
              />
              {errors.stock_quantity && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.stock_quantity.message}
                </p>
              )}
            </div>

            {componentType === "NEW_PART" && (
              <div className="sm:col-span-2">
                <Label className="text-xs uppercase tracking-wider">
                  Repair Alternative
                </Label>
                <Select
                  value={String(watch("repair_alternative") ?? "__none__")}
                  onValueChange={(v) =>
                    setValue(
                      "repair_alternative",
                      v === "__none__" ? null : Number(v),
                      { shouldValidate: true }
                    )
                  }
                >
                  <SelectTrigger className="mt-2 w-full">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {repairOptions
                      .filter((r) => r.id !== component?.id)
                      .map((r) => (
                        <SelectItem key={r.id} value={String(r.id)}>
                          {r.name} ({r.sku})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  Optional — link this part to a cheaper repair service
                </p>
              </div>
            )}
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
