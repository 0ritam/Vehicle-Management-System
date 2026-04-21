import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Package,
  Car,
  ClipboardList,
  LayoutDashboard,
  Plus,
  FileText,
  Search,
} from "lucide-react"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { useDebounce } from "@/hooks/useDebounce"
import { useComponents } from "@/features/components/api"
import { useVehicles } from "@/features/vehicles/api"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: Props) {
  const navigate = useNavigate()
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebounce(query, 250)

  // Only fetch results when palette is open and user has typed something
  const shouldSearch = open && debouncedQuery.length >= 2
  const componentsQuery = useComponents(
    shouldSearch ? { search: debouncedQuery, is_active: true } : {}
  )
  const vehiclesQuery = useVehicles(
    shouldSearch ? { search: debouncedQuery } : {}
  )

  useEffect(() => {
    if (!open) setQuery("")
  }, [open])

  const go = (path: string) => {
    onOpenChange(false)
    navigate(path)
  }

  const componentResults = useMemo(
    () => (shouldSearch ? (componentsQuery.data?.results ?? []).slice(0, 5) : []),
    [shouldSearch, componentsQuery.data]
  )
  const vehicleResults = useMemo(
    () => (shouldSearch ? (vehiclesQuery.data?.results ?? []).slice(0, 5) : []),
    [shouldSearch, vehiclesQuery.data]
  )

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command Palette"
      description="Jump to a page, create a resource, or search."
    >
      <Command>
        <CommandInput
          placeholder="Type a command or search…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
        <CommandEmpty>
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            No results
          </p>
        </CommandEmpty>

        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => go("/dashboard")}>
            <LayoutDashboard />
            <span>Dashboard</span>
            <CommandShortcut>G D</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => go("/components")}>
            <Package />
            <span>Components</span>
            <CommandShortcut>G C</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => go("/vehicles")}>
            <Car />
            <span>Vehicles</span>
            <CommandShortcut>G V</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => go("/orders")}>
            <ClipboardList />
            <span>Orders</span>
            <CommandShortcut>G O</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Create">
          <CommandItem onSelect={() => go("/components?new=1")}>
            <Plus />
            <span>New Component</span>
          </CommandItem>
          <CommandItem onSelect={() => go("/vehicles?new=1")}>
            <Plus />
            <span>New Vehicle</span>
          </CommandItem>
          <CommandItem onSelect={() => go("/orders/new")}>
            <FileText />
            <span>New Service Order</span>
          </CommandItem>
        </CommandGroup>

        {shouldSearch && componentResults.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Components">
              {componentResults.map((c) => (
                <CommandItem
                  key={`c-${c.id}`}
                  value={`component-${c.id}-${c.name}-${c.sku}`}
                  onSelect={() => go("/components")}
                >
                  <Package />
                  <div className="flex flex-col">
                    <span>{c.name}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {c.sku} ·{" "}
                      {c.component_type === "NEW_PART"
                        ? "New Part"
                        : "Repair"}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {shouldSearch && vehicleResults.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Vehicles">
              {vehicleResults.map((v) => (
                <CommandItem
                  key={`v-${v.id}`}
                  value={`vehicle-${v.id}-${v.registration_number}-${v.owner_name}`}
                  onSelect={() => go("/vehicles")}
                >
                  <Car />
                  <div className="flex flex-col">
                    <span className="font-mono">{v.registration_number}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {v.make} {v.model} · {v.owner_name}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

          {shouldSearch &&
            (componentsQuery.isLoading || vehiclesQuery.isLoading) && (
              <div className="flex items-center gap-2 px-3 py-2 text-muted-foreground">
                <Search size={12} />
                <span className="font-mono text-[10px] uppercase tracking-wider">
                  Searching…
                </span>
              </div>
            )}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
