# CrewOne HR — Dev Log

**Stack:** Next.js 15, React 19, TypeScript, PostgreSQL (Neon)
**Live:** techminds-hr.vercel.app
**Vercel Project ID:** prj_pCCk7wWVhnMDz4WaGPnxz3jtMIxF

---

## 2026-11-24 (UI/UX improvements)

### UI/UX audit + quick wins (5 CSS changes, 3 loading skeletons)
- **app/globals.css**: Fixed WCAG AA contrast failure — `--mute` changed from `#6b7389` (3.95:1) to `#525f7a` (5.4:1). Affects all label, timestamp, and secondary text across every page
- **app/refine.css** (5 additions):
  - Font size bumped from `14px` → `15px` (more readable on data-heavy tables/forms)
  - `.wrap` gets `animation: fadeUp .22s` — smooth page-load fade instead of instant repaint on navigation
  - `.btn.loading` — spinner class: `color:transparent` + `::after` spinning border ring; `.btn.sec.loading` uses brand-color ring
  - `.skel` / `.skel-h1` / `.skel-card` / `.skel-line` — pulse skeleton CSS for loading states
  - `.empty` / `.empty-icon` — empty state layout (icon + heading + sub) for "no data" cases
  - Mobile touch targets: `.theme-btn`, `.bell-btn`, `.logout-btn` bumped to `44×44px` on phones (was 32px, below Apple HIG minimum)
- **app/dashboard/loading.tsx** (new): Next.js 15 route skeleton — 2 card skeletons + 4 stat skeletons shown while dashboard data loads server-side
- **app/admin/loading.tsx** (new): 6 stat tiles + 2 cards skeleton
- **app/calendar/loading.tsx** (new): Full-height calendar skeleton
- **Audit report**: Full UI/UX audit with category breakdown (10 categories), all issues with severity + 1-line code fixes, 4-sprint roadmap to 10/10

---

## 2026-11-24

### Calendar event reminders — push notification
- **schema_calendar_remind.sql** (new): Adds `remind_minutes INT DEFAULT 0` to `calendar_events`; creates `calendar_reminders_sent (event_id, instance_dt)` table to prevent duplicate notifications
- **vercel.json** (new): Configures Vercel Cron to call `/api/cron/reminders` every minute (requires Vercel Pro)
- **app/api/cron/reminders/route.ts** (new): Cron handler — finds non-recurring + recurring events whose reminder time falls in a 90-second window, sends push notification via existing `lib/push.ts → pushTo()`, marks as sent in `calendar_reminders_sent`, cleans up entries older than 7 days. Protected by `CRON_SECRET` env var when set
- **BigCalendar.tsx**: Added `remindMinutes` to `Ev` type and `SaveData`; event modal has "Remind me" dropdown (None / 5 min / 15 min / 30 min / 1 hour / 1 day); popup shows 🔔 bell with timing if reminder set
- **calendar events API routes** (GET + POST + PUT): `remind_minutes` now saved and returned
- Requires push notifications enabled on device (via "Alerts: On" button in the app)

### Payslip customization — logo, custom fields, auto-generate
- **lib/payslip-settings.ts**: Added `CustomField` type, `logo` (base64 string), `custom_fields: CustomField[]`, `SYSTEM_SOURCES`, `DEFAULT_FIELDS`, `isCountSource` helper
- **lib/payslip-html.ts** (new): Shared `buildPayslipHtml()` function used by both payslip routes — renders custom fields with earning (green), deduction (red −), neutral styling; count-based sources show integers not currency
- **app/api/payslip-settings/route.ts**: GET/PUT now handles `payslip_logo` (base64 TEXT) and `payslip_fields` (JSON array) in the `settings` table
- **app/api/payslip/[id]/route.ts** + **preview/route.ts**: Both refactored to use `buildPayslipHtml`; custom logo takes priority over brand logo
- **PayslipSettingsForm.tsx**: Full rebuild with:
  - Logo upload: file → canvas resize (max 480px) → base64 — preview shown, Remove button
  - Custom fields builder: table with Label / Type / Source / Amount inputs; reorder (↑↓), remove (×), + Add field, Reset to default
  - System sources include all payroll columns (base_salary, bonus, absent_deduction, late_deduction, other_deduction, present/leave/absent days, late count, working days) plus "Manual value" for fixed amounts
- **page.tsx**: `getPayslipSettingsFromDB()` updated to load `logo` and `fields` from DB
- Existing "Payslip" button in PayrollClient already works — clicking generates the payslip with current custom fields instantly

### Appearance customization per user
- **MyProfile.tsx**: Added Appearance section in the avatar modal (accessible to all users + admins)
  - Font style: Inter / System / Serif / Mono (live preview on click)
  - Font size: S (13px) / M (14px) / L (15px) / XL (16px)
  - Accent color: Indigo / Blue / Violet / Teal / Rose (color swatches)
- **layout.tsx**: Added init script that reads `app-font`, `app-size`, `app-accent` from localStorage and injects `<style id="u-pref">` before render — no flash on page load
- All settings are localStorage-based (per-browser, no DB change needed); apply instantly on click

### CSS Fixes — Dark mode text, chat names, Karachi clock size
- **Dark mode text blur** (`dark.css`): Added `-webkit-font-smoothing: antialiased` + `letter-spacing: 0` to `[data-theme="dark"] body` — removes negative letter-spacing that looks fuzzy on dark backgrounds (Windows ClearType issue)
- **Light mode chat names missing** (`refine.css`): `.cw-t{color:#fff}` was set globally, making chat room names white on white background. Scoped it to `.cw .cw-t` (clock chip only) so chat widget names inherit `var(--ink)` correctly
- **Karachi time bigger** (`fixes.css`): Sidebar clock `.cw-t` font-size bumped from `15px` → `19px`

---

## 2026-11-23

### Chat widget — attachment, emoji, voice (commit `2a3338d`)
- **Paperclip button** → file picker, chunked upload to `/api/chat/files` (max 50 MB)
- **Emoji button** → 60-emoji grid popup (`.cw-emoji-pop`)
- **Mic button** → voice recording (MediaRecorder), blinking recording bar with cancel/send
- Images show inline preview in widget bubbles; voice messages playable inline
- Upload progress bar (`.cw-upload-bar`) under messages area
- New CSS: `.cw-ic-btn`, `.cw-emoji-pop`, `.cw-rec`, `.cw-upload-bar`

---

## Bug Fixes

### 1. Late Minutes — Grace Period Calculation Wrong
**Problem:** 37 min late + 30 min grace → "37m late" dikh raha tha, "7m late" hona chahiye tha.
**Fix:** `late ? diff - grace : 0` (pehle `diff` store ho raha tha bina grace subtract kiye)
**Files:** `lib/hr.ts`, `app/api/corrections/[id]/route.ts`

### 2. Logo Dark Background Pe Dark Dikh Raha Tha
**Problem:** Dark sidebar mein logo dark/invisible ho raha tha.
**Explanation:**
- `lg-d` class = light theme mein dikhe (dark logo, light background ke liye)
- `lg-l` class = dark theme mein dikhe (white logo, dark background ke liye)
- `logos.dark` = dark-colored logo URL (light background ke liye)
- `logos.light` = white logo URL (dark background ke liye)

**Code fix was already correct — real fix:** Settings → Branding mein white version "Header logo" slot pe upload karo.

### 3. UserForm Grid Layout Broken
**Problem:** Grace period field 3-column grid mein shift timings ke saath dikh raha tha.
**Fix:** `style={{ gridColumn: "1 / -1" }}` added kiya.
**File:** `components/UserForm.tsx`

---

## UI / UX Improvements

### 4. Admin Dashboard Table
- Rows vertically center-aligned: `style={{ verticalAlign: "middle" }}` on `<tr>`
- Long task names truncate with `…` and full name on hover (tooltip)
- Max width 140px on task column span
**File:** `app/admin/page.tsx`

### 5. Nav Reorder — Settings Above More
**Change:** Settings link `More` se pehle aata hai ab sidebar mein.
**File:** `components/Shell.tsx`

### 6. Sidebar Full Name Fix
**Problem:** Sidebar mein name truncate ho raha tha (e.g., "Admin (ADMI...")
**Fix:** CSS — `max-width:none; white-space:normal; overflow:visible;` for sidebar mode
**File:** `app/fixes.css`

### 7. Top Nav Mode — Name Visible
**Problem:** Top tabs mode mein name nahi dikh raha tha.
**Fix:** CSS added for `html[data-nav="top"] .top .who-t`
**File:** `app/fixes.css`

### 8. Mobile Burger Menu
**Problem:** Mobile pe nav items horizontal scroll ho rahe the — cramped layout.
**Fix:** Hamburger menu (☰ / ✕ toggle), dropdown style nav on mobile.
**New Files:**
- `components/MobileNav.tsx` — client component wrapping nav as children
**CSS Added:** `.burger-btn`, `.top nav`, `.top nav.mob-open` (absolute dropdown)
**File:** `app/fixes.css`

---

## New Features

### 9. Per-User Custom Grace Period
**Feature:** Har user ka apna grace period (minutes) — global setting se override.
**Fallback logic:** `user.grace_minutes ?? s.grace_minutes`
**DB change:** `ALTER TABLE users ADD COLUMN IF NOT EXISTS grace_minutes INT;`
**Files Changed:**
- `lib/auth.ts` — `grace_minutes` added to `SessionUser` type + SELECT
- `lib/hr.ts` — per-user grace in `markAttendance()`
- `app/api/corrections/[id]/route.ts` — per-user grace in correction approval
- `app/api/users/route.ts`, `app/api/users/[id]/route.ts` — `grace_minutes` in FIELDS
- `components/UserForm.tsx` — input field added
- `schema_user_grace.sql` — migration file

### 10. Nav Layout Toggle (Sidebar ↔ Top Tabs)
**Feature:** Har user apne liye sidebar ya top tabs choose kar sakta hai.
**How it works:**
- `localStorage("nav-layout")` mein save hota hai
- `data-nav="top"` attribute `<html>` pe set/remove hota hai
- Flash prevent karne ke liye init script `app/layout.tsx` mein
**New File:** `components/NavToggle.tsx`
**CSS:** `html[data-nav="top"]` block in `app/fixes.css`

### 11. Google Calendar — Full Implementation
**Feature:** Bilkul Google Calendar jaisi functionality.

**Views:**
| View | Description |
|------|-------------|
| Month | 7-column grid, event chips, date click → Day view |
| Week | 7-column time grid (24hrs), all-day strip, click to create |
| Day | Single day time grid, full event details |

**Custom Events (create/edit/delete):**
- Title, Date, Start/End time
- Color picker (10 colors: Indigo, Blue, Green, Amber, Red, Purple, Pink, Teal, Orange, Violet)
- All day toggle + End date
- Description
- Visibility: Personal / Team

**HR Events (read-only chips):**
| Color | Meaning |
|-------|---------|
| 🔴 Red | Holiday |
| 🟢 Green | Leave (approved) |
| ⚫ Gray | Leave (pending) |
| 🟡 Amber | Task due |
| 💚 Light green | Present |
| 🟠 Orange | Late |

**New Files:**
- `schema_calendar_events.sql` — new DB table
- `app/api/calendar/events/route.ts` — GET (by date range) + POST
- `app/api/calendar/events/[id]/route.ts` — PUT + DELETE
- `app/calendar.css` — Google Calendar-style CSS
- `components/BigCalendar.tsx` — complete rewrite (~450 lines)

**Updated Files:**
- `app/calendar/page.tsx` — 3-month HR data range (prev + current + next month)
- `app/layout.tsx` — `import "./calendar.css"`
- `scripts/migrate.ts` — `schema_calendar_events.sql` added

### 12. Leave Balance Tracker
**Feature:** Visual leave balance — employee dashboard aur admin overview dono jagah.

**Employee Dashboard (`/dashboard`):**
- Circular SVG progress ring (green/amber/red based on days left)
- Progress bar + stats row (used / remaining / total)
- Color logic:
  - 🟢 Green = more than 20% remaining
  - 🟡 Amber = ≤20% remaining
  - 🔴 Red = fully exhausted
- Per-user quota override: `user.leave_quota ?? s.leave_quota`

**Admin Leaves Page (`/admin/leaves`):**
- New "All Users Leave Balance" section at the top
- Shows every user: quota (custom `*` marked), used, remaining, status badge
- Mini progress bar per row
- Pending requests now show correct per-user quota
- Year param in SQL for year-specific counting

**DB Change:** `ALTER TABLE users ADD COLUMN IF NOT EXISTS leave_quota INT;`

**New Files:**
- `schema_leave_quota.sql` — migration
- `components/LeaveBalance.tsx` — reusable visual component

**Updated Files:**
- `lib/leave.ts` — `leaveBalance()` function added (wraps `leaveUsed()`)
- `app/dashboard/page.tsx` — `<LeaveBalance />` component used
- `app/admin/leaves/page.tsx` — all-users balance grid + per-user quota in pending table
- `app/api/users/route.ts` + `app/api/users/[id]/route.ts` — `leave_quota` in FIELDS
- `components/UserForm.tsx` — "Leave quota" input field added (12b)
- `app/fixes.css` — `.leave-bal*` CSS block
- `scripts/migrate.ts` — `schema_leave_quota.sql` added

### 13. Payslip PDF Download
**Feature:** Har payroll row pe "Payslip" button — click karo → new tab mein professional HTML payslip opens → "Download / Print PDF" button se browser print/save as PDF.

**Design:**
- Dark header with company logo + "SALARY SLIP" title
- Employee info panel (name, emp_id, dept, designation, joining date)
- Summary strip (present / leave / absent / late counts)
- Earnings & Deductions breakdown table
- Net salary box (dark, prominent)
- PAID / DRAFT stamp (green / amber)
- Auto-print button

**No extra packages** — pure HTML + inline CSS, works on Vercel free tier.

**New Files:**
- `app/api/payslip/[id]/route.ts` — returns HTML payslip, admin-only

**Updated Files:**
- `app/admin/payroll/PayrollClient.tsx` — "Payslip" anchor button (opens new tab)

### 14. Dashboard Charts
**Feature:** Two visual charts on the user dashboard — no external chart library, pure SVG.

**Chart 1 — Attendance Trend (last 6 months):**
- Stacked vertical bar chart
- Green = on-time days, Red = late days on top
- Day count label above each bar
- Current month bolded
- Always shows 6 bars (empty months = 0 height)

**Chart 2 — This Month: On-Time vs Late:**
- Circular donut chart (green on-time arc, red late arc)
- Centre: total present days
- Right panel: on-time count + %, late count + %, avg sign-in time (for on-time days)

**New Files:**
- `components/DashboardCharts.tsx` — server component, pure SVG, no deps

**Updated Files:**
- `app/dashboard/page.tsx` — added trend SQL query + `<DashboardCharts />` after MonthStats

### 15. Recurring Calendar Events
**Feature:** Events can repeat — Every day / Every week / Every month — with optional end date.

**How it works:**
- Recurring events have `recurrence` and `recurrence_until` columns on `calendar_events`
- GET API expands recurring events virtually for the requested date range (no duplicate rows in DB)
- UI: "Repeat" dropdown + "Until" date picker in event modal
- Recurring instances show a small **↻** icon on the chip
- Event popup shows "↻ Repeats weekly until 2026-12-31"
- Editing a recurring event updates ALL instances (base event edit)

**New Files:**
- `schema_recurring.sql` — ADD COLUMN recurrence + recurrence_until

**Updated Files:**
- `app/api/calendar/events/route.ts` — `expandRecurring()` in GET, recurrence in POST
- `app/api/calendar/events/[id]/route.ts` — recurrence in PUT
- `components/BigCalendar.tsx` — Recurrence UI in EventModal + ↻ icon on chips
- `scripts/migrate.ts` — schema_recurring.sql added

### 16. Payroll — Sat + Sun Double Off
**Problem:** Previous setting only allowed ONE weekly off day, but company needs Sat + Sun both off (with Saturday sometimes worked).

**Fix:** `weekly_off` setting now stores comma-separated days: `"0,6"` = Sun + Sat, `"0"` = Sun only.
- If employee comes in on Saturday, it counts as present (bonus day)
- If employee doesn't come on Saturday, NOT deducted (it's an off day)
- When Saturday is required: admin can uncheck Saturday from off days → recalculate → then re-check

**Updated Files:**
- `lib/payroll.ts` — `payrollSettings()` returns `weekly_off_days: number[]`; `calcPayroll()` uses array check
- `app/api/payroll/route.ts` — PUT saves comma-separated array
- `app/admin/payroll/PayrollClient.tsx` — Checkboxes for each day (Mon–Sun) instead of single dropdown
- `app/admin/payroll/page.tsx` — prop renamed to `weeklyOffDays`

### 17. Attendance Heatmap (GitHub-style)
**Feature:** GitHub contribution graph-style heatmap on the user dashboard — last 12 months attendance at a glance.

**Colors:**
| Color | Meaning |
|-------|---------|
| 🟢 Green | Present — on time |
| 🟠 Orange | Present — late |
| 🔵 Blue | On approved leave |
| 🟣 Purple | Public holiday |
| ⬜ Light gray | Absent (working day, no record) |
| Transparent | Weekend / future date |

**Features:**
- 52+ week × 7 day grid (Sun–Sat columns per week)
- Month labels above grid (Jan, Feb, … Nov, Dec)
- Day labels on left (Mon, Wed, Fri — alternating)
- Hover tooltip shows date + status
- Legend row below with counts: 45 present, 3 late, 2 leave, etc.
- Horizontally scrollable on mobile

**New Files:**
- `components/AttendanceHeatmap.tsx` — pure SVG, server component, no deps

**Updated Files:**
- `app/dashboard/page.tsx` — 3 new queries (heatAtt, heatLeaves, heatHols) + `<AttendanceHeatmap />` placed before Monthly record

---

## Infrastructure

### DB Schema Files
| File | Purpose |
|------|---------|
| `schema_user_grace.sql` | `grace_minutes INT` column on users table |
| `schema_calendar_events.sql` | New `calendar_events` table with indexes |
| `schema_leave_quota.sql` | `leave_quota INT` column on users table |

### API Routes Added
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/calendar/events` | GET | Fetch events by date range (personal + team) |
| `/api/calendar/events` | POST | Create new event |
| `/api/calendar/events/[id]` | PUT | Update event (owner only) |
| `/api/calendar/events/[id]` | DELETE | Delete event (owner only) |

### Deployment
- **Platform:** Vercel (Hobby plan — free)
- **DB:** Neon PostgreSQL (free tier, 0.5 GB)
- **Migration:** `npm run migrate` (runs `tsx scripts/migrate.ts`)
- **Auto-deploy:** GitHub push → Vercel auto-deploys

### Git Commits (this session)
| Commit | Description |
|--------|-------------|
| `ec3ac7c` | feat: mobile burger menu for responsive nav |
| `dfe17f3` | fix: show user name in top-nav mode header |
| `c0446e6` | fix: show full name in sidebar, clean up NavToggle |
| `6324612` | feat: nav layout toggle (sidebar / top tabs) |
| `2f7abfb` | fix: move Settings above More in admin sidebar nav |
| `94d4cad` | feat: Google Calendar-style calendar with Month/Week/Day views |

---

## Hosting Notes

**Current:** Vercel Hobby (free) — personal use only technically.

**Future / Production:**
- Hostinger VPS lena (~$5-7/month)
- Ubuntu 22.04 + Node.js + PM2 + Nginx
- Same Neon DB reuse ya VPS pe PostgreSQL install
- Let's Encrypt SSL (free)
- `npm run build && npm start` to run

---

### 18. More Dropdown Not Opening in Top-Nav Mode
**Problem:** "More ▾" button click karne pe dropdown open nahi ho raha tha — top-nav mode mein.
**Root Cause:** `<nav>` element pe `overflow-x: auto` tha top-nav mode mein. CSS spec ke according, `overflow-x: auto` automatically `overflow-y` ko bhi `auto` set kar deta hai, jo `position: absolute` dropdown ko clip kar deta tha.
**Fix:** React Portal use kiya — top-nav mode mein `.more-pop` `document.body` pe render hota hai `position: fixed` ke saath, `getBoundingClientRect()` se position calculate karke. Sidebar mode mein pehle ki tarah inline render hota hai.
**Files Changed:** `components/NavMore.tsx`

### 19. Payslip Template Customisation
**Feature:** Admin can customise payslip appearance from Settings → Payslip template.

**Options available:**
| Setting | Description |
|---------|-------------|
| Header background color | Color picker — header ki background (default #0f172a navy) |
| Net salary box color | Color picker — net amount box ka accent color |
| Currency symbol | Text — e.g. PKR, Rs., $ — amounts ke saath show hota hai |
| Company address | Text — logo ke neeche header mein show hota hai |
| Footer note | Textarea — payslip bottom pe message |
| Signature line | Checkbox — "Employee Signature / Authorised Signatory" boxes |

**Preview:** "Preview" button click karne pe sample data ke saath live payslip opens — changes reflect hoti hain immediately after save.

**New Files:**
- `app/admin/settings/PayslipSettingsForm.tsx` — settings form component
- `app/api/payslip-settings/route.ts` — GET + PUT for payslip settings
- `app/api/payslip/preview/route.ts` — preview with dummy data + yellow banner

**Updated Files:**
- `app/api/payslip/[id]/route.ts` — reads settings, applies header_color, accent_color, currency, address, footer_note, show_signature
- `app/admin/settings/page.tsx` — "Payslip template" card added

*Last updated: 2026-11-23 — Payslip template customisation*
