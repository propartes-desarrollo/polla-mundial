import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-b from-background to-secondary">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm flex flex-col gap-6">
        <h1 className="text-5xl font-extrabold tracking-tight text-primary drop-shadow-md text-center">
          Polla Mundialista <span className="text-emerald-500">FIFA 2026</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl text-center">
          Plataforma privada de pronósticos deportivos. Regístrate con tu enlace de invitación y compite por la bolsa de premios.
        </p>
        <div className="flex gap-4 mt-8">
          <Link href="/login" className="px-6 py-3 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors">
            Iniciar Sesión
          </Link>
          <Link href="/ranking" className="px-6 py-3 rounded-md bg-secondary text-secondary-foreground font-semibold hover:bg-secondary/80 transition-colors border border-border">
            Ver Ranking Público
          </Link>
        </div>
      </div>
    </main>
  );
}
