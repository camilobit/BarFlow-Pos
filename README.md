# 🍹 BarFlow POS

Sistema web profesional para administración de bares, discotecas, gastrobares y restaurantes. Meseros toman pedidos desde el celular, la barra los recibe en tiempo real, y administración controla inventario, ventas, caja, clientes y fidelización.

## Estructura del proyecto (solo dos carpetas)

```
barflow-pos/
├── backend/                  API REST (Express) + esquema de base de datos
│   ├── src/
│   │   ├── config/            supabase.js (cliente admin + anon), env.js
│   │   ├── middlewares/       auth (JWT de Supabase), roles, validate, rate limiting, errores
│   │   ├── utils/              AppError, response.utils (envoltura {success,message,data}), auditoría
│   │   ├── routes/index.js    agregador: monta cada módulo bajo /api/<recurso>
│   │   └── modules/            un módulo por dominio de negocio, autocontenido:
│   │       ├── pedidos/         pedidos.controller.js + .service.js + .routes.js + .validator.js
│   │       ├── mesas/
│   │       ├── productos/       incluye categorías e insumos/recetas
│   │       ├── caja/
│   │       ├── clientes/        incluye fidelización
│   │       ├── dashboard/
│   │       ├── negocios/        (solo super_admin)
│   │       ├── usuarios/
│   │       ├── barras/
│   │       └── notificaciones/
│   ├── database/             migrations/*.sql + seed/seed.sql (PostgreSQL en Supabase)
│   ├── scripts/seedUsuarios.js
│   └── Dockerfile
│
├── frontend/                 Aplicación web (React + Vite + Tailwind)
│   ├── src/                  pages (auth/mesero/barra/admin), components, contexts, hooks, services
│   ├── Dockerfile
│   └── nginx.conf
│
└── docker-compose.yml        Levanta backend + frontend juntos en local
```

> Cada módulo del backend agrupa su controlador, su servicio, sus rutas y sus validaciones Zod en una sola carpeta — para agregar o modificar una funcionalidad solo tocas una carpeta, no cuatro dispersas. La API responde siempre con el mismo formato `{ success, message, data }`, tanto en éxito como en error.

## Cómo funciona el login (y por qué es seguro)

El login **no pasa por tu backend** — el frontend habla directo con Supabase Auth usando la `anon key` (pensada para ser pública, no es un secreto). Supabase te devuelve un JWT firmado, que el frontend guarda en su sesión y envía en cada petición como `Authorization: Bearer <token>`.

Tu backend nunca ve contraseñas ni las guarda: en cada petición, el middleware `requireAuth` valida ese JWT contra Supabase (`supabase.auth.getUser(token)`) y carga el perfil del usuario (`tabla usuarios`) antes de dejar pasar la petición. Esto es exactamente el mismo patrón de seguridad que usan aplicaciones grandes construidas sobre Supabase — no reinventamos autenticación a mano, con todo el riesgo que eso implica (hash de contraseñas, expiración de tokens, recuperación de cuenta, etc.).


## Requisitos

- Node.js 20+ (o Docker, ver más abajo)
- Una cuenta gratuita en [supabase.com](https://supabase.com)

## 1. Crear el proyecto en Supabase

1. Crea un proyecto nuevo en Supabase.
2. Abre **SQL Editor** y ejecuta, en este orden, el contenido de:
   - `backend/database/migrations/001_schema.sql`
   - `backend/database/migrations/002_funciones_negocio.sql`
   - `backend/database/migrations/003_rls_policies.sql`
   - `backend/database/seed/seed.sql` (opcional — datos de prueba)
3. Ve a **Project Settings → API** y copia: `Project URL`, `anon public key` y `service_role key`.
4. Ve a **Database → Replication** y activa Realtime para las tablas `pedidos`, `pedido_items`, `mesas`, `notificaciones`.

## 2. Levantar todo en local

### Opción A — con Docker (recomendado, un solo comando)

```bash
cp backend/.env.example backend/.env      # completa tus credenciales de Supabase
cp frontend/.env.example frontend/.env    # completa tus credenciales de Supabase
docker compose up
```

- Backend: http://localhost:4000
- Frontend: http://localhost:5173

### Opción B — sin Docker

```bash
# Backend
cd backend
cp .env.example .env      # completa SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
npm install
npm run seed:usuarios     # crea usuarios de prueba
npm run dev                # http://localhost:4000

# En otra terminal — Frontend
cd frontend
cp .env.example .env      # completa VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL
npm install
npm run dev                # http://localhost:5173
```

**Importante:** Vite solo lee `frontend/.env` al arrancar. Si editas el `.env` con el servidor ya corriendo, debes reiniciarlo (`Ctrl+C` y `npm run dev` de nuevo).

## 3. Si el frontend se queda en blanco

Desde esta versión, la app **ya no debería quedar en blanco sin explicación**:

- Si faltan o están mal las variables `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, verás una pantalla oscura que dice exactamente qué falta y cómo arreglarlo (antes esto rompía el render completo sin avisar).
- Si ocurre cualquier otro error de JavaScript al cargar, un `ErrorBoundary` lo atrapa y muestra el mensaje en pantalla en vez de dejar la página vacía.

Si aun así ves algo raro, revisa en este orden:

1. **Consola del navegador** (F12 → Console): el 90% de las veces el error real está ahí.
2. **Variables de entorno del frontend**: en producción (Vercel/Netlify/Docker) deben definirse **antes del build**, porque Vite las incrusta en el bundle en tiempo de compilación, no en tiempo de ejecución. Si las agregaste después de desplegar, necesitas volver a hacer build/deploy, no solo reiniciar el servidor.
3. **`VITE_API_URL`** debe apuntar a la URL pública real del backend (no `localhost` si el backend está desplegado en otro dominio).
4. **CORS**: en `backend/.env`, `CORS_ORIGIN` debe ser exactamente el dominio del frontend desplegado (sin `/` al final).
5. **Rutas al recargar la página** (por ejemplo `/admin` o `/mesero`): en hosting estático necesitas redirigir todo a `index.html`. Ya se incluyen `frontend/public/_redirects` (Netlify) y `frontend/vercel.json` (Vercel) para esto.

## 4. Despliegue a producción

### Backend

Cualquier plataforma con Node 18+ (Railway, Render, Fly.io, un VPS) o el `backend/Dockerfile` incluido:

```bash
docker build -t barflow-backend ./backend
docker run -p 4000:4000 --env-file backend/.env barflow-backend
```

Configura ahí las mismas variables de `backend/.env.example`. **Nunca** expongas `SUPABASE_SERVICE_ROLE_KEY` al frontend.

### Frontend

Con Vercel/Netlify: conecta el repo, define el *root directory* como `frontend`, y agrega las variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL` en su panel **antes de desplegar**.

Con Docker (build-time args, porque Vite necesita las variables al compilar):

```bash
docker build \
  --build-arg VITE_SUPABASE_URL=https://xxxx.supabase.co \
  --build-arg VITE_SUPABASE_ANON_KEY=eyJxxx... \
  --build-arg VITE_API_URL=https://tu-backend.com/api \
  -t barflow-frontend ./frontend

docker run -p 8080:80 barflow-frontend
```

Después de actualizar variables de entorno del frontend en cualquier plataforma, **siempre hay que reconstruir el build**, no solo reiniciar.

## Antes de tener el primer negocio pagando

- **Render (u otro host) en plan gratuito duerme el backend tras inactividad.** Para un POS de bar en producción real esto es inaceptable — un mesero no puede esperar 30-60 segundos en que el servidor despierte para que salga el primer pedido de la noche. Antes de facturar, sube el backend a un plan siempre-activo (ej. Render Starter).
- **Supabase Realtime va del navegador directo a Supabase**, no pasa por tu backend — así que aunque el backend esté ocupado o lento, los pedidos entre mesero y barra se siguen viendo en tiempo real.
- El aislamiento entre negocios (multi-tenant) ya soporta varios negocios simultáneos: cada fila tiene `negocio_id`, cada consulta del backend lo filtra, y además la base de datos lo refuerza con RLS como segunda capa de defensa.
- Migrar el frontend a Cloudflare Pages más adelante es solo un cambio de hosting estático — no requiere tocar código, solo volver a definir las variables de entorno (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`) en el nuevo panel antes del build.

## Formato de respuesta de la API

Toda respuesta del backend sigue el mismo sobre, tanto en éxito como en error:

```json
// Éxito
{ "success": true, "message": "Pedido creado y enviado a barra", "data": { "id": "...", ... } }

// Error
{ "success": false, "message": "No hay una caja abierta." }
```

El frontend ya desempaqueta esto automáticamente en `frontend/src/services/api.js` — el resto del código sigue leyendo los datos directamente, sin preocuparse por el sobre.

## Roles del sistema

- **super_admin** — administra todos los negocios de la plataforma.
- **admin_negocio** — dueño/gerente de un bar: mesas, productos, inventario, caja, clientes, equipo, reportes.
- **barra** — pantalla de despacho en tiempo real.
- **mesero** — toma pedidos desde el celular, cierra/divide cuentas, combina mesas.

## Credenciales de prueba

Después de correr `npm run seed:usuarios` (o `docker compose exec backend npm run seed:usuarios`):

| Rol | Correo | Contraseña |
|---|---|---|
| Admin del negocio | admin@laterraza.com | BarFlow2026! |
| Barra | barra@laterraza.com | BarFlow2026! |
| Mesero | mesero@laterraza.com | BarFlow2026! |

Para el primer **super_admin**, créalo manualmente en Supabase Auth y luego insértalo en la tabla `usuarios` con `rol = 'super_admin'` y `negocio_id = null`.

## Flujo de un pedido (tiempo real)

1. El mesero arma el pedido desde el celular y lo envía.
2. La API crea el pedido; triggers en PostgreSQL asignan la barra a cada ítem y recalculan totales.
3. Supabase Realtime notifica al instante a la pantalla de barra correspondiente.
4. Al marcar *preparando*, un trigger descuenta el inventario según la receta del producto.
5. Al **cerrar la cuenta**, otro trigger actualiza al cliente (visitas, consumo, puntos), libera la mesa y registra el movimiento en caja.
