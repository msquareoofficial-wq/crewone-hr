// Powered By Vistech Force
import type { Notif } from "@/lib/hr";
import { fmtDateTime } from "@/lib/time";
import { CommentForm, DeleteBtn, EditNotif } from "./FeedClient";
import EmptyState from "./EmptyState";

const audBadge = (a: string) => <span className={`badge ${a === "all" ? "b-info" : a === "Sales" ? "b-warn" : "b-ok"}`}>{a === "all" ? "All" : a}</span>;

export default function Feed({ items, tz, admin, meId }: { items: Notif[]; tz: string; admin?: boolean; meId?: number }) {
  if (!items.length) return <EmptyState icon="notifications" title="No notifications yet" sub={admin ? "Post a notice or holiday to let your team know." : "No announcements from your admin yet."} />;
  return (
    <div className="grid">
      {items.map((n) => (
        <div key={n.id} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 14 }}>
          <div className="row">
            <b>{n.kind === "holiday" ? "🏖 " : ""}{n.title}</b>
            {audBadge(n.audience)}
            {n.kind === "holiday" && <span className="badge b-bad">Holiday</span>}
            <div className="spacer" />
            <span className="mute">{n.author_name} | {fmtDateTime(n.created_at, tz)}</span>
          </div>
          <p style={{ whiteSpace: "pre-wrap", margin: "8px 0" }}>{n.body}</p>
          {admin && (
            <div className="row" style={{ marginBottom: 8 }}>
              <EditNotif id={n.id} title={n.title} body={n.body} />
              <DeleteBtn url={`/api/notifications/${n.id}`} confirmText={n.kind === "holiday" ? "This holiday and its dates will also be removed from the calendar. Delete?" : "Delete this notification?"} />
            </div>
          )}
          {n.comments.length > 0 && (
            <div style={{ background: "#fafbfd", borderRadius: 8, padding: "6px 10px" }}>
              {n.comments.map((c) => (
                <div key={c.id} className="row" style={{ padding: "4px 0" }}>
                  <b>{c.name}{c.role === "admin" ? " (Admin)" : ""}:</b><span>{c.body}</span>
                  <div className="spacer" />
                  <span className="mute">{fmtDateTime(c.created_at, tz)}</span>
                  {(admin || c.user_id === meId) && <DeleteBtn url={`/api/notifications/${n.id}/comments?commentId=${c.id}`} label="x" confirmText="Delete this comment?" />}
                </div>
              ))}
            </div>
          )}
          <CommentForm id={n.id} />
        </div>
      ))}
    </div>
  );
}
