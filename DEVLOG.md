# CrewOne HR — Dev Log

**Stack:** Next.js 15, React 19, TypeScript, PostgreSQL (Neon)
**Live:** techminds-hr.vercel.app
**Vercel Project ID:** prj_pCCk7wWVhnMDz4WaGPnxz3jtMIxF

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

*Last updated: 2026-11-23 — Attendance Heatmap complete*
