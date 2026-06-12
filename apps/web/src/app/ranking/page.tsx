"use client"

import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"

interface RankRow {
  position: number
  name: string
  points: number
  exactScores: number
  correctWinners: number
}

interface Prize { label: string; amount: number }
interface PrizeInfo { participants: number; totalCollected: number; prizes: Prize[] }

const fmtCOP = (n: number) => `$${n.toLocaleString("es-CO")}`

const ROW_ACCENT = ["border-l-4 border-accent", "border-l-4 border-zinc-400", "border-l-4 border-amber-700"]

export default function RankingPage() {
  const [rows, setRows] = useState<RankRow[]>([])
  const [prizeInfo, setPrizeInfo] = useState<PrizeInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    Promise.all([
      apiFetch<RankRow[]>("/api/ranking"),
      apiFetch<PrizeInfo>("/api/prizes"),
    ])
      .then(([r, p]) => { setRows(r); setPrizeInfo(p) })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="container mx-auto p-4 md:p-8 min-h-screen">
      <h1 className="headline text-3xl md:text-4xl mb-6">
        Tabla de <span className="text-primary">Posiciones</span>
      </h1>

      {error && <div className="bg-primary/15 border border-primary text-sm rounded p-3 mb-4 font-medium">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tabla */}
        <div className="lg:col-span-2 bg-card rounded-lg border border-border overflow-hidden">
          <div className="bg-primary px-4 py-2">
            <span className="headline text-sm text-primary-foreground">Ranking general</span>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/40 text-muted-foreground text-[11px] uppercase tracking-wider font-bold">
                <th className="p-3 w-12">#</th>
                <th className="p-3">Participante</th>
                <th className="p-3 text-right">Pts</th>
                <th className="p-3 text-right hidden sm:table-cell">Exactos</th>
                <th className="p-3 text-right hidden md:table-cell">Ganadores</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Cargando...</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Aún no hay participantes con puntos.</td></tr>
              )}
              {rows.map((user, idx) => (
                <tr key={user.position}
                  className={`border-t border-border hover:bg-muted/20 transition-colors ${ROW_ACCENT[idx] ?? ""} ${idx % 2 ? "bg-black/20" : ""}`}>
                  <td className="p-3 font-black text-lg">
                    {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : user.position}
                  </td>
                  <td className="p-3 font-bold uppercase text-sm">{user.name}</td>
                  <td className="p-3 text-right font-black text-accent text-lg">{user.points}</td>
                  <td className="p-3 text-right text-muted-foreground hidden sm:table-cell">{user.exactScores}</td>
                  <td className="p-3 text-right text-muted-foreground hidden md:table-cell">{user.correctWinners}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Premios */}
        <div className="bg-card rounded-lg border border-border overflow-hidden h-fit">
          <div className="bg-accent px-4 py-2">
            <span className="headline text-sm text-accent-foreground">💰 Premios en juego</span>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {(prizeInfo?.prizes ?? []).map((p, i) => (
                <tr key={p.label} className={`border-t border-border ${i % 2 ? "bg-black/20" : ""}`}>
                  <td className="px-4 py-2.5 font-medium text-xs">{p.label}</td>
                  <td className="px-4 py-2.5 text-right font-black text-accent whitespace-nowrap">{fmtCOP(p.amount)}</td>
                </tr>
              ))}
              {!prizeInfo?.prizes?.length && (
                <tr><td className="px-4 py-6 text-center text-muted-foreground text-xs">Los premios se calculan según los participantes inscritos.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
