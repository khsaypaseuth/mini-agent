# MiniAgent

Agency platform for Lao↔Thailand micro-services — border passes, vehicle documents, insurance, immigration registration, driving licenses, and more.

## Monorepo structure

```
mini-agent/
├─ apps/api          # NestJS REST API (port 3000)
├─ apps/web-admin    # Next.js admin dashboard (port 3001)
├─ apps/web-app      # Next.js customer site + PWA (port 3002)
├─ apps/mobile       # Expo React Native (Android + iOS)
├─ packages/types    # Shared TypeScript types & enums
├─ packages/ui       # Shared design system components
├─ packages/i18n     # Translation JSON (lo, hmn, en, zh, vi, th, ko)
└─ packages/config   # ESLint, tsconfig, Tailwind preset
```

## Prerequisites

- Node.js ≥ 22
- pnpm ≥ 10
- Docker + Docker Compose

## Local dev setup

```bash
# 1. Install dependencies
pnpm install

# 2. Start infrastructure (PostgreSQL, Redis, MinIO)
docker-compose up -d

# 3. Configure API environment
cp apps/api/.env.example apps/api/.env

# 4. Generate Prisma client + run migrations
cd apps/api
pnpm db:migrate
pnpm db:seed

# 5. Start all apps in dev mode
cd ../..
pnpm dev
```

| App | URL |
|-----|-----|
| API | http://localhost:3000 |
| Swagger docs | http://localhost:3000/api/docs |
| Web Admin | http://localhost:3001 |
| Web App | http://localhost:3002 |
| MinIO console | http://localhost:9001 (minioadmin / minioadmin) |

## Branch strategy

`main` (protected) ← `develop` ← `feature/*`

Commits follow [Conventional Commits](https://www.conventionalcommits.org/).
