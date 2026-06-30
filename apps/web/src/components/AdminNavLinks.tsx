"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { getUser } from "@/lib/api"

// Enlaces del menú superior visibles SOLO para el administrador.
// Se re-evalúa en cada cambio de ruta (login/logout navegan).
export default function AdminNavLinks() {
  const pathname = usePathname()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    setIsAdmin(getUser()?.role === "ADMIN")
  }, [pathname])

  if (!isAdmin) return null

  return (
    <>
      <Link href="/admin" className="px-3 py-2 text-zinc-300 hover:text-white hover:bg-zinc-900 rounded">
        Panel
      </Link>
      <Link href="/admin/pronosticos" className="px-3 py-2 text-zinc-300 hover:text-white hover:bg-zinc-900 rounded">
        Pronósticos
      </Link>
    </>
  )
}
