import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import NavAuth from "@/components/NavAuth";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Polla Mundialista FIFA 2026",
  description: "Pronósticos y bolsa de premios para el Mundial 2026",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        <header className="sticky top-0 z-50 bg-black border-b-4 border-primary">
          <div className="container mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <span className="bg-primary text-primary-foreground headline text-lg px-2 py-0.5">
                PM
              </span>
              <span className="headline text-xl text-white hidden sm:inline">
                Polla Mundial <span className="text-primary">2026</span>
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-sm font-bold uppercase tracking-wide">
              <Link href="/ranking" className="px-3 py-2 text-zinc-300 hover:text-white hover:bg-zinc-900 rounded">
                Posiciones
              </Link>
              <Link href="/portal" className="px-3 py-2 text-zinc-300 hover:text-white hover:bg-zinc-900 rounded">
                Mi Apuesta
              </Link>
              <NavAuth />
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t-4 border-primary bg-black py-6 text-center">
          <p className="text-xs uppercase font-bold tracking-widest text-muted-foreground">
            ⚽ Polla hecha por el <span className="text-primary">Master Faiver</span>
          </p>
        </footer>
      </body>
    </html>
  );
}
