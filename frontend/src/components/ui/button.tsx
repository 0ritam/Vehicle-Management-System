import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent font-bold uppercase tracking-[0.05em] whitespace-nowrap transition-all duration-150 ease-mechanical outline-none select-none btn-press focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--primary)] text-white shadow-[4px_4px_8px_rgba(166,50,60,0.4),-4px_-4px_8px_rgba(255,100,110,0.4)] border-white/20 hover:brightness-110",
        outline:
          "border-industrial-border bg-chassis text-foreground shadow-card hover:text-[var(--primary)] hover:border-[var(--primary)]/30",
        secondary:
          "bg-chassis text-foreground shadow-card hover:text-[var(--primary)]",
        ghost:
          "text-muted-foreground hover:bg-[var(--muted)] hover:shadow-recessed hover:text-foreground",
        destructive:
          "bg-[#e74c3c] text-white shadow-[4px_4px_8px_rgba(150,40,40,0.4),-4px_-4px_8px_rgba(255,90,90,0.3)] hover:brightness-110",
        link: "text-[var(--primary)] underline-offset-4 hover:underline uppercase-none tracking-normal font-medium",
      },
      size: {
        default: "h-10 gap-2 px-5 text-xs",
        xs: "h-7 gap-1 px-3 text-[10px] rounded-sm",
        sm: "h-8 gap-1.5 px-4 text-[11px]",
        lg: "h-12 gap-2 px-6 text-sm rounded-lg",
        icon: "size-10 rounded-md",
        "icon-xs": "size-7 rounded-sm",
        "icon-sm": "size-8 rounded-md",
        "icon-lg": "size-12 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
