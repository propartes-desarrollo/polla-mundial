export default function AdminDashboard() {
  const activeParticipants = 45;
  const totalCollected = activeParticipants * 50000;
  const prizePool = totalCollected * 0.95;

  return (
    <div className="container mx-auto p-8 min-h-screen">
      <h1 className="text-3xl font-bold text-primary mb-8">Panel Administrativo</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-card border border-border p-6 rounded-lg shadow-sm">
          <p className="text-sm text-muted-foreground uppercase tracking-wide">Participantes Activos</p>
          <p className="text-4xl font-extrabold text-primary mt-2">{activeParticipants}</p>
        </div>
        <div className="bg-card border border-border p-6 rounded-lg shadow-sm">
          <p className="text-sm text-muted-foreground uppercase tracking-wide">Recaudo Total</p>
          <p className="text-4xl font-extrabold text-primary mt-2">${totalCollected.toLocaleString('es-CO')}</p>
        </div>
        <div className="bg-emerald-950/30 border border-emerald-900/50 p-6 rounded-lg shadow-sm">
          <p className="text-sm text-emerald-500 uppercase tracking-wide">Bolsa de Premios (95%)</p>
          <p className="text-4xl font-extrabold text-emerald-400 mt-2">${prizePool.toLocaleString('es-CO')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-card border border-border p-6 rounded-lg shadow-sm flex flex-col gap-4">
          <h2 className="text-xl font-bold border-b border-border pb-2">Acciones Rápidas</h2>
          <button className="bg-primary text-primary-foreground py-2 px-4 rounded-md font-medium hover:bg-primary/90">
            Sincronizar API (Manual)
          </button>
          <button className="bg-secondary text-secondary-foreground py-2 px-4 rounded-md font-medium hover:bg-secondary/80">
            Generar Enlace de Invitación
          </button>
          <button className="bg-muted text-muted-foreground py-2 px-4 rounded-md font-medium hover:bg-muted/80">
            Cerrar Fase Actual
          </button>
        </div>

        <div className="bg-card border border-border p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-bold border-b border-border pb-2 mb-4">Gestión de Fases</h2>
          <ul className="space-y-4">
            <li className="flex justify-between items-center">
              <span>Fase de Grupos</span>
              <span className="text-emerald-500 text-sm font-bold bg-emerald-500/10 px-3 py-1 rounded-full">EN JUEGO</span>
            </li>
            <li className="flex justify-between items-center">
              <span>Dieciseisavos</span>
              <span className="text-muted-foreground text-sm font-bold bg-muted/20 px-3 py-1 rounded-full">PENDIENTE</span>
            </li>
            <li className="flex justify-between items-center">
              <span>Octavos de Final</span>
              <span className="text-muted-foreground text-sm font-bold bg-muted/20 px-3 py-1 rounded-full">PENDIENTE</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
