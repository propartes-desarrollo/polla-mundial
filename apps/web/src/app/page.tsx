import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center p-8 bg-[radial-gradient(ellipse_at_top,_hsl(357_92%_15%),_hsl(0_0%_4%)_60%)]">
      <div className="max-w-4xl w-full flex flex-col items-center gap-6 text-center">
        <span className="bg-primary text-primary-foreground headline text-sm px-3 py-1">
          Copa Mundial de la FIFA 2026
        </span>
        <h1 className="headline text-5xl md:text-7xl leading-none">
          Polla <span className="text-primary">Mundialista</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          ¡Diviértete y gana dinero con la polla! La polla del Mundial 2026 entre
          amigos y colegas, sin árbitro y sin VAR. No necesitas saber de fútbol:
          a veces la suerte también ayuda
        </p>
        <div className="flex flex-wrap gap-4 mt-6 justify-center">
          <Link href="/login" className="px-8 py-3 rounded bg-primary text-primary-foreground headline text-lg hover:bg-primary/90 transition-colors">
            Iniciar sesión
          </Link>
          <Link href="/ranking" className="px-8 py-3 rounded bg-secondary text-secondary-foreground headline text-lg border border-border hover:bg-secondary/80 transition-colors">
            Ver posiciones
          </Link>
        </div>
      </div>
    </main>
  );
}
