# StayPilot Hotel OS

StayPilot is an all-in-one hotel operating system for running front desk, reservations, rooms, housekeeping, engineering, guest service, billing, payments, receipts, NFC access, inventory, documents, floor plans, and night audit from one private workspace.

The application is built as a server-owned operations platform rather than a browser-only dashboard. PostgreSQL is authoritative, business-critical workflows are transactional, and every request is scoped to an authenticated hotel and staff role.

## Product Scope

| Area | Capabilities |
| --- | --- |
| Front desk | Reservations, arrivals, room assignment, check-in, checkout, groups, guest profiles |
| Property | Live room control, housekeeping turnover, maintenance, inventory, vendors, floor blueprints |
| Revenue | Folios, invoices, payment capture, refunds, numbered receipts, PDF exports, night audit |
| Access | Room-card issuance, NFC/RFID credentials, expiry, access-event tracking |
| Control | Staff accounts, role permissions, notifications, shift handovers, policies, documents, integrations |

## System Architecture

```mermaid
flowchart LR
    Staff["Hotel staff"] --> UI["Next.js operations interface"]
    UI --> Auth["Authentication API"]
    UI --> State["Hotel state API"]
    UI --> Commands["Transactional command API"]

    Auth --> Sessions["Database sessions"]
    State --> Snapshot["Hotel snapshot repository"]
    Commands --> Services["Domain command services"]

    Sessions --> Prisma["Prisma data layer"]
    Snapshot --> Prisma
    Services --> Prisma
    Prisma --> Postgres[("PostgreSQL")]

    Services --> Audit["Audit and access history"]
    Services --> Documents["Invoices, receipts and documents"]
    Audit --> Postgres
    Documents --> Postgres
```

The React provider contains presentation state only. It loads authenticated snapshots and sends commands to the backend; it does not persist hotel records, passwords, or financial truth in `localStorage`.

## Guest Stay Flow

```mermaid
sequenceDiagram
    actor Reception as Reception
    participant API as StayPilot API
    participant DB as PostgreSQL
    participant Access as Access Control
    participant HK as Housekeeping

    Reception->>API: Create reservation
    API->>DB: Create guest, booking, invoice and notification
    DB-->>Reception: Confirmed booking and open folio

    Reception->>API: Assign available room and check in
    API->>DB: Occupy room and record status transition
    Reception->>API: Issue room credential
    API->>Access: Encode NFC/RFID credential
    Access->>DB: Store credential and access event

    Reception->>API: Complete checkout
    API->>DB: Complete stay and mark room dirty
    API->>Access: Expire active room credentials
    API->>HK: Create high-priority turnover task
    HK->>API: Complete cleaning and inspection
    API->>DB: Release room as available
```

Rooms marked dirty, cleaning, maintenance, blocked, or out of service cannot be assigned through normal check-in.

## Payment and Receipt Flow

```mermaid
flowchart TD
    Folio["Open guest folio"] --> Validate{"Payment rail enabled?"}
    Validate -- No --> Reject["Reject capture"]
    Validate -- Yes --> Capture["Capture up to open balance"]
    Capture --> Transaction["Create payment transaction"]
    Transaction --> Balance["Update paid and balance totals"]
    Balance --> Status{"Balance is zero?"}
    Status -- Yes --> Paid["Mark invoice paid"]
    Status -- No --> Partial["Mark invoice partially paid"]
    Paid --> Receipt["Issue numbered receipt"]
    Partial --> Receipt
    Receipt --> PDF["Printable receipt and invoice PDF"]
    Receipt --> Ledger["Immutable audit entry"]
    Transaction --> Refund["Optional refund"]
    Refund --> Reopen["Reverse paid amount and reopen balance"]
```

Payment capture and refunds run with serializable database transactions so invoice totals, payment records, and receipts cannot diverge.

## Authorization Model

```mermaid
flowchart TB
    Cookie["HTTP-only session cookie"] --> Session{"Valid database session?"}
    Session -- No --> Unauthorized["401 Unauthorized"]
    Session -- Yes --> Hotel["Resolve hotel scope"]
    Hotel --> Role{"Role permits command?"}
    Role -- No --> Forbidden["Reject operation"]
    Role -- Yes --> Execute["Execute hotel-scoped transaction"]
    Execute --> Audit["Write actor and target audit record"]
```

- Passwords are hashed with scrypt and unique salts.
- Session tokens contain 256 random bits; only SHA-256 token hashes are stored.
- Cookies are HTTP-only, `SameSite=Lax`, secure in production, and expire after 14 days.
- Disabled users and expired or revoked sessions cannot access hotel state.
- Backend authorization is enforced even when UI navigation is bypassed.

## Core Data Model

```mermaid
erDiagram
    HOTEL ||--o{ USER : employs
    HOTEL ||--o{ ROOM_TYPE : configures
    HOTEL ||--o{ ROOM : contains
    HOTEL ||--o{ GUEST : serves
    HOTEL ||--o{ BOOKING : receives
    HOTEL ||--o{ INVOICE : issues
    HOTEL ||--o{ PAYMENT : captures
    HOTEL ||--o{ BLUEPRINT : maps

    USER ||--o{ SESSION : authenticates
    ROOM_TYPE ||--o{ ROOM : classifies
    GUEST ||--o{ BOOKING : owns
    BOOKING o|--o| ROOM : assigns
    BOOKING ||--o{ INVOICE : generates
    INVOICE ||--|{ INVOICE_ITEM : contains
    INVOICE ||--o{ PAYMENT : settles
    PAYMENT ||--o| RECEIPT : produces
    ROOM ||--o{ HOUSEKEEPING_TASK : requires
    ROOM ||--o{ MAINTENANCE_TICKET : reports
    ROOM ||--o{ ROOM_CARD : grants
    ROOM_CARD ||--o{ NFC_ACCESS_EVENT : records
    BLUEPRINT ||--o{ BLUEPRINT_ZONE : contains
    ROOM o|--o{ BLUEPRINT_ZONE : links
```

The full schema also includes complaints, policies, documents, notifications, integrations, inventory, vendors, group reservations, handovers, night audits, room-status logs, AI interaction history, and RAG document metadata.

## Technology

- Next.js 16 App Router and React 19
- TypeScript and Tailwind CSS 4
- Customized shadcn/Radix component source
- PostgreSQL and Prisma ORM
- Zod request validation
- jsPDF invoice and receipt generation

## Local Setup

### Requirements

- Node.js 20 or newer
- PostgreSQL 15 or newer
- npm

### Installation

1. Create a PostgreSQL role and database.
2. Create `.env` from `.env.example` and set the connection string.
3. Install dependencies, apply migrations, and seed the property structure.

```bash
npm install
npm run db:deploy
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). A fresh database opens the secure owner-creation flow; no default account or password is seeded.

```env
DATABASE_URL="postgresql://staypilot:change-me@localhost:5432/staypilot?schema=public"
```

## Seeded Property Structure

The idempotent seed creates:

- One configurable hotel property
- Six room types
- 101 available rooms across 20 floors
- 20 editable operating blueprints
- Hotel policies and payment gateways
- Integration connectors, vendors, and inventory baselines
- One pending night audit for the current business date

It deliberately creates zero users, guests, reservations, invoices, payments, receipts, room cards, access events, complaints, maintenance tickets, and housekeeping tasks.

## Commands

```bash
npm run dev          # start the development server
npm run build        # create a production build
npm run lint         # run ESLint
npm run db:generate  # regenerate Prisma Client
npm run db:migrate   # create and apply a development migration
npm run db:deploy    # apply committed migrations
npm run db:seed      # seed structural property data idempotently
npm run db:studio    # inspect PostgreSQL with Prisma Studio
```

## Repository Structure

```text
prisma/
  migrations/          Database migration history
  schema.prisma        Canonical PostgreSQL domain model
  seed.ts              Idempotent property structure seed
src/
  app/api/auth/        Bootstrap, login, logout and session status
  app/api/hotel/       Authenticated state and command endpoints
  components/          Product shell and editable UI components
  lib/auth.ts          Password hashing and database sessions
  server/              Snapshot reads and transactional services
docs/
  BACKEND_ARCHITECTURE.md
  BUILD_CONTEXT.md
```

The design system and workflow decisions are documented in [`DESIGN.md`](./DESIGN.md), with backend guarantees in [`docs/BACKEND_ARCHITECTURE.md`](./docs/BACKEND_ARCHITECTURE.md).

## Production Operations

Use managed PostgreSQL with TLS, restricted network access, encrypted backups, and point-in-time recovery. Run `npm run db:deploy` during deployment, never `prisma db push` against production, and use a dedicated database role with only the permissions StayPilot requires.
