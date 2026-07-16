# Technical Requirements Document — AI Hotel Management System

## 1. Technical Overview

The system will be built as a modern full stack web application using React and Next.js. It will use a structured backend API, relational database, vector database for RAG, and AI pipelines for intelligent features.

The architecture must be modular so that the system can start as a single hotel solution and later evolve into a multi hotel SaaS platform.

## 2. Recommended Tech Stack

## 2.1 Frontend

- React
- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui or similar component library
- React Hook Form
- Zod validation
- TanStack Query or server actions for data fetching
- Recharts for dashboards

## 2.2 Backend

Two possible backend approaches are available.

### Option A: Next.js Full Stack

- Next.js App Router
- Route Handlers
- Server Actions
- Prisma ORM
- PostgreSQL

Best for faster MVP development.

### Option B: Separate Backend

- Next.js frontend
- FastAPI backend
- PostgreSQL
- SQLAlchemy or Prisma
- Python AI pipelines

Best if the AI pipeline becomes heavy and Python native processing is required.

## Recommended Approach for V1

Use **Next.js for frontend and main backend**, with a separate **Python AI service** for document processing, embeddings, and AI pipeline execution.

## 2.3 Database

Primary database:

- PostgreSQL

ORM:

- Prisma

Vector storage options:

- pgvector inside PostgreSQL
- Qdrant
- Supabase Vector

Recommended V1:

- PostgreSQL with pgvector if simplicity is preferred
- Qdrant if dedicated vector search is needed

## 2.4 File Storage

For document uploads and guest ID references:

- Supabase Storage
- AWS S3
- Cloudflare R2

Recommended V1:

- Supabase Storage or Cloudflare R2

## 2.5 AI Layer

Possible AI providers:

- OpenAI API
- Anthropic API
- Gemini API
- Local Ollama for development

Recommended V1:

- Use an API based model for reliability
- Keep local Ollama as development fallback

## 3. High Level Architecture

```text
Client Browser
    |
    v
Next.js Application
    |-- React UI
    |-- Server Components
    |-- Route Handlers
    |-- Auth Middleware
    |-- Role Based Access
    |
    v
Backend Services
    |-- Booking Service
    |-- Room Service
    |-- Guest Service
    |-- Billing Service
    |-- Housekeeping Service
    |-- Maintenance Service
    |-- Complaint Service
    |-- Report Service
    |
    v
Data Layer
    |-- PostgreSQL
    |-- Vector Database
    |-- File Storage
    |-- Audit Logs
    |
    v
AI Service
    |-- RAG Pipeline
    |-- Embedding Generation
    |-- Complaint Classifier
    |-- Guest Summary Generator
    |-- Daily Summary Generator
```

## 4. Application Modules

## 4.1 Authentication Module

Responsibilities:

- User login
- Session management
- Role based access
- Staff account creation
- Permission checks

Suggested tools:

- Auth.js
- Clerk
- Supabase Auth

## 4.2 Room Module

Responsibilities:

- Room CRUD
- Room type CRUD
- Room status update
- Room status history
- Availability calculation

Important rules:

- Occupied rooms cannot be assigned again
- Dirty rooms should not be assigned unless manager override exists
- Maintenance rooms cannot be assigned
- Checkout should mark room as dirty
- Completed housekeeping task should mark room as available

## 4.3 Booking Module

Responsibilities:

- Booking creation
- Booking search
- Booking update
- Booking cancellation
- Check in and check out status transitions

Important rules:

- Booking dates must be valid
- Room availability must be checked
- Confirmed booking should reserve room or room type
- Checked in booking must have assigned room
- Checked out booking must close active stay

## 4.4 Guest Module

Responsibilities:

- Guest profile creation
- Guest document storage reference
- Guest stay history
- Guest preferences
- Guest internal notes
- Guest AI summary

## 4.5 Housekeeping Module

Responsibilities:

- Task creation
- Staff assignment
- Room cleaning status
- Priority cleaning
- Task completion

Important automation:

- Checkout automatically creates room cleaning task
- Cleaning completed updates room status to available

## 4.6 Maintenance Module

Responsibilities:

- Ticket creation
- Issue categorization
- Staff assignment
- Priority status
- Room blocking
- Resolution tracking

## 4.7 Billing Module

Responsibilities:

- Invoice creation
- Invoice line items
- Payment tracking
- Discount recording
- Tax recording

Important rule:

AI can explain billing, but deterministic backend logic must calculate final invoice totals.

## 4.8 Complaint Module

Responsibilities:

- Complaint creation
- Guest request creation
- AI classification
- Department assignment
- Priority detection
- SLA tracking
- Resolution notes

## 4.9 RAG Policy Module

Responsibilities:

- Upload policy documents
- Extract text
- Chunk text
- Generate embeddings
- Store chunks
- Search relevant chunks
- Generate grounded answer
- Return sources

## 5. AI and RAG Architecture

## 5.1 RAG Pipeline

```text
Document Upload
    -> File Storage
    -> Text Extraction
    -> Chunking
    -> Embedding Generation
    -> Vector Storage
    -> Retrieval
    -> Prompt Construction
    -> LLM Answer
    -> Source Citation
```

## 5.2 Supported Documents

V1 should support:

- PDF
- DOCX
- TXT
- Markdown

Later versions can support:

- Images
- Scanned documents
- Policy spreadsheets

## 5.3 RAG Data Sources

- Hotel policy documents
- Cancellation policies
- Refund rules
- Staff SOPs
- Check in rules
- Guest service rules
- Emergency instructions
- Internal operating documents

## 5.4 AI Safety Rules

- AI must not answer outside available hotel context for policy questions
- AI must show source references
- AI must not make final financial decisions
- AI must not approve refunds independently
- AI must not reveal sensitive guest data to unauthorized roles
- AI responses must be logged when used for operational decisions

## 6. API Requirements

## 6.1 Example API Routes

```text
POST   /api/auth/login
GET    /api/dashboard/summary

GET    /api/rooms
POST   /api/rooms
PATCH  /api/rooms/:id
GET    /api/rooms/availability

GET    /api/bookings
POST   /api/bookings
GET    /api/bookings/:id
PATCH  /api/bookings/:id
POST   /api/bookings/:id/check-in
POST   /api/bookings/:id/check-out
POST   /api/bookings/:id/cancel

GET    /api/guests
POST   /api/guests
GET    /api/guests/:id
PATCH  /api/guests/:id
GET    /api/guests/:id/summary

GET    /api/housekeeping/tasks
POST   /api/housekeeping/tasks
PATCH  /api/housekeeping/tasks/:id

GET    /api/maintenance/tickets
POST   /api/maintenance/tickets
PATCH  /api/maintenance/tickets/:id

GET    /api/invoices
POST   /api/invoices
GET    /api/invoices/:id
POST   /api/invoices/:id/payment

GET    /api/complaints
POST   /api/complaints
PATCH  /api/complaints/:id
POST   /api/complaints/:id/classify

POST   /api/rag/documents
GET    /api/rag/documents
POST   /api/rag/query

POST   /api/ai/daily-summary
POST   /api/ai/guest-summary
```

## 7. Frontend Technical Structure

Suggested folder structure:

```text
src/
  app/
    dashboard/
    rooms/
    bookings/
    guests/
    housekeeping/
    maintenance/
    billing/
    complaints/
    ai-assistant/
    settings/
    api/
  components/
    ui/
    layout/
    rooms/
    bookings/
    guests/
    dashboard/
  lib/
    auth.ts
    db.ts
    permissions.ts
    validators.ts
    ai.ts
  server/
    services/
      room.service.ts
      booking.service.ts
      guest.service.ts
      billing.service.ts
      rag.service.ts
  prisma/
    schema.prisma
```

## 8. Security Requirements

- Role based access control
- Protected routes
- Encrypted secrets
- Secure file upload validation
- Audit logs for critical actions
- Guest document access restrictions
- Rate limiting on AI endpoints
- Input validation using Zod
- SQL injection protection through ORM
- Secure session handling

## 9. Performance Requirements

- Dashboard should load key metrics quickly
- Room grid should update without full page reload
- Search should support filtering and pagination
- AI responses may be asynchronous for heavy tasks
- Document embedding should run in background jobs
- Database queries should use indexes for booking dates, room status, and guest names

## 10. Deployment Plan

## V1 Deployment

- Frontend and backend: Vercel
- Database: Supabase PostgreSQL or Neon
- File storage: Supabase Storage or Cloudflare R2
- AI service: Railway, Render, or Fly.io
- Vector DB: pgvector or Qdrant Cloud

## 11. Development Milestones

### Milestone 1

- Project setup
- Auth setup
- Database schema
- Basic dashboard layout

### Milestone 2

- Room management
- Room type management
- Room status workflow

### Milestone 3

- Booking management
- Guest management
- Check in and check out

### Milestone 4

- Housekeeping and maintenance
- Complaints and requests

### Milestone 5

- Billing records
- Manager dashboard
- Reports

### Milestone 6

- RAG document upload
- AI policy assistant
- AI daily summary
- AI complaint classifier

## 12. Technical Risks

| Risk | Impact | Mitigation |
|---|---|---|
| AI hallucination | Wrong policy answers | Use RAG with source citations |
| Wrong room availability | Operational failure | Use transactional booking logic |
| Slow AI responses | Staff frustration | Async processing and caching |
| Sensitive guest data leak | High legal risk | Role restrictions and encryption |
| Complex scope | Delayed MVP | Build single hotel V1 first |
| Billing errors | Financial damage | Keep billing deterministic |
