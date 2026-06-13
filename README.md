# ⚽ Polla Mundialista FIFA 2026

Plataforma privada de pronósticos deportivos para el Mundial 2026. Los participantes
se registran **solo por invitación**, pronostican los marcadores de cada partido y
eligen campeón, subcampeón y goleador. Compiten por una bolsa de premios en dinero
calculada sobre el recaudo real.

**Producción:**
- 🌐 Web: https://polla-mundial-bf4.pages.dev
- 🔌 API: https://polla-mundial.mercadeo-liquimoly.workers.dev

---

## Cómo funciona el modelo de apuesta

### 1. Registro y pago
1. El admin genera un **enlace de invitación** desde el panel y se lo envía al participante.
2. El participante se registra con nombre, teléfono y contraseña.
3. El admin marca su pago en el **Control de pagos** (el recaudo solo cuenta a quienes pagaron).
4. Hay **dos cuotas configurables** desde el panel admin:
   - **Inscripción** (por defecto $50.000 COP): da derecho a jugar la fase de grupos
     y los pronósticos especiales.
   - **Recarga de fases finales** (por defecto $30.000 COP): habilita los pronósticos
     de dieciseisavos en adelante (ver punto 3).

### 2. Pronósticos especiales (una sola vez por torneo)
Antes de que arranque el Mundial, cada participante elige:

| Pronóstico | Puntos si acierta |
|---|---|
| 🏆 Campeón | 30 |
| 🥈 Subcampeón | 15 |
| ⚽ Goleador del torneo | 20 |

El admin los **bloquea** con un botón antes del primer partido; desde ese momento
quedan congelados para todo el torneo.

### 3. Pronósticos de partidos (fase por fase)
Cada partido se pronostica con marcador exacto **mientras esté programado**;
al iniciar el partido se bloquea automáticamente.

| Fase | Ganador | Dif. de goles | Goles por equipo | Marcador exacto |
|---|---|---|---|---|
| Grupos | 3 | +2 | +1 c/u | 5 |
| Dieciseisavos / Octavos | 5 | — | — | 8 |
| Cuartos | 7 | — | — | 10 |
| Semifinales / 3er puesto | 10 | — | — | 15 |
| Final | 15 | — | — | 25 |

**Puntería parcial (solo grupos):** +1 punto por cada equipo cuyo número de goles
aciertes aunque falles el resultado (real 1-1, pronóstico 2-1 → +1 por el visitante).
En eliminatorias no aplica.

**¿Cuándo aparecen las fases finales?** Automáticamente. La API de fútbol publica
los cruces de cada fase eliminatoria apenas se definen (al cerrar grupos se conocen
los dieciseisavos, etc.). El sync (cron a la :01 y :31 de cada hora, o botón del admin) inserta esos
partidos nuevos y aparecen en el portal como una nueva sección.

**La recarga de la apuesta.** Pronosticar los partidos de fases finales requiere un
segundo pago: la **recarga** (un único pago que cubre TODAS las eliminatorias, desde
dieciseisavos hasta la final). El flujo:

1. El participante paga la recarga al organizador.
2. El admin la activa con el toggle **⚡ Recargó** del Control de pagos.
3. Desde ese momento el participante puede pronosticar los cruces de eliminatorias.

Quien **no recarga** conserva sus puntos de grupos y sigue visible en la tabla de
posiciones, pero sus partidos de fases finales quedan bloqueados (el portal le
muestra el aviso "⚡ Requiere recarga" con el monto a pagar) y deja de sumar puntos.
El API también rechaza esos pronósticos en el servidor (HTTP 403), no solo en la UI.

### 4. Cierre del torneo (automático)
- Al sincronizarse la **final** ya terminada, el sistema detecta solos al **campeón
  y subcampeón** (incluye finales definidas por penales) y suma los puntos especiales
  a quienes acertaron.
- El **goleador oficial** se registra a mano en el panel admin (la pantalla
  *Resultados oficiales* también permite corregir campeón/subcampeón si hiciera falta).
- Cada vez que se guardan resultados oficiales, el ranking se recalcula al instante.

### 5. Bolsa de premios
El recaudo = inscripciones pagadas × cuota + recargas pagadas × cuota de recarga.
La organización retiene el 5%; el 95% restante se reparte así:

| Premio | % de la bolsa |
|---|---|
| 1er puesto del ranking | 50% |
| 2do puesto | 20% |
| 3er puesto | 10% |
| Más marcadores exactos | 5% |
| Más ganadores acertados | 5% |
| Acertar el campeón del Mundial | 5% |
| Acertar el goleador del Mundial | 5% |

Los montos en pesos se muestran en la página pública de posiciones y en el panel
admin, junto con quiénes van ganando cada premio (en orden del ranking). Si varios
participantes aciertan un mismo premio, este se divide en partes iguales entre
ellos; o, por acuerdo entre los ganadores, el total se lo lleva el mejor ranqueado.

---

## Estructura del proyecto

```
mundial/                      (monorepo npm workspaces, Node 20)
├── apps/
│   ├── api/                  Backend — Cloudflare Workers
│   │   ├── src/
│   │   │   ├── index.ts      Rutas Hono + sync + recálculo de puntos
│   │   │   ├── auth.ts       JWT (HS256) + hash de contraseñas PBKDF2
│   │   │   ├── scoring.ts    Puntos por fase (+ tests en scoring.test.ts)
│   │   │   ├── prizes.ts     Distribución de la bolsa (95/5 y porcentajes)
│   │   │   ├── teamNames.ts  Traducción EN→ES de selecciones
│   │   │   └── providers/    Proveedores de datos intercambiables
│   │   │       ├── football.ts             Interfaz + mock
│   │   │       ├── FootballDataProvider.ts  football-data.org (activo)
│   │   │       └── ApiSportsProvider.ts     api-sports.io (alternativo)
│   │   ├── migrations/       SQL de la base D1 (0001 schema, 0002 seed,
│   │   │                     0003 recaudo, 0004 recarga)
│   │   └── wrangler.toml     Config del Worker (D1, cron, vars)
│   └── web/                  Frontend — Next.js 15 (export estático) en Cloudflare Pages
│       └── src/
│           ├── app/
│           │   ├── page.tsx          Landing
│           │   ├── login/            Login + registro por invitación
│           │   ├── ranking/          Posiciones públicas + premios en juego
│           │   ├── portal/           Pronósticos del participante (por fase)
│           │   └── admin/            Panel: recaudo, pagos, premios, fases,
│           │                         resultados oficiales, sync, invitaciones
│           └── lib/api.ts            Cliente del API (JWT en localStorage)
├── DEPLOYMENT.md             Guía de despliegue paso a paso
└── README.md                 Este archivo
```

### Stack
- **Backend:** Hono sobre Cloudflare Workers · D1 (SQLite) · cron a la :01 y :31
  de cada hora (pausa nocturna: última corrida 1:31 AM, primera 10:01 AM Colombia)
- **Frontend:** Next.js 15 estático · TailwindCSS (tema estilo ESPN) · Cloudflare Pages
- **Datos de fútbol:** football-data.org v4 (competencia `WC`, temporada 2026).
  Proveedor intercambiable vía `FOOTBALL_PROVIDER` (`footballdata` | `apisports`).
- **Auth:** JWT HS256 + PBKDF2 (Web Crypto). Registro únicamente con token de invitación.

### Datos clave
- El cron y el botón **Sincronizar resultados** hacen lo mismo: traer equipos
  (traducidos al español, con bandera), traer partidos, detectar campeón/subcampeón
  si la final terminó, recalcular puntos y reordenar el ranking.
- Los nombres de goleador se comparan ignorando mayúsculas y tildes
  ("Mbappé" == "mbappe").
- Roles: `ADMIN` (panel completo) y `USER` (portal de pronósticos).

---

## Despliegue

Cada `git push` a `main` despliega automáticamente vía la integración Git nativa de
Cloudflare (Workers Builds para el API, Pages para la web). Guía completa con
configuración inicial, secretos y migraciones: **[DEPLOYMENT.md](DEPLOYMENT.md)**.

## Desarrollo local

```bash
npm install                          # raíz (workspaces)

# API
cd apps/api
cp .dev.vars.example .dev.vars       # rellenar las API keys
npm run db:migrate                   # D1 local
npm run dev                          # http://localhost:8787

# Web (otra terminal)
cd apps/web
npm run dev                          # http://localhost:3000
```

Verificación antes de subir cambios:

```bash
cd apps/api && npx tsc --noEmit && npx tsx src/scoring.test.ts
cd apps/web && npm run build         # genera out/ (lo que sirve Pages)
```
