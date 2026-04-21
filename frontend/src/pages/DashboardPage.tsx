import { IndustrialCard } from "@/components/industrial/IndustrialCard"

export default function DashboardPage() {
  return (
    <IndustrialCard screws vents>
      <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
        Phase 7 will build the revenue dashboard with drill-down charts.
      </p>
    </IndustrialCard>
  )
}
