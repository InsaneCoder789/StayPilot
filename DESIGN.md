# Design System: StayPilot Hotel OS

## 1. Visual theme and atmosphere

StayPilot is a serious daily operations product for front desk, housekeeping, engineering, finance, security, and management teams. The interface should feel calm under pressure: dense enough for shift work, structured enough for new staff, and restrained enough to keep alerts meaningful.

- **Design variance:** 5/10. Offset composition is allowed on dashboards, but operational forms and tables remain predictable.
- **Motion intensity:** 3/10. Motion communicates state changes and navigation only. No decorative loops except the real system-online indicator.
- **Visual density:** 7/10. Comfortable cockpit density with compact rows, tabular figures, and clear grouping.
- **Theme:** Dark property-control theme only. No section-level theme inversion.
- **System:** Customized shadcn/ui on Radix primitives with Tailwind CSS v4. Components are owned locally and never left in their default theme.

## 2. Color palette and roles

- **Operations canvas** (`#0D0F0E`) - application background, never pure black.
- **Navigation rail** (`#111412`) - fixed sidebar and mobile navigation sheet.
- **Primary surface** (`#171A18`) - cards, forms, tables, and dialogs.
- **Raised surface** (`#1D211E`) - dropdowns, command results, selected rows, and popovers.
- **Primary ink** (`#F0F2ED`) - headings and critical values.
- **Secondary ink** (`#A4AAA3`) - descriptions, labels, helper text, and metadata.
- **Quiet ink** (`#70766F`) - disabled controls and low-priority timestamps.
- **Structural border** (`#2A2F2B`) - dividers and component outlines.
- **StayPilot green** (`#8EB69B`) - the single accent for primary actions, active navigation, focus rings, and confirmed states.
- **Critical state** (`#D98276`) - semantic error and urgent status only. It is not a second brand accent.
- **Caution state** (`#C9A96A`) - semantic pending and warning status only.

No purple, blue-neon, brass-glow, rainbow, or multi-accent treatments. Foundations use semantic shadcn tokens rather than ad hoc palette classes.

## 3. Typography rules

- **Interface and display:** Geist Sans. Headings use weights 560-650, tight tracking, and controlled scale.
- **Data and identifiers:** Geist Mono. Use for amounts, room numbers, booking codes, receipt IDs, dates, and counts.
- **Body:** Geist Sans at 14-16px with 1.55-1.7 line height and 65ch maximum measure.
- **Page title:** `clamp(2rem, 4vw, 3.75rem)`, maximum two lines.
- **Section title:** 20-28px, sentence case, no eyebrow required.
- **Field label:** 12-13px medium weight above the control.
- **Banned:** Inter, serif fonts, all-caps section titles, excessive wide tracking, oversized marketing typography inside operational pages.

## 4. Shape and spacing system

- **Base radius:** 10px.
- **Inputs and buttons:** 8px radius, 44px minimum height.
- **Cards and sheets:** 12px radius.
- **Pills:** reserved for compact status badges only.
- **Page gutter:** 16px mobile, 24px tablet, 32px desktop.
- **Section gap:** 24px desktop, 20px mobile.
- **Form gap:** 16px between fields and 8px between label, control, helper, and error.

Do not nest cards more than one level deep. Use separators, inset sections, and whitespace for secondary grouping.

## 5. Component styling

- **Buttons:** shadcn Button. Primary uses StayPilot green with dark readable text. Secondary uses a raised surface and structural border. Destructive actions use the destructive token and require AlertDialog confirmation. Active state scales to 0.98.
- **Inputs and textareas:** shadcn Input and Textarea. Labels always remain visible above controls. Invalid state uses `aria-invalid`, a critical border, and inline error text.
- **Selects:** shadcn Select. Native or custom one-off dropdown implementations are not allowed.
- **Cards:** shadcn Card only when elevation communicates a separate task or summary. Dense registers use Table instead.
- **Tables:** shadcn Table with sticky headings when useful, tabular figures, row actions through DropdownMenu, and mobile conversion to stacked entity rows.
- **Tabs:** shadcn Tabs for related views inside one workflow, such as settings, room state, and finance registers.
- **Dialogs:** shadcn Dialog for focused creation or editing. AlertDialog for refunds, reset, void, delete, and access revocation.
- **Sheets:** shadcn Sheet for mobile navigation and contextual edit panels.
- **Command palette:** shadcn Command inside Dialog. Opens with Cmd/Ctrl+K and navigates to every permitted workspace.
- **Badges:** shadcn Badge variants for semantic status only.
- **Loading:** shadcn Skeleton matching the final shape. No circular spinner.
- **Alerts:** shadcn Alert for inline success, warning, and error feedback. No `window.alert`.
- **Empty states:** one clear sentence, one optional action, and enough context to explain how data appears.

## 6. Information architecture and UX flow

The navigation is grouped by hotel job, not by implementation:

1. **Operate:** command center, front desk, rooms, reservations, groups, guests.
2. **Property:** housekeeping, engineering, inventory, vendors, blueprints.
3. **Revenue:** invoices, payments, receipts, reports, night audit.
4. **Control:** keys and NFC, access events, service operations, notifications, handovers, documents, guest issues, knowledge, integrations, settings.

Primary daily flows:

- **Arrival:** reservation -> room assignment -> payment or deposit -> key issue -> check-in confirmation.
- **Stay:** guest profile -> service request -> room charge -> access event review.
- **Departure:** folio review -> payment capture -> receipt -> checkout -> card expiry -> housekeeping task.
- **Night close:** open-balance review -> gateway reconciliation -> night audit -> PDF archive.
- **Property issue:** room or asset -> maintenance ticket -> vendor/SLA -> resolution -> housekeeping inspection -> room release.

Every page must answer three questions without scrolling: where am I, what needs attention, and what is the primary next action?

## 7. Layout principles

- Fixed desktop navigation and a shadcn Sheet on mobile.
- A maximum content width of 1600px, aligned to the workspace rather than centered like a marketing page.
- CSS Grid for summaries and split workspaces.
- Tables and registers for repeated operational entities. Cards are not substitutes for data tables.
- Dashboard layouts may be asymmetric, but form and transaction flows remain stable.
- All multi-column layouts collapse to one column below 768px.
- No horizontal page overflow. Dense tables use deliberate contained scrolling or responsive row layouts.
- Use `min-height: 100dvh`, never `100vh`.

## 8. Motion and interaction

- Default transition: 180-240ms with `cubic-bezier(0.16, 1, 0.3, 1)`.
- Animate transform and opacity only.
- Navigation selection, sheet entry, dialog entry, and row creation receive motion because they communicate state change.
- Lists do not animate perpetually. The online indicator may pulse because it conveys real system state.
- Honor `prefers-reduced-motion` and remove non-essential transforms.
- Keyboard access is mandatory for command palette, dialogs, menus, selects, and tables.

## 9. Responsive behavior

- Mobile touch targets are at least 44px.
- Sidebar becomes a Sheet opened from the top bar.
- Page title and primary action stack without overlap.
- Forms become one column below 768px.
- Summary groups use two columns where space allows, otherwise one column.
- Operational table rows expose the most important field first and move secondary metadata below it on mobile.
- Dialogs become near-full-width with safe viewport padding.

## 10. Content rules

- Use short, direct operational language.
- Button labels use a verb and object: `Create invoice`, `Capture payment`, `Issue key`.
- Avoid AI cliches, decorative metaphors, emojis, filler slogans, and invented precision.
- Use a regular hyphen only. Do not use em-dash or en-dash characters.
- Errors explain what failed and how to resolve it.
- Success messages confirm the created record identifier when available.

## 11. Anti-patterns

- No raw buttons, inputs, selects, dialogs, or menus when a shadcn primitive exists.
- No hand-drawn SVG icon paths. Use one icon family.
- No pure black or pure white.
- No neon or outer glow effects.
- No glassmorphism across scrolling content.
- No three equal promotional cards.
- No nested card stacks.
- No decorative status dots. Dots are reserved for real live status.
- No oversized marketing hero inside authenticated operations.
- No modal for trivial inline edits; use it only when focus or confirmation matters.
- No destructive action without AlertDialog confirmation.
- No empty table without a designed empty state.
- No native browser alert, confirm, or prompt.
- No route, form field, or business workflow renamed without preserving existing behavior.
