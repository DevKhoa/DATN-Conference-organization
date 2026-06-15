import type { CSSProperties } from "react";

export const DIRS = ["n", "s", "e", "w", "ne", "nw", "se", "sw"] as const;
export type ResizeDirection = (typeof DIRS)[number];

const BASE_API_URL = ((import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:8080").replace(/\/$/, "");

export const DIR_CURSOR: Record<ResizeDirection, string> = {
  n: "ns-resize",
  s: "ns-resize",
  e: "ew-resize",
  w: "ew-resize",
  ne: "ne-resize",
  nw: "nw-resize",
  se: "se-resize",
  sw: "sw-resize",
};

export const getHandlePosition = (dir: string): CSSProperties => ({
  position: "absolute",
  width: 9,
  height: 9,
  background: "#4f46e5",
  border: "1.5px solid white",
  borderRadius: 2,
  cursor: DIR_CURSOR[dir as ResizeDirection] || "default",
  top: dir.includes("n")
    ? -5
    : dir.includes("s")
      ? "calc(100% - 4px)"
      : "calc(50% - 4px)",
  left: dir.includes("w")
    ? -5
    : dir.includes("e")
      ? "calc(100% - 4px)"
      : "calc(50% - 4px)",
  zIndex: 20,
});

/** Module-level cache for solid color images to avoid redundant canvas creation */
const _solidColorCache = new Map<string, string>();

/** Create a solid color image as data URL */
export const solidColorImg = (color: string, w: number, h: number): string => {
  const key = `${color}_${Math.round(w)}_${Math.round(h)}`;
  if (_solidColorCache.has(key)) return _solidColorCache.get(key)!;
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, c.width, c.height);
  const dataUrl = c.toDataURL("image/png");
  _solidColorCache.set(key, dataUrl);
  return dataUrl;
};

/** Convert an external image URL to base64 data URL (via server proxy to bypass CORS) */
export const urlToBase64 = async (url: string): Promise<string> => {
  if (url.startsWith("data:")) return url;

 try {
    const resp = await fetch(
      `${BASE_API_URL}/proxy-image?url=${encodeURIComponent(url)}`
    );
    if (resp.ok) {
      const json = await resp.json();
      if (json.data_url) return json.data_url;
    }
  } catch {
    /* server not available, try fallback */
  }

  // Fallback: try client-side canvas (only works if image server allows CORS)
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        resolve(c.toDataURL("image/png"));
      } catch {
        resolve(url);
      }
    };
    img.onerror = () => resolve(url);
    img.src = url;
  });
};

/** Crop state for image editor */
export interface CropState {
  elId: string;
  src: string;
  natW: number;
  natH: number;
  cx: number;
  cy: number;
  cw: number;
  ch: number;
}

/** Crop drag reference for tracking drag operations */
export interface CropDragRef {
  active: boolean;
  mode: string;
  sx: number;
  sy: number;
  origCx: number;
  origCy: number;
  origCw: number;
  origCh: number;
}

export const createInitialCropDragRef = (): CropDragRef => ({
  active: false,
  mode: "",
  sx: 0,
  sy: 0,
  origCx: 0,
  origCy: 0,
  origCw: 0,
  origCh: 0,
});
