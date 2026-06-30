"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { apiFetch, getUser } from "@/lib/api"

interface PredMatch {
  id: string; phaseId: string; phaseName: string; matchDate: string; status: string
  homeScore: number | null; awayScore: number | null
  duration: "REGULAR" | "EXTRA_TIME" | "PENALTY_SHOOTOUT" | null
  winner: "HOME" | "AWAY" | null
  penaltyHome: number | null; penaltyAway: number | null
  fullHome: number | null; fullAway: number | null
  homeName: string; awayName: string
}
interface PredRow { userId: string; matchId: string; predictedHome: number; predictedAway: number; points: number | null; locked: number }
interface PredSpecial { userId: string; championName: string | null; runnerUpName: string | null; topScorerName: string | null }
interface PredData { participants: { id: string; name: string }[]; matches: PredMatch[]; predictions: PredRow[]; specials: PredSpecial[] }

const fmtDateShort = (iso: string) => {
  try { return new Date(iso).toLocaleString("es-CO", { day: "2-digit", month: "short" }) } catch { return iso }
}

// Marcador oficial de un partido: 90' + nota de penales/tiempo extra.
function actualLabel(m: PredMatch): string {
  if (m.status !== "FINISHED" || m.homeScore == null || m.awayScore == null) return "—"
  let s = `${m.homeScore}-${m.awayScore}`
  if (m.duration === "PENALTY_SHOOTOUT") s += ` (pen ${m.penaltyHome ?? "?"}-${m.penaltyAway ?? "?"})`
  else if (m.duration === "EXTRA_TIME") s += ` (TE ${m.fullHome ?? "?"}-${m.fullAway ?? "?"})`
  return s
}

export default function AdminPredictionsPage() {
  const router = useRouter()
  const [predData, setPredData] = useState<PredData | null>(null)
  const [predMode, setPredMode] = useState<"match" | "participant">("match")
  const [predMatchId, setPredMatchId] = useState("")
  const [predUserId, setPredUserId] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const user = getUser()
    if (!user || user.role !== "ADMIN") { router.replace("/login"); return }
    apiFetch<PredData>("/api/admin/predictions")
      .then((d) => {
        setPredData(d)
        if (d.matches.length) setPredMatchId(d.matches[0].id)
        if (d.participants.length) setPredUserId(d.participants[0].id)
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [router])

  const predIndex = new Map<string, PredRow>()
  predData?.predictions.forEach((p) => predIndex.set(`${p.userId}|${p.matchId}`, p))

  const toggleBtn = (mode: "match" | "participant", label: string) => (
    <button onClick={() => setPredMode(mode)}
      className={predMode === mode
        ? "text-xs font-black uppercase px-3 py-1.5 rounded bg-primary text-primary-foreground"
        : "text-xs font-black uppercase px-3 py-1.5 rounded text-muted-foreground hover:text-foreground"}>
      {label}
    </button>
  )

  return (
    <div className="container mx-auto p-4 md:p-8 min-h-screen">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h1 className="headline text-3xl md:text-4xl">Pronósticos de <span className="text-primary">participantes</span></h1>
        <Link href="/admin" className="text-xs font-bold uppercase text-muted-foreground hover:text-primary">← Panel admin</Link>
      </div>

      {error && <div className="bg-primary/15 border border-primary text-sm rounded p-3 mb-6 font-medium">{error}</div>}

      {loading ? (
        <p className="text-muted-foreground">Cargando pronósticos...</p>
      ) : !predData ? (
        <p className="text-muted-foreground">No se pudieron cargar los pronósticos.</p>
      ) : (
        <>
          <div className="flex gap-1 bg-card border border-border rounded-lg p-1 w-fit mb-4">
            {toggleBtn("match", "Por partido")}
            {toggleBtn("participant", "Por participante")}
          </div>

          {predMode === "match" ? (() => {
            const data = predData!
            const m = data.matches.find((x) => x.id === predMatchId)
            return (
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="p-4 border-b border-border">
                  <select value={predMatchId} onChange={(e) => setPredMatchId(e.target.value)}
                    className="w-full bg-input border border-border rounded px-3 py-2 text-sm font-bold">
                    {data.matches.map((x) => (
                      <option key={x.id} value={x.id}>{x.phaseName} · {x.homeName} vs {x.awayName} · {fmtDateShort(x.matchDate)}</option>
                    ))}
                  </select>
                  {m && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Resultado (90 min): <b className="text-foreground">{actualLabel(m)}</b>
                      {m.winner && (m.duration === "PENALTY_SHOOTOUT" || m.duration === "EXTRA_TIME") && (
                        <> · Avanza <b className="text-foreground">{m.winner === "HOME" ? m.homeName : m.awayName}</b></>
                      )}
                    </p>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-black/40 text-muted-foreground text-[11px] uppercase tracking-wider font-bold">
                        <th className="p-3 text-left">Participante</th>
                        <th className="p-3 text-center">Pronóstico</th>
                        <th className="p-3 text-center w-20">Puntos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.participants.map((u, i) => {
                        const pr = predIndex.get(`${u.id}|${predMatchId}`)
                        return (
                          <tr key={u.id} className={i % 2 ? "border-t border-border bg-black/20" : "border-t border-border"}>
                            <td className="p-3 font-bold uppercase">{u.name}</td>
                            <td className="p-3 text-center font-black">
                              {pr ? `${pr.predictedHome}-${pr.predictedAway}` : <span className="text-muted-foreground font-normal">Sin pronóstico</span>}
                            </td>
                            <td className="p-3 text-center font-black text-accent">{pr && m?.status === "FINISHED" ? (pr.points ?? 0) : "—"}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })() : (() => {
            const data = predData!
            const sp = data.specials.find((x) => x.userId === predUserId)
            return (
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="p-4 border-b border-border">
                  <select value={predUserId} onChange={(e) => setPredUserId(e.target.value)}
                    className="w-full bg-input border border-border rounded px-3 py-2 text-sm font-bold">
                    {data.participants.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground mt-2">
                    🏆 Campeón: <b className="text-foreground">{sp?.championName ?? "—"}</b> · 🥈 Subcampeón: <b className="text-foreground">{sp?.runnerUpName ?? "—"}</b> · ⚽ Goleador: <b className="text-foreground">{sp?.topScorerName || "—"}</b>
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-black/40 text-muted-foreground text-[11px] uppercase tracking-wider font-bold">
                        <th className="p-3 text-left">Partido</th>
                        <th className="p-3 text-center">Pronóstico</th>
                        <th className="p-3 text-center">Resultado</th>
                        <th className="p-3 text-center w-20">Puntos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.matches.map((m, i) => {
                        const pr = predIndex.get(`${predUserId}|${m.id}`)
                        return (
                          <tr key={m.id} className={i % 2 ? "border-t border-border bg-black/20" : "border-t border-border"}>
                            <td className="p-3">
                              <span className="font-bold">{m.homeName} vs {m.awayName}</span>
                              <span className="block text-[11px] text-muted-foreground">{m.phaseName} · {fmtDateShort(m.matchDate)}</span>
                            </td>
                            <td className="p-3 text-center font-black">
                              {pr ? `${pr.predictedHome}-${pr.predictedAway}` : <span className="text-muted-foreground font-normal">—</span>}
                            </td>
                            <td className="p-3 text-center">{actualLabel(m)}</td>
                            <td className="p-3 text-center font-black text-accent">{pr && m.status === "FINISHED" ? (pr.points ?? 0) : "—"}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })()}
        </>
      )}
    </div>
  )
}
