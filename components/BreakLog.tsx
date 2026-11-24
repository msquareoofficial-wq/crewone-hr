// Powered By Vistech Force
"use client";
import { useState } from "react";
import CatIcon from "./CatIcon";
import { fmtDur } from "@/lib/time";
import { fmtDate } from "@/lib/fmtdate";
import { BREAK_CATS, catKey, catLabel } from "@/lib/breakcats";
import type { BreakLogRow } from "@/lib/breaklog";
import EmptyState from "./EmptyState";
import "./breaklog.css";
import "./tasklog.css";

const hm = (d: string | Date, tz: string) => new Date(d).toLocaleTimeString("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" });

export default function BreakLog({ rows, tz, csvHref, title }: { rows: BreakLogRow[]; tz: string; csvHref: string; title?: string }) {
  const [f, setF] = useState<string>("all");
  const stats = BREAK_CATS.map((c) => {
    const r = rows.filter((x) => catKey(x.category) === c.key);
    return { ...c, n: r.length, secs: r.reduce((a, x) => a + x.secs, 0) };
  });
  const shown = f === "all" ? rows : rows.filter((x) => catKey(x.category) === f);
  const tot = shown.reduce((a, x) => a + x.secs, 0);
  return (
    <div className="card">
      <div className="tl-head">
        <h2>{title || "Break log"}</h2>
        <div className="spacer" />
        <a className="btn sec sm" href={csvHref}>Download CSV</a>
      </div>
      <div className="bl-cats">
        <button className={"bl-cat" + (f === "all" ? " on" : "")} onClick={() => setF("all")}>
          <div><b>All breaks</b><span className="s">{rows.length} breaks, {fmtDur(rows.reduce((a, x) => a + x.secs, 0))}</span></div>
        </button>
        {stats.map((c) => (
          <button key={c.key} className={"bl-cat bk-" + c.key + (f === c.key ? " on" : "")} onClick={() => setF(f === c.key ? "all" : c.key)}>
            <span className="bk-ic"><CatIcon cat={c.key} size={20} /></span>
            <div><b>{c.short}</b><span className="s">{c.n} break{c.n === 1 ? "" : "s"}, {fmtDur(c.secs)}</span></div>
          </button>
        ))}
      </div>
      {shown.length ? (
        <div>
          <p className="mute" style={{ margin: "0 0 6px" }}>{f === "all" ? "All categories" : catLabel(f)}: {shown.length} break{shown.length === 1 ? "" : "s"}, total {fmtDur(tot)}</p>
          {shown.map((b, i) => (
            <div className="bl-row" key={i}>
              <span className="mute">{fmtDate(b.work_date)}</span>
              <span className={"bl-c bk-" + catKey(b.category)}><span style={{ display: "inline-flex" }}><CatIcon cat={b.category} size={18} /></span>{catLabel(b.category)}</span>
              <span className="bl-r">{hm(b.start_at, tz)} - {b.end_at ? hm(b.end_at, tz) : "running"}</span>
              <span className="bl-d">{fmtDur(b.secs)}</span>
            </div>
          ))}
        </div>
      ) : <EmptyState icon="breaks" title="No breaks recorded" sub="Breaks taken this period will appear here." compact />}
    </div>
  );
}
