"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { apiFetch, getUser, logout } from "@/lib/api"

interface Stats { participants: number; totalCollected: number; prizePool: number }
interface Phase { id: string; name: string; status: string }

const STATUS_LABEL: Record<string, string> = {
  OPEN: "EN JUEGO",
  CLOSED: "CERRADA",
  PENDING: "PENDIENTE",
}

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [phases, setPhases] = useState<Phase[]>([])
  const [error, setError] = useState("")
  const [busy, setBusy] = useState("")
  const [inviteUrl, setInviteUrl] = useState("")

  async function load() {
    const [s, p] = await Promise.all([
      apiFetch<Stats>("/api/admin/stats"),
      apiFetch<Phase[]>("/api/admin/phases"),
    ])
    setStats(s)
    setPhases(p)
  }

  useEffect(() => {
    const user = getUser()
    if (!user || user.role !== "ADMIN") {
      router.replace("/login")
      return
    }
    load().catch((e) => setError((e as Error).message))
  }, [router])

  async function handleSync() {
    setBusy("sync"); setError("")
    try {
      const r = await apiFetch<{ matches: number; teams: number }>("/api/admin/sync", { method: "POST" })
      alert(`Sincronizado: ${r.teams} equipos, ${r.matches} partidos.`)
      await load()
    } catch (e) { setError((e as Error).message) } finally { setBusy("") }
  }

  async function handleInvitation() {
    setBusy("invite"); setError("")
    try {
      const r = await apiFetch<{ url: string }>("/api/admin/invitations", { method: "POST" })
      setInviteUrl(r.url)
    } catch (e) { setError((e as Error).message) } finally { setBusy("") }
  }

  async function cyclePhase(phase: Phase) {
    const next = phase.status === "PENDING" ? "OPEN" : phase.status === "OPEN" ? "CLOSED" : "PENDING"
    try {
      await apiFetch(`/api/admin/phases/${phase.id}`, { method: "PUT", body: JSON.stringify({ status: next }) })
      await load()
    } catch (e) { setError((e as Error).message) }
  }

  return (
    <div className="container mx-auto p-8 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-primary">Panel Administrativo</h1>
        <button onClick={() => { logout(); router.replace("/login") }} className="text-sm text-muted-foreground hover:text-primary">
          Cerrar sesión
        </button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/40 text-destructive-foreground text-sm rounded-md p-3 mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-card border border-border p-6 rounded-lg shadow-sm">
          <p className="text-sm text-muted-foreground uppercase tracking-wide">Participantes Activos</p>
          <p className="text-4xl font-extrabold text-primary mt-2">{stats?.participants ?? "—"}</p>
        </div>
        <div className="bg-card border border-border p-6 rounded-lg shadow-sm">
          <p className="text-sm text-muted-foreground uppercase tracking-wide">Recaudo Total</p>
          <p className="text-4xl font-extrabold text-primary mt-2">${(stats?.totalCollected ?? 0).toLocaleString("es-CO")}</p>
        </div>
        <div className="bg-emerald-950/30 border border-emerald-900/50 p-6 rounded-lg shadow-sm">
          <p className="text-sm text-emerald-500 uppercase tracking-wide">Bolsa de Premios (95%)</p>
          <p className="text-4xl font-extrabold text-emerald-400 mt-2">${(stats?.prizePool ?? 0).toLocaleString("es-CO")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-card border border-border p-6 rounded-lg shadow-sm flex flex-col gap-4">
          <h2 className="text-xl font-bold border-b border-border pb-2">Acciones Rápidas</h2>
          <button onClick={handleSync} disabled={busy === "sync"} className="bg-primary text-primary-foreground py-2 px-4 rounded-md font-medium hover:bg-primary/90 disabled:opacity-50">
            {busy === "sync" ? "Sincronizando..." : "Sincronizar API (Manual)"}
          </button>
          <button onClick={handleInvitation} disabled={busy === "invite"} className="bg-secondary text-secondary-foreground py-2 px-4 rounded-md font-medium hover:bg-secondary/80 disabled:opacity-50">
            {busy === "invite" ? "Generando..." : "Generar Enlace de Invitación"}
          </button>
          {inviteUrl && (
            <div className="bg-background border border-input rounded-md p-3 text-sm break-all">
              <p className="text-muted-foreground mb-1">Comparte este enlace:</p>
              <a href={inviteUrl} className="text-primary hover:underline">{inviteUrl}</a>
            </div>
          )}
        </div>

        <div className="bg-card border border-border p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-bold border-b border-border pb-2 mb-4">Gestión de Fases</h2>
          <ul className="space-y-4">
            {phases.map((phase) => (
              <li key={phase.id} className="flex justify-between items-center">
                <span>{phase.name}</span>
                <button
                  onClick={() => cyclePhase(phase)}
                  title="Click para cambiar estado"
                  className={
                    phase.status === "OPEN"
                      ? "text-emerald-500 text-sm font-bold bg-emerald-500/10 px-3 py-1 rounded-full hover:bg-emerald-500/20"
                      : "text-muted-foreground text-sm font-bold bg-muted/20 px-3 py-1 rounded-full hover:bg-muted/40"
                  }
                >
                  {STATUS_LABEL[phase.status] ?? phase.status}
                </button>
              </li>
            ))}
            {phases.length === 0 && <li className="text-muted-foreground text-sm">Sin fases.</li>}
          </ul>
        </div>
      </div>
    </div>
  )
}
