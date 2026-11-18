"use client";
// Powered By Vistech Force
// Simple pan + zoom image cropper. Drag the picture to move it, use the slider to zoom.
import { useEffect, useRef, useState } from "react";

type Props = {
  file: File;
  aspect?: number;          // width / height of the crop box (1 = square)
  outW: number;             // output width in px
  format?: "jpeg" | "png";  // jpeg for photos, png keeps transparency for logos
  round?: boolean;          // show a round guide (profile pictures)
  maxLen?: number;          // shrink output until the data URL is below this size
  bg?: string;              // preview background (helps with transparent logos)
  onDone: (dataUrl: string) => void;
  onCancel: () => void;
};

export default function ImageCropper({ file, aspect = 1, outW, format = "jpeg", round, maxLen, bg = "#e5e7eb", onDone, onCancel }: Props) {
  const BOX_W = 300;
  const BOX_H = Math.round(BOX_W / aspect);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [err, setErr] = useState("");
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 }); // image centre offset from box centre
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const i = new Image();
    i.onload = () => setImg(i);
    i.onerror = () => setErr("Could not read this image. Try a PNG or JPG file.");
    i.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const nw = img ? img.naturalWidth || 300 : 1;
  const nh = img ? img.naturalHeight || 100 : 1;
  // zoom 1 = image just covers the box (round) or fits inside it (logos, so nothing is cut by default)
  const base = round || format === "jpeg" ? Math.max(BOX_W / nw, BOX_H / nh) : Math.min(BOX_W / nw, BOX_H / nh);
  const scale = base * zoom;

  function clamp(p: { x: number; y: number }) {
    const w = nw * scale, h = nh * scale;
    const mx = Math.max(0, (w - BOX_W) / 2), my = Math.max(0, (h - BOX_H) / 2);
    // when the image is smaller than the box on an axis, let it sit anywhere inside the box
    const lx = w >= BOX_W ? mx : (BOX_W - w) / 2, ly = h >= BOX_H ? my : (BOX_H - h) / 2;
    return { x: Math.max(-lx, Math.min(lx, p.x)), y: Math.max(-ly, Math.min(ly, p.y)) };
  }

  function down(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
  }
  function move(e: React.PointerEvent) {
    const d = drag.current; if (!d) return;
    setPos(clamp({ x: d.px + (e.clientX - d.x), y: d.py + (e.clientY - d.y) }));
  }
  function up() { drag.current = null; }

  function apply() {
    if (!img) return;
    const k = outW / BOX_W;
    let w = outW;
    for (let i = 0; i < 8; i++) {
      const kk = w / BOX_W;
      const c = document.createElement("canvas");
      c.width = Math.round(BOX_W * kk); c.height = Math.round(BOX_H * kk);
      const g = c.getContext("2d")!;
      if (format === "jpeg") { g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); }
      const dw = nw * scale * kk, dh = nh * scale * kk;
      g.drawImage(img, c.width / 2 + pos.x * kk - dw / 2, c.height / 2 + pos.y * kk - dh / 2, dw, dh);
      const out = format === "jpeg" ? c.toDataURL("image/jpeg", 0.85) : c.toDataURL("image/png");
      if (!maxLen || out.length <= maxLen || i === 7) return onDone(out);
      w = Math.round(w * 0.75);
    }
    void k;
  }

  const w = nw * scale, h = nh * scale;
  return (
    <div className="modal-bg" onClick={onCancel}>
      <div className="modal" style={{ width: "min(380px,94vw)" }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Adjust picture</h3>
        {err ? <div className="err">{err}</div> : !img ? <div className="mute">Loading...</div> : (
          <>
            <div
              onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
              style={{ width: BOX_W, height: BOX_H, maxWidth: "100%", margin: "0 auto", position: "relative", overflow: "hidden", background: bg, borderRadius: round ? "50%" : 8, touchAction: "none", cursor: "grab", border: "2px solid #6366f1" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.src} alt="" draggable={false} style={{ position: "absolute", left: BOX_W / 2 + pos.x - w / 2, top: BOX_H / 2 + pos.y - h / 2, width: w, height: h, maxWidth: "none", userSelect: "none", pointerEvents: "none" }} />
            </div>
            <div style={{ margin: "12px 0 4px" }}>
              <label>Zoom</label>
              <input type="range" min={1} max={4} step={0.01} value={zoom} style={{ width: "100%" }}
                onChange={(e) => { const z = Number(e.target.value); setZoom(z); setPos((p) => p); }} />
              <div className="mute">Drag the picture to move it.</div>
            </div>
          </>
        )}
        <div className="row" style={{ marginTop: 10, justifyContent: "flex-end" }}>
          <button type="button" className="btn sec" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn" disabled={!img} onClick={apply}>Use this</button>
        </div>
      </div>
    </div>
  );
}
