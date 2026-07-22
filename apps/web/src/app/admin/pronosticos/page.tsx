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
interface RankRow { position: number; name: string; points: number; exactScores: number; correctWinners: number }
interface PrizeWinner { name: string; position: number }
interface Prize { label: string; amount: number; winners?: PrizeWinner[]; perWinner?: number | null }
interface PrizeInfo { participants: number; paidCount: number; totalCollected: number; prizes: Prize[] }

type Mode = "match" | "participant" | "goleador"

const fmtDateShort = (iso: string) => {
  try { return new Date(iso).toLocaleString("es-CO", { day: "2-digit", month: "short" }) } catch { return iso }
}

// Misma normalización del backend (normName): minúsculas, sin tildes, espacios colapsados.
const normName = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim().replace(/\s+/g, " ")

// Marcador oficial de un partido: 90' + nota de penales/tiempo extra.
function actualLabel(m: PredMatch): string {
  if (m.status !== "FINISHED" || m.homeScore == null || m.awayScore == null) return "—"
  let s = `${m.homeScore}-${m.awayScore}`
  if (m.duration === "PENALTY_SHOOTOUT") s += ` (pen ${m.penaltyHome ?? "?"}-${m.penaltyAway ?? "?"})`
  else if (m.duration === "EXTRA_TIME") s += ` (TE ${m.fullHome ?? "?"}-${m.fullAway ?? "?"})`
  return s
}

// --- CSV ---
function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
function toCSV(rows: (string | number | null | undefined)[][]): string {
  return rows.map((r) => r.map(csvEscape).join(",")).join("\r\n")
}
function downloadCSV(filename: string, csv: string) {
  // BOM UTF-8 (﻿) para que Excel respete tildes y ñ.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Agrupa las respuestas del goleador por nombre normalizado.
function goleadorGroups(predData: PredData) {
  const nameById = new Map(predData.participants.map((p) => [p.id, p.name]))
  const groups = new Map<string, { variants: Set<string>; users: string[] }>()
  for (const s of predData.specials) {
    if (!s.topScorerName || !s.topScorerName.trim()) continue
    const key = normName(s.topScorerName)
    const g = groups.get(key) ?? { variants: new Set<string>(), users: [] }
    g.variants.add(s.topScorerName.trim())
    g.users.push(nameById.get(s.userId) ?? s.userId)
    groups.set(key, g)
  }
  return [...groups.entries()]
    .map(([key, g]) => ({ key, variants: [...g.variants], users: g.users.sort() }))
    .sort((a, b) => b.users.length - a.users.length)
}

export default function AdminPredictionsPage() {
  const router = useRouter()
  const [predData, setPredData] = useState<PredData | null>(null)
  const [ranking, setRanking] = useState<RankRow[]>([])
  const [prizeInfo, setPrizeInfo] = useState<PrizeInfo | null>(null)
  const [mode, setMode] = useState<Mode>("match")
  const [predMatchId, setPredMatchId] = useState("")
  const [predUserId, setPredUserId] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const user = getUser()
    if (!user || user.role !== "ADMIN") { router.replace("/login"); return }
    Promise.all([
      apiFetch<PredData>("/api/admin/predictions"),
      apiFetch<RankRow[]>("/api/ranking").catch(() => [] as RankRow[]),
      apiFetch<PrizeInfo | null>("/api/prizes").catch(() => null),
    ])
      .then(([d, r, pz]) => {
        setPredData(d)
        setRanking(r)
        setPrizeInfo(pz)
        if (d.matches.length) setPredMatchId(d.matches[0].id)
        if (d.participants.length) setPredUserId(d.participants[0].id)
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [router])

  function exportStandings() {
    const rows: (string | number)[][] = [["Puesto", "Participante", "Puntos", "Marcadores exactos", "Ganadores acertados"]]
    ranking.forEach((r) => rows.push([r.position, r.name, r.points, r.exactScores, r.correctWinners]))
    downloadCSV("posiciones-finales.csv", toCSV(rows))
  }
  function exportSpecials() {
    if (!predData) return
    const spById = new Map(predData.specials.map((s) => [s.userId, s]))
    const rows: (string | null)[][] = [["Participante", "Campeon", "Subcampeon", "Goleador"]]
    predData.participants.forEach((p) => {
      const s = spById.get(p.id)
      rows.push([p.name, s?.championName ?? "", s?.runnerUpName ?? "", s?.topScorerName ?? ""])
    })
    downloadCSV("pronosticos-especiales.csv", toCSV(rows))
  }
  function exportPrizes() {
    if (!prizeInfo) return
    const rows: (string | number)[][] = [["Premio", "Monto (COP)", "Gana(n)", "Por ganador (COP)"]]
    prizeInfo.prizes.forEach((pz) => {
      const winners = (pz.winners ?? []).map((w) => `${w.name} (${w.position}o)`).join(" / ")
      rows.push([pz.label, pz.amount, winners, pz.perWinner ?? ""])
    })
    downloadCSV("premios.csv", toCSV(rows))
  }
  function exportGoleador() {
    if (!predData) return
    const rows: (string | number)[][] = [["Respuesta (normalizada)", "Variantes escritas", "Cuantos", "Participantes"]]
    goleadorGroups(predData).forEach((g) => rows.push([g.key, g.variants.join(" / "), g.users.length, g.users.join(" / ")]))
    downloadCSV("goleador-respuestas.csv", toCSV(rows))
  }
  // Todos los pronósticos de partidos con su puntaje: una fila por pronóstico.
  function exportAllPredictions() {
    if (!predData) return
    const nameById = new Map(predData.participants.map((p) => [p.id, p.name]))
    const matchById = new Map(predData.matches.map((m) => [m.id, m]))
    const rows: (string | number)[][] = [["Participante", "Fase", "Partido", "Fecha", "Pronostico", "Resultado (90 min)", "Puntos"]]
    predData.predictions
      .map((pr) => ({ pr, m: matchById.get(pr.matchId), name: nameById.get(pr.userId) ?? pr.userId }))
      .filter((x): x is { pr: PredRow; m: PredMatch; name: string } => !!x.m)
      .sort((a, b) => a.name.localeCompare(b.name) || new Date(a.m.matchDate).getTime() - new Date(b.m.matchDate).getTime())
      .forEach(({ pr, m, name }) => {
        rows.push([
          name,
          m.phaseName,
          `${m.homeName} vs ${m.awayName}`,
          fmtDateShort(m.matchDate),
          `${pr.predictedHome}-${pr.predictedAway}`,
          actualLabel(m),
          m.status === "FINISHED" ? (pr.points ?? 0) : "",
        ])
      })
    downloadCSV("pronosticos-detallados.csv", toCSV(rows))
  }

  const predIndex = new Map<string, PredRow>()
  predData?.predictions.forEach((p) => predIndex.set(`${p.userId}|${p.matchId}`, p))

  const toggleBtn = (m: Mode, label: string) => (
    <button onClick={() => setMode(m)}
      className={mode === m
        ? "text-xs font-black uppercase px-3 py-1.5 rounded bg-primary text-primary-foreground"
        : "text-xs font-black uppercase px-3 py-1.5 rounded text-muted-foreground hover:text-foreground"}>
      {label}
    </button>
  )
  const exportBtn = (label: string, fn: () => void) => (
    <button onClick={fn}
      className="text-xs font-black uppercase px-3 py-1.5 rounded bg-secondary text-secondary-foreground hover:bg-secondary/80">
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
          {/* Exportar a hoja de cálculo (CSV, se abre en Excel / Google Sheets) */}
          <div className="bg-card border border-border rounded-lg p-3 mb-4 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-black uppercase text-muted-foreground mr-1">Exportar CSV:</span>
            {exportBtn("Posiciones", exportStandings)}
            {exportBtn("Pronósticos (todos)", exportAllPredictions)}
            {exportBtn("Especiales", exportSpecials)}
            {exportBtn("Premios", exportPrizes)}
            {exportBtn("Goleador", exportGoleador)}
          </div>

          <div className="flex flex-wrap gap-1 bg-card border border-border rounded-lg p-1 w-fit mb-4">
            {toggleBtn("match", "Por partido")}
            {toggleBtn("participant", "Por participante")}
            {toggleBtn("goleador", "Goleador")}
          </div>

          {mode === "match" ? (() => {
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
          })() : mode === "participant" ? (() => {
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
          })() : (() => {
            const data = predData!
            const groups = goleadorGroups(data)
            return (
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <p className="p-4 border-b border-border text-xs text-muted-foreground">
                  Todas las respuestas del goleador, agrupadas ignorando tildes y mayúsculas. Los
                  errores de escritura (ej. <b className="text-foreground">Mpape</b>, <b className="text-foreground">Kiliam</b>)
                  quedan como grupos aparte para que decidas a mano quiénes acertaron. La app solo
                  suma automáticamente a quienes coincidan exactamente (ya normalizado) con el goleador oficial.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-black/40 text-muted-foreground text-[11px] uppercase tracking-wider font-bold">
                        <th className="p-3 text-left">Respuesta</th>
                        <th className="p-3 text-center w-20">Cuántos</th>
                        <th className="p-3 text-left">Participantes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groups.map((g, i) => (
                        <tr key={g.key} className={i % 2 ? "border-t border-border bg-black/20" : "border-t border-border"}>
                          <td className="p-3">
                            <span className="font-black">{g.key}</span>
                            {g.variants.length > 1 && (
                              <span className="block text-[11px] text-muted-foreground">Escrito: {g.variants.join(" · ")}</span>
                            )}
                          </td>
                          <td className="p-3 text-center font-black text-accent">{g.users.length}</td>
                          <td className="p-3 text-muted-foreground">{g.users.join(", ")}</td>
                        </tr>
                      ))}
                      {groups.length === 0 && (
                        <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">Nadie ha registrado goleador todavía.</td></tr>
                      )}
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
