import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { CornerScrews } from "./ScrewDetail"
import { VentSlots } from "./VentSlots"

export function IndustrialCard({
  children,
  className,
  screws = false,
  vents = false,
  hover = true,
}: {
  children: ReactNode
  className?: string
  screws?: boolean
  vents?: boolean
  hover?: boolean
}) {
  return (
    <div
      className={cn(
        "relative rounded-lg bg-chassis p-6 shadow-card",
        hover && "card-lift",
        className
      )}
    >
      {screws && <CornerScrews />}
      {vents && (
        <div className="absolute top-3 right-4">
          <VentSlots />
        </div>
      )}
      {children}
    </div>
  )
}
