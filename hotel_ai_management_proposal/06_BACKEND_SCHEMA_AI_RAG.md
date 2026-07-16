# Backend Schema and AI RAG Design — AI Hotel Management System

## 1. Purpose

This document defines the backend data model, main database entities, relationships, and AI/RAG system design for the hotel management platform.

The backend must support reliable hotel operations first. AI features should depend on structured, accurate data and should not replace deterministic business logic.

## 2. Database Choice

Recommended database:

- PostgreSQL

Recommended ORM:

- Prisma

Recommended vector storage:

- pgvector for V1 simplicity
- Qdrant for larger scale future version

## 3. Core Entity Groups

The backend schema can be divided into these groups:

1. Hotel and staff entities
2. Guest entities
3. Room entities
4. Booking and stay entities
5. Billing entities
6. Housekeeping entities
7. Maintenance entities
8. Complaint and request entities
9. AI and RAG entities
10. Audit and notification entities

## 4. Main Tables

## 4.1 hotels

Stores hotel property details.

Fields:

```text
id
name
address
city
state
country
phone
email
check_in_time
check_out_time
timezone
created_at
updated_at
```

## 4.2 users

Stores login accounts.

Fields:

```text
id
hotel_id
name
email
phone
password_hash / auth_provider_id
role
status
last_login_at
created_at
updated_at
```

Roles:

```text
SUPER_ADMIN
HOTEL_ADMIN
MANAGER
RECEPTIONIST
HOUSEKEEPING
MAINTENANCE
ACCOUNTANT
GUEST
```

## 4.3 staff_profiles

Stores staff specific information.

Fields:

```text
id
user_id
hotel_id
department
shift_start
shift_end
employee_code
created_at
updated_at
```

## 4.4 room_types

Stores room category information.

Fields:

```text
id
hotel_id
name
description
base_price
capacity
bed_type
amenities
created_at
updated_at
```

Examples:

- Standard
- Deluxe
- Suite
- Dorm
- Premium King

## 4.5 rooms

Stores individual room records.

Fields:

```text
id
hotel_id
room_type_id
room_number
floor
status
capacity
notes
created_at
updated_at
```

Room statuses:

```text
AVAILABLE
RESERVED
OCCUPIED
DIRTY
CLEANING
MAINTENANCE
BLOCKED
```

## 4.6 room_status_logs

Tracks every room status change.

Fields:

```text
id
room_id
old_status
new_status
changed_by_user_id
reason
created_at
```

## 4.7 guests

Stores guest profiles.

Fields:

```text
id
hotel_id
first_name
last_name
email
phone
nationality
date_of_birth
address
vip_status
notes
created_at
updated_at
```

## 4.8 guest_documents

Stores references to uploaded guest ID documents.

Fields:

```text
id
guest_id
document_type
document_number
file_url
verified_by_user_id
verified_at
created_at
```

Security note:

Guest document access must be role restricted.

## 4.9 guest_preferences

Stores guest preferences.

Fields:

```text
id
guest_id
preference_type
preference_value
source
created_at
updated_at
```

Examples:

- Higher floor
- Quiet room
- Extra pillows
- Vegetarian food
- Late checkout preference

## 4.10 bookings

Stores booking records.

Fields:

```text
id
hotel_id
primary_guest_id
booking_code
source
status
check_in_date
check_out_date
room_type_id
assigned_room_id
adult_count
child_count
special_requests
created_by_user_id
created_at
updated_at
```

Booking statuses:

```text
PENDING
CONFIRMED
CHECKED_IN
CHECKED_OUT
CANCELLED
NO_SHOW
```

Booking sources:

```text
WALK_IN
PHONE
WEBSITE
AGENCY
OTA
CORPORATE
```

## 4.11 booking_guests

Maps multiple guests to one booking.

Fields:

```text
id
booking_id
guest_id
is_primary
created_at
```

## 4.12 stays

Represents active or completed stays.

Fields:

```text
id
booking_id
hotel_id
room_id
actual_check_in_at
actual_check_out_at
checked_in_by_user_id
checked_out_by_user_id
status
created_at
updated_at
```

Stay statuses:

```text
ACTIVE
COMPLETED
CANCELLED
```

## 4.13 invoices

Stores invoice records.

Fields:

```text
id
hotel_id
booking_id
guest_id
invoice_number
subtotal
tax_amount
discount_amount
total_amount
paid_amount
balance_amount
status
created_by_user_id
created_at
updated_at
```

Invoice statuses:

```text
DRAFT
ISSUED
PARTIALLY_PAID
PAID
VOID
```

## 4.14 invoice_items

Stores invoice line items.

Fields:

```text
id
invoice_id
description
quantity
unit_price
tax_rate
total_price
item_type
created_at
```

Item types:

```text
ROOM_CHARGE
SERVICE_CHARGE
LAUNDRY
FOOD
DISCOUNT
TAX
OTHER
```

## 4.15 payments

Stores payment records.

Fields:

```text
id
invoice_id
amount
payment_method
payment_reference
received_by_user_id
paid_at
created_at
```

Payment methods:

```text
CASH
CARD
UPI
BANK_TRANSFER
ONLINE
OTHER
```

## 4.16 housekeeping_tasks

Stores cleaning tasks.

Fields:

```text
id
hotel_id
room_id
assigned_to_user_id
status
priority
task_type
notes
due_at
completed_at
created_at
updated_at
```

Statuses:

```text
PENDING
IN_PROGRESS
COMPLETED
CANCELLED
```

Priorities:

```text
LOW
MEDIUM
HIGH
URGENT
```

## 4.17 maintenance_tickets

Stores maintenance issues.

Fields:

```text
id
hotel_id
room_id
reported_by_user_id
assigned_to_user_id
category
priority
status
title
description
resolution_note
created_at
updated_at
closed_at
```

Statuses:

```text
OPEN
ASSIGNED
IN_PROGRESS
RESOLVED
CLOSED
REOPENED
```

## 4.18 complaints

Stores complaints and guest requests.

Fields:

```text
id
hotel_id
guest_id
booking_id
room_id
created_by_user_id
type
category
priority
status
message
ai_summary
ai_sentiment
assigned_department
resolution_note
created_at
updated_at
closed_at
```

Types:

```text
COMPLAINT
REQUEST
FEEDBACK
```

## 4.19 hotel_policies

Stores structured hotel policies.

Fields:

```text
id
hotel_id
title
category
content
created_by_user_id
created_at
updated_at
```

## 4.20 rag_documents

Stores uploaded documents for RAG.

Fields:

```text
id
hotel_id
title
file_url
file_type
status
uploaded_by_user_id
created_at
processed_at
```

Statuses:

```text
UPLOADED
PROCESSING
READY
FAILED
```

## 4.21 rag_chunks

Stores text chunks and embeddings.

Fields:

```text
id
rag_document_id
hotel_id
chunk_index
content
embedding
metadata
created_at
```

Metadata may include:

```text
page_number
section_title
source_file
policy_category
```

## 4.22 ai_interactions

Stores AI usage logs.

Fields:

```text
id
hotel_id
user_id
feature_type
prompt
response
source_references
model_name
tokens_used
created_at
```

Feature types:

```text
RAG_POLICY_ASSISTANT
DAILY_SUMMARY
GUEST_SUMMARY
COMPLAINT_CLASSIFIER
DOCUMENT_EXTRACTION
```

## 4.23 notifications

Stores user notifications.

Fields:

```text
id
hotel_id
user_id
title
message
type
read_at
created_at
```

## 4.24 audit_logs

Stores important actions.

Fields:

```text
id
hotel_id
user_id
action
entity_type
entity_id
old_value
new_value
ip_address
created_at
```

## 5. Key Relationships

```text
Hotel has many Users
Hotel has many Rooms
Hotel has many Room Types
Hotel has many Guests
Hotel has many Bookings
Hotel has many Complaints
Hotel has many RAG Documents

Room Type has many Rooms
Guest has many Bookings
Booking has many Guests
Booking has one Stay
Booking has many Invoices
Invoice has many Invoice Items
Invoice has many Payments
Room has many Housekeeping Tasks
Room has many Maintenance Tickets
RAG Document has many RAG Chunks
```

## 6. Important Backend Business Rules

## 6.1 Room Assignment Rules

- Room must be available or reserved for the same booking
- Dirty rooms cannot be assigned to check in
- Maintenance rooms cannot be assigned
- Blocked rooms cannot be assigned
- Manager override must be logged

## 6.2 Checkout Rules

- Checkout marks stay as completed
- Checkout marks booking as checked out
- Checkout marks room as dirty
- Checkout creates housekeeping task
- Invoice should be generated before or during checkout

## 6.3 Billing Rules

- Invoice totals must be calculated by backend logic
- AI must not directly decide financial totals
- Discounts must be permission controlled
- Payment records must be immutable or adjustment logged

## 6.4 RAG Rules

- RAG answers must be limited to hotel specific documents
- Sources must be shown
- If no source is found, AI should say it does not have enough information
- Sensitive guest data should not be retrieved for unauthorized users

## 7. RAG System Design

## 7.1 Document Processing Pipeline

```text
Upload Document
    -> Store file
    -> Extract text
    -> Clean text
    -> Split into chunks
    -> Generate embeddings
    -> Store chunks and embeddings
    -> Mark document as ready
```

## 7.2 Retrieval Pipeline

```text
User Question
    -> Validate user role
    -> Generate query embedding
    -> Search vector database by hotel_id
    -> Retrieve top relevant chunks
    -> Build prompt with context
    -> Generate answer
    -> Return answer with sources
    -> Store AI interaction log
```

## 7.3 Example RAG Prompt Structure

```text
You are the hotel policy assistant for this hotel.
Answer only using the provided context.
If the answer is not available in the context, say that the policy is not available.
Do not invent rules.
Show the source section used.

Context:
{retrieved_chunks}

Question:
{user_question}
```

## 8. AI Pipelines

## 8.1 Complaint Classifier

Input:

```text
Complaint message, guest details, room number, booking status
```

Output:

```text
category
priority
sentiment
assigned_department
suggested_action
```

## 8.2 Daily Summary Generator

Input:

```text
Today arrivals
Today departures
Room status counts
Pending housekeeping tasks
Open maintenance tickets
Pending payments
Open complaints
Returning guests
```

Output:

```text
Manager readable summary
Alerts
Recommended actions
```

## 8.3 Guest Summary Generator

Input:

```text
Guest stay history
Past complaints
Preferences
Booking types
Payment/stay behavior
```

Output:

```text
Short guest profile summary
Preferences
Risks or special notes
Suggested service actions
```

## 8.4 Document Extraction Pipeline

Future version:

```text
Guest ID image/PDF
    -> OCR
    -> Extract fields
    -> Validate fields
    -> Human review
    -> Save guest document record
```

## 9. Example Prisma Style Models

```prisma
model Hotel {
  id        String   @id @default(cuid())
  name      String
  address   String?
  city      String?
  country   String?
  phone     String?
  email     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  users     User[]
  rooms     Room[]
  guests    Guest[]
  bookings  Booking[]
}

model Room {
  id         String   @id @default(cuid())
  hotelId    String
  roomTypeId String
  roomNumber String
  floor      String?
  status     RoomStatus @default(AVAILABLE)
  notes      String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  hotel      Hotel @relation(fields: [hotelId], references: [id])
  roomType   RoomType @relation(fields: [roomTypeId], references: [id])
}

enum RoomStatus {
  AVAILABLE
  RESERVED
  OCCUPIED
  DIRTY
  CLEANING
  MAINTENANCE
  BLOCKED
}
```

## 10. API Data Validation

Use Zod schemas for:

- Create booking
- Update booking
- Create room
- Update room status
- Create guest
- Create invoice
- Create complaint
- Upload RAG document
- Ask RAG question

## 11. Background Jobs

The following should run as background jobs:

- RAG document processing
- Embedding generation
- Daily summary generation
- Large report generation
- Notification dispatch
- OCR document extraction

Possible job systems:

- Inngest
- BullMQ
- Trigger.dev
- Cloud task queues

## 12. Security and Privacy

Sensitive data:

- Guest ID documents
- Passport numbers
- Phone numbers
- Addresses
- Payment references
- Internal staff notes

Protection required:

- Role based access
- Encrypted file storage
- Audit logs
- Signed URLs for documents
- Limited AI access to sensitive fields
- Data retention policy

## 13. MVP Backend Priority

Build in this order:

1. hotels, users, roles
2. room_types and rooms
3. guests
4. bookings and booking_guests
5. stays
6. housekeeping_tasks
7. maintenance_tickets
8. invoices and payments
9. complaints
10. hotel_policies and rag_documents
11. rag_chunks and ai_interactions
12. audit_logs and notifications

## 14. Final Backend Principle

The backend should be the source of truth. AI should help users understand, summarize, classify, and retrieve information, but operational decisions must be validated by backend rules.
