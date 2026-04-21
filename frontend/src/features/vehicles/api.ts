import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query"
import api from "@/lib/api"
import type { Paginated, Vehicle } from "@/lib/types"

export interface VehicleFilters {
  search?: string
}

const keys = {
  all: ["vehicles"] as const,
  list: (filters: VehicleFilters) =>
    [...keys.all, "list", filters] as const,
  detail: (id: number) => [...keys.all, "detail", id] as const,
}

export function useVehicles(filters: VehicleFilters = {}) {
  return useQuery({
    queryKey: keys.list(filters),
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (filters.search) params.search = filters.search
      const { data } = await api.get<Paginated<Vehicle>>("/vehicles/", {
        params,
      })
      return data
    },
    placeholderData: keepPreviousData,
  })
}

export function useVehicle(id: number | null) {
  return useQuery({
    queryKey: id ? keys.detail(id) : ["vehicles", "detail", "null"],
    queryFn: async () => {
      const { data } = await api.get<Vehicle>(`/vehicles/${id}/`)
      return data
    },
    enabled: id !== null,
  })
}

export interface VehiclePayload {
  registration_number: string
  make: string
  model: string
  year: number
  owner_name: string
  owner_contact: string
}

export function useCreateVehicle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: VehiclePayload) => {
      const { data } = await api.post<Vehicle>("/vehicles/", payload)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all })
    },
  })
}

export function useUpdateVehicle(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<VehiclePayload>) => {
      const { data } = await api.patch<Vehicle>(`/vehicles/${id}/`, payload)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all })
    },
  })
}

export function useDeleteVehicle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/vehicles/${id}/`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all })
    },
  })
}
