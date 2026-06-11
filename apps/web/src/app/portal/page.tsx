export default function UserPortal() {
  return (
    <div className="container mx-auto p-4 md:p-8 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-primary">Mis Pronósticos</h1>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Puntos Actuales</p>
          <p className="text-2xl font-bold text-emerald-400">125 pts</p>
        </div>
      </div>

      <div className="bg-blue-950/20 border border-blue-900/50 p-4 rounded-lg mb-8 flex justify-between items-center">
        <div>
          <h3 className="font-bold text-blue-400">Fase Actual: Grupos</h3>
          <p className="text-sm text-muted-foreground">Los pronósticos se bloquearán al iniciar el partido.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Mock Match Card */}
        <div className="bg-card border border-border p-4 rounded-lg flex flex-col gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-emerald-500/10 text-emerald-500 text-xs font-bold px-3 py-1 rounded-bl-lg">
            ABIERTO
          </div>
          <p className="text-xs text-muted-foreground font-mono">15 Jun 2026 - 15:00</p>
          
          <div className="flex justify-between items-center mt-2">
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 bg-muted rounded-full"></div>
              <span className="font-bold text-sm">Brasil</span>
            </div>
            
            <div className="flex gap-2 items-center">
              <input type="number" className="w-12 h-12 bg-background border border-input rounded-md text-center text-xl font-bold" placeholder="-" min="0" max="20" />
              <span className="text-muted-foreground font-bold">-</span>
              <input type="number" className="w-12 h-12 bg-background border border-input rounded-md text-center text-xl font-bold" placeholder="-" min="0" max="20" />
            </div>

            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 bg-muted rounded-full"></div>
              <span className="font-bold text-sm">Japón</span>
            </div>
          </div>
          <button className="w-full bg-primary text-primary-foreground py-2 mt-2 rounded-md font-bold hover:bg-primary/90 transition-colors">
            Guardar Pronóstico
          </button>
        </div>

        {/* Locked Match Card */}
        <div className="bg-card border border-border p-4 rounded-lg flex flex-col gap-4 relative overflow-hidden opacity-70">
          <div className="absolute top-0 right-0 bg-destructive/10 text-destructive-foreground text-xs font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            BLOQUEADO
          </div>
          <p className="text-xs text-muted-foreground font-mono">14 Jun 2026 - 10:00</p>
          
          <div className="flex justify-between items-center mt-2">
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 bg-muted rounded-full"></div>
              <span className="font-bold text-sm">Argentina</span>
            </div>
            
            <div className="flex gap-4 items-center">
              <span className="text-2xl font-bold text-primary">2</span>
              <span className="text-muted-foreground font-bold">-</span>
              <span className="text-2xl font-bold text-primary">0</span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 bg-muted rounded-full"></div>
              <span className="font-bold text-sm">Canadá</span>
            </div>
          </div>
          <div className="w-full text-center py-2 mt-2 border-t border-border text-sm text-emerald-400 font-bold">
            +5 Puntos (Marcador Exacto)
          </div>
        </div>
      </div>
    </div>
  )
}
