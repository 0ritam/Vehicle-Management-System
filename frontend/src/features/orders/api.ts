import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query"
import api from "@/lib/api"
import type {
  CompareResponse,
  OrderStatus,
  Paginated,
  Payment,
  ServiceItem,
  ServiceOrder,
} from "@/lib/types"

export interface OrderFilters {
  search?: string
  status?: OrderStatus | ""
  created_after?: string
  created_before?: string
}

const keys = {
  all: ["orders"] as const,
  list: (filters: OrderFilters) => [...keys.all, "list", filters] as const,
  detail: (id: number) => [...keys.all, "detail", id] as const,
  compare: (orderId: number, componentId: number) =>
    [...keys.all, "compare", orderId, componentId] as const,
}

export function useOrders(filters: OrderFilters = {}) {
  return useQuery({
    queryKey: keys.list(filters),
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (filters.search) params.search = filters.search
      if (filters.status) params.status = filters.status
      if (filters.created_after) params.created_after = filters.created_after
      if (filters.created_before) params.created_before = filters.created_before
      const { data } = await api.get<Paginated<ServiceOrder>>(
        "/service-orders/",
        { params }
      )
      return data
    },
    placeholderData: keepPreviousData,
  })
}

export function useOrder(id: number | null) {
  return useQuery({
    queryKey: id ? keys.detail(id) : ["orders", "detail", "null"],
    queryFn: async () => {
      const { data } = await api.get<ServiceOrder>(`/service-orders/${id}/`)
      return data
    },
    enabled: id !== null,
  })
}

export interface CreateOrderPayload {
  vehicle_id: number
  issue_description: string
  labor_rate?: string
  tax_rate?: string
  discount_amount?: string
}

export function useCreateOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateOrderPayload) => {
      const { data } = await api.post<ServiceOrder>("/service-orders/", payload)
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all })
    },
  })
}

export interface UpdateOrderPayload {
  labor_rate?: string
  tax_rate?: string
  discount_amount?: string
  issue_description?: string
}

export function useUpdateOrder(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: UpdateOrderPayload) => {
      const { data } = await api.patch<ServiceOrder>(
        `/service-orders/${id}/`,
        payload
      )
      return data
    },
    onSuccess: (data) => {
      qc.setQueryData(keys.detail(id), data)
      qc.invalidateQueries({ queryKey: keys.list({}) })
    },
  })
}

export function useAddItem(orderId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { component_id: number; quantity: number }) => {
      const { data } = await api.post<ServiceItem>(
        `/service-orders/${orderId}/add-item/`,
        payload
      )
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.detail(orderId) })
    },
  })
}

export function useRemoveItem(orderId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (itemId: number) => {
      await api.delete(`/service-orders/${orderId}/items/${itemId}/`)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.detail(orderId) })
    },
  })
}

export function useTransitionOrder(orderId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (newStatus: OrderStatus) => {
      const { data } = await api.post<ServiceOrder>(
        `/service-orders/${orderId}/transition/`,
        { status: newStatus }
      )
      return data
    },
    onSuccess: (data) => {
      qc.setQueryData(keys.detail(orderId), data)
      qc.invalidateQueries({ queryKey: keys.list({}) })
    },
  })
}

export function usePayOrder(orderId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (method: string) => {
      const { data } = await api.post<Payment>(
        `/service-orders/${orderId}/pay/`,
        { method }
      )
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.detail(orderId) })
      qc.invalidateQueries({ queryKey: keys.list({}) })
    },
  })
}

export function useCompareOptions(orderId: number, componentId: number | null) {
  return useQuery({
    queryKey:
      componentId !== null
        ? keys.compare(orderId, componentId)
        : ["orders", "compare", orderId, "null"],
    queryFn: async () => {
      const { data } = await api.get<CompareResponse>(
        `/service-orders/${orderId}/compare/${componentId}/`
      )
      return data
    },
    enabled: componentId !== null,
    retry: false,
  })
}

export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ["QUOTED", "CANCELLED"],
  QUOTED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: ["PAID"],
  PAID: [],
  CANCELLED: [],
}
