# Backend Architecture

## Data Ownership

PostgreSQL owns all operational truth. Browser state is a read model and may be discarded at any time. Every successful mutation returns a fresh server snapshot after the database commit.

## Tenant Boundary

Every operational table carries a `hotelId` directly or is reachable only through a hotel-scoped parent. Session records bind a user to one hotel. State queries and command handlers use the authenticated session's `hotelId`; client-provided hotel identifiers are ignored.

## Authentication

- Passwords use Node.js scrypt with a unique 128-bit salt.
- Session tokens contain 256 random bits.
- Only SHA-256 token hashes are stored in PostgreSQL.
- Cookies are HTTP-only, `SameSite=Lax`, secure in production, path-scoped, and expire after 14 days.
- Logout revokes the database session before deleting the cookie.
- Disabled users and expired or revoked sessions cannot load hotel data.

## Transactional Workflows

- Check-in assigns the booking, occupies the room, records the room transition, and writes an audit entry in one transaction.
- Checkout completes the stay, dirties the room, creates housekeeping work, expires room credentials, updates guest stay history, and audits the operation atomically.
- Payment capture verifies the enabled payment rail, caps capture at the open balance, updates the invoice, creates a payment and receipt, records the document, and audits under serializable isolation.
- Refunds are idempotent and reverse invoice paid/balance totals under serializable isolation.
- Maintenance and housekeeping state changes update the connected room state in the same transaction.

## Fresh-State Seed

The idempotent seed contains only property structure and configuration. It deliberately leaves operational tables empty so a new hotel starts with zero guests, reservations, invoices, payments, receipts, room cards, access events, complaints, and maintenance or housekeeping tasks.

## Backups and Operations

- Take encrypted daily backups and enable point-in-time recovery in production.
- Test restoration regularly in a separate environment.
- Apply committed migrations with `prisma migrate deploy`.
- Never use `prisma db push` against production.
- Retain audit and access-event records according to the hotel's legal and security policy.
