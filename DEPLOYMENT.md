# Despliegue — Polla Mundialista 2026

Cada `git push` a la rama `main` despliega automáticamente:
- **`apps/api`** → Cloudflare **Workers**
- **`apps/web`** → Cloudflare **Pages**

Esto lo ejecuta el workflow [.github/workflows/deploy.yml](.github/workflows/deploy.yml).

---

## Configuración por única vez

Necesitas hacer esto **una sola vez** antes del primer push. Requiere [Node.js](https://nodejs.org) instalado.

### 1. Cuenta y CLI de Cloudflare
```bash
npm install                      # instala dependencias (incluye wrangler)
cd apps/api
npx wrangler login               # abre el navegador para autenticarte
```

### 2. Crear la base de datos D1
```bash
npx wrangler d1 create polla-db
```
Copia el `database_id` que imprime y pégalo en [apps/api/wrangler.toml](apps/api/wrangler.toml),
reemplazando los ceros:
```toml
database_id = "AQUI-VA-EL-ID-REAL"
```

### 3. Cargar el esquema y datos iniciales
```bash
# Local (para probar con `npm run dev`):
npx wrangler d1 migrations apply polla-db --local

# Remoto (la base de datos real en Cloudflare):
npx wrangler d1 migrations apply polla-db --remote
```

### 4. Cargar los secretos en producción
```bash
npx wrangler secret put FOOTBALL_API_KEY
# pega tu API key de api-sports.io (la misma que está en apps/api/.dev.vars)

npx wrangler secret put JWT_SECRET
# pega una cadena larga y aleatoria
```

### 5. Conseguir el token de API de Cloudflare (para GitHub Actions)
En el [dashboard de Cloudflare](https://dash.cloudflare.com/profile/api-tokens) → **Create Token**
→ usa la plantilla *Edit Cloudflare Workers* y añade permisos:
- `Account · Workers Scripts · Edit`
- `Account · D1 · Edit`
- `Account · Cloudflare Pages · Edit`

Copia el token. También necesitas tu **Account ID** (visible en la barra lateral del dashboard).

### 6. Cargar los secretos en GitHub
En tu repo de GitHub → **Settings → Secrets and variables → Actions**:

**Secrets** (pestaña *Secrets*):
| Nombre | Valor |
|---|---|
| `CLOUDFLARE_API_TOKEN` | el token del paso 5 |
| `CLOUDFLARE_ACCOUNT_ID` | tu Account ID |

**Variables** (pestaña *Variables*, opcional pero recomendado):
| Nombre | Valor |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL del Worker, ej. `https://polla-mundialista-api.TU-SUBDOMINIO.workers.dev` |

> La URL del Worker la sabrás después del primer deploy del API. Puedes dejar la variable
> vacía la primera vez y configurarla luego para que la web apunte al API real.

---

## Uso diario

```bash
git add .
git commit -m "mi cambio"
git push
```

GitHub Actions se encarga del resto. Puedes ver el progreso en la pestaña **Actions** de tu repo.

---

## Desarrollo local

```bash
# API (Worker + D1 local)
cd apps/api
npm run db:migrate     # solo la primera vez / al cambiar el esquema
npm run dev            # http://localhost:8787

# Verificar conexión con la API de fútbol (sin base de datos):
#   http://localhost:8787/api/football/status

# Web (en otra terminal)
cd apps/web
npm run dev            # http://localhost:3000
```

---

## Endpoints del API

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Health check |
| GET | `/api/football/status` | Verifica la API de fútbol (no usa BD) |
| POST | `/api/admin/sync` | Sincroniza equipos/partidos a D1 y recalcula puntos |
| GET | `/test-db` | Lista las fases (prueba de BD) |

El **cron cada 30 min** ejecuta el mismo sync automáticamente.

> ⚠️ `POST /api/admin/sync` aún no tiene autenticación. Protégelo con verificación de
> rol ADMIN (JWT) antes de exponerlo públicamente.
