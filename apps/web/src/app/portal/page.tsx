"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { apiFetch, getUser, logout } from "@/lib/api"

interface Me { name: string; points: number; position: number }

interface Match {
  id: string
  matchDate: string
  status: "SCHEDULED" | "IN_PLAY" | "FINISHED"
  homeScore: number | null
  awayScore: number | null
  phaseName: string
  homeName: string
  awayName: string
  predictedHome: number | null
  predictedAway: number | null
  predictionPoints: number | null
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-CO", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    })
  } catch {
    return iso
  }
}

export default function UserPortal() {
  const router = useRouter()
  const [me, setMe] = useState<Me | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [inputs, setInputs] = useState<Record<string, { home: string; away: string }>>({})
  const [error, setError] = useState("")
  const [savingId, setSavingId] = useState("")

  async function load() {
    const [m, list] = await Promise.all([
      apiFetch<Me>("/api/me"),
      apiFetch<Match[]>("/api/matches"),
    ])
    setMe(m)
    setMatches(list)
    const seed: Record<string, { home: string; away: string }> = {}
    for (const match of list) {
      seed[match.id] = {
        home: match.predictedHome != null ? String(match.predictedHome) : "",
        away: match.predictedAway != null ? String(match.predictedAway) : "",
      }
    }
    setInputs(seed)
  }

  useEffect(() => {
    const user = getUser()
    if (!user) {
      router.replace("/login")
      return
    }
    load().catch((e) => setError((e as Error).message))
  }, [router])

  function setInput(id: string, field: "home" | "away", value: string) {
    setInputs((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
  }

  async function save(match: Match) {
    setSavingId(match.id); setError("")
    try {
      const v = inputs[match.id]
      await apiFetch("/api/predictions", {
        method: "POST",
        body: JSON.stringify({ matchId: match.id, home: Number(v.home), away: Number(v.away) }),
      })
      await load()
    } catch (e) { setError((e as Error).message) } finally { setSavingId("") }
  }

  return (
    <div className="container mx-auto p-4 md:p-8 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-primary">Mis Pronósticos</h1>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Puntos Actuales</p>
            <p className="text-2xl font-bold text-emerald-400">{me?.points ?? 0} pts</p>
          </div>
          <button onClick={() => { logout(); router.replace("/login") }} className="text-sm text-muted-foreground hover:text-primary">
            Salir
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/40 text-destructive-foreground text-sm rounded-md p-3 mb-6">
          {error}
        </div>
      )}

      {matches.length === 0 && (
        <p className="text-muted-foreground">No hay partidos disponibles todavía. Vuelve cuando el calendario esté cargado.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {matches.map((match) => {
          const editable = match.status === "SCHEDULED"
          const v = inputs[match.id] ?? { home: "", away: "" }
          return (
            <div key={match.id} className={`bg-card border border-border p-4 rounded-lg flex flex-col gap-4 relative overflow-hidden ${editable ? "" : "opacity-80"}`}>
              <div className={`absolute top-0 right-0 text-xs font-bold px-3 py-1 rounded-bl-lg ${editable ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive-foreground"}`}>
                {editable ? "ABIERTO" : "BLOQUEADO"}
              </div>
              <p className="text-xs text-muted-foreground font-mono">{match.phaseName} · {fmtDate(match.matchDate)}</p>

              <div className="flex justify-between items-center mt-2">
                <span className="font-bold text-sm flex-1 text-center">{match.homeName}</span>

                {editable ? (
                  <div className="flex gap-2 items-center">
                    <input type="number" min={0} max={20} value={v.home}
                      onChange={(e) => setInput(match.id, "home", e.target.value)}
                      className="w-12 h-12 bg-background border border-input rounded-md text-center text-xl font-bold" placeholder="-" />
                    <span className="text-muted-foreground font-bold">-</span>
                    <input type="number" min={0} max={20} value={v.away}
                      onChange={(e) => setInput(match.id, "away", e.target.value)}
                      className="w-12 h-12 bg-background border border-input rounded-md text-center text-xl font-bold" placeholder="-" />
                  </div>
                ) : (
                  <div className="flex gap-3 items-center">
                    <span className="text-2xl font-bold text-primary">{match.homeScore ?? "-"}</span>
                    <span className="text-muted-foreground font-bold">-</span>
                    <span className="text-2xl font-bold text-primary">{match.awayScore ?? "-"}</span>
                  </div>
                )}

                <span className="font-bold text-sm flex-1 text-center">{match.awayName}</span>
              </div>

              {editable ? (
                <button onClick={() => save(match)} disabled={savingId === match.id}
                  className="w-full bg-primary text-primary-foreground py-2 mt-2 rounded-md font-bold hover:bg-primary/90 disabled:opacity-50">
                  {savingId === match.id ? "Guardando..." : "Guardar Pronóstico"}
                </button>
              ) : (
                <div className="w-full text-center py-2 mt-2 border-t border-border text-sm font-bold">
                  {match.predictedHome != null ? (
                    <span className="text-muted-foreground">
                      Tu pronóstico: {match.predictedHome}-{match.predictedAway}
                      {match.status === "FINISHED" && (
                        <span className="text-emerald-400"> · +{match.predictionPoints ?? 0} pts</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Sin pronóstico</span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
