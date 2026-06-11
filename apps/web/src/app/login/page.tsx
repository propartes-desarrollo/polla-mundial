"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { apiFetch, setSession, SessionUser } from "@/lib/api"

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<"login" | "register">("login")
  const [inviteToken, setInviteToken] = useState("")
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // Si llega ?invite=... cambiamos a modo registro.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const invite = params.get("invite")
    if (invite) {
      setInviteToken(invite)
      setMode("register")
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const path = mode === "login" ? "/api/auth/login" : "/api/auth/register"
      const body =
        mode === "login"
          ? { phone, password }
          : { token: inviteToken, name, phone, password }
      const res = await apiFetch<{ token: string; user: SessionUser }>(path, {
        method: "POST",
        body: JSON.stringify(body),
      })
      setSession(res.token, res.user)
      router.push(res.user.role === "ADMIN" ? "/admin" : "/portal")
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-secondary">
      <div className="w-full max-w-md bg-card border border-border rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-primary mb-1">
          {mode === "login" ? "Iniciar Sesión" : "Crear Cuenta"}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {mode === "login"
            ? "Ingresa con tu teléfono y contraseña."
            : "Completa tus datos para unirte a la polla."}
        </p>

        {error && (
          <div className="bg-destructive/10 border border-destructive/40 text-destructive-foreground text-sm rounded-md p-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "register" && (
            <input
              className="bg-background border border-input rounded-md px-3 py-2"
              placeholder="Nombre completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}
          <input
            className="bg-background border border-input rounded-md px-3 py-2"
            placeholder="Teléfono"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <input
            type="password"
            className="bg-background border border-input rounded-md px-3 py-2"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="bg-primary text-primary-foreground py-2 rounded-md font-semibold hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Procesando..." : mode === "login" ? "Entrar" : "Registrarme"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "login" ? (
            inviteToken ? (
              <button onClick={() => setMode("register")} className="text-primary hover:underline">
                ¿Tienes invitación? Regístrate
              </button>
            ) : (
              <span>El registro es solo por invitación.</span>
            )
          ) : (
            <button onClick={() => setMode("login")} className="text-primary hover:underline">
              ¿Ya tienes cuenta? Inicia sesión
            </button>
          )}
        </div>

        <div className="mt-4 text-center">
          <Link href="/" className="text-xs text-muted-foreground hover:text-primary">
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
