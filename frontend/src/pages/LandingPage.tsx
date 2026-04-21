import { Link } from "react-router-dom"
import {
  ArrowRight,
  Package,
  ClipboardList,
  FileText,
  BarChart3,
  Wrench,
  Command,
} from "lucide-react"
import { IndustrialCard } from "@/components/industrial/IndustrialCard"
import { LedIndicator } from "@/components/industrial/LedIndicator"
import { useAuth } from "@/hooks/useAuth"

const FEATURES = [
  {
    icon: ClipboardList,
    title: "Service Orders",
    body: "End-to-end lifecycle from draft to payment. Snapshots prices so historical records stay intact when parts change price.",
  },
  {
    icon: Wrench,
    title: "New-vs-Repair Compare",
    body: "Every part is linked to its repair alternative. Show customers savings side-by-side before they pick.",
  },
  {
    icon: BarChart3,
    title: "Revenue Dashboard",
    body: "Daily, monthly, yearly revenue with click-through drill-down. Know exactly which month every rupee came from.",
  },
  {
    icon: FileText,
    title: "PDF Invoicing",
    body: "Download tax invoices on any completed order. Styled, printable, ready to hand to the customer.",
  },
  {
    icon: Package,
    title: "Parts Inventory",
    body: "Track stock, flag zero-stock parts, and suggest the repair service when a new part isn't available.",
  },
  {
    icon: Command,
    title: "Keyboard-first",
    body: "⌘K opens a command palette from anywhere. Jump to any page, create any resource, search components or vehicles in a keystroke.",
  },
]

export default function LandingPage() {
  const { isAuthenticated } = useAuth()
  const ctaTarget = isAuthenticated ? "/dashboard" : "/login"

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="border-b border-industrial-border bg-chassis/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--primary)] shadow-[0_0_12px_rgba(255,71,87,0.4)]">
              <Package size={18} className="text-white" />
            </div>
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.12em]">
                VSMS
              </p>
              <p className="font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground">
                Service Manager
              </p>
            </div>
          </div>
          <Link
            to={ctaTarget}
            className="group inline-flex items-center gap-2 rounded-md bg-[var(--primary)] px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-white shadow-card transition-all hover:brightness-110 btn-press"
          >
            {isAuthenticated ? "Open Dashboard" : "Sign In"}
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-16 pb-14 lg:px-8 lg:pt-24 lg:pb-20">
        <div className="max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-industrial-border bg-chassis px-3 py-1 shadow-recessed">
            <LedIndicator color="green" size="xs" />
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              Vehicle Service Management
            </span>
          </div>

          <h1 className="font-mono text-4xl font-bold uppercase leading-[1.05] tracking-[0.02em] text-foreground text-emboss sm:text-5xl lg:text-6xl">
            Run your auto workshop
            <br />
            <span className="text-[var(--primary)]">like a service desk.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground lg:text-lg">
            Quote, service, invoice, and track revenue for every vehicle that
            comes in. Built for shops that want clean books, fast turnaround,
            and customers who know exactly what they're paying for.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to={ctaTarget}
              className="group inline-flex items-center gap-2 rounded-md bg-[var(--primary)] px-6 py-3 font-mono text-xs font-bold uppercase tracking-[0.08em] text-white shadow-card transition-all hover:brightness-110 btn-press"
            >
              {isAuthenticated ? "Go to Dashboard" : "Get Started"}
              <ArrowRight
                size={14}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 rounded-md border border-industrial-border bg-chassis px-6 py-3 font-mono text-xs font-bold uppercase tracking-[0.08em] text-foreground shadow-card transition-colors hover:text-[var(--primary)]"
            >
              See Features
            </a>
          </div>

          {/* Stats row */}
          <dl className="mt-12 grid grid-cols-3 gap-4 sm:max-w-xl">
            <StatCard value="6" label="Status states" />
            <StatCard value="INR" label="First-class" />
            <StatCard value="A4" label="PDF invoices" />
          </dl>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="border-t border-industrial-border bg-[var(--muted)]/30 py-16 lg:py-24"
      >
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <div className="mb-10 max-w-2xl">
            <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--primary)]">
              // Features
            </p>
            <h2 className="font-mono text-2xl font-bold uppercase tracking-[0.04em] text-foreground text-emboss sm:text-3xl">
              Everything a busy shop needs
            </h2>
            <p className="mt-4 text-muted-foreground">
              No spreadsheets, no pen-and-paper. Every moving part of service
              work in one place.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => {
              const Icon = f.icon
              return (
                <IndustrialCard key={f.title} className="p-6" hover={true}>
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
                    <Icon size={18} />
                  </div>
                  <h3 className="mb-2 font-mono text-sm font-bold uppercase tracking-[0.06em]">
                    {f.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {f.body}
                  </p>
                </IndustrialCard>
              )
            })}
          </div>
        </div>
      </section>

      {/* Tech strip */}
      <section className="border-t border-industrial-border py-10">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <p className="mb-4 text-center font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Stack
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
            <span>Django 5</span>
            <span className="text-[var(--primary)]/40">·</span>
            <span>DRF + SimpleJWT</span>
            <span className="text-[var(--primary)]/40">·</span>
            <span>PostgreSQL</span>
            <span className="text-[var(--primary)]/40">·</span>
            <span>React + TypeScript</span>
            <span className="text-[var(--primary)]/40">·</span>
            <span>TanStack Query</span>
            <span className="text-[var(--primary)]/40">·</span>
            <span>Tailwind + shadcn</span>
            <span className="text-[var(--primary)]/40">·</span>
            <span>Recharts</span>
            <span className="text-[var(--primary)]/40">·</span>
            <span>WeasyPrint</span>
          </div>
        </div>
      </section>

      {/* CTA footer */}
      <section className="border-t border-industrial-border bg-[var(--muted)]/30 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center lg:px-8">
          <h2 className="font-mono text-2xl font-bold uppercase tracking-[0.04em] text-foreground text-emboss sm:text-3xl">
            Ready to work a service order?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Log in with the demo credentials and click through a full order
            lifecycle — quote, start, complete, pay, invoice.
          </p>
          <Link
            to={ctaTarget}
            className="group mt-8 inline-flex items-center gap-2 rounded-md bg-[var(--primary)] px-6 py-3 font-mono text-xs font-bold uppercase tracking-[0.08em] text-white shadow-card transition-all hover:brightness-110 btn-press"
          >
            {isAuthenticated ? "Open the App" : "Try the Demo"}
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
          <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
            Demo credentials: <span className="text-foreground">ritam</span> /{" "}
            <span className="text-foreground">ritam#1234</span>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-industrial-border py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 text-center lg:flex-row lg:px-8 lg:text-left">
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
            VSMS · Vehicle Service Management
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
            Built for a 24-hour assessment
          </p>
        </div>
      </footer>
    </div>
  )
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-md border border-industrial-border bg-chassis p-3 shadow-card">
      <p className="font-mono text-lg font-bold text-foreground text-emboss">
        {value}
      </p>
      <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
    </div>
  )
}
