// Powered By Vistech Force
"use client";
import { useState, useEffect, useRef } from "react";

// ---- Types ----
export type CalEvent = { date: string; label: string; kind: "hol" | "leave" | "leavep" | "task" | "late" | "pres" };

type View = "month" | "week" | "day";

type Ev = {
  id?: number;
  date: string;
  endDate?: string;
  title: string;
  color: string;
  kind: string;
  startMin?: number;
  endMin?: number;
  allDay: boolean;
  description?: string;
  visibility?: "personal" | "team";
  editable: boolean;
  recurrence?: "none" | "daily" | "weekly" | "monthly";
  recurrenceUntil?: string;
  isRecurringInstance?: boolean;
  remindMinutes?: number;
};

type Recurrence = "none" | "daily" | "weekly" | "monthly";

interface SaveData {
  title: string; description: string; date: string; endDate: string;
  startTime: string; endTime: string; color: string; allDay: boolean;
  visibility: "personal" | "team"; recurrence: Recurrence; recurrenceUntil: string;
  remindMinutes: number;
}

// ---- Constants ----
const HOUR_H = 60;

const HR_COLORS: Record<string, string> = {
  hol: "#ef4444", leave: "#16a34a", leavep: "#94a3b8",
  task: "#f59e0b", pres: "#22c55e", late: "#f97316",
};

const PALETTE = [
  { color: "#4f46e5", name: "Indigo" }, { color: "#0ea5e9", name: "Blue" },
  { color: "#10b981", name: "Green" }, { color: "#f59e0b", name: "Amber" },
  { color: "#ef4444", name: "Red" }, { color: "#8b5cf6", name: "Purple" },
  { color: "#ec4899", name: "Pink" }, { color: "#14b8a6", name: "Teal" },
  { color: "#f97316", name: "Orange" }, { color: "#6366f1", name: "Violet" },
];

// ---- Helpers ----
function isoDate(d: Date) { return d.toISOString().slice(0, 10); }

function addDays(date: string, n: number) {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return isoDate(d);
}

function weekSunday(date: string) {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return isoDate(d);
}

function fmt12(min: number) {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function minToHhmm(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function navMonth(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

function monthTitle(ym: string) {
  return new Date(ym + "-01T00:00:00Z").toLocaleString("en-US", {
    month: "long", year: "numeric", timeZone: "UTC",
  });
}

function hrToEv(e: CalEvent): Ev {
  return { date: e.date, title: e.label, color: HR_COLORS[e.kind] ?? "#4f46e5", kind: e.kind, allDay: true, editable: false };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function apiToEv(e: any): Ev {
  const start = new Date(e.start_dt);
  const end = new Date(e.end_dt);
  return {
    id: e.recurrence_base_id ?? e.id,
    date: e.start_dt.slice(0, 10), endDate: e.end_dt.slice(0, 10),
    title: e.title, color: e.color, kind: "custom",
    startMin: e.all_day ? undefined : start.getUTCHours() * 60 + start.getUTCMinutes(),
    endMin: e.all_day ? undefined : end.getUTCHours() * 60 + end.getUTCMinutes(),
    allDay: e.all_day, description: e.description ?? undefined,
    visibility: e.visibility, editable: true,
    recurrence: e.recurrence ?? "none",
    recurrenceUntil: e.recurrence_until ?? undefined,
    isRecurringInstance: !!e.recurrence_base_id,
    remindMinutes: e.remind_minutes ?? 0,
  };
}

// ---- Event Modal ----
function EventModal({ mode, ev, initDate, initStartMin, saving, onSave, onClose }: {
  mode: "create" | "edit"; ev?: Ev; initDate: string; initStartMin?: number;
  saving: boolean; onSave: (d: SaveData) => void; onClose: () => void;
}) {
  const [title, setTitle] = useState(ev?.title ?? "");
  const [desc, setDesc] = useState(ev?.description ?? "");
  const [date, setDate] = useState(ev?.date ?? initDate);
  const [endDate, setEndDate] = useState(ev?.endDate ?? ev?.date ?? initDate);
  const [allDay, setAllDay] = useState(ev?.allDay ?? initStartMin === undefined);
  const [startT, setStartT] = useState(
    ev?.startMin !== undefined ? minToHhmm(ev.startMin) :
    initStartMin !== undefined ? minToHhmm(initStartMin) : "09:00"
  );
  const [endT, setEndT] = useState(
    ev?.endMin !== undefined ? minToHhmm(ev.endMin) :
    initStartMin !== undefined ? minToHhmm(Math.min(initStartMin + 60, 23 * 60)) : "10:00"
  );
  const [color, setColor] = useState(ev?.color ?? "#4f46e5");
  const [vis, setVis] = useState<"personal" | "team">(ev?.visibility ?? "personal");
  const [rec, setRec] = useState<Recurrence>(ev?.recurrence ?? "none");
  const [recUntil, setRecUntil] = useState(ev?.recurrenceUntil ?? "");
  const [remindMin, setRemindMin] = useState(ev?.remindMinutes ?? 0);
  const [err, setErr] = useState("");

  function handleSave() {
    if (!title.trim()) { setErr("Title is required"); return; }
    setErr("");
    onSave({ title: title.trim(), description: desc, date, endDate: endDate || date, startTime: startT, endTime: endT, color, allDay, visibility: vis, recurrence: rec, recurrenceUntil: recUntil, remindMinutes: remindMin });
  }

  return (
    <div className="gcal-backdrop" onClick={onClose}>
      <div className="gcal-modal" onClick={(e) => e.stopPropagation()}>
        <div className="gcal-modal-head" style={{ borderTop: `4px solid ${color}` }}>
          <h3 style={{ margin: 0, fontSize: 17 }}>{mode === "edit" ? "Edit event" : "New event"}</h3>
          <button className="gcal-close" onClick={onClose}>✕</button>
        </div>
        <div className="gcal-modal-body">
          <input className="gcal-title-inp" value={title}
            onChange={(e) => setTitle(e.target.value)} placeholder="Add title" autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }} />
          <label className="gcal-allday-toggle">
            <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
            All day
          </label>
          <div className="gcal-modal-row">
            <div>
              <div className="gcal-label">Date</div>
              <input type="date" value={date} onChange={(e) => {
                setDate(e.target.value);
                if (!endDate || endDate < e.target.value) setEndDate(e.target.value);
              }} />
            </div>
            {!allDay ? (
              <>
                <div>
                  <div className="gcal-label">Start</div>
                  <input type="time" value={startT} onChange={(e) => setStartT(e.target.value)} />
                </div>
                <div>
                  <div className="gcal-label">End</div>
                  <input type="time" value={endT} onChange={(e) => setEndT(e.target.value)} />
                </div>
              </>
            ) : (
              <div>
                <div className="gcal-label">End date</div>
                <input type="date" value={endDate} min={date} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            )}
          </div>
          <div>
            <div className="gcal-label">Color</div>
            <div className="gcal-palette">
              {PALETTE.map((p) => (
                <button key={p.color} title={p.name} type="button"
                  className={"gcal-pal-btn" + (color === p.color ? " sel" : "")}
                  style={{ background: p.color }} onClick={() => setColor(p.color)} />
              ))}
            </div>
          </div>
          <div>
            <div className="gcal-label">Description</div>
            <textarea className="gcal-desc" value={desc} rows={2}
              onChange={(e) => setDesc(e.target.value)} placeholder="Add description…" />
          </div>
          <div>
            <div className="gcal-label">Visibility</div>
            <select value={vis} onChange={(e) => setVis(e.target.value as "personal" | "team")}>
              <option value="personal">Only me</option>
              <option value="team">Whole team</option>
            </select>
          </div>
          <div>
            <div className="gcal-label">Repeat</div>
            <div className="gcal-modal-row" style={{ gap: 10, flexWrap: "wrap" }}>
              <select value={rec} onChange={(e) => setRec(e.target.value as Recurrence)} style={{ flex: 1, minWidth: 140 }}>
                <option value="none">Does not repeat</option>
                <option value="daily">Every day</option>
                <option value="weekly">Every week</option>
                <option value="monthly">Every month</option>
              </select>
              {rec !== "none" && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, color: "var(--mute)", whiteSpace: "nowrap" }}>Until (optional)</span>
                  <input type="date" value={recUntil} min={date}
                    onChange={(e) => setRecUntil(e.target.value)}
                    style={{ width: 150 }} />
                </div>
              )}
            </div>
            {rec !== "none" && <div style={{ fontSize: 12, color: "var(--mute)", marginTop: 4 }}>Editing applies to all instances of this event.</div>}
          </div>
          <div>
            <div className="gcal-label">Remind me</div>
            <select value={remindMin} onChange={(e) => setRemindMin(Number(e.target.value))}>
              <option value={0}>No reminder</option>
              <option value={5}>5 minutes before</option>
              <option value={15}>15 minutes before</option>
              <option value={30}>30 minutes before</option>
              <option value={60}>1 hour before</option>
              <option value={1440}>1 day before</option>
            </select>
            {remindMin > 0 && <div style={{ fontSize: 11, color: "var(--mute)", marginTop: 3 }}>Push notification will be sent (requires Alerts to be on)</div>}
          </div>
          {err && <div style={{ color: "#ef4444", fontSize: 13 }}>{err}</div>}
        </div>
        <div className="gcal-modal-foot">
          <button className="btn sec" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}

// ---- Event Popup ----
function EventPopup({ ev, onEdit, onDelete, onClose }: {
  ev: Ev; onEdit: (ev: Ev) => void; onDelete: (id: number) => void; onClose: () => void;
}) {
  const kindLabel: Record<string, string> = {
    hol: "Holiday", leave: "Leave (approved)", leavep: "Leave (pending)",
    task: "Task due", pres: "Attendance", late: "Late arrival",
  };
  return (
    <div className="gcal-backdrop" onClick={onClose}>
      <div className="gcal-popup" onClick={(e) => e.stopPropagation()}>
        <div className="gcal-popup-head">
          <div className="gcal-popup-dot" style={{ background: ev.color }} />
          <div className="gcal-popup-info">
            <div className="gcal-popup-title">{ev.title}</div>
            {kindLabel[ev.kind] && <div className="gcal-popup-kind">{kindLabel[ev.kind]}</div>}
            <div className="gcal-popup-time">
              {ev.allDay
                ? ev.date + (ev.endDate && ev.endDate !== ev.date ? ` – ${ev.endDate}` : "")
                : `${ev.date} · ${fmt12(ev.startMin ?? 0)} – ${fmt12(ev.endMin ?? 0)}`}
            </div>
            {ev.visibility === "team" && <div className="gcal-popup-vis">Team event</div>}
            {ev.recurrence && ev.recurrence !== "none" && (
              <div className="gcal-popup-vis" style={{ color: "var(--mute)" }}>
                ↻ Repeats {ev.recurrence}{ev.recurrenceUntil ? ` until ${ev.recurrenceUntil}` : ""}
              </div>
            )}
            {ev.remindMinutes && ev.remindMinutes > 0 ? (
              <div className="gcal-popup-vis" style={{ color: "var(--mute)" }}>
                🔔 {ev.remindMinutes < 60 ? `${ev.remindMinutes} min` : ev.remindMinutes === 60 ? "1 hr" : ev.remindMinutes === 1440 ? "1 day" : `${ev.remindMinutes / 60} hrs`} before
              </div>
            ) : null}
            {ev.description && <div className="gcal-popup-desc">{ev.description}</div>}
          </div>
          <button className="gcal-close" onClick={onClose}>✕</button>
        </div>
        {ev.editable && (
          <div className="gcal-popup-foot">
            <button className="btn sec sm" onClick={() => onEdit(ev)}>Edit</button>
            <button className="btn sm" style={{ background: "#ef4444", border: 0, color: "#fff" }}
              onClick={() => ev.id && onDelete(ev.id)}>Delete</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Main Component ----
export default function BigCalendar({ month: initialMonth, today, events: hrEvents }: {
  month: string; today: string; events: CalEvent[];
}) {
  const [view, setView] = useState<View>("month");
  const [curDate, setCurDate] = useState(today);
  const [curMonth, setCurMonth] = useState(initialMonth);
  const [customEvs, setCustomEvs] = useState<Ev[]>([]);
  const [modal, setModal] = useState<
    | { type: "create"; date: string; startMin?: number }
    | { type: "view"; ev: Ev }
    | { type: "edit"; ev: Ev }
    | null>(null);
  const [saving, setSaving] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  function getRange() {
    if (view === "month") {
      const [y, m] = curMonth.split("-").map(Number);
      return { start: curMonth + "-01", end: isoDate(new Date(Date.UTC(y, m, 0))) };
    }
    if (view === "week") {
      const ws = weekSunday(curDate);
      return { start: ws, end: addDays(ws, 6) };
    }
    return { start: curDate, end: curDate };
  }

  async function loadCustom() {
    const { start, end } = getRange();
    try {
      const r = await fetch(`/api/calendar/events?start=${start}&end=${end}`);
      if (r.ok) setCustomEvs((await r.json() as Ev[]).map(apiToEv));
    } catch { /* network error — keep existing events */ }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadCustom(); }, [view, curDate, curMonth]);

  const allEvs: Ev[] = [...hrEvents.map(hrToEv), ...customEvs];

  function eventsForDate(date: string) {
    return allEvs.filter((e) =>
      e.endDate && e.endDate > e.date ? date >= e.date && date <= e.endDate : e.date === date
    );
  }

  function nav(delta: number) {
    if (view === "month") setCurMonth(navMonth(curMonth, delta));
    else if (view === "week") setCurDate(addDays(weekSunday(curDate), delta * 7));
    else setCurDate(addDays(curDate, delta));
  }

  function goToday() { setCurDate(today); setCurMonth(today.slice(0, 7)); }

  function switchView(v: View) {
    setView(v);
    if (v !== "month" && !curDate.startsWith(curMonth)) setCurDate(curMonth + "-01");
    if (v === "month" && !curDate.startsWith(curMonth)) setCurMonth(curDate.slice(0, 7));
  }

  function openCreate(date: string, startMin?: number) { setModal({ type: "create", date, startMin }); }
  function openView(ev: Ev) { setModal({ type: "view", ev }); }
  function openEdit(ev: Ev) { setModal({ type: "edit", ev }); }

  async function saveEvent(form: SaveData) {
    setSaving(true);
    try {
      const start_dt = form.allDay ? form.date + "T00:00:00Z" : `${form.date}T${form.startTime}:00Z`;
      const end_dt = form.allDay ? (form.endDate || form.date) + "T23:59:59Z" : `${form.endDate || form.date}T${form.endTime}:00Z`;
      const body = { title: form.title, description: form.description, start_dt, end_dt, color: form.color, all_day: form.allDay, visibility: form.visibility, recurrence: form.recurrence, recurrence_until: form.recurrenceUntil || null, remind_minutes: form.remindMinutes };
      const isEdit = modal?.type === "edit" && (modal as { type: "edit"; ev: Ev }).ev?.id;
      const id = isEdit ? (modal as { type: "edit"; ev: Ev }).ev.id : undefined;
      const r = await fetch(isEdit ? `/api/calendar/events/${id}` : "/api/calendar/events", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (r.ok) { setModal(null); await loadCustom(); }
    } finally { setSaving(false); }
  }

  async function deleteEvent(id: number) {
    if (!confirm("Delete this event?")) return;
    await fetch(`/api/calendar/events/${id}`, { method: "DELETE" });
    setModal(null);
    await loadCustom();
  }

  function getTitle() {
    if (view === "month") return monthTitle(curMonth);
    if (view === "week") {
      const ws = weekSunday(curDate);
      const we = addDays(ws, 6);
      const sm = new Date(ws + "T00:00:00Z").toLocaleString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
      const em = new Date(we + "T00:00:00Z").toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
      return `${sm} – ${em}`;
    }
    return new Date(curDate + "T00:00:00Z").toLocaleString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
    });
  }

  // ---- Month View ----
  function MonthView() {
    const [y, m] = curMonth.split("-").map(Number);
    const first = new Date(Date.UTC(y, m - 1, 1));
    const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const cells: (string | null)[] = [
      ...Array(first.getUTCDay()).fill(null),
      ...Array.from({ length: days }, (_, i) => `${curMonth}-${String(i + 1).padStart(2, "0")}`),
    ];
    while (cells.length % 7) cells.push(null);
    return (
      <div className="gcal-month">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="gcal-wd">{d}</div>)}
        {cells.map((date, i) => {
          if (!date) return <div key={i} className="gcal-day gcal-off" />;
          const evs = eventsForDate(date);
          const isToday = date === today;
          return (
            <div key={i} className={`gcal-day${isToday ? " gcal-today" : ""}`} onClick={() => openCreate(date)}>
              <div className={`gcal-dn${isToday ? " gcal-dn-today" : ""}`}
                onClick={(e) => { e.stopPropagation(); switchView("day"); setCurDate(date); }}>
                {Number(date.slice(8))}
              </div>
              {evs.slice(0, 3).map((ev, j) => (
                <div key={j} className="gcal-chip"
                  style={{ background: ev.color + "22", borderLeft: `3px solid ${ev.color}`, color: ev.color }}
                  onClick={(e) => { e.stopPropagation(); openView(ev); }} title={ev.title}>
                  {!ev.allDay && <span style={{ opacity: .75 }}>{fmt12(ev.startMin ?? 0)} </span>}
                  {ev.isRecurringInstance && <span style={{ opacity: .6, fontSize: 10 }}>↻ </span>}
                  {ev.title}
                </div>
              ))}
              {evs.length > 3 && (
                <div className="gcal-more" onClick={(e) => { e.stopPropagation(); switchView("day"); setCurDate(date); }}>
                  +{evs.length - 3} more
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ---- Week View ----
  function WeekView() {
    const ws = weekSunday(curDate);
    const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
    const hours = Array.from({ length: 24 }, (_, i) => i);

    function evStyle(ev: Ev) {
      const top = (ev.startMin ?? 0) * (HOUR_H / 60);
      const h = Math.max(((ev.endMin ?? 60) - (ev.startMin ?? 0)) * (HOUR_H / 60), 22);
      return { top, height: h };
    }

    return (
      <div className="gcal-week-wrap">
        <div className="gcal-week-head">
          <div className="gcal-time-gutter" />
          {days.map((d) => (
            <div key={d} className={`gcal-week-dh${d === today ? " gcal-wh-today" : ""}`}
              onClick={() => { switchView("day"); setCurDate(d); }}>
              <span className="gcal-wh-wd">{new Date(d + "T00:00:00Z").toLocaleString("en-US", { weekday: "short", timeZone: "UTC" })}</span>
              <span className={`gcal-wh-dn${d === today ? " gcal-dn-today" : ""}`}>{Number(d.slice(8))}</span>
            </div>
          ))}
        </div>
        <div className="gcal-allday-row">
          <div className="gcal-time-gutter gcal-allday-label">all-day</div>
          {days.map((d) => (
            <div key={d} className="gcal-allday-cell">
              {eventsForDate(d).filter((e) => e.allDay).map((ev, j) => (
                <div key={j} className="gcal-allday-chip"
                  style={{ background: ev.color + "22", borderLeft: `3px solid ${ev.color}`, color: ev.color }}
                  onClick={() => openView(ev)}>{ev.title}</div>
              ))}
            </div>
          ))}
        </div>
        <div className="gcal-grid-scroll" ref={gridRef}>
          <div className="gcal-grid" style={{ height: 24 * HOUR_H }}>
            <div className="gcal-time-col">
              {hours.map((h) => (
                <div key={h} className="gcal-time-cell" style={{ height: HOUR_H }}>
                  {h === 0 ? "" : `${h % 12 || 12} ${h >= 12 ? "PM" : "AM"}`}
                </div>
              ))}
            </div>
            {days.map((d) => {
              const timedEvs = eventsForDate(d).filter((e) => !e.allDay);
              return (
                <div key={d} className="gcal-day-col" style={{ height: 24 * HOUR_H }}
                  onClick={(e) => {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    const rawMin = Math.round(((e.clientY - rect.top) / (HOUR_H / 60)) / 30) * 30;
                    openCreate(d, Math.min(Math.max(rawMin, 0), 23 * 60));
                  }}>
                  {hours.map((h) => <div key={h} className="gcal-hour-line" style={{ top: h * HOUR_H }} />)}
                  {timedEvs.map((ev, j) => {
                    const { top, height } = evStyle(ev);
                    return (
                      <div key={j} className="gcal-timed-ev" style={{ top, height, background: ev.color + "e0" }}
                        onClick={(e) => { e.stopPropagation(); openView(ev); }} title={ev.title}>
                        <div className="gcal-ev-title">{ev.title}</div>
                        {height > 32 && <div className="gcal-ev-time">{fmt12(ev.startMin ?? 0)}</div>}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ---- Day View ----
  function DayView() {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const all = eventsForDate(curDate);
    const allDayEvs = all.filter((e) => e.allDay);
    const timedEvs = all.filter((e) => !e.allDay);

    function evStyle(ev: Ev) {
      const top = (ev.startMin ?? 0) * (HOUR_H / 60);
      const h = Math.max(((ev.endMin ?? 60) - (ev.startMin ?? 0)) * (HOUR_H / 60), 22);
      return { top, height: h };
    }

    return (
      <div className="gcal-week-wrap">
        <div className="gcal-week-head">
          <div className="gcal-time-gutter" />
          <div className={`gcal-week-dh${curDate === today ? " gcal-wh-today" : ""}`}
            style={{ flex: 1, flexDirection: "row", alignItems: "center", padding: "12px 16px", gap: 10, cursor: "default" }}>
            <span className={`gcal-wh-dn${curDate === today ? " gcal-dn-today" : ""}`} style={{ fontSize: 30, width: 44, height: 44 }}>
              {Number(curDate.slice(8))}
            </span>
            <div>
              <div className="gcal-wh-wd" style={{ fontSize: 13, letterSpacing: 0 }}>
                {new Date(curDate + "T00:00:00Z").toLocaleString("en-US", { weekday: "long", timeZone: "UTC" })}
              </div>
              <div style={{ fontSize: 12, color: "var(--mute)" }}>
                {new Date(curDate + "T00:00:00Z").toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}
              </div>
            </div>
          </div>
        </div>
        {allDayEvs.length > 0 && (
          <div className="gcal-allday-row">
            <div className="gcal-time-gutter gcal-allday-label">all-day</div>
            <div className="gcal-allday-cell" style={{ flex: 1 }}>
              {allDayEvs.map((ev, j) => (
                <div key={j} className="gcal-allday-chip"
                  style={{ background: ev.color + "22", borderLeft: `3px solid ${ev.color}`, color: ev.color }}
                  onClick={() => openView(ev)}>{ev.title}</div>
              ))}
            </div>
          </div>
        )}
        <div className="gcal-grid-scroll" ref={gridRef}>
          <div className="gcal-grid" style={{ height: 24 * HOUR_H }}>
            <div className="gcal-time-col">
              {hours.map((h) => (
                <div key={h} className="gcal-time-cell" style={{ height: HOUR_H }}>
                  {h === 0 ? "" : `${h % 12 || 12} ${h >= 12 ? "PM" : "AM"}`}
                </div>
              ))}
            </div>
            <div className="gcal-day-col gcal-day-col-single" style={{ height: 24 * HOUR_H }}
              onClick={(e) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const rawMin = Math.round(((e.clientY - rect.top) / (HOUR_H / 60)) / 30) * 30;
                openCreate(curDate, Math.min(Math.max(rawMin, 0), 23 * 60));
              }}>
              {hours.map((h) => <div key={h} className="gcal-hour-line" style={{ top: h * HOUR_H }} />)}
              {timedEvs.map((ev, j) => {
                const { top, height } = evStyle(ev);
                return (
                  <div key={j} className="gcal-timed-ev gcal-timed-ev-day" style={{ top, height, background: ev.color + "e0" }}
                    onClick={(e) => { e.stopPropagation(); openView(ev); }} title={ev.title}>
                    <div className="gcal-ev-title">{ev.title}</div>
                    {height > 32 && <div className="gcal-ev-time">{fmt12(ev.startMin ?? 0)} – {fmt12(ev.endMin ?? 0)}</div>}
                    {ev.description && height > 55 && <div className="gcal-ev-desc">{ev.description}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- Render ----
  const modalKey = modal
    ? modal.type + (modal.type === "create" ? modal.date : modal.type === "edit" ? String(modal.ev.id) + modal.ev.date : "view")
    : "";

  return (
    <div className="gcal">
      <div className="gcal-header">
        <div className="row" style={{ gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn sec sm" onClick={goToday}>Today</button>
          <button className="btn sec sm" onClick={() => nav(-1)} style={{ padding: "5px 11px" }}>‹</button>
          <button className="btn sec sm" onClick={() => nav(1)} style={{ padding: "5px 11px" }}>›</button>
          <span className="gcal-title">{getTitle()}</span>
        </div>
        <div className="gcal-view-tabs">
          {(["month", "week", "day"] as View[]).map((v) => (
            <button key={v} className={`gcal-tab${view === v ? " on" : ""}`} onClick={() => switchView(v)}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
          <button className="btn sm" style={{ marginLeft: 8 }}
            onClick={() => openCreate(view === "month" ? (curDate.startsWith(curMonth) ? curDate : curMonth + "-01") : curDate)}>
            + New
          </button>
        </div>
      </div>

      {view === "month" && <MonthView />}
      {view === "week" && <WeekView />}
      {view === "day" && <DayView />}

      {view === "month" && (
        <div className="row gcal-legend">
          {[
            { color: "#ef4444", label: "Holiday" }, { color: "#16a34a", label: "Leave" },
            { color: "#94a3b8", label: "Leave (pending)" }, { color: "#f59e0b", label: "Task due" },
            { color: "#22c55e", label: "Present" }, { color: "#f97316", label: "Late" },
          ].map((l) => (
            <span key={l.label} style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--mute)" }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: l.color, flexShrink: 0, display: "inline-block" }} />
              {l.label}
            </span>
          ))}
        </div>
      )}

      {modal && (modal.type === "create" || modal.type === "edit") && (
        <EventModal key={modalKey} mode={modal.type}
          ev={modal.type === "edit" ? modal.ev : undefined}
          initDate={modal.type === "create" ? modal.date : modal.ev.date}
          initStartMin={modal.type === "create" ? modal.startMin : modal.ev.startMin}
          saving={saving} onSave={saveEvent} onClose={() => setModal(null)} />
      )}
      {modal && modal.type === "view" && (
        <EventPopup ev={modal.ev} onEdit={openEdit} onDelete={deleteEvent} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
