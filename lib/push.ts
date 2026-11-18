// Powered By Vistech Force
import webpush from "web-push";
import { q } from "./db";

let ready = false;
function init() {
  if (ready) return true;
  const pub = process.env.VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", pub, priv);
  ready = true;
  return true;
}

// Never throws. Sends a phone/desktop alert to the given users.
export async function pushTo(userIds: number[], title: string, body: string, url = "/") {
  try {
    if (!userIds.length || !init()) return;
    const subs = await q<any>("SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ANY($1)", [userIds]);
    const payload = JSON.stringify({ title: title.slice(0, 80), body: body.slice(0, 160), url });
    await Promise.all(subs.map(async (s) => {
      try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 3600 }); }
      catch (e: any) { if (e?.statusCode === 404 || e?.statusCode === 410) await q("DELETE FROM push_subscriptions WHERE id=$1", [s.id]); }
    }));
  } catch {}
}

export async function pushAudience(audience: string, exceptId: number, title: string, body: string, url: string) {
  try {
    const rows = await q<{ id: number }>("SELECT id FROM users WHERE active=TRUE AND id<>$1 AND ($2='all' OR department=$2)", [exceptId, audience]);
    await pushTo(rows.map((r) => r.id), title, body, url);
  } catch {}
}
