# Product Requirements Document — AI Hotel Management System

## 1. Product Name

**HotelOS AI**

Temporary working name. The final name can be changed later.

## 2. Product Summary

HotelOS AI is a web based hotel management system built using React and Next.js. It allows hotel teams to manage rooms, bookings, guests, housekeeping, maintenance, complaints, staff roles, and billing from a unified dashboard. The system includes an AI layer powered by RAG and AI pipelines to assist staff with hotel policies, daily summaries, complaint classification, and guest history analysis.

## 3. Goals

The product must:

- Digitize hotel operations
- Reduce manual coordination between departments
- Improve room status accuracy
- Make check in and check out faster
- Centralize guest records
- Improve housekeeping visibility
- Help managers understand daily operations
- Use AI to answer policy and SOP questions
- Use AI to classify complaints and summarize guest history

## 4. Non Goals

The product will not initially:

- Replace human staff
- Become a full accounting ERP
- Integrate with every OTA platform in V1
- Automate refunds without approval
- Act as a legal or tax advisor
- Replace payment gateway systems
- Support large hotel chains in V1

## 5. User Personas

## 5.1 Hotel Owner

Needs high level visibility into occupancy, revenue, complaints, staff performance, and daily operations.

Important features:

- Manager dashboard
- Revenue summary
- Occupancy chart
- Pending payments
- AI daily report
- Complaint overview

## 5.2 Hotel Manager

Runs the hotel daily and coordinates reception, housekeeping, maintenance, and guest service.

Important features:

- Operations dashboard
- Room status view
- Staff task monitoring
- Complaint escalation
- Daily summary
- Reports

## 5.3 Receptionist

Handles guest check in, check out, room assignment, bookings, guest details, and payment collection.

Important features:

- Booking creation
- Guest search
- Room assignment
- Check in workflow
- Check out workflow
- Invoice view
- Guest notes

## 5.4 Housekeeping Staff

Updates room cleaning status and completes assigned tasks.

Important features:

- Assigned cleaning tasks
- Room status update
- Priority rooms
- Linen and mini bar notes
- Task completion

## 5.5 Maintenance Staff

Handles room repair and facility issues.

Important features:

- Maintenance tickets
- Issue category
- Priority level
- Assigned room
- Status update
- Resolution notes

## 5.6 Guest

May interact through a guest portal or chatbot in later versions.

Important features:

- Ask hotel policy questions
- Raise request
- Submit complaint
- View booking details
- Request service

## 6. Core Features

## 6.1 Authentication and Role Management

### Description

The system must support secure login and role based access control.

### Roles

- Super Admin
- Hotel Admin
- Manager
- Receptionist
- Housekeeping Staff
- Maintenance Staff
- Accountant
- Guest

### Requirements

- Users can log in securely
- Admin can create staff accounts
- Admin can assign roles
- Role permissions control dashboard access
- Staff actions are stored in audit logs

## 6.2 Hotel Setup

### Description

The hotel admin can configure hotel details.

### Requirements

- Add hotel name, address, contact details
- Configure check in and check out time
- Configure tax settings
- Configure room types
- Configure floors
- Configure hotel policies

## 6.3 Room Management

### Description

The system must manage all rooms and their live status.

### Room Statuses

- Available
- Occupied
- Dirty
- Cleaning
- Maintenance
- Blocked
- Reserved

### Requirements

- Create and edit room details
- Assign room type
- Set floor and capacity
- View room status grid
- Update room status manually or through workflows
- Maintain room status history

## 6.4 Booking Management

### Description

The system must allow staff to create and manage bookings.

### Booking Statuses

- Pending
- Confirmed
- Checked In
- Checked Out
- Cancelled
- No Show

### Requirements

- Create booking
- Search booking
- Modify booking dates
- Add guest details
- Assign room type
- Assign specific room
- Mark advance payment
- Cancel booking
- Track booking source

## 6.5 Guest Management

### Description

The system must maintain guest records.

### Requirements

- Add guest profile
- Store contact details
- Store ID document reference
- Store stay history
- Store preferences
- Add internal notes
- View past bookings
- Generate AI guest summary

## 6.6 Check In Workflow

### Description

Reception should be able to check in a guest quickly.

### Requirements

- Search booking
- Verify guest details
- Upload or record ID proof
- Assign clean available room
- Collect pending advance if required
- Mark booking as checked in
- Mark room as occupied
- Generate check in record

## 6.7 Check Out Workflow

### Description

Reception should be able to check out a guest and close billing.

### Requirements

- Open active stay
- Add additional charges
- Generate invoice
- Mark payment status
- Mark booking as checked out
- Mark room as dirty
- Create housekeeping cleaning task

## 6.8 Housekeeping Management

### Description

Housekeeping team must see assigned tasks and update cleaning status.

### Requirements

- Auto create cleaning task after checkout
- Create manual cleaning task
- Assign staff member
- Mark task status as pending, in progress, completed
- Update room status after cleaning
- View priority tasks for upcoming check ins

## 6.9 Maintenance Management

### Description

Hotel staff can create and track maintenance issues.

### Requirements

- Create maintenance ticket
- Assign room or hotel area
- Set priority
- Assign technician
- Mark room as maintenance if needed
- Update ticket status
- Add resolution notes
- Reopen unresolved issue

## 6.10 Billing and Invoice Management

### Description

The system must manage basic invoices and payment records.

### Requirements

- Generate invoice from room charges
- Add extra charges
- Apply discounts with permission
- Record payment method
- Track paid, partial, unpaid status
- Download invoice as PDF in later version

## 6.11 Complaint and Guest Request Management

### Description

Guests or staff can log complaints and requests.

### Requirements

- Create complaint or request
- Classify category
- Assign department
- Set priority
- Track status
- Add resolution notes
- AI classification support

## 6.12 RAG Policy Assistant

### Description

The AI assistant can answer questions using hotel uploaded documents and structured policies.

### Requirements

- Upload hotel policy documents
- Chunk and store document embeddings
- Ask natural language questions
- Retrieve relevant policy chunks
- Generate answer with references
- Show source document or policy section
- Limit answers to available hotel knowledge

## 6.13 AI Daily Operations Summary

### Description

The system generates a daily manager summary.

### Summary Includes

- Today’s arrivals
- Today’s departures
- Occupancy rate
- Dirty rooms
- Rooms under maintenance
- Pending payments
- High priority complaints
- Housekeeping workload
- VIP or returning guests

## 6.14 AI Guest Summary

### Description

The system summarizes past guest behavior and preferences.

### Example Output

“Guest has stayed 3 times, usually books deluxe rooms, prefers higher floors, requested late checkout twice, and previously complained about WiFi.”

## 7. Functional Requirements

- The system must support single hotel operations in V1
- The system must use role based dashboards
- The system must store room status changes
- The system must prevent assigning dirty or maintenance rooms unless overridden by authorized staff
- The system must create housekeeping task after checkout
- The system must maintain booking status history
- The system must store guest stay history
- The system must allow hotel policy upload for RAG
- The AI assistant must cite source documents or records where applicable

## 8. Non Functional Requirements

- Fast dashboard loading
- Mobile responsive UI
- Secure authentication
- Encrypted sensitive guest data
- Audit logs for critical actions
- Reliable database transactions
- Graceful error handling
- API validation
- Role based access control
- Scalable architecture for future multi hotel support

## 9. MVP Acceptance Criteria

The MVP is complete when:

- Admin can create rooms and room types
- Reception can create and manage bookings
- Guests can be checked in and checked out
- Room status changes correctly during workflows
- Housekeeping tasks are created and completed
- Complaints can be created and classified
- Manager can see dashboard metrics
- Hotel policies can be uploaded
- RAG assistant can answer policy questions with source references
- AI daily summary can be generated from database data

## 10. Future Product Requirements

- Multi hotel support
- Guest mobile app
- WhatsApp chatbot
- Payment gateway integration
- Restaurant POS
- Inventory management
- OTA integrations
- Dynamic pricing recommendations
- Review sentiment dashboard
- AI voice assistant
