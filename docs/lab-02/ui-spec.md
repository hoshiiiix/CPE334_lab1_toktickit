# Lab 2 UI Specification — Zen Green Theme

## 1. Color Tokens
| Token | Value | Use |
|---|---|---|
| `--color-primary` | `#006B3C` | App header, primary buttons, strong emphasis |
| `--color-secondary` | `#0B7A46` | Active tabs, focus accents, links, hover |
| `--color-pale` | `#EAF6EF` | Selected rows, success emphasis, subtle sections |
| `--color-bg` | `#F5F7F6` | Page background |
| `--color-surface` | `#FFFFFF` | Cards, panels (subtle border, restrained shadow) |
| `--color-text` | `#1F2A24` | Dark charcoal-green body text |
| `--color-error` | `#B3261E` | Error text/border |
| `--color-warning` | `#B8860B` (amber) | Warning callouts/badges only |
| `--color-success` | `#1E7A46` | Success confirmation text/icon |

Editable fields: white background, neutral 1px border. Read-only fields: soft
gray-green (`#EEF2EF`) background, same border radius, clearly non-interactive
cursor.

## 2. Typography & Spacing
- Base font size 16px, 1.5 line-height for body text; headings use the same
  font family at 20/24/28px for h3/h2/h1.
- Spacing scale: 4/8/12/16/24/32px; form fields use 16px vertical gap, sections use
  32px.

## 3. Component States
- **Editable**: white bg, neutral border, `--color-secondary` border on focus with
  visible focus ring.
- **Read-only**: gray-green bg, no focus ring, `aria-readonly="true"`.
- **Invalid**: `--color-error` border, error text directly below the field, `aria-invalid="true"`, `aria-describedby` pointing to the message.
- **Disabled**: 50% opacity, `cursor: not-allowed`, not focusable.
- **Busy** (submit button): spinner + "Submitting…" label, button disabled.

## 4. Required-Field Marker & Validation Placement
Required fields show a red asterisk after the label text. Validation messages
appear immediately below their field, in `--color-error`, never only as a single
banner at the top of the form (a top-level summary banner may additionally list all
errors with anchor links, but per-field messages are mandatory).

## 5. Button Hierarchy
| Style | Use | Example |
|---|---|---|
| Primary | Main action | "Submit Ticket", "Continue" |
| Secondary | Alternate action | "Cancel", "Clear Filters" |
| Tertiary (text/link) | Low-emphasis action | "Change Requester" |
| Destructive | Irreversible-ish action | "Remove Attachment" (red text/border) |
| Disabled | Any style, disabled state | 50% opacity, no hover |
| Busy | Primary mid-submit | spinner + disabled |

## 6. Attachment Selection & Error Presentation
- File picker shows selected filenames with size; invalid files show inline red
  text under the file list (not a popup alert) naming the specific problem
  ("scan.exe: file type not allowed", "photo.jpg: exceeds 5MB").
- Active attachments show a filename + download icon. Removed attachments show the
  filename greyed out with a "Removed" badge and no download control.

## 7. Screen States (all data-bound screens)
Initial (unloaded) → Loading (spinner/skeleton) → one of: Success (data shown),
Empty (zero records ever), No Results (records exist but filtered to zero), Failure
(safe error message + retry action). Create Ticket additionally has Validation
(field errors shown, form untouched otherwise) and Submitting (busy button, form
disabled) states.

## 8. Responsive Layout Rules
| Viewport | Rule |
|---|---|
| Desktop ≥992px | Multi-column form; My Tickets as a full data table; content max-width ~1140px, centered |
| Tablet 768–991px | Two-column form where practical; Summary/Description keep full width |
| Mobile <768px | Fields stack vertically; My Tickets renders as stacked cards (Ticket Number + Summary prominent, badges below); no horizontal page scroll; buttons full-width and touch-sized (≥44px height) |

## 9. Accessibility
- All interactive controls reachable and operable by keyboard (Tab/Shift+Tab/Enter/Space).
- Visible focus outline on every focusable element (no `outline: none` without a replacement).
- Icon-only controls (e.g. download icon) have `aria-label` and a tooltip.
- Status/priority badges are never color-only: each includes text (e.g. "High" not just a red dot).

## 10. Application Shell & Navigation
- Header: TokTickIT logo/name (left), "My Tickets" / "Create Ticket" nav (center/left-of-center),
  current Development Requester name + "Change Requester" + profile icon (right).
- Active nav item underlined/highlighted with `--color-secondary`.
- Mobile: nav collapses into a hamburger/menu button; Requester info remains visible or one tap away.

## 11. Development Requester Selection Screen
- Centered card, TokTickIT title, short "testing only, not a login screen" explanation,
  dropdown (loading/empty/error states per Section 7), disabled Continue until a
  selection is made, "Authentication coming in Lab 3" note (matches labsheet Figure).

## 12. Create Ticket Screen
- Field order: Ticket Number (read-only, shown as "will be assigned" pre-submit) →
  Ticket Date (read-only, "now") → Category (select) → Related System (select) →
  Requested Priority (select) → Summary (text, single line) → Description (textarea,
  resizable vertically only) → Attachments (file picker, max 5) → Submit/Cancel.
- Success state: green `--color-pale` panel showing the generated Ticket Number and
  a "View Ticket" / "Create Another" action.

## 13. My Tickets Screen
- Toolbar: search box (left), Category/Requested Priority/Status filters, "Clear
  Filters" and "Create Ticket" buttons (right).
- Table columns (desktop): Ticket No., Created Date, Summary, Category, Requested
  Priority (badge), Current Status (badge), Last Updated. Sortable columns show a
  sort indicator arrow.
- Pagination: Previous/Next + page numbers, current page highlighted.
- Mobile: each ticket becomes a card with Ticket No. + Summary as the primary line,
  badges below, tap anywhere to open detail.

## 14. Requester Ticket Detail Screen
- Read-only header fields grouped as in Create Ticket's field order (minus Submit).
- Separate "Attachments" section below the header, visually distinct (bordered
  panel), with an "Add Attachment" control and a list of active + removed
  attachments per Section 6 above.
- Back-to-My-Tickets navigation at the top.

## 15. Badge Rules
| Badge | Colors |
|---|---|
| Requested Priority: Low/Medium/High | neutral/amber/red text+bg, never color-only |
| Current Status: NEW | pale-green bg, `--color-secondary` text |

## 16. Visual Inspection Checklist
- [ ] No clipped labels or truncated badges at any breakpoint
- [ ] No overlapping validation messages
- [x] No unintended horizontal scroll on mobile
- [x] Editable vs. read-only fields are visually distinguishable at a glance
- [ ] All button styles match the hierarchy table
- [x] Screenshots captured at desktop/tablet/mobile for Create Ticket, My Tickets,
      Ticket Detail, saved under `artifacts/lab-02/screenshots/<screen>/`
<img width="1280" height="480" alt="Capture d’écran 2026-09-07 à 00 26 42" src="https://github.com/user-attachments/assets/de4ab9f1-4135-4b60-ac16-cd53a414959a" />
<img width="1280" height="480" alt="Capture d’écran 2026-09-07 à 00 26 45" src="https://github.com/user-attachments/assets/3be34873-d889-4697-82cf-5b0b5b82a9d7" />
<img width="1280" height="480" alt="Capture d’écran 2026-09-07 à 00 26 38" src="https://github.com/user-attachments/assets/02cf6b6a-de0e-49ad-9d8e-28a59224a8c8" />

<img width="768" height="480" alt="Capture d’écran 2026-09-07 à 00 26 25" src="https://github.com/user-attachments/assets/c8f6f572-6f8a-4c09-a923-44bbe736898b" />
<img width="768" height="480" alt="Capture d’écran 2026-09-07 à 00 26 21" src="https://github.com/user-attachments/assets/3bf14a69-10bc-4fc4-acec-25d5c379a784" />
<img width="768" height="480" alt="Capture d’écran 2026-09-07 à 00 26 17" src="https://github.com/user-attachments/assets/d7efef2a-6701-4e53-88c7-c209fc7a441c" />

<img width="375" height="480" alt="Capture d’écran 2026-09-07 à 00 25 34" src="https://github.com/user-attachments/assets/20fd51a6-e7eb-4a75-a28b-64025aea97da" />
<img width="375" height="480" alt="Capture d’écran 2026-09-07 à 00 25 43" src="https://github.com/user-attachments/assets/aa6a3dee-7940-4faf-8267-19f19745433d" />
<img width="375" height="480" alt="Capture d’écran 2026-09-07 à 00 25 49" src="https://github.com/user-attachments/assets/542cd65c-2458-4307-8cbf-7219d1a77455" />


### Notes / Known Issues
1. **Mobile header nav (Section 10 violation)**: the spec requires the mobile nav
   to collapse into a hamburger/menu button. Instead, the current implementation
   just lets "My Tickets", "Create Ticket", requester name, and "Change Requester"
   wrap and overlap within the fixed-height header bar, causing the label overlap
   noted above. This is a layout bug, not just a cosmetic nit — it makes "Create
   Ticket" and the requester name hard to read/tap distinctly on mobile.
2. **"Change Requester" button style**: rendered as an outlined button on every
   breakpoint, whereas Section 5 classifies it as a tertiary (text/link) action.
   Low-severity — doesn't block usability, but is a spec deviation worth flagging.
