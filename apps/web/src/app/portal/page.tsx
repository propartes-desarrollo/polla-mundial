"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { apiFetch, getUser, logout } from "@/lib/api"

interface Me { name: string; points: number; position: number; recharged: boolean; rechargeFee: number }

interface Match {
  id: string
  matchDate: string
  status: "SCHEDULED" | "IN_PLAY" | "FINISHED"
  homeScore: number | null
  awayScore: number | null
  phaseId: string
  phaseName: string
  homeName: string
  awayName: string
  homeFlag: string | null
  awayFlag: string | null
  predictedHome: number | null
  predictedAway: number | null
  predictionPoints: number | null
}

interface Team { id: string; name: string; flagUrl: string | null }

interface Specials {
  championTeamId: string | null
  runnerUpTeamId: string | null
  topScorerName: string | null
  locked: number
}

const fmtCOP = (n: number) => `$${n.toLocaleString("es-CO")}`

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-CO", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    })
  } catch {
    return iso
  }
}

function Flag({ src, name, size = 28 }: { src: string | null; name: string; size?: number }) {
  if (!src) return <span className="inline-block rounded-sm bg-muted" style={{ width: size, height: size * 0.7 }} />
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt={name}
      width={size}
      height={size * 0.7}
      className="rounded-sm object-cover border border-border shadow-sm"
      style={{ width: size, height: size * 0.7 }}
    />
  )
}

function StatusChip({ status }: { status: Match["status"] }) {
  if (status === "IN_PLAY")
    return <span className="text-[10px] font-black uppercase bg-primary text-primary-foreground px-2 py-0.5 rounded animate-pulse">En vivo</span>
  if (status === "FINISHED")
    return <span className="text-[10px] font-black uppercase bg-muted text-muted-foreground px-2 py-0.5 rounded">Final</span>
  return <span className="text-[10px] font-black uppercase bg-emerald-600 text-white px-2 py-0.5 rounded">Abierto</span>
}

export default function UserPortal() {
  const router = useRouter()
  const [me, setMe] = useState<Me | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [specials, setSpecials] = useState<Specials | null>(null)
  const [champion, setChampion] = useState("")
  const [runnerUp, setRunnerUp] = useState("")
  const [topScorer, setTopScorer] = useState("")
  const [inputs, setInputs] = useState<Record<string, { home: string; away: string }>>({})
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [savingId, setSavingId] = useState("")

  async function load() {
    const [m, list, teamList, sp] = await Promise.all([
      apiFetch<Me>("/api/me"),
      apiFetch<Match[]>("/api/matches"),
      apiFetch<Team[]>("/api/teams"),
      apiFetch<Specials | null>("/api/special-predictions"),
    ])
    setMe(m)
    setMatches(list)
    setTeams(teamList)
    setSpecials(sp)
    setChampion(sp?.championTeamId ?? "")
    setRunnerUp(sp?.runnerUpTeamId ?? "")
    setTopScorer(sp?.topScorerName ?? "")
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

  async function saveSpecials() {
    setSavingId("specials"); setError(""); setNotice("")
    try {
      await apiFetch("/api/special-predictions", {
        method: "POST",
        body: JSON.stringify({ championTeamId: champion, runnerUpTeamId: runnerUp, topScorerName: topScorer }),
      })
      setNotice("Pronósticos especiales guardados ✓")
      await load()
    } catch (e) { setError((e as Error).message) } finally { setSavingId("") }
  }

  const specialsLocked = !!specials?.locked
  const teamById = (id: string) => teams.find((t) => t.id === id)
  // Las fases finales requieren haber pagado la recarga de la apuesta.
  const needsRecharge = (m: Match) => m.phaseId !== "phase_groups" && !!me && !me.recharged
  const hasKnockoutMatches = matches.some((m) => m.phaseId !== "phase_groups")

  return (
    <div className="container mx-auto p-4 md:p-8 min-h-screen">
      {/* Marcador superior del usuario */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="headline text-3xl md:text-4xl">Mi <span className="text-primary">Apuesta</span></h1>
        <div className="flex items-center gap-4">
          <div className="bg-card border border-border rounded px-4 py-2 text-right">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">Mis puntos</p>
            <p className="text-2xl font-black text-accent leading-none">{me?.points ?? 0}</p>
          </div>
          <button onClick={() => { logout(); router.replace("/login") }} className="text-xs font-bold uppercase text-muted-foreground hover:text-primary">
            Salir
          </button>
        </div>
      </div>

      {error && <div className="bg-primary/15 border border-primary text-sm rounded p-3 mb-4 font-medium">{error}</div>}
      {notice && <div className="bg-emerald-600/15 border border-emerald-600 text-sm rounded p-3 mb-4 font-medium">{notice}</div>}

      {/* Aviso de recarga: aparece cuando ya existen partidos de fases finales
          y el participante aún no ha pagado la recarga. */}
      {me && !me.recharged && hasKnockoutMatches && (
        <div className="bg-accent/10 border border-accent text-sm rounded p-4 mb-4">
          <p className="font-black uppercase text-accent mb-1">⚡ ¡Recarga tu apuesta!</p>
          <p className="text-muted-foreground">
            Las fases finales ya están en juego. Para pronosticar esos partidos paga la
            recarga de <b className="text-foreground">{fmtCOP(me.rechargeFee)}</b> al organizador
            y pídele que active tu recarga. Tus puntos de la fase de grupos se conservan.
          </p>
        </div>
      )}

      {/* Pronósticos especiales */}
      <section className="mb-10">
        <h2 className="section-bar headline text-xl mb-4">Pronósticos especiales</h2>
        <div className="bg-card border border-border rounded-lg p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="text-[11px] uppercase font-bold text-muted-foreground flex items-center gap-2 mb-2">
                🏆 Campeón del Mundial
              </label>
              <div className="flex items-center gap-2">
                <Flag src={teamById(champion)?.flagUrl ?? null} name="campeón" />
                <select value={champion} onChange={(e) => setChampion(e.target.value)} disabled={specialsLocked}
                  className="flex-1 bg-input border border-border rounded px-2 py-2 text-sm disabled:opacity-60">
                  <option value="">— Elige selección —</option>
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[11px] uppercase font-bold text-muted-foreground flex items-center gap-2 mb-2">
                🥈 Subcampeón
              </label>
              <div className="flex items-center gap-2">
                <Flag src={teamById(runnerUp)?.flagUrl ?? null} name="subcampeón" />
                <select value={runnerUp} onChange={(e) => setRunnerUp(e.target.value)} disabled={specialsLocked}
                  className="flex-1 bg-input border border-border rounded px-2 py-2 text-sm disabled:opacity-60">
                  <option value="">— Elige selección —</option>
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[11px] uppercase font-bold text-muted-foreground flex items-center gap-2 mb-2">
                ⚽ Goleador del Mundial
              </label>
              <input value={topScorer} onChange={(e) => setTopScorer(e.target.value)} disabled={specialsLocked}
                placeholder="Nombre del jugador"
                className="w-full bg-input border border-border rounded px-3 py-2 text-sm disabled:opacity-60" />
            </div>
          </div>
          <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {specialsLocked
                ? "🔒 Tus pronósticos especiales están bloqueados."
                : "Puntos: Campeón 30 · Subcampeón 15 · Goleador 20"}
            </p>
            {!specialsLocked && (
              <button onClick={saveSpecials} disabled={savingId === "specials"}
                className="w-full sm:w-auto shrink-0 bg-primary text-primary-foreground font-black uppercase text-sm px-5 py-2.5 rounded hover:bg-primary/90 disabled:opacity-50">
                {savingId === "specials" ? "Guardando..." : "Guardar especiales"}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Partidos agrupados por fase. Las fases finales aparecen aquí
          automáticamente cuando el torneo define los cruces (vía sync). */}
      {matches.length === 0 && (
        <p className="text-muted-foreground">No hay partidos disponibles todavía.</p>
      )}
      {(() => {
        // Orden del torneo; se muestra al revés para que las fases más avanzadas
        // (las más recientes en aparecer / las pendientes) queden arriba y la
        // fase de grupos, ya jugada, quede al final. Dentro de cada fase los
        // partidos siguen en orden cronológico (match_date ASC del API).
        const PHASE_ORDER = ["phase_groups", "phase_16", "phase_8", "phase_4", "phase_semi", "phase_3rd", "phase_final"]
        const byPhase = new Map<string, { phaseId: string; phase: string; items: Match[] }>()
        for (const m of matches) {
          const g = byPhase.get(m.phaseId)
          if (g) g.items.push(m)
          else byPhase.set(m.phaseId, { phaseId: m.phaseId, phase: m.phaseName, items: [m] })
        }
        const groups = Array.from(byPhase.values()).sort(
          (a, b) => PHASE_ORDER.indexOf(b.phaseId) - PHASE_ORDER.indexOf(a.phaseId)
        )
        return groups.map((g) => (
          <section key={g.phaseId} className="mb-10">
            <h2 className="section-bar headline text-xl mb-4">{g.phase}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {g.items.map((match) => {
            const locked = needsRecharge(match)
            // Bloqueo por hora: el status en DB solo se actualiza con el sync (cron
            // cada 30 min), así que un partido ya iniciado puede seguir "SCHEDULED".
            const matchStarted = new Date(match.matchDate).getTime() <= Date.now()
            const editable = match.status === "SCHEDULED" && !matchStarted && !locked
            // Si la hora ya pasó pero el sync aún no lo marcó IN_PLAY/FINISHED, lo
            // tratamos como "En vivo" igualmente — la etiqueta no depende del sync.
            const displayStatus: Match["status"] =
              match.status === "SCHEDULED" && matchStarted ? "IN_PLAY" : match.status
            const v = inputs[match.id] ?? { home: "", away: "" }
            return (
              <div key={match.id} className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between bg-black/40 px-3 py-1.5 border-b border-border">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">{fmtDate(match.matchDate)}</span>
                  {locked && !matchStarted ? (
                    <span className="text-[10px] font-black uppercase bg-accent text-accent-foreground px-2 py-0.5 rounded">⚡ Recarga</span>
                  ) : (
                    <StatusChip status={displayStatus} />
                  )}
                </div>

                <div className="p-3 space-y-2">
                  {/* Fila equipo local */}
                  <div className="flex items-center gap-2">
                    <Flag src={match.homeFlag} name={match.homeName} />
                    <span className="font-bold text-sm uppercase flex-1 truncate">{match.homeName}</span>
                    {editable ? (
                      <input type="number" min={0} max={20} value={v.home}
                        onChange={(e) => setInput(match.id, "home", e.target.value)}
                        className="w-12 h-10 bg-input border border-border rounded text-center text-lg font-black" placeholder="-" />
                    ) : (
                      <span className="w-12 text-center text-2xl font-black">{match.homeScore ?? "-"}</span>
                    )}
                  </div>
                  {/* Fila equipo visitante */}
                  <div className="flex items-center gap-2">
                    <Flag src={match.awayFlag} name={match.awayName} />
                    <span className="font-bold text-sm uppercase flex-1 truncate">{match.awayName}</span>
                    {editable ? (
                      <input type="number" min={0} max={20} value={v.away}
                        onChange={(e) => setInput(match.id, "away", e.target.value)}
                        className="w-12 h-10 bg-input border border-border rounded text-center text-lg font-black" placeholder="-" />
                    ) : (
                      <span className="w-12 text-center text-2xl font-black">{match.awayScore ?? "-"}</span>
                    )}
                  </div>
                </div>

                <div className="px-3 pb-3">
                  {editable ? (
                    <button onClick={() => save(match)} disabled={savingId === match.id}
                      className="w-full bg-primary text-primary-foreground py-2 rounded font-black uppercase text-sm hover:bg-primary/90 disabled:opacity-50">
                      {savingId === match.id ? "Guardando..." : "Guardar"}
                    </button>
                  ) : locked && !matchStarted ? (
                    <div className="text-center text-xs border-t border-border pt-2 font-black uppercase text-accent">
                      ⚡ Requiere recarga
                    </div>
                  ) : (
                    <div className="text-center text-xs border-t border-border pt-2">
                      {match.predictedHome != null ? (
                        <span className="text-muted-foreground font-medium">
                          Mi pronóstico: <b>{match.predictedHome}-{match.predictedAway}</b>
                          {match.status === "FINISHED" && (
                            <span className="text-accent font-black"> · +{match.predictionPoints ?? 0} pts</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Sin pronóstico</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
                )
              })}
            </div>
          </section>
        ))
      })()}
    </div>
  )
}
