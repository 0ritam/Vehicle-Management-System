import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { format, parseISO, subDays, startOfYear } from "date-fns"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import {
  TrendingUp,
  ClipboardList,
  Coins,
  Trophy,
  Inbox,
  ExternalLink,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { IndustrialCard } from "@/components/industrial/IndustrialCard"
import { formatCurrency, formatDate } from "@/lib/format"
import {
  type Granularity,
  type RevenueRange,
  useRevenueDrillDown,
  useRevenueSummary,
  useRevenueTimeseries,
  useTopComponents,
} from "@/features/dashboard/api"
import { STATUS_BADGE } from "@/pages/OrdersListPage"

type Preset = "7d" | "30d" | "90d" | "ytd" | "all"

const PRESET_LABEL: Record<Preset, string> = {
  "7d": "7 days",
  "30d": "30 days",
  "90d": "90 days",
  ytd: "This year",
  all: "All time",
}

function presetToRange(preset: Preset): RevenueRange {
  const now = new Date()
  switch (preset) {
    case "7d":
      return { start: subDays(now, 7).toISOString() }
    case "30d":
      return { start: subDays(now, 30).toISOString() }
    case "90d":
      return { start: subDays(now, 90).toISOString() }
    case "ytd":
      return { start: startOfYear(now).toISOString() }
    case "all":
      return {}
  }
}

function formatBucket(bucket: string, granularity: Granularity): string {
  const d = parseISO(bucket)
  switch (granularity) {
    case "day":
      return format(d, "dd MMM")
    case "month":
      return format(d, "MMM yy")
    case "year":
      return format(d, "yyyy")
  }
}

export default function DashboardPage() {
  const [granularity, setGranularity] = useState<Granularity>("month")
  const [preset, setPreset] = useState<Preset>("all")
  const [drillBucket, setDrillBucket] = useState<string | null>(null)

  const range = useMemo(() => presetToRange(preset), [preset])

  const summary = useRevenueSummary(range)
  const timeseries = useRevenueTimeseries(granularity, range)
  const top = useTopComponents(range)
  const drillDown = useRevenueDrillDown(drillBucket, granularity)

  const chartData = useMemo(
    () =>
      (timeseries.data ?? []).map((b) => ({
        bucket: b.bucket,
        label: formatBucket(b.bucket, granularity),
        revenue: parseFloat(String(b.revenue)),
        orders: b.orders,
      })),
    [timeseries.data, granularity]
  )

  const topComponent = top.data?.[0] ?? null

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-mono text-xl font-bold uppercase tracking-[0.06em] text-foreground text-emboss">
          Revenue Dashboard
        </h1>
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {PRESET_LABEL[preset]} · bucketed by {granularity}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Total Revenue"
          value={summary.data ? formatCurrency(summary.data.total_revenue) : null}
          icon={<Coins size={16} />}
          loading={summary.isLoading}
        />
        <KpiCard
          label="Orders Completed"
          value={summary.data ? String(summary.data.order_count) : null}
          icon={<ClipboardList size={16} />}
          loading={summary.isLoading}
        />
        <KpiCard
          label="Avg Order Value"
          value={
            summary.data ? formatCurrency(summary.data.avg_order_value) : null
          }
          icon={<TrendingUp size={16} />}
          loading={summary.isLoading}
        />
        <KpiCard
          label="Top Component"
          value={topComponent?.name ?? "—"}
          subvalue={
            topComponent
              ? `${formatCurrency(String(topComponent.revenue))} · ${topComponent.units} units`
              : "No sales yet"
          }
          icon={<Trophy size={16} />}
          loading={top.isLoading}
        />
      </div>

      {/* Filter bar */}
      <IndustrialCard className="p-4" hover={false}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Date Range
            </p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(PRESET_LABEL) as Preset[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPreset(p)}
                  className={
                    "rounded-md border px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition-all " +
                    (preset === p
                      ? "border-[var(--primary)] bg-[var(--primary)] text-white shadow-card"
                      : "border-industrial-border bg-chassis text-muted-foreground hover:text-foreground")
                  }
                >
                  {PRESET_LABEL[p]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Granularity
            </p>
            <Tabs
              value={granularity}
              onValueChange={(v) => setGranularity(v as Granularity)}
            >
              <TabsList>
                <TabsTrigger value="day">Day</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
                <TabsTrigger value="year">Year</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </IndustrialCard>

      {/* Revenue chart */}
      <IndustrialCard className="p-5" hover={false}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-mono text-xs font-bold uppercase tracking-wider">
            Revenue by {granularity}
          </h2>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Click a bar to drill down
          </p>
        </div>
        <div className="h-[300px] min-w-0">
          {timeseries.isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : chartData.length === 0 ? (
            <EmptyChart message="No revenue in this range" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(0,0,0,0.06)"
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  axisLine={{ stroke: "rgba(0,0,0,0.1)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  axisLine={{ stroke: "rgba(0,0,0,0.1)" }}
                  tickLine={false}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `₹${Math.round(v / 1000)}k` : `₹${v}`
                  }
                  width={60}
                />
                <Tooltip content={<RevenueTooltip />} cursor={{ fill: "rgba(255,71,87,0.08)" }} />
                <Bar
                  dataKey="revenue"
                  radius={[4, 4, 0, 0]}
                  onClick={(d: unknown) => {
                    const payload = d as { bucket?: string } | undefined
                    if (payload?.bucket) setDrillBucket(payload.bucket)
                  }}
                  cursor="pointer"
                >
                  {chartData.map((d) => (
                    <Cell key={d.bucket} fill="#ff4757" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </IndustrialCard>

      {/* Secondary orders line chart */}
      <IndustrialCard className="p-5" hover={false}>
        <h2 className="mb-4 font-mono text-xs font-bold uppercase tracking-wider">
          Order Count Trend
        </h2>
        <div className="h-[200px] min-w-0">
          {timeseries.isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : chartData.length === 0 ? (
            <EmptyChart message="No orders in this range" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(0,0,0,0.06)"
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  axisLine={{ stroke: "rgba(0,0,0,0.1)" }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  axisLine={{ stroke: "rgba(0,0,0,0.1)" }}
                  tickLine={false}
                  width={40}
                />
                <Tooltip content={<OrdersTooltip />} />
                <Line
                  type="monotone"
                  dataKey="orders"
                  stroke="#2d3436"
                  strokeWidth={2}
                  dot={{ fill: "#2d3436", r: 3 }}
                  activeDot={{ r: 6, fill: "#ff4757" }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </IndustrialCard>

      {/* Top components breakdown */}
      {(top.data ?? []).length > 0 && (
        <IndustrialCard className="p-5" hover={false}>
          <h2 className="mb-4 font-mono text-xs font-bold uppercase tracking-wider">
            Top Revenue Components
          </h2>
          <div className="space-y-3">
            {top.data!.map((c, i) => {
              const maxRevenue = parseFloat(String(top.data![0].revenue))
              const width =
                (parseFloat(String(c.revenue)) / maxRevenue) * 100
              return (
                <div key={c.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-foreground/10 font-mono text-[10px] font-bold">
                        {i + 1}
                      </span>
                      <span className="font-medium">{c.name}</span>
                      <Badge
                        variant={
                          c.component_type === "NEW_PART"
                            ? "secondary"
                            : "outline"
                        }
                        className="text-[10px]"
                      >
                        {c.component_type === "NEW_PART" ? "New" : "Repair"}
                      </Badge>
                    </div>
                    <div className="font-mono text-sm">
                      {formatCurrency(String(c.revenue))}
                      <span className="ml-2 text-[10px] text-muted-foreground">
                        {c.units} units
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded bg-[var(--muted)]/60 shadow-recessed">
                    <div
                      className="h-full rounded bg-[var(--primary)]"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </IndustrialCard>
      )}

      {/* Drill-down Sheet */}
      <Sheet
        open={drillBucket !== null}
        onOpenChange={(o) => !o && setDrillBucket(null)}
      >
        <SheetContent
          side="right"
          className="w-full overflow-y-auto bg-chassis p-0 sm:max-w-xl"
        >
          <SheetHeader className="border-b border-industrial-border p-5">
            <SheetTitle className="font-mono uppercase tracking-wider">
              {drillBucket
                ? `Orders in ${formatBucket(drillBucket, granularity)}`
                : ""}
            </SheetTitle>
            <SheetDescription className="font-mono text-[10px] uppercase tracking-wider">
              Paid orders within this {granularity}
            </SheetDescription>
          </SheetHeader>
          <div className="p-5">
            <DrillDownList
              isLoading={drillDown.isLoading}
              orders={drillDown.data ?? []}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function KpiCard({
  label,
  value,
  subvalue,
  icon,
  loading,
}: {
  label: string
  value: string | null
  subvalue?: string
  icon: React.ReactNode
  loading?: boolean
}) {
  return (
    <IndustrialCard className="p-4" hover={false}>
      <div className="mb-2 flex items-center justify-between">
        <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--primary)]/10 text-[var(--primary)]">
          {icon}
        </div>
      </div>
      {loading ? (
        <Skeleton className="h-7 w-24" />
      ) : (
        <p className="font-mono text-xl font-bold text-foreground text-emboss">
          {value ?? "—"}
        </p>
      )}
      {subvalue && !loading && (
        <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {subvalue}
        </p>
      )}
    </IndustrialCard>
  )
}

function RevenueTooltip(props: {
  active?: boolean
  payload?: Array<{ payload: { label: string; revenue: number; orders: number } }>
}) {
  if (!props.active || !props.payload?.length) return null
  const d = props.payload[0].payload
  return (
    <div className="rounded-md border border-industrial-border bg-chassis p-3 shadow-card">
      <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {d.label}
      </p>
      <p className="mt-1 font-mono text-sm font-bold">
        {formatCurrency(d.revenue)}
      </p>
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {d.orders} {d.orders === 1 ? "order" : "orders"}
      </p>
    </div>
  )
}

function OrdersTooltip(props: {
  active?: boolean
  payload?: Array<{ payload: { label: string; orders: number } }>
}) {
  if (!props.active || !props.payload?.length) return null
  const d = props.payload[0].payload
  return (
    <div className="rounded-md border border-industrial-border bg-chassis p-2 shadow-card">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {d.label}
      </p>
      <p className="font-mono text-sm font-bold">{d.orders} orders</p>
    </div>
  )
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center">
      <Inbox size={36} className="mb-3 text-muted-foreground/40" />
      <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
        {message}
      </p>
    </div>
  )
}

function DrillDownList({
  isLoading,
  orders,
}: {
  isLoading: boolean
  orders: import("@/lib/types").ServiceOrder[]
}) {
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="py-12 text-center">
        <Inbox size={28} className="mx-auto mb-3 text-muted-foreground/40" />
        <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          No orders in this bucket
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {orders.map((o) => {
        const badge = STATUS_BADGE[o.status]
        return (
          <button
            key={o.id}
            onClick={() => navigate(`/orders/${o.id}`)}
            className="group flex w-full items-center justify-between rounded-md border border-industrial-border bg-chassis p-3 text-left transition-all hover:border-[var(--primary)]/30 hover:shadow-card"
          >
            <div>
              <div className="flex items-center gap-2">
                <p className="font-mono text-sm font-medium">
                  {o.order_number}
                </p>
                <Badge className={badge.className + " text-[10px]"}>
                  {badge.label}
                </Badge>
              </div>
              <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                {o.vehicle.registration_number} · {o.vehicle.owner_name}
              </p>
              {o.payment && (
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Paid {formatDate(o.payment.paid_at)} · {o.payment.method}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold">
                {formatCurrency(o.total)}
              </span>
              <ExternalLink
                size={14}
                className="text-muted-foreground/50 group-hover:text-[var(--primary)]"
              />
            </div>
          </button>
        )
      })}
    </div>
  )
}

