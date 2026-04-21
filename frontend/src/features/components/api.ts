import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query"
import api from "@/lib/api"
import type {
  Component,
  ComponentListItem,
  Paginated,
} from "@/lib/types"

export interface ComponentFilters {
  search?: string
  component_type?: "NEW_PART" | "REPAIR_SERVICE" | ""
  is_active?: boolean
}

const keys = {
  all: ["components"] as const,
  list: (filters: ComponentFilters) =>
    [...keys.all, "list", filters] as const,
  detail: (id: number) => [...keys.all, "detail", id] as const,
}

export function useComponents(filters: ComponentFilters = {}) {
  return useQuery({
    queryKey: keys.list(filters),
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (filters.search) params.search = filters.search
      if (filters.component_type) params.component_type = filters.component_type
      if (filters.is_active !== undefined)
        params.is_active = String(filters.is_active)
      const { data } = await api.get<Paginated<ComponentListItem>>(
        "/components/",
        { params }
      )
      return data
    },
    placeholderData: keepPreviousData,
  })
}

export function useComponent(id: number | null) {
  return useQuery({
    queryKey: id ? keys.detail(id) : ["components", "detail", "null"],
    queryFn: async () => {
      const { data } = await api.get<Component>(`/components/${id}/`)
      return data
    },
    enabled: id !== null,
  })
}

export interface ComponentPayload {
  name: string
  sku: string
  component_type: "NEW_PART" | "REPAIR_SERVICE"
  unit_price: string
  labor_hours: string
  stock_quantity: number
  repair_alternative: number | null
  is_active?: boolean
}

export function useCreateComponent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: ComponentPayload) => {
      const { data } = await api.post<Component>("/components/", payload)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all })
    },
  })
}

export function useUpdateComponent(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<ComponentPayload>) => {
      const { data } = await api.patch<Component>(
        `/components/${id}/`,
        payload
      )
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all })
    },
  })
}

export function useDeactivateComponent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.patch<Component>(`/components/${id}/`, {
        is_active: false,
      })
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all })
    },
  })
}

export function useActivateComponent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.patch<Component>(`/components/${id}/`, {
        is_active: true,
      })
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all })
    },
  })
}
