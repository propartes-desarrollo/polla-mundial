# Despliegue — Polla Mundialista 2026

Cada `git push` a `main` despliega automáticamente vía la **integración Git nativa de Cloudflare**:
- **`apps/api`** → Cloudflare **Workers** (Workers Builds)
- **`apps/web`** → Cloudflare **Pages**

No se usa GitHub Actions: Cloudflare escucha los push del repo directamente (webhook OAuth).

---

## Configuración en Cloudflare (una sola vez)

### Worker (API) — Workers Builds

Workers & Pages → Create → Workers → Connect to Git → repo `polla-mundial`:

| Campo | Valor |
|---|---|
| Root directory | `apps/api` |
| Build command | *(vacío)* |
| Deploy command | `npx wrangler deploy` |

**Secretos del Worker** (Settings → Variables and Secrets, tipo *Secret*):

| Nombre | Valor |
|---|---|
| `FOOTBALL_API_KEY` | API key de api-sports.io (si usas ese proveedor) |
| `FOOTBALL_DATA_API_KEY` | API key de football-data.org (si usas ese proveedor) |
| `JWT_SECRET` | cadena larga aleatoria |

### Pages (Web)

Workers & Pages → Create → Pages → Connect to Git → repo `polla-mundial`:

| Campo | Valor |
|---|---|
| Production branch | `main` |
| Framework preset | **None** (⚠️ no elegir "Next.js" — la app es export estático) |
| Root directory | `apps/web` |
| Build command | `npm run build` |
| Build output directory | `out` |

**Variables de entorno de Pages** (Settings → Environment variables):

| Nombre | Valor |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL del Worker, ej. `https://polla-mundial.TU-SUBDOMINIO.workers.dev` |

La versión de Node la fija el archivo `.nvmrc` (20).

### Base de datos D1

1. Storage & Databases → D1 → Create → nombre `polla-db`.
2. Copiar el **Database ID** a `apps/api/wrangler.toml` (`database_id`).
3. En la pestaña **Console** de la D1, ejecutar el contenido de:
   - `apps/api/migrations/0001_schema.sql` (tablas)
   - `apps/api/migrations/0002_seed.sql` (fases + admin inicial)
   - `apps/api/migrations/0003_recaudo.sql` (control de pagos + tabla settings)
   - `apps/api/migrations/0004_recarga.sql` (recarga de fases finales)

Admin inicial: teléfono `0000000000`, contraseña `admin123` (cámbiala en producción).

---

## Proveedores de datos de fútbol

La API soporta dos proveedores, seleccionables con la variable `FOOTBALL_PROVIDER`
en `apps/api/wrangler.toml` (o en el dashboard del Worker):

| Valor | Proveedor | Secreto requerido | Notas |
|---|---|---|---|
| `apisports` (default) | api-sports.io | `FOOTBALL_API_KEY` | Plan free: solo temporadas 2022–2024 |
| `footballdata` | football-data.org | `FOOTBALL_DATA_API_KEY` | Plan free incluye el Mundial; ~10 req/min |

La temporada se controla con `WORLD_CUP_SEASON` (ej. `2022` para pruebas, `2026` para el torneo real).

---

## Uso diario

```bash
git add .
git commit -m "mi cambio"
git push
```

Cloudflare hace el resto. El progreso se ve en cada proyecto → pestaña **Deployments**.

> Nota: el botón **Retry** de un deployment fallido reusa el MISMO commit de ese build.
> Para desplegar el código más reciente, haz push de un commit nuevo o usa "Create deployment".

---

## Desarrollo local

Requiere Node 20+ (ver `.nvmrc`).

```bash
npm install                # en la raíz (workspaces)

# API (Worker + D1 local)
cd apps/api
cp .dev.vars.example .dev.vars   # y rellena las keys
npm run db:migrate               # primera vez / al cambiar esquema
npm run dev                      # http://localhost:8787

# Web (en otra terminal)
cd apps/web
npm run dev                      # http://localhost:3000
```

Verificación de build en limpio (lo que correrá Cloudflare):

```bash
npm install && npm run build --workspace=web   # genera apps/web/out/
cd apps/api && npx tsc --noEmit                # typecheck del Worker
npx tsx src/scoring.test.ts                    # tests de puntuación
```

---

## Endpoints del API

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/` | público (health check) |
| POST | `/api/auth/login` | público |
| POST | `/api/auth/register` | público (token de invitación) |
| GET | `/api/ranking` | público |
| GET | `/api/me` | usuario autenticado |
| GET | `/api/matches` | usuario autenticado |
| POST | `/api/predictions` | usuario autenticado |
| GET | `/api/admin/stats` | admin |
| GET | `/api/admin/participants` | admin |
| PUT | `/api/admin/participants/:id/payment` · `/:id/recharge` · `/:id/password` | admin |
| DELETE | `/api/admin/participants/:id` | admin |
| PUT | `/api/admin/fee` | admin |
| GET | `/api/admin/phases` · PUT `/api/admin/phases/:id` | admin |
| POST | `/api/admin/invitations` | admin |
| POST | `/api/admin/sync` | admin |
| GET | `/api/football/status` | público (diagnóstico del proveedor, no toca BD) |

El **cron** ejecuta el mismo sync automáticamente a la :01 y :31 de cada hora;
última corrida nocturna 1:31 AM y primera de la mañana 10:01 AM hora Colombia
(se saltan las horas 07-14 UTC, franja sin partidos).
