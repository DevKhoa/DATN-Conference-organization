import { v4 as uuidv4 } from "uuid";
import type { EditorEl, EditorPage } from "../types";
import { CANVAS_W, CANVAS_H, THUMB_W, THUMB_H } from "../types";
import { solidColorImg } from "./canvas-helpers";
import { renderTableToCanvas } from "@/components/ui/table-editor";

// ─── Format abstract text — normalize line-breaks and ligatures ───────────────
export const formatAbstract = (text?: string): string => {
  if (!text) return "";
  return text
    .replace(/\uFB00/g, "ff")
    .replace(/\uFB01/g, "fi")
    .replace(/\uFB02/g, "fl")
    .replace(/\uFB03/g, "ffi")
    .replace(/\uFB04/g, "ffl")
    .replace(/\uFB05/g, "st")
    .replace(/\uFB06/g, "st")
    .replace(/[\u00ad\u200b\u200c\u200d\ufeff]/g, "")
    .replace(/-[ \t]*\r?\n[ \t]*/g, "")
    .replace(/\r?\n/g, " ")
    .replace(/-\s{2,}/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
};

// ─── Measure wrapped text height using canvas ctx.measureText() ───────────────
// This is accurate because it uses the same font engine as the canvas renderer.
// Kept as the primary measurement function — the old ratio-based one is the fallback.

/** Shared off-screen canvas for synchronous text measurement (never rendered) */
let _mCtx: CanvasRenderingContext2D | null = null;
const getMCtx = (): CanvasRenderingContext2D | null => {
  if (_mCtx) return _mCtx;
  try {
    const c = document.createElement("canvas");
    c.width = 1;
    c.height = 1;
    _mCtx = c.getContext("2d");
  } catch {
    _mCtx = null;
  }
  return _mCtx;
};

/**
 * Measure the pixel height of wrapped text using real browser font metrics.
 * Falls back to a character-ratio estimate if canvas is unavailable (SSR).
 */
export const measureWrappedTextHeight = (
  text: string,
  fontPx: number,
  maxWidth: number,
  lineHeightMultiplier = 1.6,
  bold = false,
  italic = false,
): number => {
  if (!text || maxWidth <= 0) return fontPx * lineHeightMultiplier;

  const ctx = getMCtx();
  if (ctx) {
    // ── Canvas-based exact measurement ───────────────────────────────────────
    const fontStr = `${italic ? "italic " : ""}${bold ? "bold " : ""}${fontPx}px Inter, Helvetica, Arial, sans-serif`;
    ctx.font = fontStr;
    let totalLines = 0;
    for (const para of text.split("\n")) {
      const trimmed = para.trimEnd();
      if (!trimmed) { totalLines++; continue; }
      const words = trimmed.split(/\s+/).filter(Boolean);
      let cur = "";
      let lines = 0;
      for (const word of words) {
        const test = cur ? cur + " " + word : word;
        if (cur && ctx.measureText(test).width > maxWidth) {
          lines++;
          cur = word;
        } else {
          cur = test;
        }
      }
      if (cur) lines++;
      totalLines += lines;
    }
    // Add 10% safety buffer so boxes are never too short
    return Math.ceil(totalLines * fontPx * lineHeightMultiplier * 1.10);
  }

  // ── Fallback: character-ratio estimate (used in SSR / test environments) ──
  const charWidthRatio = bold ? 0.56 : 0.52;
  const charsPerLine = Math.max(1, Math.floor(maxWidth / (fontPx * charWidthRatio)));
  let totalLines = 0;
  for (const para of text.split("\n")) {
    if (!para.trim()) { totalLines++; continue; }
    const words = para.split(" ");
    let lineLen = 0;
    let lines = 1;
    for (const word of words) {
      const wl = word.length;
      if (wl === 0) continue;
      const lws = wl + (lineLen > 0 ? 1 : 0);
      if (lineLen + lws > charsPerLine) { lines++; lineLen = wl; }
      else lineLen += lws;
    }
    totalLines += lines;
  }
  return Math.ceil(totalLines * fontPx * lineHeightMultiplier * 1.15);
};

// ─── Strip thumbnail data URLs from pages before caching/hashing ─────────────
export const stripPagesForCache = (pages: EditorPage[]) =>
  pages.map(({ bg, ...rest }) => ({
    ...rest,
    els: rest.els?.map((el) => ({ ...el })),
  }));

// ─── Hash payload for cache key ───────────────────────────────────────────────
export const hashPayload = async (payload: any): Promise<string> => {
  const data = new TextEncoder().encode(JSON.stringify(payload));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

// ─── Build editor pages directly from procData (overflow-aware) ───────────────
export const buildEditorPages = (data: any): EditorPage[] => {
  const scX = CANVAS_W / 595;
  const scY = CANVAS_H / 842;
  const ML = Math.round(55 * scX);
  const MT = Math.round(50 * scY);
  const CW = CANVAS_W - ML * 2;
  const MAX_Y = CANVAS_H - Math.round(56 * scY);

  const allPages: EditorPage[] = [];
  let els: EditorEl[] = [];
  let curY = MT;
  let imgZ = 10;
  let txtZ = 100;
  const nzImg = () => ++imgZ;
  const nzTxt = () => ++txtZ;

  const flushPage = (bgColor?: string) => {
    allPages.push({ id: uuidv4(), bg: "", bgColor, els: [...els] });
    els = [];
    curY = MT;
    imgZ = 10;
    txtZ = 100;
  };
  const fit = (h: number) => {
    if (curY + h > MAX_Y) flushPage();
  };

  const addTMultiPage = (
    text: string,
    x: number,
    w: number,
    opts: Partial<EditorEl> = {},
  ) => {
    const fontPx = opts.fontSize ?? Math.round(10 * scY);
    const lineHeightMultiplier = 1.6;
    const lineH = fontPx * lineHeightMultiplier;

    const allLines: string[] = [];
    try {
      const c2 = document.createElement("canvas");
      const ctx2 = c2.getContext("2d")!;
      ctx2.font = `${opts.bold ? "bold " : ""}${opts.italic ? "italic " : ""}${fontPx}px Helvetica, Arial, sans-serif`;
      for (const para of text.split("\n")) {
        const trimmed = para.trimEnd();
        if (!trimmed) { allLines.push(""); continue; }
        const words = trimmed.split(/\s+/).filter(Boolean);
        let cur = "";
        for (const word of words) {
          const test = cur ? cur + " " + word : word;
          if (cur && ctx2.measureText(test).width > w) {
            allLines.push(cur);
            cur = word;
          } else {
            cur = test;
          }
        }
        if (cur) allLines.push(cur);
      }
    } catch {
      const charsPerLine = Math.max(1, Math.floor(w / (fontPx * 0.50)));
      const words = text.split(/\s+/);
      let cur = "";
      for (const word of words) {
        if (cur && (cur + " " + word).length > charsPerLine) { allLines.push(cur); cur = word; }
        else cur = cur ? cur + " " + word : word;
      }
      if (cur) allLines.push(cur);
    }

    if (allLines.length === 0) return;

    let i = 0;
    while (i < allLines.length) {
      const available = MAX_Y - curY;
      const linesThisPage = Math.max(1, Math.floor(available / lineH));
      const chunk = allLines.slice(i, i + linesThisPage);
      const chunkH = Math.ceil(chunk.length * lineH) + Math.round(2 * scY);

      const el: EditorEl = {
        id: uuidv4(),
        type: "text",
        x,
        y: curY,
        w,
        h: chunkH,
        text: chunk.join(" "),
        fontSize: fontPx,
        bold: opts.bold ?? false,
        italic: opts.italic ?? false,
        color: opts.color ?? "#1a202c",
        align: opts.align ?? "left",
        fontFamily: opts.fontFamily ?? "Inter",
        zIndex: opts.zIndex !== undefined ? opts.zIndex : nzTxt(),
      };
      els.push(el);
      curY += chunkH;
      i += linesThisPage;
      if (i < allLines.length) flushPage();
    }
  };

  const addT = (
    text: string,
    x: number,
    w: number,
    h: number,
    opts: Partial<EditorEl> = {},
  ): EditorEl => {
    const el: EditorEl = {
      id: uuidv4(),
      type: "text",
      x,
      y: curY,
      w,
      h,
      text,
      fontSize: opts.fontSize ?? Math.round(10 * scY),
      bold: opts.bold ?? false,
      italic: opts.italic ?? false,
      color: opts.color ?? "#1a202c",
      align: opts.align ?? "left",
      fontFamily: opts.fontFamily ?? "Inter",
      zIndex: opts.zIndex !== undefined ? opts.zIndex : nzTxt(),
      isTocEntry: opts.isTocEntry ?? false,
      tocLabel: opts.tocLabel,
    };
    els.push(el);
    curY += h;
    return el;
  };

  const addRect = (color: string, x: number, w: number, h: number): number => {
    const savedY = curY;
    els.push({
      id: uuidv4(),
      type: "image",
      x,
      y: savedY,
      w,
      h,
      src: solidColorImg(color, w, h),
      zIndex: nzImg(),
    });
    curY += h;
    return savedY;
  };

  const addRectFlat = (color: string, x: number, y: number, w: number, h: number) => {
    els.push({
      id: uuidv4(),
      type: "image",
      x,
      y,
      w,
      h,
      src: solidColorImg(color, w, h),
      zIndex: nzImg(),
    });
  };

  const addImg = (src: string, x: number, w: number, h: number) => {
    els.push({
      id: uuidv4(),
      type: "image",
      x,
      y: curY,
      w,
      h,
      src,
      zIndex: nzImg(),
    });
    curY += h;
  };

  const addTAt = (
    text: string,
    x: number,
    y: number,
    w: number,
    h: number,
    opts: Partial<EditorEl> = {},
  ): EditorEl => {
    const el: EditorEl = {
      id: opts.id ?? uuidv4(),
      type: "text",
      x,
      y,
      w,
      h,
      text,
      fontFamily: opts.fontFamily || "Inter",
      fontSize: opts.fontSize ?? Math.round(9 * scY),
      bold: opts.bold ?? false,
      italic: opts.italic ?? false,
      color: opts.color ?? "#1a202c",
      align: opts.align ?? "left",
      zIndex: opts.zIndex !== undefined ? opts.zIndex : nzTxt(),
      isTocEntry: opts.isTocEntry,
      tocLabel: opts.tocLabel,
    };
    els.push(el);
    return el;
  };

  const addSecHeader = (title: string) => {
    const fsRaw = Math.max(10, Math.min(13, Math.floor(450 / (title.length * 0.55))));
    const h = Math.round(20 * scY);
    addT(title, ML, CW, h, {
      fontSize: Math.round(fsRaw * scY),
      bold: true,
      color: "#1a3a6b",
      isTocEntry: true,
      tocLabel: title,
    });
    curY += Math.round(4 * scY);
    addRectFlat("#1a3a6b", ML, curY, CW, Math.round(2 * scY));
    curY += Math.round(2 * scY) + Math.round(18 * scY);
  };

  // ── COVER ─────────────────────────────────────────────────────────────────
  {
    const coverEls: EditorEl[] = [];
    let y = Math.round(CANVAS_H * 0.26);
    const addC = (el: EditorEl) => coverEls.push(el);

    addC({
      id: uuidv4(),
      type: "text",
      x: ML,
      y,
      w: CW,
      h: Math.round(16 * scY),
      text: "P R O G R A M  B O O K",
      fontSize: Math.round(9 * scY),
      bold: false,
      italic: false,
      color: "#93c5fd",
      align: "center",
      zIndex: 11,
    });
    y += Math.round(20 * scY);
    addC({
      id: uuidv4(),
      type: "image",
      x: Math.round((CANVAS_W - 60 * scX) / 2),
      y,
      w: Math.round(60 * scX),
      h: Math.round(2 * scY),
      src: solidColorImg("#60a5fa", Math.round(60 * scX), 2),
      zIndex: 12,
    });
    y += Math.round(22 * scY);
    const title = data.cover?.title || "CONFERENCE PROCEEDINGS";
    const titleFs = Math.max(
      Math.round(12 * scY),
      Math.min(Math.round(25 * scY), Math.round((CW * 0.85) / (title.length * 0.55)))
    );
    const titleH = Math.round(38 * scY);
    addC({
      id: uuidv4(),
      type: "text",
      x: ML,
      y,
      w: CW,
      h: titleH,
      text: title,
      fontSize: titleFs,
      bold: true,
      italic: false,
      color: "#ffffff",
      align: "center",
      zIndex: 13,
    });
    y += titleH + Math.round(10 * scY);
    const nameFs = Math.round(11 * scY);
    if (data.cover?.conferenceName) {
      const nameH = measureWrappedTextHeight(data.cover.conferenceName, nameFs, CW, 1.4);
      addC({
        id: uuidv4(),
        type: "text",
        x: ML,
        y,
        w: CW,
        text: data.cover.conferenceName,
        h: nameH,
        fontSize: nameFs,
        bold: false,
        italic: false,
        color: "#bfdbfe",
        align: "center",
        zIndex: 14,
      });
      y += nameH + Math.round(4 * scY);
    }
    const dl = [data.cover?.date, data.cover?.location]
      .filter(Boolean)
      .join("  ·  ");
    if (dl) {
      const dlFs = Math.max(
        Math.round(7 * scY),
        Math.min(Math.round(10 * scY), Math.round((CW * 0.9) / (dl.length * 0.52)))
      );
      addC({
        id: uuidv4(),
        type: "text",
        x: ML,
        y,
        w: CW,
        h: Math.round(18 * scY),
        text: dl,
        fontSize: dlFs,
        bold: false,
        italic: false,
        color: "#93c5fd",
        align: "center",
        zIndex: 15,
      });
      y += Math.round(44 * scY);
    }
    const selectedLogos = (data.cover?.sponsorLogos || []).filter(
      (l: any) => l.selected,
    );
    if (selectedLogos.length > 0) {
      addC({
        id: uuidv4(),
        type: "text",
        x: ML,
        y,
        w: CW,
        h: Math.round(14 * scY),
        text: "S P O N S O R S  &  P A R T N E R S",
        fontSize: Math.round(8 * scY),
        bold: false,
        italic: false,
        color: "#93c5fd",
        align: "center",
        zIndex: 16,
      });
      y += Math.round(18 * scY);

      const lw = Math.round(75 * scX);
      const lh = Math.round(55 * scY);
      const gap = Math.round(15 * scX);
      const logosPerRow = Math.floor((CW + gap) / (lw + gap)) || 1;

      for (let i = 0; i < selectedLogos.length; i += logosPerRow) {
        const row = selectedLogos.slice(i, i + logosPerRow);
        const rowW = row.length * lw + (row.length - 1) * gap;
        let lx = ML + (CW - rowW) / 2;

        row.forEach((logo: any) => {
          addC({
            id: uuidv4(),
            type: "image",
            x: lx,
            y,
            w: lw,
            h: lh,
            src: logo.src,
            zIndex: 17,
          });
          lx += lw + gap;
        });
        y += lh + gap;
      }
    }
    allPages.push({
      id: uuidv4(),
      bg: solidColorImg("#1a3a6b", THUMB_W, THUMB_H),
      bgColor: "#1a3a6b",
      els: coverEls,
    });
  }

  // ── TOC placeholder (filled by regenerateToc) ─────────────────────────────
  allPages.push({ id: uuidv4(), bg: "", bgColor: "#ffffff", els: [] });

  // ── FOREWORD ──────────────────────────────────────────────────────────────
  addSecHeader("FOREWORD");
  const paras = (data.foreword || "")
    .split("\n")
    .filter((p: string) => p.trim());
  if (paras.length === 0) {
    addT("No foreword provided.", ML, CW, Math.round(18 * scY), {
      color: "#718096",
      italic: true,
    });
  } else {
    paras.forEach((p: string) => {
      const lines = Math.ceil(p.trim().length / 85) + 1;
      const h = Math.round(lines * 16 * scY);
      fit(h + Math.round(10 * scY));
      addT(p.trim(), ML, CW, h, { color: "#2d3748" });
      curY += Math.round(10 * scY);
    });
  }
  flushPage();

  // ── ORGANIZING COMMITTEE ──────────────────────────────────────────────────
  addSecHeader("ORGANIZING COMMITTEE");
  const byRole: Record<string, any[]> = {};
  (data.committee || []).forEach((m: any) => {
    if (!byRole[m.role]) byRole[m.role] = [];
    byRole[m.role].push(m);
  });
  if (Object.keys(byRole).length === 0) {
    addT("No committee members added.", ML, CW, Math.round(18 * scY), {
      color: "#718096",
      italic: true,
    });
  } else {
    Object.entries(byRole).forEach(([role, members]) => {
      fit(Math.round(60 * scY));
      addT(role, ML, CW, Math.round(16 * scY), {
        fontSize: Math.round(9 * scY),
        bold: true,
        color: "#1a3a6b",
      });
      curY += Math.round(4 * scY);
      (members as any[]).forEach((m: any) => {
        fit(Math.round(16 * scY));
        addT(
          m.name + (m.affiliation ? `, ${m.affiliation}` : ""),
          ML + Math.round(8 * scX),
          CW - Math.round(8 * scX),
          Math.round(16 * scY),
          { fontSize: Math.round(9 * scY), color: "#2d3748" },
        );
      });
      curY += Math.round(8 * scY);
    });
  }
  flushPage();

  // ── CONFERENCE INFORMATION ────────────────────────────────────────────────
  const infoTitle = data.cover?.conferenceName
    ? `${data.cover.conferenceName.toUpperCase()} INFORMATION`
    : "CONFERENCE INFORMATION";
  const infoTitleFs = Math.round(14 * scY);
  const infoTitleH = measureWrappedTextHeight(infoTitle, infoTitleFs, CW, 1.3);
  fit(infoTitleH + Math.round(20 * scY));
  addT(infoTitle, ML, CW, infoTitleH, {
    fontSize: infoTitleFs,
    bold: true,
    color: "#2a4365",
    align: "center",
    isTocEntry: true,
    tocLabel: "Conference Information",
  });
  curY += Math.round(16 * scY);

  const addInfoSection = (label: string, text?: string) => {
    if (!text?.trim()) return;
    const rH = Math.round(16 * scY);
    fit(Math.round(40 * scY));
    const bgY = curY;
    addRectFlat("#2a4365", ML, bgY, CW, rH);
    const labelFs = Math.max(
      Math.round(7 * scY),
      Math.min(Math.round(9 * scY), Math.round((CW * 0.9) / (label.length * 0.52)))
    );
    addTAt(
      label.toUpperCase(),
      ML + Math.round(4 * scX),
      bgY + Math.round(3 * scY),
      CW,
      rH,
      { fontSize: labelFs, bold: true, color: "#ffffff" },
    );
    curY = bgY + rH + Math.round(4 * scY);

    const lines = Math.ceil(text.length / 90) + 1;
    const h = Math.round(lines * 16 * scY);
    fit(h);
    addT(text, ML, CW, h, { fontSize: Math.round(9 * scY), color: "#2d3748" });
    curY += Math.round(12 * scY);
  };

  addInfoSection("CONFERENCE VENUE", data.generalInfo?.venueDetails);
  addInfoSection("REGISTRATION DESK OPENING TIME", data.generalInfo?.registrationHours);
  addInfoSection("FUNCTION ROOMS", data.generalInfo?.roomAssignments);
  addInfoSection("REFRESHMENTS & INTERNET ACCESS", data.generalInfo?.coffeeInternetInfo);
  addInfoSection("GALA DINNER", data.generalInfo?.galaDinner);

  if (data.generalInfo?.floorPlan) {
    fit(Math.round(240 * scY));
    const layoutTitle = data.cover?.conferenceName
      ? `${data.cover.conferenceName.toUpperCase()} LAYOUT`
      : "VENUE LAYOUT";
    const layoutFontSize = Math.max(10, Math.min(24, Math.floor(460 / (layoutTitle.length * 0.52))));
    curY += Math.round(16 * scY);
    addT(layoutTitle, ML, CW, Math.round(32 * scY), {
      fontSize: Math.round(layoutFontSize * scY),
      bold: true,
      color: "#2a4365",
      align: "center",
    });
    curY += Math.round(12 * scY);
    addImg(data.generalInfo.floorPlan, ML, CW, Math.round(200 * scY));
  }
  flushPage();

  // ── PROGRAM AT A GLANCE ───────────────────────────────────────────────────
  addSecHeader("PROGRAM AT A GLANCE");
  const byDate: Record<string, any[]> = {};
  (data.summarySchedule || []).forEach((s: any) => {
    const k = s.date || "Unscheduled";
    if (!byDate[k]) byDate[k] = [];
    byDate[k].push(s);
  });
  if (Object.keys(byDate).length === 0) {
    addT("No schedule data loaded.", ML, CW, Math.round(18 * scY), {
      color: "#718096",
      italic: true,
    });
  } else {
    Object.entries(byDate).forEach(([dateStr, items]) => {
      const parts = dateStr.split(" - ");
      const dayLabel = (parts[0] || "").toUpperCase();
      const dateLabel = parts.slice(1).join(" - ");

      const timeGroups: { time: string; sessions: any[] }[] = [];
      (items as any[]).forEach((s) => {
        const ex = timeGroups.find((g) => g.time === s.time);
        if (ex) ex.sessions.push(s);
        else timeGroups.push({ time: s.time || "", sessions: [s] });
      });

      const totalRows = 1 + timeGroups.reduce((acc, g) => acc + g.sessions.length, 0);
      const rowH = Math.round(22 * scY);
      const totalHs = (totalRows + 1) * rowH;
      fit(totalHs);

      const cells: any[][] = [];
      const hr: any[] = [];
      const dayFs = Math.max(Math.round(8 * scY), Math.min(Math.round(12 * scY), Math.round((CW * 0.25) / (dayLabel.length * 0.6))));
      const dateFs = Math.max(Math.round(8 * scY), Math.min(Math.round(12 * scY), Math.round((CW * 0.75) / (dateLabel.length * 0.55))));
      hr.push({
        id: uuidv4(), text: dayLabel, align: "left", colSpan: 1, rowSpan: 1, hidden: false,
        bgColor: "#2a4365", fontColor: "#ffffff", bold: true, fontSize: dayFs,
        borderBottom: true, borderRight: false, borderTop: true, borderLeft: true, fontFamily: "Inter",
      });
      hr.push({
        id: uuidv4(), text: dateLabel, align: "right", colSpan: 2, rowSpan: 1, hidden: false,
        bgColor: "#2a4365", fontColor: "#ffffff", bold: true, fontSize: dateFs,
        borderBottom: true, borderLeft: false, borderTop: true, borderRight: true, fontFamily: "Inter",
      });
      hr.push({ id: uuidv4(), text: "", align: "right", colSpan: 1, rowSpan: 1, hidden: true });
      cells.push(hr);

      timeGroups.forEach((group, gi) => {
        const sLen = group.sessions.length;
        group.sessions.forEach((s, si) => {
          const r: any[] = [];
          const isLastRow = gi === timeGroups.length - 1 && si === sLen - 1;

          if (si === 0) {
            r.push({
              id: uuidv4(), text: group.time, align: "left", colSpan: 1,
              rowSpan: sLen, hidden: false, fontColor: "#1a3a6b", bold: true,
              fontSize: Math.round(9 * scY), borderTop: false, borderRight: false,
              borderBottom: gi === timeGroups.length - 1, borderLeft: true, fontFamily: "Inter",
            });
          } else {
            r.push({ id: uuidv4(), text: "", align: "left", colSpan: 1, rowSpan: 1, hidden: true });
          }

          r.push({
            id: uuidv4(), text: s.topic || "", align: "left", colSpan: 1, rowSpan: 1,
            hidden: false, fontColor: "#4a5568", fontSize: Math.round(9 * scY),
            borderTop: false, borderRight: false, borderLeft: false, borderBottom: isLastRow, fontFamily: "Inter",
          });
          r.push({
            id: uuidv4(), text: s.location || "", align: "right", colSpan: 1, rowSpan: 1,
            hidden: false, fontColor: "#a0aec0", fontSize: Math.round(9 * scY),
            borderTop: false, borderLeft: false, borderRight: true, borderBottom: isLastRow, fontFamily: "Inter",
          });
          cells.push(r);
        });
      });

      const rHeights: number[] = Array(totalRows).fill(rowH);
      rHeights[0] = Math.round(30 * scY);

      const tableData = {
        rows: totalRows,
        cols: 3,
        cells: cells,
        colWidths: [CW * 0.25, CW * 0.55, CW * 0.2],
        rowHeights: rHeights,
        borderOn: true,
        borderThickness: 1,
        cellPadding: 6,
        headerHighlight: false,
        headerBgColor: "#2a4365",
        borderColor: "#e2e8f0",
      };

      const tH = rHeights.reduce((s, h) => s + h, 0);
      els.push({
        id: uuidv4(),
        type: "table",
        x: ML,
        y: curY,
        w: CW,
        h: tH,
        tableData: tableData as any,
        zIndex: nzTxt(),
      });

      curY += tH + Math.round(18 * scY);
    });
  }
  flushPage();

  // ── KEYNOTE SPEAKERS ──────────────────────────────────────────────────────
  if (data.keynotes?.length > 0) {
    (data.keynotes as any[]).forEach((k, idx) => {
      if (curY > MT) flushPage();

      const pad = Math.round(10 * scX);
      const photoW = Math.round(130 * scX);
      const photoH = Math.round(150 * scY);

      els.push({
        id: uuidv4(),
        type: "text",
        x: ML,
        y: curY,
        w: 1,
        h: 1,
        text: "",
        fontSize: 1,
        zIndex: 0,
        isTocEntry: idx === 0,
        tocLabel: "Keynote Speakers",
      });

      if (k.dayLabel) {
        const barH = Math.round(25 * scY);
        addRectFlat("#2a4365", ML, curY, CW, barH);
        els.push({
          id: uuidv4(),
          type: "text",
          x: ML + pad,
          y: curY + Math.round(6 * scY),
          w: CW - pad * 2,
          h: Math.round(12 * scY),
          text: k.dayLabel.toUpperCase(),
          fontSize: Math.round(10 * scY),
          bold: true,
          color: "#ffffff",
          align: "left",
          zIndex: nzTxt(),
        });
        curY += barH + Math.round(20 * scY);
      } else {
        curY += Math.round(20 * scY);
      }

      const blockStartY = curY;
      const vPad = Math.round(15 * scY);
      const lineGap = Math.round(4 * scY);
      let contentH = vPad * 2;
      if (k.timeSlot || k.location) contentH += Math.round(12 * scY) + lineGap;
      if (k.keynoteLabel) contentH += Math.round(14 * scY) + lineGap;
      const pTitle = k.presentationTitle || "Untitled Keynote";
      const pTitleFs = Math.max(9, Math.min(13, Math.floor(370 / (Math.max(1, pTitle.length) * 0.55))));
      const _infoWForMeasure = CW - Math.round(130 * scX) - Math.round(30 * scX);
      const titleH_measured = measureWrappedTextHeight(pTitle, Math.round(pTitleFs * scY), _infoWForMeasure, 1.3);
      contentH += titleH_measured + lineGap;
      contentH += Math.round(16 * scY) + lineGap;
      if (k.affiliation) contentH += Math.round(12 * scY);

      const lightBgH = Math.max(photoH, contentH);
      const textBgX = ML + photoW;
      const textBgW = CW - photoW;
      addRectFlat("#e8eff5", textBgX, blockStartY, textBgW, lightBgH);

      if (k.photo) {
        els.push({
          id: uuidv4(),
          type: "image",
          x: ML,
          y: blockStartY,
          w: photoW,
          h: photoH,
          src: k.photo,
          zIndex: nzImg(),
        });
      }

      const infoX = textBgX + Math.round(20 * scX);
      const infoW = textBgW - Math.round(30 * scX);
      const bgCenterOffsetY = Math.round((lightBgH - contentH) / 2);
      let infoY = blockStartY + bgCenterOffsetY + vPad;

      if (k.timeSlot || k.location) {
        const timeLoc = [k.timeSlot, k.location].filter(Boolean).join(" | ");
        els.push({
          id: uuidv4(),
          type: "text",
          x: infoX,
          y: infoY,
          w: infoW,
          h: Math.round(12 * scY),
          text: timeLoc,
          fontSize: Math.round(9 * scY),
          color: "#1a202c",
          align: "left",
          fontFamily: "Inter",
          zIndex: nzTxt(),
        });
        infoY += Math.round(12 * scY) + lineGap;
      }

      if (k.keynoteLabel) {
        els.push({
          id: uuidv4(),
          type: "text",
          x: infoX,
          y: infoY,
          w: infoW,
          h: Math.round(14 * scY),
          text: k.keynoteLabel.toUpperCase() + ":",
          fontSize: Math.round(11 * scY),
          bold: true,
          color: "#1a3a6b",
          align: "left",
          zIndex: nzTxt(),
        });
        infoY += Math.round(14 * scY) + lineGap;
      }

      const titleHk = titleH_measured;
      els.push({
        id: uuidv4(),
        type: "text",
        x: infoX,
        y: infoY,
        w: infoW,
        h: titleHk,
        text: pTitle,
        fontSize: Math.round(pTitleFs * scY),
        color: "#2d3748",
        align: "left",
        fontFamily: "Inter",
        zIndex: nzTxt(),
      });
      infoY += titleHk + lineGap;

      const sName = k.name || "Unknown Speaker";
      els.push({
        id: uuidv4(),
        type: "text",
        x: infoX,
        y: infoY,
        w: infoW,
        h: Math.round(16 * scY),
        text: sName.toUpperCase(),
        fontSize: Math.round(14 * scY),
        bold: true,
        color: "#1a3a6b",
        align: "left",
        zIndex: nzTxt(),
      });
      infoY += Math.round(16 * scY) + lineGap;

      if (k.affiliation) {
        els.push({
          id: uuidv4(),
          type: "text",
          x: infoX,
          y: infoY,
          w: infoW,
          h: Math.round(12 * scY),
          text: k.affiliation,
          fontSize: Math.round(8.5 * scY),
          color: "#4a5568",
          align: "left",
          fontFamily: "Inter",
          zIndex: nzTxt(),
        });
      }

      curY = blockStartY + lightBgH + Math.round(15 * scY);

      if (k.abstract) {
        fit(Math.round(40 * scY));
        addT("ABSTRACT", ML, CW, Math.round(16 * scY), {
          fontSize: Math.round(10 * scY),
          bold: true,
          color: "#1a3a6b",
        });
        curY += Math.round(6 * scY);

        const abText = formatAbstract(k.abstract);
        const abFontPx = Math.round(9.5 * scY);
        addTMultiPage(abText, ML, CW, {
          fontSize: abFontPx,
          color: "#2d3748",
          align: "justify",
          fontFamily: "Inter",
        });
        curY += Math.round(12 * scY);
      }

      if (k.bio) {
        fit(Math.round(40 * scY));
        addT("BIOGRAPHY", ML, CW, Math.round(16 * scY), {
          fontSize: Math.round(10 * scY),
          bold: true,
          color: "#1a3a6b",
        });
        curY += Math.round(6 * scY);

        const bioFontPx = Math.round(9.5 * scY);
        addTMultiPage(formatAbstract(k.bio), ML, CW, {
          fontSize: bioFontPx,
          color: "#2d3748",
          align: "justify",
          fontFamily: "Inter",
        });
        curY += Math.round(10 * scY);
      }

      flushPage();
    });
  }

  // ── DETAILED PROGRAM WITH ABSTRACTS ───────────────────────────────────────
  addSecHeader("DETAILED PROGRAM WITH ABSTRACTS");
  const schedule: any[] = data.detailedSchedule || [];
  if (schedule.length === 0) {
    addT(
      "No accepted papers found for this conference.",
      ML,
      CW,
      Math.round(18 * scY),
      { color: "#718096", italic: true },
    );
  } else {
    const sorted = [...schedule].sort((a, b) => {
      if (a.sessionDayOrder !== b.sessionDayOrder)
        return (a.sessionDayOrder || 0) - (b.sessionDayOrder || 0);
      return (a.timeSlot || "").localeCompare(b.timeSlot || "");
    });
    const days: { label: string; papers: any[] }[] = [];
    sorted.forEach((p) => {
      const label = p.sessionDayLabel || "Unscheduled";
      const ex = days.find((d) => d.label === label);
      if (ex) ex.papers.push(p);
      else days.push({ label, papers: [p] });
    });
    days.forEach((day) => {
      const dayH = Math.round(22 * scY);
      fit(dayH + Math.round(40 * scY));
      const dayBgY = addRect("#1a3a6b", ML, CW, dayH);
      const dayLabelFs = Math.max(
        Math.round(7 * scY),
        Math.min(Math.round(10 * scY), Math.round(((CW - 16 * scX) * 0.95) / (day.label.length * 0.55)))
      );
      addTAt(
        day.label,
        ML + Math.round(8 * scX),
        dayBgY + Math.round(5 * scY),
        CW - Math.round(16 * scX),
        dayH - Math.round(8 * scY),
        { fontSize: dayLabelFs, bold: true, color: "#ffffff" },
      );
      curY += Math.round(10 * scY);
      day.papers.forEach((p) => {
        const pML = ML + Math.round(12 * scX);
        const pCW = CW - Math.round(10 * scX);
        const timeW = p.timeSlot ? Math.round(44 * scX) : 0;
        const pCW_for_measure = pCW - timeW;

        const authH = p.authors 
          ? measureWrappedTextHeight(p.authors, 8.5 * scY, pCW_for_measure - 4, 1.6, false, true)
          : Math.round(14 * scY);
          
        const tH = p.paperTitle 
          ? measureWrappedTextHeight(p.paperTitle, 9.5 * scY, pCW_for_measure, 1.6, true)
          : Math.round(14 * scY);
          
        const abText = p.abstract
          ? "ABSTRACT. " + formatAbstract(p.abstract)
          : "";
        const abFontPx = 8.5 * scY;
        const abH = abText
          ? measureWrappedTextHeight(abText, abFontPx, pCW_for_measure, 1.6)
          : 0;

        const totalH = authH + Math.round(2 * scY) + tH + Math.round(6 * scY) + abH + Math.round(3 * scY) + Math.round(14 * scY);
        fit(totalH);

        const barStartY = curY;

        if (p.timeSlot)
          addTAt(p.timeSlot, pML, curY, Math.round(36 * scX), authH, {
            fontSize: Math.round(8.5 * scY),
            bold: true,
            color: "#1a3a6b",
          });
        addTAt(p.authors || "", pML + timeW + 4, curY, pCW - timeW - 4, authH, {
          fontSize: Math.round(8.5 * scY),
          italic: true,
          color: "#4a5568",
        });
        curY += authH + Math.round(4 * scY);

        addTAt(p.paperTitle || "", pML + timeW, curY, pCW - timeW, tH, {
          fontSize: Math.round(9.5 * scY),
          bold: true,
          color: "#1a202c",
        });
        curY += tH + Math.round(6 * scY);

        const abElId = uuidv4();
        if (abText) {
          addTAt(abText, pML + timeW, curY, pCW - timeW, abH, {
            id: abElId,
            fontSize: Math.round(8.5 * scY),
            color: "#2d3748",
            align: "justify",
          });
          curY += abH;
        }

        els.push({
          id: uuidv4(),
          type: "bar",
          x: ML,
          y: barStartY,
          w: Math.round(2.5 * scX),
          h: curY - barStartY,
          barColor: "#93c5fd",
          linkedAbstractId: abText ? abElId : undefined,
          zIndex: nzImg(),
        });

        curY += Math.round(16 * scY);
      });
    });
  }
  flushPage();
  return allPages;
};

// ─── Regenerate TOC page (always index 1) — SOICT 2025 style ─────────────────
export const regenerateToc = (pages: EditorPage[]): EditorPage[] => {
  if (pages.length < 2) return pages;
  const scX = CANVAS_W / 595,
    scY = CANVAS_H / 842;
  const ML = Math.round(55 * scX),
    MT = Math.round(50 * scY);
  const CW = CANVAS_W - ML * 2;
  const entries: { label: string; pageNum: number }[] = [];
  pages.forEach((pg, idx) => {
    if (idx <= 1) return;
    pg.els.forEach((el) => {
      if (el.isTocEntry && el.text)
        entries.push({ label: el.tocLabel || el.text, pageNum: idx - 1 });
    });
  });
  const tocEls: EditorEl[] = [];
  let txtZ = 100;
  const nzTxt = () => ++txtZ;

  const confNameEl = pages[0]?.els.find(
    (e) => e.type === "text" && e.color === "#bfdbfe",
  );
  const confName = confNameEl?.text || "CONFERENCE";

  const vertFontSize = Math.round(18 * scY);
  const vertW = Math.round(CANVAS_H * 0.85);
  const vertH = Math.round(24 * scY);
  const cx = Math.round(28 * scX);
  const cy = Math.round(CANVAS_H / 2);
  const vertX = cx - Math.round(vertW / 2);
  const vertY = cy - Math.round(vertH / 2);
  tocEls.push({
    id: uuidv4(),
    type: "text",
    x: vertX,
    y: vertY,
    w: vertW,
    h: vertH,
    text: confName,
    fontSize: vertFontSize,
    bold: true,
    italic: false,
    color: "#3b6cb5",
    align: "center",
    fontFamily: "Inter",
    zIndex: nzTxt(),
    rotation: -90,
  });

  const titleH = Math.round(32 * scY);
  tocEls.push({
    id: uuidv4(),
    type: "text",
    x: ML,
    y: MT,
    w: CW,
    h: titleH,
    text: "TABLE OF CONTENT",
    fontSize: Math.round(20 * scY),
    bold: true,
    italic: false,
    color: "#2b5797",
    align: "center",
    fontFamily: "Inter",
    zIndex: nzTxt(),
  });

  let y = MT + titleH + Math.round(30 * scY);
  const entryML = ML + Math.round(120 * scX);
  const numW = Math.round(48 * scX);
  entries.forEach((entry) => {
    const rowH = Math.round(35 * scY);
    tocEls.push({
      id: uuidv4(),
      type: "text",
      x: entryML,
      y,
      w: numW,
      h: rowH,
      text: String(entry.pageNum),
      fontSize: Math.round(18 * scY),
      bold: true,
      italic: false,
      color: "#3b6cb5",
      align: "left",
      fontFamily: "Inter",
      zIndex: nzTxt(),
    });
    const labelFs = Math.max(
      Math.round(8 * scY),
      Math.min(Math.round(10 * scY), Math.round(((CW - numW - 75 * scX) * 0.95) / (entry.label.length * 0.55)))
    );
    tocEls.push({
      id: uuidv4(),
      type: "text",
      x: entryML + numW + Math.round(10 * scX),
      y: y + Math.round(6 * scY),
      w: CW - numW - Math.round(75 * scX),
      h: rowH - Math.round(6 * scY),
      text: entry.label,
      fontSize: labelFs,
      bold: false,
      italic: false,
      color: "#3b6cb5",
      align: "left",
      fontFamily: "Inter",
      zIndex: nzTxt(),
    });
    y += rowH;
  });
  return pages.map((pg, idx) => (idx === 1 ? { ...pg, els: tocEls } : pg));
};

// ─── Render page elements to a thumbnail JPEG ─────────────────────────────────
export const renderThumbnail = async (page: EditorPage): Promise<string> => {
  const scale = THUMB_W / CANVAS_W;
  const c = document.createElement("canvas");
  c.width = THUMB_W;
  c.height = THUMB_H;
  const ctx = c.getContext("2d")!;
  const bgStr = page.bgColor || "#ffffff";

  if (bgStr.includes("gradient")) {
    try {
      const stopColors: string[] = [];
      const hexPattern = /#[0-9a-fA-F]{3,8}\b/g;
      const rgbPattern = /rgba?\([^)]+\)/g;
      let m: RegExpExecArray | null;
      while ((m = hexPattern.exec(bgStr)) !== null) stopColors.push(m[0]);
      while ((m = rgbPattern.exec(bgStr)) !== null) stopColors.push(m[0]);

      if (stopColors.length >= 2) {
        const isRadial = bgStr.includes("radial-gradient");
        let grad: CanvasGradient;
        if (isRadial) {
          const cx2 = THUMB_W / 2, cy2 = THUMB_H / 2;
          grad = ctx.createRadialGradient(cx2, cy2 * 0.3, 0, cx2, cy2, Math.max(THUMB_W, THUMB_H));
        } else {
          const angleMatch = bgStr.match(/linear-gradient\(\s*(-?\d+)deg/);
          const deg = angleMatch ? parseInt(angleMatch[1]) : 135;
          const rad = (deg - 90) * Math.PI / 180;
          const cx2 = THUMB_W / 2, cy2 = THUMB_H / 2;
          const r = Math.sqrt(THUMB_W * THUMB_W + THUMB_H * THUMB_H) / 2;
          grad = ctx.createLinearGradient(
            cx2 - Math.cos(rad) * r, cy2 - Math.sin(rad) * r,
            cx2 + Math.cos(rad) * r, cy2 + Math.sin(rad) * r
          );
        }
        stopColors.forEach((color, i) => {
          grad.addColorStop(i / (stopColors.length - 1), color);
        });
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = stopColors[0] || "#667eea";
      }
      ctx.fillRect(0, 0, THUMB_W, THUMB_H);
    } catch {
      ctx.fillStyle = "#667eea";
      ctx.fillRect(0, 0, THUMB_W, THUMB_H);
    }
  } else {
    ctx.fillStyle = bgStr;
    ctx.fillRect(0, 0, THUMB_W, THUMB_H);
  }

  const sorted = [...page.els].sort(
    (a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0),
  );
  for (const el of sorted) {
    const x = el.x * scale,
      y = el.y * scale;
    const w = Math.max(1, el.w * scale),
      h = Math.max(1, el.h * scale);
    const hasRotation = el.rotation && el.rotation !== 0;
    if (hasRotation) {
      const cx2 = x + w / 2,
        cy2 = y + h / 2;
      ctx.save();
      ctx.translate(cx2, cy2);
      ctx.rotate((el.rotation! * Math.PI) / 180);
      ctx.translate(-cx2, -cy2);
    }
    if (el.type === "table" && el.tableData) {
      renderTableToCanvas(ctx, el.tableData, x, y, w, h, scale);
    } else if (el.type === "bar") {
      ctx.fillStyle = el.barColor ?? "#93c5fd";
      ctx.fillRect(x, y, w, h);
    } else if (el.type === "image" && el.src) {
      await new Promise<void>((resolve) => {
        const img = new window.Image();
        img.onload = () => {
          ctx.drawImage(img, x, y, w, h);
          resolve();
        };
        img.onerror = () => resolve();
        img.src = el.src!;
      });
    } else if (el.type === "text" && el.text) {
      ctx.fillStyle = el.color || "#1a202c";
      const fs = Math.max(1.5, (el.fontSize || 10) * scale);
      ctx.font = `${el.italic ? "italic " : ""}${el.bold ? "bold " : ""}${fs}px Helvetica, Arial, sans-serif`;
      ctx.textBaseline = "top";
      const lineH = fs * 1.6;
      const rawLines = el.text.split("\n");
      const wrappedLines: string[] = [];
      for (const rawLine of rawLines) {
        if (!rawLine.trim()) {
          wrappedLines.push("");
          continue;
        }
        const words = rawLine.split(" ");
        let current = "";
        for (const word of words) {
          const test = current ? current + " " + word : word;
          if (ctx.measureText(test).width > w && current) {
            wrappedLines.push(current);
            current = word;
          } else {
            current = test;
          }
        }
        if (current) wrappedLines.push(current);
      }
      wrappedLines.forEach((line, li) => {
        const ly = y + li * lineH;
        if (ly + lineH > y + h + lineH) return;
        if (!line.trim()) return;
        if (el.align === "center") {
          const tw = ctx.measureText(line).width;
          ctx.fillText(line, x + (w - tw) / 2, ly);
        } else if (el.align === "right") {
          const tw = ctx.measureText(line).width;
          ctx.fillText(line, x + w - tw, ly);
        } else {
          ctx.fillText(line, x, ly);
        }
      });
    }
    if (hasRotation) ctx.restore();
  }
  return c.toDataURL("image/jpeg", 0.82);
};
