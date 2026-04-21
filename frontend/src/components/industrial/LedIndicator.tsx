import { cn } from "@/lib/utils"

type LedColor = "red" | "green" | "yellow"

const colorMap: Record<LedColor, { bg: string; glow: string }> = {
  red: { bg: "bg-[#ff4757]", glow: "shadow-[0_0_10px_2px_rgba(255,71,87,0.6)]" },
  green: { bg: "bg-[#22c55e]", glow: "shadow-[0_0_10px_2px_rgba(34,197,94,0.6)]" },
  yellow: { bg: "bg-[#f59e0b]", glow: "shadow-[0_0_10px_2px_rgba(245,158,11,0.6)]" },
}

export function LedIndicator({
  color = "green",
  pulse = true,
  size = "sm",
  label,
}: {
  color?: LedColor
  pulse?: boolean
  size?: "xs" | "sm" | "md"
  label?: string
}) {
  const { bg, glow } = colorMap[color]
  const sizeClass = size === "xs" ? "h-2 w-2" : size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "rounded-full",
          sizeClass,
          bg,
          glow,
          pulse && "animate-pulse"
        )}
      />
      {label && (
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </span>
      )}
    </div>
  )
}
