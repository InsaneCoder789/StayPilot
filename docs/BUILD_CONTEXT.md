# StayPilot Build Context

## Product Positioning

StayPilot is an AI-powered hotel operations platform for single-property hotels in V1, especially properties with roughly 10 to 80 rooms. The goal is to unify bookings, room status, guests, housekeeping, maintenance, complaints, billing, and manager visibility in one web dashboard.

AI is supportive, not authoritative. It can answer policy questions with retrieval, summarize guests and daily operations, and classify complaints, but it must not decide final billing, refunds, tax, or permission overrides.

## MVP Scope

The first release should include:

- Authentication and role-based access
- Hotel setup and staff management
- Room types, rooms, and room status lifecycle
- Guest profiles and guest history
- Booking management
- Check-in and check-out workflows
- Housekeeping tasks
- Maintenance tickets
- Complaints and guest requests
- Basic billing records
- Policy RAG assistant
- AI daily summary
- AI guest summary

## Primary Roles

- Hotel Admin
- Manager
- Receptionist
- Housekeeping
- Maintenance
- Accountant

## Operational Truths

- Dirty, maintenance, and blocked rooms cannot be assigned during normal check-in.
- Checkout must mark the stay completed, mark the room dirty, and create a housekeeping task.
- Billing totals remain deterministic backend logic.
- AI policy answers must cite hotel-specific source material.
- Sensitive guest data must be access-controlled by role.

## Suggested Technical Direction

- Frontend and main app: Next.js App Router, TypeScript, Tailwind
- Data model: PostgreSQL with Prisma
- Vector search: pgvector for V1
- Files: Supabase Storage or Cloudflare R2
- AI service split: Next.js app plus separate Python processing service for document extraction, chunking, embeddings, and heavier pipelines

## Build Order

1. App foundation, navigation, and domain model
2. Auth and permissions
3. Room and room-type management
4. Guests and bookings
5. Check-in and check-out
6. Housekeeping, maintenance, complaints
7. Billing primitives
8. RAG document ingestion and policy assistant
9. Daily and guest AI summaries

## Source Docs

Canonical proposal docs live in `/Users/rohanc/Documents/StayPilot/hotel_ai_management_proposal/`.
