import { useQuery, keepPreviousData } from "@tanstack/react-query"
import api from "@/lib/api"
import type {
  RevenueBucket,
  RevenueSummary,
  ServiceOrder,
  TopComponent,
} from "@/lib/types"

export type Granularity = "day" | "month" | "year"

export interface RevenueRange {
  start?: string
  end?: string
}

const keys = {
  all: ["revenue"] as const,
  timeseries: (g: Granularity, r: RevenueRange) =>
    [...keys.all, "timeseries", g, r] as const,
  summary: (r: RevenueRange) => [...keys.all, "summary", r] as const,
  top: (r: RevenueRange) => [...keys.all, "top", r] as const,
  drillDown: (bucket: string, g: Granularity) =>
    [...keys.all, "drill", bucket, g] as const,
}

function rangeParams(r: RevenueRange): Record<string, string> {
  const params: Record<string, string> = {}
  if (r.start) params.start = r.start
  if (r.end) params.end = r.end
  return params
}

export function useRevenueTimeseries(
  granularity: Granularity,
  range: RevenueRange
) {
  return useQuery({
    queryKey: keys.timeseries(granularity, range),
    queryFn: async () => {
      const { data } = await api.get<RevenueBucket[]>(
        "/revenue/timeseries/",
        { params: { granularity, ...rangeParams(range) } }
      )
      return data
    },
    placeholderData: keepPreviousData,
  })
}

export function useRevenueSummary(range: RevenueRange) {
  return useQuery({
    queryKey: keys.summary(range),
    queryFn: async () => {
      const { data } = await api.get<RevenueSummary>("/revenue/summary/", {
        params: rangeParams(range),
      })
      return data
    },
    placeholderData: keepPreviousData,
  })
}

export function useTopComponents(range: RevenueRange) {
  return useQuery({
    queryKey: keys.top(range),
    queryFn: async () => {
      const { data } = await api.get<TopComponent[]>(
        "/revenue/top-components/",
        { params: rangeParams(range) }
      )
      return data
    },
    placeholderData: keepPreviousData,
  })
}

export function useRevenueDrillDown(
  bucket: string | null,
  granularity: Granularity
) {
  return useQuery({
    queryKey:
      bucket !== null
        ? keys.drillDown(bucket, granularity)
        : ["revenue", "drill", "null"],
    queryFn: async () => {
      const { data } = await api.get<ServiceOrder[]>("/revenue/drill-down/", {
        params: { bucket, granularity },
      })
      return data
    },
    enabled: bucket !== null,
  })
}
