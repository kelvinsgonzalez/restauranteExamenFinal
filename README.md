# Restaurante Familiar – Sistema de Reservas

Monorepo full-stack (NestJS + React 18) para gestionar reservas, mesas y clientes de un restaurante familiar con disponibilidad en tiempo real, reportes y despliegue preparado con Docker.

## Estructura

```
/
├─ package.json (workspaces)
├─ docker-compose.yml
├─ apps/
│  ├─ backend (NestJS 10, TypeORM, Socket.IO)
│  └─ frontend (Vite 5, React 18, Tailwind)
```

## Requisitos

- Node.js 18+
- npm 10+
- Docker + Docker Compose (opcional pero recomendado)

## Variables de entorno

Duplica `.env.example` en `.env` en la raíz y ajusta:

```
API_PORT=3000
API_PREFIX=/api/v1
DATABASE_URL=postgres://postgres:postgres@db:5432/reservas
VITE_API_BASE=http://localhost:3000/api/v1
VITE_WS_URL=http://localhost:3000
VITE_MAPBOX_TOKEN=YOUR_MAPBOX_TOKEN
```

Credenciales seed: `chef@restaurante.com / Chef2024!`

## Desarrollo local (sin Docker)

```bash
npm install
npm run dev:backend   # NestJS con ts-node-dev
npm run dev:frontend  # Vite (puerto 5173)
```

Para ejecutar ambos en paralelo: `npm run dev:local` (usa concurrently).

Base de datos: apunta `DATABASE_URL` a tu PostgreSQL local o levanta `docker compose up db`.

### Migraciones y seed

```bash
npm run migrate:run --workspace apps/backend
npm run seed --workspace apps/backend
```

## Desarrollo con Docker

```bash
npm run dev          # equivalente a docker compose up --build
```

Servicios:
- **db**: PostgreSQL 15
- **backend**: Node 18 (NestJS + ServeStatic). expone `3000`
- **frontend**: Node 20 ejecutando Vite dev server en `5173`

Para producción, construye el frontend y se copia al contenedor del backend (ServeStatic sirve `/`).

## Scripts útiles

| Script | Descripción |
| --- | --- |
| `npm run dev` | Docker Compose completo |
| `npm run dev:local` | Front + back en HOT reload |
| `npm run build` | Build frontend + backend |
| `npm run lint` | Lint de ambos paquetes |
| `npm run test --workspace apps/backend` | Tests unitarios backend |
| `npm run test:e2e --workspace apps/backend` | Tests e2e básicos (auth/reservas) |

## Frontend

- React Router, Tailwind, Framer Motion (animaciones ligeras)
- Socket.IO client + Sonner para notificaciones en tiempo real
- Mapa con `react-map-gl` (Mapbox)
- Axios + interceptores con JWT (cookie o bearer)
- Componentes principales: calendario diario, dashboard con KPIs, formulario con disponibilidad, CRUD de mesas y clientes.

## Backend

- NestJS modular (`auth`, `users`, `tables`, `customers`, `reservations`, `settings`, `reports`, `ws`, `tasks`)
- TypeORM + PostgreSQL (UUID, migraciones, seeds)
- Validaciones (`class-validator`, reglas de negocio para horarios, colisiones y capacidad)
- Autenticación JWT + Passport (bearer o cookie httpOnly)
- Socket.IO (`/ws`) emite `reservation.created|updated|cancelled` y snapshots de ocupación
- Cron jobs (node-cron) para recordatorios y cierre diario
- ServeStatic en producción (frontend build en `/`)

## Aceptación funcional

- Crear/editar mesas, clientes y reservas respetando capacidad y horarios
- Consultar disponibilidad (`/availability`)
- Confirmar/cancelar reservas con notificaciones en tiempo real
- Dashboard con ocupación estimada, reservas del día y mapa interactivo
- Historial de clientes frecuentes y reportes `/reports/occupancy?range=day|week`

## Tests

`apps/backend/test/*.e2e-spec.ts` validan endpoints de auth y reservas vía Supertest (Nest Testing Module). Ejecuta con `npm run test:e2e --workspace apps/backend`.

## Despliegue

1. Ajusta `.env` con credenciales reales.
2. `npm run build` (compila frontend + backend).
3. `docker compose up --build backend db` para stack productivo (frontend se sirve desde backend).

¡Lista la plataforma para gestionar las reservas del restaurante familiar! 
