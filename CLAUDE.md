# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Manager

Use **pnpm** exclusively. npm and yarn are prohibited.

## Development Commands

```bash
# Start both frontend and backend
pnpm dev

# Individual packages
pnpm --filter frontend dev        # React + Vite on port 5173
pnpm --filter backend dev         # NestJS on port 3000

# Build
pnpm --filter @erp/shared-types build   # Must build before backend/frontend
pnpm --filter @erp/database build
pnpm --filter backend build
pnpm --filter frontend build

# Lint & format
pnpm --filter backend lint
pnpm --filter backend format
pnpm --filter frontend lint

# Tests
pnpm --filter backend test              # Jest unit tests
pnpm --filter backend test:e2e          # E2E tests
pnpm --filter frontend test             # Vitest single run
```

## Database Commands

```bash
# Create and apply a named migration after schema changes
pnpm --filter @erp/database exec prisma migrate dev --name <name>

# Apply committed migrations to the current database
pnpm --filter @erp/database exec prisma migrate deploy
```

`DATABASE_URL` is read from `packages/database/.env` and is required for local startup.
Copy `packages/database/.env.example` when setting up a new machine.
MinIO settings are also environment-driven:
- macOS can point `MINIO_ENDPOINT` to local MinIO
- Windows can point `MINIO_ENDPOINT` to a NAS-hosted MinIO endpoint
- `MINIO_BUCKET` must already exist

Local startup now runs Prisma sync automatically before `pnpm dev` and
`pnpm --filter backend dev`:
- always runs `prisma generate`
- applies pending migrations with `prisma migrate deploy`
- blocks startup on legacy `db push` databases unless
  `PRISMA_DEV_ALLOW_DB_PUSH_FALLBACK=true` is set for a one-time local baseline

When changing `packages/database/prisma/schema.prisma`, always commit the new
`packages/database/prisma/migrations/*` directory in the same change.

## Monorepo Structure

```
apps/
  backend/     NestJS REST API (port 3000)
  frontend/    React 19 + Vite SPA (port 5173)
packages/
  database/    Prisma schema + client (@erp/database)
  shared-types/ Shared TypeScript DTOs (@erp/shared-types)
```

## Architecture

### API Layer

- Frontend proxies `/api/*` → `http://localhost:3000` via Vite config
- All responses follow `{ code, message, data? }` shape
- Global `AllExceptionsFilter` normalizes errors; Prisma error codes (P2002, P2003, P2025) are mapped to user-friendly messages
- Global validation pipe: `whitelist: true`, `transform: true`

### Backend Modules (NestJS)

- `PrismaModule` — singleton DB connection
- `OrdersModule` — order CRUD + status transitions (PENDING → PARTIAL_SHIPPED → SHIPPED → CLOSED_SHORT)
- `PartsModule` — parts dictionary + versioned drawings
- `DeliveriesModule` — shipment tracking with anti-oversend validation via `OrderItem.shippedQty`
- `BillingModule` — invoice lifecycle (DRAFT → SEALED → PAID)
- `SealsModule` — digital seal management
- `DocumentsModule` — PDF generation + seal application

### Frontend Architecture

- File-based routing via **TanStack Router** (`src/routes/*.tsx`)
- **React Query** for server state (5-min stale time, no refetch on window blur)
- **Zustand** stores: `layoutStore`, `ui.store`
- **Zod + React Hook Form** for form validation
- Document export utilities: `documentExport.ts`, `documentExportData.ts`

### Shared Types

`@erp/shared-types` defines DTOs used by both backend (class-validator decorators) and frontend (Zod schemas). Build this package first when types change.

### Key Database Constraints

- `OrderItem.unitPrice` is a snapshot locked at order creation — never update it
- `DeliveryItem` has a unique constraint on `billingId` to prevent double-billing
- `PartDrawing.isLatest` flag manages drawing versions
- `SealUsageLog` is an append-only audit trail (IP + timestamp)
