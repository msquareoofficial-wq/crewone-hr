// Powered By Vistech Force
// Resize an image client side to a small JPEG data URL so it can be stored in the DB.
export function fileToSmallDataUrl(file: File, max = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => reject(new Error("Image load fail"));
    img.src = url;
  });
}

// Resize a logo client side (keeps transparency) to a PNG data URL.
// Handles SVGs without intrinsic size and shrinks further if the PNG is too large to store.
export function fileToLogoDataUrl(file: File, maxW = 600, maxH = 200, maxLen = 450_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const w0 = img.naturalWidth || img.width || 300, h0 = img.naturalHeight || img.height || 100;
      let k = Math.min(1, maxW / w0, maxH / h0);
      // SVGs and tiny images can be scaled up to a sensible header size
      if (file.type === "image/svg+xml") k = Math.min(maxW / w0, maxH / h0);
      for (let i = 0; i < 8; i++) {
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(w0 * k));
        c.height = Math.max(1, Math.round(h0 * k));
        c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
        const out = c.toDataURL("image/png");
        if (out.length <= maxLen || i === 7) { URL.revokeObjectURL(url); return resolve(out); }
        k *= 0.75;
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read this image. Try a PNG or JPG file.")); };
    img.src = url;
  });
}
