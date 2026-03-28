# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Package Manager

Use **pnpm** exclusively. npm and yarn are prohibited.

## Development Commands

```bash
# Start both frontend and backend concurrently
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
# Generate Prisma client (required after schema changes)
pnpm --filter @erp/database exec prisma generate

# Push schema changes to dev DB
pnpm --filter @erp/database exec prisma db push

# Create a named migration
pnpm --filter @erp/database exec prisma migrate dev --name <name>
```

`DATABASE_URL` is read from `packages/database/.env`.

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
