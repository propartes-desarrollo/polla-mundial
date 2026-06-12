"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { apiFetch, getUser, logout } from "@/lib/api"

interface Phase { id: string; name: string; status: string }
interface Prize { label: string; amount: number }
interface PrizeInfo { participants: number; paidCount: number; totalCollected: number; prizes: Prize[] }
interface Stats { participants: number; paidCount: number; pendingCount: number; fee: number; totalCollected: number }
interface Participant { id: string; name: string; phone: string; paid: number; points: number }

const STATUS_LABEL: Record<string, string> = {
  OPEN: "EN JUEGO",
  CLOSED: "CERRADA",
  PENDING: "PENDIENTE",
}

const fmtCOP = (n: number) => `$${n.toLocaleString("es-CO")}`

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [prizeInfo, setPrizeInfo] = useState<PrizeInfo | null>(null)
  const [phases, setPhases] = useState<Phase[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [feeInput, setFeeInput] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState("")
  const [inviteUrl, setInviteUrl] = useState("")

  async function load() {
    const [s, pi, p, parts] = await Promise.all([
      apiFetch<Stats>("/api/admin/stats"),
      apiFetch<PrizeInfo>("/api/prizes"),
      apiFetch<Phase[]>("/api/admin/phases"),
      apiFetch<Participant[]>("/api/admin/participants").catch(() => [] as Participant[]),
    ])
    setStats(s)
    setPrizeInfo(pi)
    setPhases(p)
    setParticipants(parts)
    setFeeInput(String(s.fee))
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

  async function handleLockSpecials() {
    if (!confirm("¿Bloquear los pronósticos especiales de TODOS los participantes?")) return
    setBusy("lock"); setError("")
    try {
      await apiFetch("/api/admin/lock-specials", { method: "POST" })
      alert("Pronósticos especiales bloqueados.")
    } catch (e) { setError((e as Error).message) } finally { setBusy("") }
  }

  async function saveFee() {
    setBusy("fee"); setError("")
    try {
      await apiFetch("/api/admin/fee", { method: "PUT", body: JSON.stringify({ fee: Number(feeInput) }) })
      await load()
    } catch (e) { setError((e as Error).message) } finally { setBusy("") }
  }

  async function togglePaid(p: Participant) {
    // Optimista: refleja el cambio al instante
    setParticipants((prev) => prev.map((x) => x.id === p.id ? { ...x, paid: p.paid ? 0 : 1 } : x))
    try {
      await apiFetch(`/api/admin/participants/${p.id}/payment`, {
        method: "PUT", body: JSON.stringify({ paid: !p.paid }),
      })
      const [s, pi] = await Promise.all([apiFetch<Stats>("/api/admin/stats"), apiFetch<PrizeInfo>("/api/prizes")])
      setStats(s); setPrizeInfo(pi)
    } catch (e) {
      setError((e as Error).message)
      setParticipants((prev) => prev.map((x) => x.id === p.id ? { ...x, paid: p.paid } : x)) // revertir
    }
  }

  async function cyclePhase(phase: Phase) {
    const next = phase.status === "PENDING" ? "OPEN" : phase.status === "OPEN" ? "CLOSED" : "PENDING"
    try {
      await apiFetch(`/api/admin/phases/${phase.id}`, { method: "PUT", body: JSON.stringify({ status: next }) })
      await load()
    } catch (e) { setError((e as Error).message) }
  }

  return (
    <div className="container mx-auto p-4 md:p-8 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="headline text-3xl md:text-4xl">Panel <span className="text-primary">Admin</span></h1>
        <button onClick={() => { logout(); router.replace("/login") }} className="text-xs font-bold uppercase text-muted-foreground hover:text-primary">
          Cerrar sesión
        </button>
      </div>

      {error && <div className="bg-primary/15 border border-primary text-sm rounded p-3 mb-6 font-medium">{error}</div>}

      {/* Métricas de recaudo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-border p-4 rounded-lg">
          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide">Inscritos</p>
          <p className="text-3xl font-black mt-1">{stats?.participants ?? "—"}</p>
        </div>
        <div className="bg-card border border-border p-4 rounded-lg">
          <p className="text-[10px] uppercase font-bold text-emerald-400 tracking-wide">Pagaron</p>
          <p className="text-3xl font-black text-emerald-400 mt-1">{stats?.paidCount ?? "—"}</p>
        </div>
        <div className="bg-card border border-border p-4 rounded-lg">
          <p className="text-[10px] uppercase font-bold text-primary tracking-wide">Pendientes</p>
          <p className="text-3xl font-black text-primary mt-1">{stats?.pendingCount ?? "—"}</p>
        </div>
        <div className="bg-card border border-border p-4 rounded-lg">
          <p className="text-[10px] uppercase font-bold text-accent tracking-wide">Recaudo</p>
          <p className="text-2xl font-black text-accent mt-1">{fmtCOP(stats?.totalCollected ?? 0)}</p>
        </div>
      </div>

      {/* Cuota configurable */}
      <div className="bg-card border border-border rounded-lg p-4 mb-8 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide block mb-1">Cuota de inscripción (COP)</label>
          <input type="number" min={0} value={feeInput} onChange={(e) => setFeeInput(e.target.value)}
            className="bg-input border border-border rounded px-3 py-2 w-40 font-bold" />
        </div>
        <button onClick={saveFee} disabled={busy === "fee"}
          className="bg-secondary text-secondary-foreground py-2 px-4 rounded font-bold uppercase text-sm hover:bg-secondary/80 disabled:opacity-50">
          {busy === "fee" ? "Guardando..." : "Actualizar cuota"}
        </button>
        <p className="text-xs text-muted-foreground">El recaudo = participantes que pagaron × cuota.</p>
      </div>

      {/* Premios */}
      <section className="mb-8">
        <h2 className="section-bar headline text-xl mb-4">Premios</h2>
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {(prizeInfo?.prizes ?? []).map((p, i) => (
                <tr key={p.label} className={i % 2 ? "bg-black/20" : ""}>
                  <td className="px-4 py-3 font-medium">{p.label}</td>
                  <td className="px-4 py-3 text-right font-black text-accent whitespace-nowrap">{fmtCOP(p.amount)}</td>
                </tr>
              ))}
              {!prizeInfo?.prizes?.length && (
                <tr><td className="px-4 py-6 text-center text-muted-foreground">Sin recaudo aún.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Control de pagos */}
      <section className="mb-8">
        <h2 className="section-bar headline text-xl mb-4">Control de pagos</h2>
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-black/40 text-muted-foreground text-[11px] uppercase tracking-wider font-bold">
                <th className="p-3 text-left">Participante</th>
                <th className="p-3 text-left hidden sm:table-cell">Teléfono</th>
                <th className="p-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((p, i) => (
                <tr key={p.id} className={`border-t border-border ${i % 2 ? "bg-black/20" : ""}`}>
                  <td className="p-3 font-bold uppercase">{p.name}</td>
                  <td className="p-3 text-muted-foreground hidden sm:table-cell">{p.phone}</td>
                  <td className="p-3 text-center">
                    <button onClick={() => togglePaid(p)}
                      className={p.paid
                        ? "text-xs font-black uppercase bg-emerald-500/15 text-emerald-400 px-3 py-1 rounded-full hover:bg-emerald-500/25"
                        : "text-xs font-black uppercase bg-primary/15 text-primary px-3 py-1 rounded-full hover:bg-primary/25"}>
                      {p.paid ? "✓ Pagó" : "Pendiente"}
                    </button>
                  </td>
                </tr>
              ))}
              {participants.length === 0 && (
                <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">
                  No hay participantes aún (o falta correr la migración de pagos).
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border p-5 rounded-lg flex flex-col gap-3">
          <h2 className="headline text-lg border-b border-border pb-2">Acciones rápidas</h2>
          <button onClick={handleSync} disabled={busy === "sync"}
            className="bg-primary text-primary-foreground py-2.5 px-4 rounded font-black uppercase text-sm hover:bg-primary/90 disabled:opacity-50">
            {busy === "sync" ? "Sincronizando..." : "Sincronizar resultados"}
          </button>
          <button onClick={handleInvitation} disabled={busy === "invite"}
            className="bg-secondary text-secondary-foreground py-2.5 px-4 rounded font-bold uppercase text-sm hover:bg-secondary/80 disabled:opacity-50">
            {busy === "invite" ? "Generando..." : "Generar enlace de invitación"}
          </button>
          <button onClick={handleLockSpecials} disabled={busy === "lock"}
            className="bg-accent text-accent-foreground py-2.5 px-4 rounded font-bold uppercase text-sm hover:bg-accent/80 disabled:opacity-50">
            {busy === "lock" ? "Bloqueando..." : "🔒 Bloquear pronósticos especiales"}
          </button>
          {inviteUrl && (
            <div className="bg-input border border-border rounded p-3 text-sm break-all">
              <p className="text-muted-foreground mb-1 text-xs uppercase font-bold">Comparte este enlace:</p>
              <a href={inviteUrl} className="text-accent hover:underline">{inviteUrl}</a>
            </div>
          )}
        </div>

        <div className="bg-card border border-border p-5 rounded-lg">
          <h2 className="headline text-lg border-b border-border pb-2 mb-4">Gestión de fases</h2>
          <ul className="space-y-3">
            {phases.map((phase) => (
              <li key={phase.id} className="flex justify-between items-center">
                <span className="font-medium">{phase.name}</span>
                <button
                  onClick={() => cyclePhase(phase)}
                  title="Click para cambiar estado"
                  className={
                    phase.status === "OPEN"
                      ? "text-emerald-400 text-xs font-black uppercase bg-emerald-500/10 px-3 py-1 rounded-full hover:bg-emerald-500/20"
                      : "text-muted-foreground text-xs font-black uppercase bg-muted/30 px-3 py-1 rounded-full hover:bg-muted/50"
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
