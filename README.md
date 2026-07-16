<div align="center">
  <img src="./public/readme-banner.svg" alt="StayPilot Hotel Operating System" width="100%" />
</div>

<div align="center">
  <br />
  <strong>An all-in-one hotel operating suite for every team, room, payment, and guest journey.</strong>
  <br /><br />
  <a href="#quick-start">Quick Start</a> ·
  <a href="#operator-manual">Operator Manual</a> ·
  <a href="#feature-directory">Features</a> ·
  <a href="#production-deployment">Deployment</a>
</div>

<div align="center">
  <br />
  <img alt="Next.js 16" src="https://img.shields.io/badge/Next.js_16-111412?style=for-the-badge&logo=nextdotjs&logoColor=F0F2ED" />
  <img alt="React 19" src="https://img.shields.io/badge/React_19-111412?style=for-the-badge&logo=react&logoColor=8EB69B" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-111412?style=for-the-badge&logo=postgresql&logoColor=8EB69B" />
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-111412?style=for-the-badge&logo=prisma&logoColor=C9A86A" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-111412?style=for-the-badge&logo=typescript&logoColor=8EB69B" />
</div>

---

## What Is StayPilot?

StayPilot is a private hotel operations workspace that brings the front desk, reservations, guests, rooms, housekeeping, engineering, service recovery, billing, payments, receipts, NFC access, inventory, vendors, reports, floor plans, and night audit into one consistent system.

It is built as an operational application rather than a collection of disconnected dashboard mockups. PostgreSQL owns hotel data, authenticated APIs enforce hotel and role boundaries, and critical workflows update all connected records together.

### Product Principles

- **One source of truth:** operational records live in PostgreSQL, not browser storage.
- **One connected workflow:** check-in, access, billing, housekeeping, and checkout share the same guest and room context.
- **Safe financial operations:** captures and refunds update payments, invoices, receipts, and audit history transactionally.
- **Fresh by default:** the seed creates the property structure but no guests, bookings, bills, staff, or access credentials.
- **Hotel-controlled access:** the first owner creates the property account; no default credentials are shipped.
- **In-house interface:** product controls, overlays, menus, data tables, and operating flows are maintained inside the codebase.

## Feature Directory

| Workspace | What hotel teams can do |
| --- | --- |
| **Dashboard** | Monitor occupancy readiness, arrivals, departures, room state, alerts, and operational priorities. |
| **Front Desk** | Coordinate arrivals, available-room assignment, check-in, checkout, and current stays. |
| **Bookings** | Create and manage reservations, stay dates, booking status, room assignment, and source details. |
| **Group Reservations** | Organize multi-room stays and keep group movements visible to operations. |
| **Guests** | Maintain guest profiles, contact details, preferences, stay history, and linked activity. |
| **Rooms** | Browse all 101 rooms across 20 floors and control availability, occupancy, cleaning, blocking, and service state. |
| **Housekeeping** | Run turnover queues, room cleaning, inspections, priorities, ownership, and completion. |
| **Maintenance** | Raise engineering tickets, classify urgency, connect work to rooms, and restore inventory safely. |
| **Service Operations** | Coordinate guest-facing service work from one operating queue. |
| **Complaints** | Record service issues, priority, ownership, status, and resolution progress. |
| **Billing** | Build guest folios and invoices, add charge lines, track balances, and generate PDFs. |
| **Payments** | Capture enabled payment methods, update invoice balances, and process controlled refunds. |
| **Receipts** | Review numbered receipts and create printable receipt documents. |
| **Room Cards** | Issue, monitor, expire, and revoke NFC/RFID room credentials. |
| **Access Tracker** | Review credential events and room-access history for security follow-up. |
| **Inventory** | Track hotel stock, reorder levels, unit cost, and operational availability. |
| **Vendors** | Maintain supplier contacts and the partners connected to hotel operations. |
| **Blueprints** | Work with floor-by-floor operating plans linked to the room structure. |
| **Documents** | Keep property documents and generated operational files discoverable. |
| **Reports** | Review hotel performance and operational summaries from current system data. |
| **Night Audit** | Close the business date through a dedicated audit workspace. |
| **Handovers** | Record shift context so unresolved work moves safely between teams. |
| **Notifications** | Review system alerts and operational follow-ups in one inbox. |
| **Integrations** | View and manage configured property connectors and payment rails. |
| **Settings** | Configure property details, staff access, roles, policies, and operating preferences. |

## Built-In Safety

- Passwords are hashed with Node.js `scrypt` and a unique salt.
- Session cookies are HTTP-only, `SameSite=Lax`, secure in production, and valid for 14 days.
- Only SHA-256 session-token hashes are stored in the database.
- Every state request is resolved from the authenticated user's hotel scope.
- Disabled users and expired or revoked sessions are rejected by the backend.
- Check-in refuses rooms that are dirty, cleaning, blocked, under maintenance, or out of service.
- Checkout expires room credentials, marks the room dirty, and creates turnover work in one transaction.
- Payment and refund operations use serializable database transactions.
- Sensitive actions produce actor and target audit records.

## Quick Start

### Prerequisites

Install the following before starting:

- Node.js 20 or newer
- npm 10 or newer
- PostgreSQL 15 or newer
- Git

### 1. Clone and install

```bash
git clone https://github.com/InsaneCoder789/StayPilot.git
cd StayPilot
npm install
```

### 2. Create the database

Create a dedicated PostgreSQL database and role. The names below are examples and may be changed.

```sql
CREATE ROLE staypilot WITH LOGIN PASSWORD 'replace-with-a-strong-password';
CREATE DATABASE staypilot OWNER staypilot;
```

### 3. Configure the environment

Create a local `.env` file from the committed template and replace the credentials.

```bash
cp .env.example .env
```

```env
DATABASE_URL="postgresql://staypilot:replace-with-a-strong-password@localhost:5432/staypilot?schema=public"
```

Never commit `.env`. It is excluded by `.gitignore`.

### 4. Apply the database and seed the property

```bash
npm run db:generate
npm run db:deploy
npm run db:seed
```

The seed is idempotent. Re-running it restores required property structure without creating guests, bookings, invoices, payments, receipts, cards, complaints, maintenance work, housekeeping work, or staff accounts.

### 5. Start StayPilot

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). A new installation redirects to owner setup.

### 6. Create the first owner

1. Enter the property name and the owner's staff details.
2. Use a private work email and a strong, unique password.
3. Submit the setup form once; this becomes the first authorized property account.
4. Sign in and open **Settings** before beginning live operations.

No default username, password, demo guest, or pre-filled booking is included.

## First-Time Property Setup

Complete these steps in order before the hotel starts using the system:

1. **Property identity:** verify the property name, address, contact information, currency, taxes, and operating timezone in **Settings**.
2. **Staff access:** add only active hotel employees, assign the minimum role required, and verify each account before sharing access.
3. **Room inventory:** review all floors and room numbers in **Rooms**. Confirm room type, floor, and initial availability.
4. **Payment rails:** enable only the payment methods the property is prepared to accept in **Integrations** or **Settings**.
5. **Policies:** review check-in, checkout, cancellation, refund, access-card, and data-retention policies.
6. **Vendors and inventory:** add suppliers and confirm stock units, minimum levels, and current quantities.
7. **Floor plans:** review the 20 seeded floor blueprints and connect operating zones to the correct rooms.
8. **Opening checks:** confirm there are zero guests, bookings, invoices, payments, and room credentials before entering live data.

## Operator Manual

### Reservation to checkout

#### Create a reservation

1. Open **Bookings** and choose the create-booking action.
2. Enter the guest identity, contact information, arrival date, departure date, room type, occupancy, source, and rate details.
3. Review the stay dates and financial summary before confirming.
4. Save the reservation. StayPilot creates the connected guest, booking, open folio, and operational notification.

#### Prepare an arrival

1. Open **Front Desk** and locate the arriving reservation.
2. Confirm the guest's details, dates, preferences, payment expectations, and room type.
3. Open **Rooms** if availability needs review.
4. Select only a room marked available and ready.
5. Resolve any dirty, cleaning, maintenance, blocked, or out-of-service state before assignment.

#### Check in a guest

1. Assign the available room from **Front Desk** or the reservation flow.
2. Confirm the final room and arrival details.
3. Complete check-in. The room becomes occupied and the stay becomes active.
4. Open **Room Cards** and issue the guest's credential with the correct validity period.
5. Verify the issuance event in **Access Tracker** when required by property policy.

#### Add folio charges

1. Open **Billing** and select the guest's invoice.
2. Add a clear charge description, quantity, unit price, and applicable tax.
3. Confirm the new total and outstanding balance.
4. Generate the invoice PDF when a guest copy is required.

#### Capture payment

1. Open **Payments** and select the open guest invoice.
2. Choose an enabled payment rail and enter an amount no greater than the open balance.
3. Add a payment reference when available.
4. Confirm the capture once. StayPilot updates the invoice, creates the payment record, and issues a numbered receipt.
5. Open **Receipts** to review or print the receipt.

#### Process a refund

1. Locate the completed transaction in **Payments**.
2. Verify the guest, invoice, amount, payment rail, and original reference.
3. Run the refund action only after property authorization.
4. Confirm the reopened invoice balance and retain the refund reference for reconciliation.

#### Check out a guest

1. Confirm all charges and payments in **Billing**.
2. Complete checkout from **Front Desk**.
3. StayPilot ends the stay, expires active room credentials, marks the room dirty, and creates a high-priority housekeeping turnover task.
4. Give the guest the final invoice and receipt documents as required.

### Housekeeping operations

1. Open **Housekeeping** at the beginning of the shift.
2. Prioritize departure turnovers, urgent guest requests, and inspection failures.
3. Assign work to the responsible attendant where staffing is configured.
4. Move the task through cleaning and inspection states as work progresses.
5. Mark the task complete only after the room passes property standards.
6. Confirm the room returns to available before the front desk assigns it.

### Maintenance operations

1. Open **Maintenance** and create a ticket with the affected room, category, description, and urgency.
2. Use a blocking severity when a defect makes the room unsafe or unsuitable for sale.
3. Record progress and ownership while engineering works the ticket.
4. Resolve the ticket only after verifying the repair.
5. Confirm the connected room has returned to the correct sale and housekeeping state.

### Room-card and NFC operations

1. Issue credentials only for an active stay and its assigned room.
2. Match credential validity to the approved stay period.
3. Use **Access Tracker** to investigate credential events and access history.
4. Revoke a lost or replaced credential immediately.
5. Confirm all active credentials expire automatically at checkout.

StayPilot manages credential records and access-event history. Physical encoding and door-controller communication require compatible hotel hardware and a configured connector.

### Complaints and service recovery

1. Open **Complaints** and record the guest, room, issue, urgency, and clear factual notes.
2. Assign an owner and track the complaint through resolution.
3. Create connected housekeeping or maintenance work when the issue requires another team.
4. Record the outcome before closing the complaint.
5. Include unresolved or sensitive matters in **Handovers**.

### Inventory and vendors

1. Add approved suppliers in **Vendors** with current contact details.
2. Configure each stock item in **Inventory** with its unit, quantity, reorder level, and cost.
3. Review low-stock items during the daily operating meeting.
4. Update quantities when goods are received or issued.
5. Keep supplier and cost information current for purchasing decisions.

### Shift handover

1. Open **Handovers** before the outgoing team leaves.
2. Record unresolved arrivals, guest complaints, payment follow-ups, blocked rooms, maintenance risks, and access concerns.
3. Keep notes factual and action-oriented.
4. The incoming shift should acknowledge and work each outstanding item.

### Night audit

1. Confirm expected arrivals, departures, open folios, payment exceptions, and unresolved room states.
2. Review **Reports**, **Billing**, and **Payments** for discrepancies.
3. Open **Night Audit** and complete the business-date checks.
4. Resolve exceptions before final closure wherever possible.
5. Record deferred work in **Handovers** for the next shift.

## Room Inventory

The fresh property seed creates **101 available rooms across 20 floors**, with four to six rooms per floor and six configurable room types. It also creates one editable blueprint for every floor.

The seed does not allocate any room. Every room starts without a guest, booking, folio, card, cleaning task, or maintenance ticket.

## Data Ownership and API Behavior

The browser provider holds presentation state only. It loads an authenticated hotel snapshot and sends validated commands to the backend. Refreshing or closing the browser cannot remove the hotel's operational records.

Core workflow guarantees include:

- Check-in assigns the room, changes room status, updates the booking, and writes audit history together.
- Checkout completes the stay, dirties the room, creates turnover work, expires credentials, and updates guest history together.
- Payment capture updates the transaction, invoice balance, receipt, document record, and audit history together.
- Refunds are idempotent and safely reverse invoice paid and balance totals.
- Housekeeping and maintenance state changes update the connected room inside the same database transaction.

For implementation details, read [Backend Architecture](./docs/BACKEND_ARCHITECTURE.md).

## Development Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server. |
| `npm run build` | Create and validate the optimized production build. |
| `npm run start` | Run the completed production build. |
| `npm run lint` | Run the ESLint quality gate. |
| `npm run db:generate` | Regenerate Prisma Client after schema changes. |
| `npm run db:migrate` | Create and apply a development migration. |
| `npm run db:deploy` | Apply committed migrations in staging or production. |
| `npm run db:seed` | Idempotently create the property structure. |
| `npm run db:studio` | Open Prisma Studio for authorized local inspection. |

## Repository Guide

```text
StayPilot/
├── prisma/
│   ├── migrations/          # Versioned PostgreSQL changes
│   ├── schema.prisma        # Canonical hotel domain model
│   └── seed.ts              # Fresh property structure
├── public/                  # Static product and repository assets
├── src/
│   ├── app/                 # Product routes and API handlers
│   ├── components/          # App shell and maintained UI components
│   ├── lib/                 # Authentication, database, PDF, and shared logic
│   └── server/              # Snapshot reads and transactional commands
├── docs/                    # Backend and build documentation
├── DESIGN.md                # Visual language and interaction decisions
└── README.md                # Setup guide and operator manual
```

## Production Deployment

### Required controls

- Use a managed PostgreSQL service with TLS, encrypted backups, and point-in-time recovery.
- Use a dedicated least-privilege database role for StayPilot.
- Store `DATABASE_URL` in the deployment platform's encrypted environment settings.
- Set `NODE_ENV=production` so authentication cookies are marked secure.
- Apply migrations with `npm run db:deploy`; never use `prisma db push` against production.
- Back up the database before high-risk migrations and test restoration regularly.
- Restrict database network access to approved application and administration sources.
- Define retention policies for audit events, access history, guest data, invoices, and receipts.

### Deployment sequence

```bash
npm ci
npm run db:generate
npm run db:deploy
npm run build
npm run start
```

Run `npm run db:seed` only when establishing the property structure or intentionally repairing missing structural records. It should not be part of every application restart.

## Troubleshooting

### The application cannot reach PostgreSQL

- Confirm PostgreSQL is running and accepts TCP connections.
- Verify the host, port, database, role, password, and `schema` query parameter in `DATABASE_URL`.
- Confirm the database role owns the database or has the required schema permissions.
- Run `npm run db:deploy` after connectivity is restored.

### Prisma Client is out of date

Run:

```bash
npm run db:generate
```

Restart the development server afterward.

### No login account exists

A fresh database intentionally contains no users. Open the application and complete the owner-creation screen. If an owner already exists, new access should be created by an authorized owner through **Settings**.

### A room cannot be assigned

Review the room state in **Rooms**, **Housekeeping**, and **Maintenance**. Normal assignment is blocked while a room is dirty, cleaning, blocked, under maintenance, or out of service.

### A payment method is rejected

Confirm that the payment rail is enabled for the property and that the requested amount does not exceed the open invoice balance.

## Quality Checklist

Before opening a pull request or deploying a release, run:

```bash
npm run lint
npm run build
```

For schema changes, also generate Prisma Client, create a migration, test the migration against a non-production database, and verify the fresh seed.

## Documentation

- [Design System](./DESIGN.md)
- [Backend Architecture](./docs/BACKEND_ARCHITECTURE.md)
- [Build Context](./docs/BUILD_CONTEXT.md)
- [Product Requirements](./hotel_ai_management_proposal/02_PRD.md)
- [Technical Requirements](./hotel_ai_management_proposal/03_TRD.md)

## Project Status

StayPilot is under active development. The current repository provides a complete operating foundation and connected core workflows. Before production use, each property must validate local legal, fiscal, privacy, payment, door-access, and retention requirements and complete any required hardware or provider integrations.

---

<div align="center">
  <strong>StayPilot</strong><br />
  One hotel. One operating system. One source of truth.
</div>
