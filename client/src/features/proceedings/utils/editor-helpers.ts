import type { EditorEl, EditorPage } from "../types";
import { CANVAS_W, CANVAS_H, THUMB_W, THUMB_H } from "../types";
import { solidColorImg } from "./canvas-helpers";
import { renderTableToCanvas } from "@/components/ui/table-editor";

/**
 * Build editor pages directly from procData (overflow-aware)
 * Creates a visual representation of proceedings data for the PDF editor
 */
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
  // Separate zIndex by type: image 10-99, text 100-199
  let imgZ = 10;
  let txtZ = 100;
  const nzImg = () => ++imgZ;
  const nzTxt = () => ++txtZ;

  const flushPage = (bgColor?: string) => {
    allPages.push({ id: crypto.randomUUID(), bg: "", bgColor, els: [...els] });
    els = [];
    curY = MT;
    imgZ = 10;
    txtZ = 100;
  };
  const fit = (h: number) => {
    if (curY + h > MAX_Y) flushPage();
  };

  const addT = (
    text: string,
    x: number,
    w: number,
    h: number,
    opts: Partial<EditorEl> = {},
  ): EditorEl => {
    const el: EditorEl = {
      id: crypto.randomUUID(),
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
      id: crypto.randomUUID(),
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
  const addRectFlat = (
    color: string,
    x: number,
    y: number,
    w: number,
    h: number,
  ) => {
    els.push({
      id: crypto.randomUUID(),
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
      id: crypto.randomUUID(),
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
      id: crypto.randomUUID(),
      type: "text",
      x,
      y,
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
      isTocEntry: opts.isTocEntry,
      tocLabel: opts.tocLabel,
    };
    els.push(el);
    return el;
  };

  // ────────────────────────────────────────────────────────────────────────────
  // COVER PAGE (index 0)
  // ────────────────────────────────────────────────────────────────────────────
  {
    const coverEls: EditorEl[] = [];
    let y = Math.round(CANVAS_H * 0.26);
    const addC = (el: EditorEl) => coverEls.push(el);

    // Tag: PROGRAM BOOK
    addC({
      id: crypto.randomUUID(),
      type: "text",
      x: ML,
      y,
      w: CW,
      h: Math.round(16 * scY),
      text: "PROGRAM BOOK",
      fontSize: Math.round(11 * scY),
      bold: false,
      italic: false,
      color: "#93c5fd",
      align: "center",
      fontFamily: "Inter",
      zIndex: 100,
    });
    y += Math.round(28 * scY);
    // Divider
    addC({
      id: crypto.randomUUID(),
      type: "image",
      x: Math.round((CANVAS_W - 60 * scX) / 2),
      y,
      w: Math.round(60 * scX),
      h: Math.round(2 * scY),
      src: solidColorImg("#60a5fa", Math.round(60 * scX), Math.round(2 * scY)),
      zIndex: 10,
    });
    y += Math.round(36 * scY);
    // Title
    addC({
      id: crypto.randomUUID(),
      type: "text",
      x: ML,
      y,
      w: CW,
      h: Math.round(56 * scY),
      text: data.cover?.title || "CONFERENCE PROCEEDINGS",
      fontSize: Math.round(28 * scY),
      bold: true,
      italic: false,
      color: "#ffffff",
      align: "center",
      fontFamily: "Inter",
      zIndex: 101,
    });
    y += Math.round(56 * scY);
    // Conference name
    addC({
      id: crypto.randomUUID(),
      type: "text",
      x: ML,
      y,
      w: CW,
      h: Math.round(22 * scY),
      text: data.cover?.conferenceName || "",
      fontSize: Math.round(13 * scY),
      bold: false,
      italic: false,
      color: "#bfdbfe",
      align: "center",
      fontFamily: "Inter",
      zIndex: 102,
    });
    y += Math.round(26 * scY);
    // Date + location
    addC({
      id: crypto.randomUUID(),
      type: "text",
      x: ML,
      y,
      w: CW,
      h: Math.round(18 * scY),
      text: `${data.cover?.date || ""} · ${data.cover?.location || ""}`,
      fontSize: Math.round(11 * scY),
      bold: false,
      italic: false,
      color: "#93c5fd",
      align: "center",
      fontFamily: "Inter",
      zIndex: 103,
    });
    allPages.push({
      id: crypto.randomUUID(),
      bg: "",
      bgColor: "#1a3a6b",
      els: coverEls,
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // TOC PAGE (index 1) — placeholder, regenerateToc() will overwrite
  // ────────────────────────────────────────────────────────────────────────────
  allPages.push({
    id: crypto.randomUUID(),
    bg: "",
    bgColor: "#ffffff",
    els: [],
  });

  // ────────────────────────────────────────────────────────────────────────────
  // FOREWORD
  // ────────────────────────────────────────────────────────────────────────────
  {
    fit(Math.round(40 * scY));
    addT("Foreword", ML, CW, Math.round(24 * scY), {
      fontSize: Math.round(15 * scY),
      bold: true,
      color: "#1a3a6b",
      isTocEntry: true,
      tocLabel: "Foreword",
    });
    addRect("#1a3a6b", ML, CW, Math.round(2 * scY));
    curY += Math.round(10 * scY);
    (data.foreword || "")
      .split("\n")
      .filter((p: string) => p.trim())
      .forEach((p: string) => {
        fit(Math.round(18 * scY));
        addT(p.trim(), ML, CW, Math.round(18 * scY), {
          fontSize: Math.round(10 * scY),
          color: "#2d3748",
          align: "justify",
        });
        curY += Math.round(6 * scY);
      });
    flushPage();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // COMMITTEE
  // ────────────────────────────────────────────────────────────────────────────
  {
    fit(Math.round(40 * scY));
    addT("Organizing Committee", ML, CW, Math.round(24 * scY), {
      fontSize: Math.round(15 * scY),
      bold: true,
      color: "#1a3a6b",
      isTocEntry: true,
      tocLabel: "Organizing Committee",
    });
    addRect("#1a3a6b", ML, CW, Math.round(2 * scY));
    curY += Math.round(10 * scY);
    const byRole: Record<string, any[]> = {};
    (data.committee || []).forEach((m: any) => {
      if (!byRole[m.role]) byRole[m.role] = [];
      byRole[m.role].push(m);
    });
    Object.entries(byRole).forEach(([role, members]) => {
      fit(Math.round(20 * scY));
      addT(role, ML, CW, Math.round(16 * scY), {
        fontSize: Math.round(10 * scY),
        bold: true,
        color: "#1a3a6b",
      });
      members.forEach((m) => {
        fit(Math.round(14 * scY));
        addT(
          m.affiliation ? `${m.name}, ${m.affiliation}` : m.name,
          ML + Math.round(8 * scX),
          CW - Math.round(8 * scX),
          Math.round(14 * scY),
          { fontSize: Math.round(9.5 * scY), color: "#2d3748" },
        );
      });
      curY += Math.round(6 * scY);
    });
    flushPage();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // GENERAL INFO
  // ────────────────────────────────────────────────────────────────────────────
  {
    const confName = data.cover?.conferenceName || "CONFERENCE";
    const infoTitle = `${confName.toUpperCase()} INFORMATION`;
    fit(Math.round(40 * scY));
    addT(infoTitle, ML, CW, Math.round(28 * scY), {
      fontSize: Math.round(
        Math.max(14, Math.min(22, Math.floor(475 / (infoTitle.length * 0.6)))) *
          scY,
      ),
      bold: true,
      color: "#2a4365",
      align: "center",
      isTocEntry: true,
      tocLabel: "Conference Information",
    });
    curY += Math.round(8 * scY);
    const renderInfo = (label: string, text?: string) => {
      if (!text?.trim()) return;
      fit(Math.round(20 * scY));
      addRect("#2a4365", ML, CW, Math.round(18 * scY));
      addTAt(
        label,
        ML + 4,
        curY - Math.round(18 * scY) + 2,
        CW - 8,
        Math.round(16 * scY),
        {
          fontSize: Math.round(9 * scY),
          bold: true,
          color: "#ffffff",
        },
      );
      text
        .split("\n")
        .filter((l) => l.trim())
        .forEach((line) => {
          fit(Math.round(14 * scY));
          addT(line.trim(), ML, CW, Math.round(14 * scY), {
            fontSize: Math.round(9 * scY),
            color: "#2d3748",
          });
        });
      curY += Math.round(8 * scY);
    };
    const gi = data.generalInfo || {};
    renderInfo("Conference Venue", gi.venueDetails);
    renderInfo("Registration Desk Opening Time", gi.registrationHours);
    renderInfo("Function Rooms", gi.roomAssignments);
    renderInfo("Refreshments & Internet Access", gi.coffeeInternetInfo);
    renderInfo("Gala Dinner", gi.galaDinner);
    if (gi.floorPlan) {
      fit(Math.round(220 * scY));
      const layoutTitle = `${confName.toUpperCase()} LAYOUT`;
      addT(layoutTitle, ML, CW, Math.round(26 * scY), {
        fontSize: Math.round(
          Math.max(
            14,
            Math.min(22, Math.floor(475 / (layoutTitle.length * 0.6))),
          ) * scY,
        ),
        bold: true,
        color: "#2a4365",
        align: "center",
      });
      addImg(gi.floorPlan, ML, CW, Math.round(200 * scY));
    }
    flushPage();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // PROGRAM AT A GLANCE
  // ────────────────────────────────────────────────────────────────────────────
  {
    fit(Math.round(40 * scY));
    addT("Program at a Glance", ML, CW, Math.round(32 * scY), {
      fontSize: Math.round(20 * scY),
      bold: true,
      color: "#1a3a6b",
      align: "center",
      isTocEntry: true,
      tocLabel: "Program at a Glance",
    });
    curY += Math.round(8 * scY);
    const byDate: Record<string, any[]> = {};
    (data.summarySchedule || []).forEach((s: any) => {
      const k = s.date || "Unscheduled";
      if (!byDate[k]) byDate[k] = [];
      byDate[k].push(s);
    });
    Object.entries(byDate).forEach(([date, items]) => {
      fit(Math.round(28 * scY));
      const barY = addRect("#1a3a6b", ML, CW, Math.round(22 * scY));
      addTAt(
        date,
        ML + 8,
        barY + 3,
        Math.round(200 * scX),
        Math.round(18 * scY),
        {
          fontSize: Math.round(11 * scY),
          bold: true,
          color: "#ffffff",
        },
      );
      items.forEach((s: any) => {
        fit(Math.round(18 * scY));
        const rowY = curY;
        addRect("#ffffff", ML, CW, Math.round(16 * scY));
        addTAt(
          s.time || "",
          ML + 4,
          rowY + 2,
          Math.round(80 * scX),
          Math.round(14 * scY),
          {
            fontSize: Math.round(9 * scY),
            color: "#2d3748",
          },
        );
        addTAt(
          s.session || "",
          ML + Math.round(90 * scX),
          rowY + 2,
          Math.round(320 * scX),
          Math.round(14 * scY),
          {
            fontSize: Math.round(9 * scY),
            color: "#2d3748",
          },
        );
        addTAt(
          s.location || "",
          ML + Math.round(420 * scX),
          rowY + 2,
          Math.round(100 * scX),
          Math.round(14 * scY),
          {
            fontSize: Math.round(9 * scY),
            color: "#2d3748",
            align: "right",
          },
        );
      });
    });
    flushPage();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // KEYNOTES
  // ────────────────────────────────────────────────────────────────────────────
  if (data.keynotes?.length) {
    fit(Math.round(40 * scY));
    addT("Keynote Speakers", ML, CW, Math.round(24 * scY), {
      fontSize: Math.round(15 * scY),
      bold: true,
      color: "#1a3a6b",
      isTocEntry: true,
      tocLabel: "Keynote Speakers",
    });
    addRect("#1a3a6b", ML, CW, Math.round(2 * scY));
    curY += Math.round(10 * scY);
    data.keynotes.forEach((k: any) => {
      fit(Math.round(120 * scY));
      // Photo placeholder
      if (k.photo) {
        addImg(k.photo, ML, Math.round(90 * scX), Math.round(90 * scY));
        curY -= Math.round(90 * scY);
      }
      const textX = ML + (k.photo ? Math.round(100 * scX) : 0);
      const textW = CW - (k.photo ? Math.round(100 * scX) : 0);
      addT(
        k.presentationTitle || "Untitled Keynote",
        textX,
        textW,
        Math.round(20 * scY),
        {
          fontSize: Math.round(13 * scY),
          bold: true,
          color: "#1a3a6b",
        },
      );
      addT(k.name || "Unknown Speaker", textX, textW, Math.round(16 * scY), {
        fontSize: Math.round(11 * scY),
        italic: true,
        color: "#4a5568",
      });
      if (k.abstract) {
        addT("Abstract", textX, textW, Math.round(12 * scY), {
          fontSize: Math.round(8 * scY),
          bold: true,
          color: "#718096",
        });
        addT(k.abstract, textX, textW, Math.round(50 * scY), {
          fontSize: Math.round(9.5 * scY),
          color: "#2d3748",
          align: "justify",
        });
      }
      if (k.bio) {
        addT(k.bio, textX, textW, Math.round(30 * scY), {
          fontSize: Math.round(9 * scY),
          italic: true,
          color: "#4a5568",
          align: "justify",
        });
      }
      curY += Math.round(20 * scY);
    });
    flushPage();
  }

  // ────────────────────────────────────────────────────────────────────────────
  // DETAILED SCHEDULE / PAPERS
  // ────────────────────────────────────────────────────────────────────────────
  if (data.detailedSchedule?.length) {
    fit(Math.round(40 * scY));
    addT("Detailed Program with Abstracts", ML, CW, Math.round(24 * scY), {
      fontSize: Math.round(15 * scY),
      bold: true,
      color: "#1a3a6b",
      isTocEntry: true,
      tocLabel: "Detailed Program with Abstracts",
    });
    addRect("#1a3a6b", ML, CW, Math.round(2 * scY));
    curY += Math.round(10 * scY);
    data.detailedSchedule.forEach((session: any) => {
      fit(Math.round(30 * scY));
      addRect("#1a3a6b", ML, CW, Math.round(22 * scY));
      addTAt(
        session.sessionName || "Session",
        ML + 8,
        curY - Math.round(22 * scY) + 4,
        CW - 16,
        Math.round(18 * scY),
        { fontSize: Math.round(11 * scY), bold: true, color: "#ffffff" },
      );
      (session.papers || []).forEach((p: any) => {
        fit(Math.round(50 * scY));
        // Left border
        addRectFlat(
          "#93c5fd",
          ML,
          curY,
          Math.round(3 * scX),
          Math.round(44 * scY),
        );
        const pX = ML + Math.round(10 * scX);
        const pW = CW - Math.round(10 * scX);
        if (p.timeSlot) {
          addT(p.timeSlot, pX, Math.round(34 * scX), Math.round(12 * scY), {
            fontSize: Math.round(8.5 * scY),
            bold: true,
            color: "#1a3a6b",
          });
          curY -= Math.round(12 * scY);
        }
        addT(
          p.authors || "",
          pX + (p.timeSlot ? Math.round(38 * scX) : 0),
          pW - (p.timeSlot ? Math.round(38 * scX) : 0),
          Math.round(12 * scY),
          {
            fontSize: Math.round(8.5 * scY),
            italic: true,
            color: "#4a5568",
          },
        );
        addT(p.paperTitle || "", pX, pW, Math.round(14 * scY), {
          fontSize: Math.round(10.5 * scY),
          bold: true,
          color: "#1a202c",
        });
        if (p.abstract) {
          addT(
            `ABSTRACT. ${p.abstract.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim()}`,
            pX,
            pW,
            Math.round(40 * scY),
            {
              fontSize: Math.round(9.5 * scY),
              color: "#2d3748",
              align: "justify",
            },
          );
        }
        curY += Math.round(8 * scY);
      });
    });
  }
  flushPage();
  return allPages;
};

/**
 * Regenerate TOC page (always index 1) — SOICT 2025 style
 * Scans all pages for isTocEntry elements and rebuilds the table of contents
 */
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
        entries.push({ label: el.tocLabel || el.text, pageNum: idx + 1 });
    });
  });
  const tocEls: EditorEl[] = [];
  let txtZ = 100;
  const nzTxt = () => ++txtZ;

  // Extract conference name from cover page
  const confNameEl = pages[0]?.els.find(
    (e) => e.type === "text" && e.color === "#bfdbfe",
  );
  const confName = confNameEl?.text || "CONFERENCE";

  // Vertical conference name (rotated -90deg, decorative left side)
  const textLen = confName.length;
  // Auto-scale to fill ~800pt height
  const rawFont = Math.max(16, Math.min(140, 800 / (textLen * 0.65)));
  const vertFontSize = Math.round(rawFont * scY);
  // Width fixed to 800 to avoid wrapping and ensure center rotation alignment
  const vertW = Math.round(800 * scY);
  const vertH = Math.round(rawFont * 1.4 * scY);
  // x: visual center at ~40px from left
  const cx = Math.round(40 * scX);
  const cy = Math.round(421 * scY);
  const vertX = cx - Math.round(vertW / 2);
  const vertY = cy - Math.round(vertH / 2);
  tocEls.push({
    id: crypto.randomUUID(),
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

  // Title centered
  const titleH = Math.round(32 * scY);
  tocEls.push({
    id: crypto.randomUUID(),
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

  // Entries: large page number + label
  let y = MT + titleH + Math.round(30 * scY);
  const entryML = ML + Math.round(120 * scX);
  const numW = Math.round(48 * scX);
  entries.forEach((entry) => {
    const rowH = Math.round(35 * scY);
    // Large page number
    tocEls.push({
      id: crypto.randomUUID(),
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
    // Label
    tocEls.push({
      id: crypto.randomUUID(),
      type: "text",
      x: entryML + numW + Math.round(10 * scX),
      y: y + Math.round(6 * scY),
      w: CW - numW - Math.round(75 * scX),
      h: rowH - Math.round(6 * scY),
      text: entry.label,
      fontSize: Math.round(10 * scY),
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

/**
 * Render page elements to a thumbnail JPEG
 * Creates a small preview image of an editor page
 */
export const renderThumbnail = (page: EditorPage): Promise<string> => {
  const scale = THUMB_W / CANVAS_W;
  return new Promise((resolve) => {
    const c = document.createElement("canvas");
    c.width = THUMB_W;
    c.height = THUMB_H;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = page.bgColor || "#ffffff";
    ctx.fillRect(0, 0, THUMB_W, THUMB_H);
    const sorted = [...page.els].sort(
      (a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0),
    );
    const drawNext = (i: number) => {
      if (i >= sorted.length) {
        resolve(c.toDataURL("image/jpeg", 0.82));
        return;
      }
      const el = sorted[i];
      const x = el.x * scale,
        y = el.y * scale;
      const w = Math.max(1, el.w * scale),
        h = Math.max(1, el.h * scale);
      const hasRotation = el.rotation && el.rotation !== 0;
      if (hasRotation) {
        const cx = x + w / 2,
          cy = y + h / 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((el.rotation! * Math.PI) / 180);
        ctx.translate(-cx, -cy);
      }
      if (el.type === "table" && el.tableData) {
        renderTableToCanvas(ctx, el.tableData, x, y, w, h, scale);
        if (hasRotation) ctx.restore();
        drawNext(i + 1);
      } else if (el.type === "image" && el.src) {
        const img = new window.Image();
        img.onload = () => {
          ctx.drawImage(img, x, y, w, h);
          if (hasRotation) ctx.restore();
          drawNext(i + 1);
        };
        img.onerror = () => {
          if (hasRotation) ctx.restore();
          drawNext(i + 1);
        };
        img.src = el.src;
      } else if (el.type === "text" && el.text) {
        ctx.fillStyle = el.color || "#1a202c";
        const fs = Math.max(1.5, (el.fontSize || 10) * scale);
        ctx.font = `${el.italic ? "italic " : ""}${el.bold ? "bold " : ""}${fs}px Helvetica, Arial, sans-serif`;
        ctx.textBaseline = "top";
        const lineH = fs * 1.35;
        el.text.split("\n").forEach((line, li) => {
          const ly = y + li * lineH;
          if (ly > THUMB_H || !line.trim()) return;
          if (el.align === "center") {
            const tw = ctx.measureText(line).width;
            ctx.fillText(line, x + (w - tw) / 2, ly, w);
          } else if (el.align === "right") {
            const tw = ctx.measureText(line).width;
            ctx.fillText(line, x + w - tw, ly, w);
          } else ctx.fillText(line, x, ly, w);
        });
        if (hasRotation) ctx.restore();
        drawNext(i + 1);
      } else {
        if (hasRotation) ctx.restore();
        drawNext(i + 1);
      }
    };
    drawNext(0);
  });
};
