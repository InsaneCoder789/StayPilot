# UI UX Plan — AI Hotel Management System

## 1. Design Goal

The UI must feel like a professional hotel command center. It should be clean, fast, simple, and operationally focused. Hotel staff should be able to complete common tasks in 2 to 3 clicks.

The design should not feel like a complex ERP. It should feel like a modern dashboard that receptionists, managers, and housekeeping staff can understand immediately.

## 2. Design Principles

## 2.1 Clarity First

Every screen should clearly answer:

- What is happening now?
- What needs attention?
- What action should the user take?

## 2.2 Role Based Simplicity

Each role should only see what they need.

Receptionists do not need deep analytics. Housekeeping staff do not need revenue reports. Managers need high level overview.

## 2.3 Fast Operational Actions

Common actions should be easy:

- Create booking
- Check in guest
- Check out guest
- Mark room clean
- Create complaint
- Assign maintenance ticket

## 2.4 AI Should Be Helpful, Not Distracting

AI features should appear as assistance cards, summaries, or side panels. AI should not interrupt critical workflows.

## 3. Visual Style

Recommended style:

- Modern SaaS dashboard
- Clean cards
- Soft borders
- Clear status colors
- Spacious layout
- Mobile responsive screens
- High contrast text
- Professional hotel inspired interface

## 4. Color System

Suggested functional colors:

- Green: Available, completed, paid
- Blue: Reserved, confirmed, information
- Purple: AI assistant, smart insights
- Yellow/Orange: Pending, cleaning, warning
- Red: Complaint, unpaid, blocked, urgent
- Gray: Inactive, archived, neutral

## 5. Main Navigation

Sidebar navigation:

```text
Dashboard
Rooms
Bookings
Guests
Housekeeping
Maintenance
Billing
Complaints
AI Assistant
Reports
Staff
Settings
```

For smaller screens, use a bottom navigation or collapsible sidebar.

## 6. Dashboard Design

## 6.1 Manager Dashboard

Main cards:

- Occupancy Rate
- Available Rooms
- Occupied Rooms
- Dirty Rooms
- Maintenance Rooms
- Arrivals Today
- Departures Today
- Pending Payments
- Open Complaints

Sections:

1. Today’s Operations Overview
2. Room Status Grid
3. AI Daily Summary
4. Arrivals and Departures Table
5. Housekeeping Priority List
6. Complaint Alerts
7. Revenue Snapshot

## 6.2 Reception Dashboard

Main focus:

- Check ins today
- Check outs today
- Available clean rooms
- Active stays
- Pending payments
- Walk in booking button

Primary action buttons:

- New Booking
- Check In
- Check Out
- Search Guest

## 6.3 Housekeeping Dashboard

Main focus:

- Assigned tasks
- Dirty rooms
- Priority rooms
- In progress cleaning
- Completed today

Task card should show:

- Room number
- Room type
- Priority
- Checkout time
- Next check in time
- Task status
- Action button

## 7. Room Management UI

## 7.1 Room Grid

Rooms should be displayed in a visual grid.

Each room card shows:

- Room number
- Room type
- Floor
- Status
- Current guest if occupied
- Next booking if reserved
- Quick action button

Example:

```text
Room 204
Deluxe King
Status: Dirty
Last checkout: 10:45 AM
Action: Assign Cleaning
```

## 7.2 Room Filters

Filters:

- Floor
- Room type
- Status
- Availability date
- Occupancy

## 7.3 Room Detail Page

Shows:

- Room information
- Current status
- Current or upcoming booking
- Housekeeping history
- Maintenance history
- Room notes
- Status timeline

## 8. Booking UI

## 8.1 Booking List

Table columns:

- Booking ID
- Guest Name
- Check in
- Check out
- Room Type
- Room Number
- Status
- Payment Status
- Source
- Actions

## 8.2 Create Booking Form

Steps:

1. Guest details
2. Stay dates
3. Room type selection
4. Room assignment or auto suggestion
5. Payment/advance details
6. Confirmation

## 8.3 Booking Detail Page

Shows:

- Guest details
- Stay dates
- Assigned room
- Booking status
- Payment status
- Invoice details
- Guest notes
- Timeline
- Actions: Check In, Modify, Cancel, Check Out

## 9. Check In UI

Check in should be a guided flow:

```text
Step 1: Find Booking
Step 2: Verify Guest
Step 3: Assign Room
Step 4: Confirm Payment/Advance
Step 5: Complete Check In
```

Important UX:

- Show only clean available rooms
- Highlight guest preferences
- Show AI guest summary for returning guest
- Allow manager override only with permission

## 10. Check Out UI

Check out flow:

```text
Step 1: Open Active Stay
Step 2: Review Charges
Step 3: Add Extra Charges
Step 4: Generate Invoice
Step 5: Record Payment
Step 6: Complete Checkout
```

After checkout:

- Room automatically becomes dirty
- Housekeeping task is created
- Invoice status is shown

## 11. Guest Management UI

Guest profile page:

- Personal details
- Contact details
- ID document reference
- Stay history
- Preferences
- Complaints
- Notes
- AI guest summary

AI guest summary should be shown as a collapsible card.

## 12. Complaint UI

Complaint list columns:

- Complaint ID
- Guest
- Room
- Category
- Priority
- Department
- Status
- Created time
- Assigned to

Complaint detail page:

- Original complaint text
- AI classification
- Staff confirmed classification
- Timeline
- Resolution note

## 13. AI Assistant UI

The AI assistant should have two modes:

## 13.1 Policy Assistant

For questions like:

- What is the late checkout policy?
- What is the refund rule?
- What should staff do during fire emergency?

UI should show:

- Answer
- Source document
- Relevant section
- Confidence indicator

## 13.2 Operations Assistant

For internal questions like:

- Which rooms are dirty?
- Who is checking out today?
- Which guests have pending payments?

UI should show structured results from database, not only AI text.

## 14. Reports UI

Reports page should include:

- Occupancy report
- Revenue report
- Booking source report
- Complaint report
- Housekeeping performance
- Maintenance report
- Guest repeat rate

Charts:

- Occupancy over time
- Revenue by date
- Room status distribution
- Complaint categories
- Booking source distribution

## 15. Staff Management UI

Admin can:

- Add staff
- Assign role
- Change permissions
- Disable account
- View activity logs

## 16. Settings UI

Settings include:

- Hotel profile
- Room types
- Tax settings
- Check in/check out time
- Policy documents
- AI settings
- Notification settings
- Billing settings

## 17. Mobile Responsiveness

The system should be usable on tablets and phones.

Priority mobile views:

- Housekeeping task list
- Room status update
- Complaint creation
- Manager dashboard overview
- Reception quick search

## 18. Suggested Page Routes in Next.js

```text
/app/dashboard
/app/rooms
/app/rooms/[id]
/app/bookings
/app/bookings/new
/app/bookings/[id]
/app/check-in
/app/check-out
/app/guests
/app/guests/[id]
/app/housekeeping
/app/maintenance
/app/billing
/app/complaints
/app/complaints/[id]
/app/ai-assistant
/app/reports
/app/staff
/app/settings
```

## 19. MVP UI Priority

Build these first:

1. Login page
2. Dashboard layout
3. Room grid
4. Booking list and create booking
5. Guest profile
6. Check in flow
7. Check out flow
8. Housekeeping task page
9. Complaint page
10. AI assistant page

## 20. UX Risk Areas

| Risk | Solution |
|---|---|
| Too many features on one screen | Role based dashboards |
| Staff confusion | Use simple action labels |
| Slow check in | Guided flow with minimal fields |
| Wrong room assignment | Filter only clean available rooms |
| AI overuse | Keep AI in assistant panels |
| Mobile difficulty | Build responsive task based screens |
