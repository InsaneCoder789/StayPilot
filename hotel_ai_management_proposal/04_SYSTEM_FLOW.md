# System Flow Document — AI Hotel Management System

## 1. Purpose

This document defines the main user flows and operational flows of the hotel management system. It explains how bookings, rooms, guests, housekeeping, maintenance, complaints, billing, and AI features work together.

## 2. Main System Actors

- Hotel Admin
- Manager
- Receptionist
- Housekeeping Staff
- Maintenance Staff
- Accountant
- Guest
- AI Assistant

## 3. End to End Hotel Operation Flow

```text
Booking Created
    -> Guest Details Added
    -> Room Type Selected
    -> Booking Confirmed
    -> Guest Arrives
    -> Check In
    -> Room Assigned
    -> Room Marked Occupied
    -> Guest Stay Active
    -> Requests and Complaints Managed
    -> Checkout Started
    -> Invoice Generated
    -> Payment Recorded
    -> Guest Checked Out
    -> Room Marked Dirty
    -> Housekeeping Task Created
    -> Room Cleaned
    -> Room Marked Available
```

## 4. Booking Creation Flow

## 4.1 Manual Booking by Receptionist

```text
Receptionist opens Booking module
    -> Clicks Create Booking
    -> Enters guest details
    -> Selects check in and check out dates
    -> Selects room type
    -> System checks availability
    -> Receptionist adds payment or advance details
    -> Booking is created as Confirmed
    -> Room or room type is reserved
```

## 4.2 Booking Validation Rules

- Check out date must be after check in date
- Guest contact details are required
- Room type must have availability
- Booking cannot overlap with unavailable room assignment
- Advance payment is optional in V1
- Duplicate guest profiles should be detected by phone/email

## 5. Check In Flow

```text
Guest arrives at hotel
    -> Receptionist searches booking
    -> System displays booking and guest details
    -> Receptionist verifies ID proof
    -> System shows available clean rooms matching booking
    -> Receptionist assigns room
    -> System marks booking as Checked In
    -> System marks room as Occupied
    -> Check in record is created
    -> Guest stay becomes active
```

## 5.1 Check In Rules

- Dirty room cannot be assigned
- Maintenance room cannot be assigned
- Blocked room cannot be assigned
- Manager override may be required for exceptions
- ID proof should be recorded or uploaded
- Check in action should be logged

## 6. Check Out Flow

```text
Guest requests checkout
    -> Receptionist opens active stay
    -> System calculates room charges
    -> Extra charges are added if any
    -> Invoice is generated
    -> Payment is recorded
    -> Booking marked Checked Out
    -> Room marked Dirty
    -> Housekeeping task automatically created
```

## 6.1 Check Out Rules

- Invoice must be generated before checkout closure
- Payment status can be Paid, Partial, or Unpaid
- Room must move to Dirty after checkout
- Housekeeping task must be created automatically
- Checkout action must be logged

## 7. Room Status Flow

```text
Available
    -> Reserved
    -> Occupied
    -> Dirty
    -> Cleaning
    -> Available
```

Alternative flow:

```text
Available / Dirty / Occupied
    -> Maintenance
    -> Blocked
    -> Available
```

## 7.1 Room Status Rules

- Available rooms can be assigned
- Reserved rooms are linked to upcoming bookings
- Occupied rooms are linked to active stays
- Dirty rooms require cleaning
- Cleaning rooms are being worked on
- Maintenance rooms require repair
- Blocked rooms are unavailable by management decision

## 8. Housekeeping Flow

```text
Checkout completed
    -> Room becomes Dirty
    -> Cleaning task created
    -> Housekeeping staff receives task
    -> Staff marks task In Progress
    -> Staff cleans room
    -> Staff marks task Completed
    -> System marks room Available
```

## 8.1 Priority Cleaning Flow

```text
Upcoming check in detected
    -> System checks room readiness
    -> If assigned room is dirty
    -> Task priority becomes High
    -> Manager and housekeeping notified
```

## 9. Maintenance Flow

```text
Issue reported
    -> Maintenance ticket created
    -> Category selected
    -> Priority assigned
    -> Room optionally marked Maintenance
    -> Technician assigned
    -> Work started
    -> Resolution note added
    -> Ticket closed
    -> Room returned to Available or Dirty
```

## 9.1 Maintenance Rules

- Maintenance rooms cannot be assigned
- High priority issues should appear on manager dashboard
- Closed ticket must include resolution note
- Reopened tickets should preserve old history

## 10. Complaint Flow

```text
Guest complaint received
    -> Staff enters complaint
    -> AI classifies complaint
    -> System suggests category, priority, and department
    -> Staff confirms or edits classification
    -> Complaint assigned
    -> Department resolves issue
    -> Resolution note added
    -> Complaint closed
```

## 10.1 AI Complaint Classification Example

Guest message:

“The AC is not working and I have called twice already.”

AI output:

```text
Category: Maintenance
Priority: High
Department: Engineering
Sentiment: Negative
Suggested SLA: Urgent
Suggested Action: Assign technician immediately
```

## 11. RAG Policy Assistant Flow

## 11.1 Document Upload Flow

```text
Manager uploads policy document
    -> File stored in storage
    -> Text extracted
    -> Text split into chunks
    -> Embeddings generated
    -> Chunks stored in vector database
    -> Document becomes searchable
```

## 11.2 Question Answering Flow

```text
Staff asks question
    -> Query converted into embedding
    -> Relevant policy chunks retrieved
    -> Prompt created with retrieved context
    -> LLM generates answer
    -> Answer shown with source references
```

## 11.3 RAG Example

Question:

“What is the cancellation policy for same day cancellation?”

System retrieves:

- Cancellation policy document
- Same day cancellation section
- Refund rules

AI response:

“The policy states that same day cancellations are non refundable unless approved by the manager. Source: Cancellation Policy, Section 3.”

## 12. AI Daily Summary Flow

```text
Manager opens dashboard
    -> Clicks Generate Daily Summary
    -> System fetches operational data
    -> Data includes arrivals, departures, occupancy, dirty rooms, maintenance, complaints, payments
    -> AI generates summary
    -> Summary displayed to manager
```

## 12.1 Daily Summary Data Inputs

- Today’s bookings
- Today’s check ins
- Today’s check outs
- Room status counts
- Pending housekeeping tasks
- Active maintenance tickets
- Pending payments
- Open complaints
- VIP or returning guests

## 13. Guest Summary Flow

```text
Receptionist opens guest profile
    -> Clicks AI Summary
    -> System fetches guest history
    -> AI summarizes preferences, complaints, spending, and stay behavior
    -> Summary shown to authorized staff
```

## 14. Billing Flow

```text
Booking created
    -> Room rate stored
    -> Guest checks in
    -> Additional charges added during stay
    -> Checkout begins
    -> Invoice generated using deterministic calculation
    -> Payment recorded
    -> Invoice status updated
```

## 14.1 Billing Rules

- AI must not generate final totals independently
- Backend must calculate invoice totals
- All discounts require permission
- Payment changes must be logged
- Tax values must be configurable

## 15. Dashboard Flow

## 15.1 Manager Dashboard

Manager sees:

- Occupancy percentage
- Available rooms
- Occupied rooms
- Dirty rooms
- Maintenance rooms
- Today’s arrivals
- Today’s departures
- Pending payments
- Open complaints
- AI daily summary

## 15.2 Reception Dashboard

Receptionist sees:

- Arrivals today
- Departures today
- Available rooms
- Active guests
- Pending check ins
- Pending payments

## 15.3 Housekeeping Dashboard

Housekeeping sees:

- Assigned cleaning tasks
- Priority rooms
- Dirty rooms
- In progress rooms
- Completed tasks

## 16. Notification Flow

Possible notifications:

- New booking created
- Guest checked out
- Room needs cleaning
- Maintenance issue created
- Complaint high priority
- Payment pending
- VIP guest arriving
- Policy document processing completed

## 17. Audit Log Flow

Critical actions must create audit logs:

- Login
- Room status change
- Booking creation
- Booking cancellation
- Check in
- Check out
- Invoice update
- Payment update
- Discount applied
- Policy document uploaded
- Staff role changed
- Complaint closed

## 18. MVP Flow Priority

The first build should prioritize:

1. Auth and role flow
2. Room status flow
3. Booking flow
4. Check in flow
5. Check out flow
6. Housekeeping flow
7. Complaint flow
8. RAG policy assistant flow
9. AI daily summary flow
