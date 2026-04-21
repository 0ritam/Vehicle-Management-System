import { useEffect, useState } from "react"
import { Link, Outlet, useLocation } from "react-router-dom"
import { CommandPalette } from "./CommandPalette"
import {
  LayoutDashboard,
  Package,
  Car,
  ClipboardList,
  Menu,
  X,
  LogOut,
  Command,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/useAuth"
import { LedIndicator } from "./industrial/LedIndicator"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "./ui/sheet"

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/components", label: "Components", icon: Package },
  { to: "/vehicles", label: "Vehicles", icon: Car },
  { to: "/orders", label: "Orders", icon: ClipboardList },
]

function NavLink({
  to,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string; size?: number }>
  active: boolean
  onClick?: () => void
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200",
        active
          ? "bg-[var(--sidebar-accent)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
          : "text-white/70 hover:bg-white/5 hover:text-white"
      )}
    >
      <Icon size={18} className={active ? "text-[var(--primary)]" : ""} />
      <span className="font-mono text-xs uppercase tracking-[0.06em]">
        {label}
      </span>
      {active && (
        <div className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--primary)] shadow-glow-red" />
      )}
    </Link>
  )
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation()
  const { logout } = useAuth()

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--primary)] shadow-[0_0_12px_rgba(255,71,87,0.4)]">
          <Package size={18} className="text-white" />
        </div>
        <div>
          <h1 className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-white">
            VSMS
          </h1>
          <p className="font-mono text-[9px] uppercase tracking-[0.06em] text-white/40">
            Service Manager
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        <p className="mb-2 px-3 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-white/30">
          Navigation
        </p>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            {...item}
            active={location.pathname.startsWith(item.to)}
            onClick={onNavigate}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 px-4 py-3">
        <LedIndicator color="green" label="System Online" size="xs" />
        <button
          onClick={() => {
            logout()
            onNavigate?.()
          }}
          className="mt-3 flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs text-white/50 transition-colors hover:bg-white/5 hover:text-white/80"
        >
          <LogOut size={14} />
          <span className="font-mono uppercase tracking-wider">Logout</span>
        </button>
      </div>
    </div>
  )
}

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const location = useLocation()

  const currentPage =
    navItems.find((item) => location.pathname.startsWith(item.to))?.label ??
    "Dashboard"

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setPaletteOpen((open) => !open)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden w-60 flex-shrink-0 bg-[var(--sidebar)] lg:block">
        <SidebarContent />
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-14 items-center justify-between border-b border-industrial-border bg-chassis px-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] lg:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile menu */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-[var(--muted)] hover:text-foreground lg:hidden">
                {mobileOpen ? <X size={18} /> : <Menu size={18} />}
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-60 border-none bg-[var(--sidebar)] p-0"
              >
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <SidebarContent onNavigate={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>

            <h2 className="text-sm font-bold uppercase tracking-[0.06em] text-foreground text-emboss">
              {currentPage}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPaletteOpen(true)}
              className="hidden items-center gap-1.5 rounded-md bg-[var(--muted)] px-2.5 py-1.5 font-mono text-[10px] text-muted-foreground shadow-recessed transition-colors hover:text-foreground sm:inline-flex"
              title="Open command palette"
            >
              <Command size={10} />K
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  )
}
