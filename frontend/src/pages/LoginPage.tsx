import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Package, AlertCircle } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LedIndicator } from "@/components/industrial/LedIndicator"

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState("")

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setError("")
    try {
      await login(data.username, data.password)
      navigate("/dashboard", { replace: true })
    } catch {
      setError("Invalid credentials. Please try again.")
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="relative w-full max-w-sm rounded-xl bg-chassis p-8 shadow-floating">
        {/* Corner screws */}
        {[
          "top-3 left-3",
          "top-3 right-3",
          "bottom-3 left-3",
          "bottom-3 right-3",
        ].map((pos) => (
          <div
            key={pos}
            className={`absolute h-2.5 w-2.5 rounded-full ${pos}`}
            style={{
              background:
                "radial-gradient(circle, rgba(0,0,0,0.2) 20%, rgba(0,0,0,0.08) 40%, transparent 60%)",
            }}
          />
        ))}

        {/* Vent slots */}
        <div className="absolute top-3 right-10 flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-6 w-1 rounded-full bg-[var(--muted)]"
              style={{ boxShadow: "inset 1px 1px 2px rgba(0,0,0,0.1)" }}
            />
          ))}
        </div>

        {/* Logo */}
        <div className="mb-6 flex flex-col items-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-panel-dark shadow-[0_0_20px_rgba(255,71,87,0.3)]">
            <Package size={28} className="text-[var(--primary)]" />
          </div>
          <h1 className="font-mono text-sm font-bold uppercase tracking-[0.12em] text-foreground text-emboss">
            VSMS Control
          </h1>
          <div className="mt-2">
            <LedIndicator color="green" label="Ready" size="xs" />
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-md bg-[#e74c3c]/10 px-3 py-2 text-xs text-[#e74c3c]">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Username
            </Label>
            <Input
              {...register("username")}
              autoComplete="username"
              className="h-12 rounded-md border-none bg-chassis px-4 font-mono shadow-recessed placeholder:text-muted-foreground/50 focus-visible:shadow-[var(--shadow-recessed),0_0_0_2px_var(--primary)]"
              placeholder="Enter username"
            />
            {errors.username && (
              <p className="text-xs text-[#e74c3c]">{errors.username.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Password
            </Label>
            <Input
              {...register("password")}
              type="password"
              autoComplete="current-password"
              className="h-12 rounded-md border-none bg-chassis px-4 font-mono shadow-recessed placeholder:text-muted-foreground/50 focus-visible:shadow-[var(--shadow-recessed),0_0_0_2px_var(--primary)]"
              placeholder="Enter password"
            />
            {errors.password && (
              <p className="text-xs text-[#e74c3c]">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              "Authenticate"
            )}
          </Button>
        </form>

        <p className="mt-4 text-center font-mono text-[9px] uppercase tracking-[0.06em] text-muted-foreground/50">
          Vehicle Service Management System v1.0
        </p>
      </div>
    </div>
  )
}
