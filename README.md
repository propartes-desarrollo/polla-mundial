# Polla Mundialista FIFA 2026

Plataforma privada de pronósticos deportivos para el Mundial de la FIFA 2026, optimizada para **Cloudflare Pages** y **Cloudflare Workers**.

## Estructura del Proyecto (Monorepo)

- `apps/api`: Backend usando Hono.js en Cloudflare Workers, base de datos D1 (SQLite) y tareas CRON.
- `apps/web`: Frontend en Next.js 15 (App Router), con TailwindCSS y Shadcn UI.

## Requisitos

- Node.js >= 20
- npm o yarn
- Cuenta en Cloudflare
- Wrangler CLI (`npm install -g wrangler`)

## Despliegue Backend (Cloudflare Worker & D1)

1. Ve a `apps/api`.
2. Inicializa la base de datos D1:
   ```bash
   wrangler d1 create polla-db
   ```
3. Copia el ID de la base de datos resultante y actualízalo en `apps/api/wrangler.toml`.
4. Ejecuta las migraciones:
   ```bash
   wrangler d1 execute polla-db --remote --file=./schema.sql
   ```
5. Despliega el Worker:
   ```bash
   npm run deploy
   ```

## Despliegue Frontend y Automatización con GitHub (CI/CD)

Cloudflare Pages ofrece integración nativa y automática con **GitHub**. Esta es la forma recomendada para manejar los despliegues de este proyecto:

1. **Sube el código a GitHub**:
   Inicia un repositorio local, haz un commit y súbelo a tu cuenta de GitHub.
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/polla-mundialista.git
   git push -u origin main
   ```

2. **Conecta GitHub con Cloudflare**:
   - Ve al [Dashboard de Cloudflare Pages](https://dash.cloudflare.com/?to=/:account/pages).
   - Haz clic en **Create a project** > **Connect to Git**.
   - Selecciona tu repositorio en GitHub.
   - En la configuración de build, selecciona el framework **Next.js**.
   - Configura el **Root directory** como `/apps/web` (ya que es un monorepo).
   - Cloudflare desplegará automáticamente la aplicación cada vez que hagas un `git push` a la rama `main`.

*(Nota: Para el Backend en Cloudflare Workers, puedes usar GitHub Actions con la acción de Wrangler para auto-desplegarlo también).*

El frontend está construido con Next.js. Si prefieres hacerlo manual:

1. Ve a `apps/web`.
2. Instala el adaptador:
   ```bash
   npm install -D @cloudflare/next-on-pages
   ```
3. Actualiza tu script de build en `package.json`:
   ```json
   "build": "npx @cloudflare/next-on-pages"
   ```
4. Despliega usando Wrangler:
   ```bash
   npx wrangler pages deploy .vercel/output/static
   ```

*(Alternativamente, puedes conectar el repositorio de GitHub directamente a Cloudflare Pages y elegir "Next.js" como framework).*

## Tareas Programadas (Cron Jobs)

El Worker está configurado en `wrangler.toml` para ejecutarse cada 30 minutos:
```toml
[triggers]
crons = ["*/30 * * * *"]
```
Este proceso llamará a la API de fútbol, actualizará los resultados en D1, recalculará los puntos de los participantes y ajustará la tabla de posiciones y las bolsas de premios automáticamente.
