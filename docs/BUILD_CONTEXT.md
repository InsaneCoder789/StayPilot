# StayPilot Build Context

## Product Positioning

StayPilot is a multi-property hotel operating system. It unifies reservations, room control, guests, housekeeping, engineering, service recovery, finance, access control, procurement, dining, events, spa, transport, documents, integrations, and management reporting in one authenticated workspace.

## Shipped Scope

- Authentication, MFA, invitations, session control, and property-scoped roles
- Hotel setup, portfolio switching, room types, floor plans, rooms, and room-state lifecycle
- Guest profiles, reservations, group stays, check-in, stay extension, room moves, and checkout
- Housekeeping, maintenance, complaints, tasks, incidents, lost-and-found, inventory, and procurement
- Transactional invoices, receipts, payments, refunds, credit notes, cashiering, and reconciliation
- Secure document storage, generated PDFs, templates, communication, and delivery tracking
- Outlet POS, event venue, appointment, and transport workflows
- NFC hardware bridge, OTA and POS webhooks, accounting exports, and sync history
- Server-side metrics, CSV exports, scheduled report packs, and night audit

## Primary Roles

- Hotel Admin
- Manager
- Receptionist
- Housekeeping
- Maintenance
- Accountant

## Operational Truths

- Dirty, maintenance, blocked, and out-of-service rooms cannot be assigned during normal check-in.
- Active room reservations cannot overlap at the database or command layer.
- Checkout completes the stay, marks the room dirty, creates housekeeping work, and expires room credentials.
- Billing totals, taxes, credits, refunds, and receipts remain deterministic backend logic.
- Sensitive guest and financial data is hotel-scoped and role-controlled.
- Outlet and service charges reach a guest folio only through controlled, one-time posting transitions.
- Property switching changes the server session and effective role after an access check.

## Technical Direction

- Frontend and server: Next.js App Router, React, TypeScript, and Tailwind CSS
- Data model: PostgreSQL with Prisma and committed migrations
- Files: authenticated PostgreSQL binary storage with checksums and metadata
- Integrations: adapter boundaries with signed webhooks, idempotency, encrypted secrets, and audit history
- Verification: Vitest coverage, PostgreSQL-backed Playwright journeys, production builds, dependency audit, and GitHub Actions

## Completed Build Order

1. Production foundation, database, testing, CI, deployment, and observability
2. Identity, MFA, sessions, invitations, and property-scoped roles
3. Reservation, room, check-in, move, extension, and checkout lifecycle
4. Finance, payment adapters, receipts, credits, cashiering, and reconciliation
5. Operations, procurement, documents, communications, NFC, and external integrations
6. Reporting, scheduling, multi-property control, and hotel departments

## Source Docs

Canonical proposal documents remain in `hotel_ai_management_proposal/` for requirements traceability. The current implementation and operator behavior are documented in `README.md` and `docs/BACKEND_ARCHITECTURE.md`.
