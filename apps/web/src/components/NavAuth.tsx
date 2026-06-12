"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { getUser } from "@/lib/api"

// Botón "Entrar" del header: solo visible cuando NO hay sesión.
// Se re-evalúa en cada cambio de ruta (login/logout navegan, así que se actualiza).
export default function NavAuth() {
  const pathname = usePathname()
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    setLoggedIn(!!getUser())
  }, [pathname])

  if (loggedIn) return null

  return (
    <Link href="/login" className="ml-2 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90">
      Entrar
    </Link>
  )
}
