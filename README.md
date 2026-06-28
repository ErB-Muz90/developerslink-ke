# DevLink KE

A Kenya-first tech collaboration platform where developers connect, build rooms, and ship together.

[![Website](https://img.shields.io/website?url=https%3A%2F%2Fdevlink.banduka.co.ke&label=devlink.banduka.co.ke)](https://devlink.banduka.co.ke)
[![Vercel](https://img.shields.io/badge/Vercel-deployed-000000?logo=vercel)](https://vercel.com)

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│                   Vercel                           │
│  ┌──────────────┐    ┌─────────────────────────┐ │
│  │  Frontend     │    │  API Function            │ │
│  │  (React/Vite) │◄──►│  (Express + serverless)  │ │
│  │  /api/*       │    │  /api/auth, /api/rooms   │ │
│  └──────────────┘    └──────────┬──────────────┘  │
│                                  │                  │
│                                 ▼                  │
│                          ┌────────────┐            │
│                          │ PostgreSQL │            │
│                          │ (Neon/RDS) │            │
│                          └────────────┘            │
└──────────────────────────────────────────────────┘
```

### Frontend — `artifacts/devlink-ke`
- React 19 + TypeScript + Vite
- React Router (wouter)
- TanStack Query for data fetching
- shadcn/ui component library
- Tailwind CSS v4

### API — `artifacts/api-server`
- Express 5 + TypeScript
- Session-based auth (connect-pg-simple)
- WebSocket support (ws) for room collaboration
- Drizzle ORM + PostgreSQL
- Zod validation

### Shared Libraries
- `@workspace/db` — Database schema & connection
- `@workspace/api-zod` — Zod schemas for API contracts
- `@workspace/api-client-react` — Generated React hooks (Orval)
- `lib/api-spec` — OpenAPI specification

---

## Local Development

```bash
# Install dependencies
pnpm install

# Set up environment
cp artifacts/api-server/.env.example artifacts/api-server/.env
# Edit .env with your DATABASE_URL and SESSION_SECRET

# Start the API server (port 3001)
pnpm --filter @workspace/api-server run dev

# Start the frontend dev server (port 3000) in another terminal
pnpm --filter @workspace/devlink-ke run dev
```

The frontend dev server proxies `/api` requests to the API server.

### Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Session signing secret (required in production) |
| `RESEND_API_KEY` | Resend API key for email verification |
| `NODE_ENV` | `development` or `production` |
| `PORT` | API server port (default: 3001) |

---

## Deployment

The site deploys on **Vercel** from the `main` branch.

Push to trigger a deploy:

```bash
git push origin main
```

Monitor deployment status in the [Vercel dashboard](https://vercel.com).

### Deploy Flow

1. `pnpm install` — install workspace dependencies
2. Vercel discovers the API serverless function at `api/[[...route]].ts` (optional catch-all pattern)
3. `pnpm --filter @workspace/devlink-ke run build` — build frontend bundle
4. Vercel bundles `api/[[...route]].ts` into a serverless function (catch-all route, wraps Express via `serverless-http`)
5. Frontend is published to `artifacts/devlink-ke/dist/public`
6. Vercel rewrites `/*` → `/index.html` (SPA routing) — the function handles `/api/*` directly via the catch-all pattern

### Environment Variables in Vercel

Set these in the Vercel dashboard (Project → Settings → Environment Variables):

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `SESSION_SECRET` | ✅ | Long random string for session signing |
| `RESEND_API_KEY` | ❌ | For email verification |
| `NODE_ENV` | ✅ | Set to `production` |

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/livez` | Lightweight liveness check (no middleware) |
| GET | `/api/healthz` | Full health check (through middleware stack) |
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/logout` | Sign out |
| GET | `/api/auth/me` | Current user |
| GET | `/api/rooms` | List rooms |
| POST | `/api/rooms` | Create room |
| GET | `/api/rooms/:id` | Room detail |
| ... | ... | ... |

Full API documentation is in [`lib/api-spec/openapi.yaml`](./lib/api-spec/openapi.yaml).

---

## Project Structure

```
├── api/
│   └── [[...route]].ts   # Vercel serverless function (Express + serverless-http)
├── artifacts/
│   ├── api-server/       # Express API server
│   └── devlink-ke/       # React frontend
├── lib/
│   ├── api-client-react/ # Generated React API client
│   ├── api-spec/         # OpenAPI specification
│   ├── api-zod/          # Zod validation schemas
│   └── db/               # Database schema & connection
└── pnpm-workspace.yaml   # Workspace configuration
```
