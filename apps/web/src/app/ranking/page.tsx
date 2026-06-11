import Link from "next/link"

// Mock data for the UI
const rankingData = [
  { position: 1, name: "Carlos M.", points: 125, exactScores: 4, correctWinners: 10 },
  { position: 2, name: "Ana P.", points: 110, exactScores: 3, correctWinners: 9 },
  { position: 3, name: "Luis R.", points: 105, exactScores: 2, correctWinners: 11 },
]

export default function RankingPage() {
  return (
    <div className="container mx-auto p-8 pt-24 min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold text-primary">Ranking Global</h1>
        <Link href="/" className="text-muted-foreground hover:text-primary transition-colors">Volver al inicio</Link>
      </div>

      <div className="bg-card text-card-foreground rounded-lg shadow-lg border border-border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/50 text-muted-foreground text-sm uppercase tracking-wider">
              <th className="p-4 border-b border-border font-semibold">#</th>
              <th className="p-4 border-b border-border font-semibold">Participante</th>
              <th className="p-4 border-b border-border font-semibold text-right">Pts</th>
              <th className="p-4 border-b border-border font-semibold text-right hidden sm:table-cell">Marcadores Exactos</th>
              <th className="p-4 border-b border-border font-semibold text-right hidden md:table-cell">Aciertos Ganador</th>
            </tr>
          </thead>
          <tbody>
            {rankingData.map((user, idx) => (
              <tr key={user.position} className="hover:bg-muted/30 transition-colors">
                <td className="p-4 border-b border-border font-bold">
                  {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : user.position}
                </td>
                <td className="p-4 border-b border-border font-medium">{user.name}</td>
                <td className="p-4 border-b border-border text-right font-bold text-primary">{user.points}</td>
                <td className="p-4 border-b border-border text-right text-muted-foreground hidden sm:table-cell">{user.exactScores}</td>
                <td className="p-4 border-b border-border text-right text-muted-foreground hidden md:table-cell">{user.correctWinners}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
