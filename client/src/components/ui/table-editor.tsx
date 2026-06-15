import React, { useState, useRef } from "react";
import {
  Plus,
  Trash2,
  Upload,
  Merge,
  SplitSquareHorizontal,
  AlignLeft,
  AlignCenter,
  AlignRight,
  X,
  Check,
  Grid3X3,
} from "lucide-react";
import { View, Text as PdfText } from "@react-pdf/renderer";
import { FontSelector, cssFontFamily } from "./font-manager";
import { generateUUID } from "@/features/proceedings/utils/uuid";

// ─── Data Model ───────────────────────────────────────────────────────────────

export interface TableCell {
  id: string;
  text: string;
  align: "left" | "center" | "right";
  bgColor?: string;
  colSpan: number;
  rowSpan: number;
  hidden: boolean;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  fontColor?: string;
  fontFamily?: string;
  // per-cell borders (undefined = use table default)
  borderTop?: boolean;
  borderRight?: boolean;
  borderBottom?: boolean;
  borderLeft?: boolean;
  borderColor?: string;
  borderWidth?: number;
}

export interface TableData {
  rows: number;
  cols: number;
  cells: TableCell[][];
  colWidths: number[];
  rowHeights: number[];
  borderOn: boolean;
  borderThickness: number;
  cellPadding: number;
  headerHighlight: boolean;
  headerBgColor: string;
  borderColor: string;
}

export interface CellCoord {
  r: number;
  c: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const createEmptyTable = (
  rows: number,
  cols: number,
  w: number,
  h: number,
): TableData => {
  const colW = Math.floor(w / cols);
  const rowH = Math.floor(h / rows);
  const cells: TableCell[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: TableCell[] = [];
    for (let c = 0; c < cols; c++) {
      row.push({
        id: generateUUID(),
        text: "",
        align: "center",
        colSpan: 1,
        rowSpan: 1,
        hidden: false,
        fontSize: 10,
        bold: false,
        italic: false,
        fontColor: "#1a202c",
      });
    }
    cells.push(row);
  }
  return {
    rows,
    cols,
    cells,
    colWidths: Array(cols).fill(colW),
    rowHeights: Array(rows).fill(rowH),
    borderOn: true,
    borderThickness: 1,
    cellPadding: 4,
    headerHighlight: true,
    headerBgColor: "#1a3a6b",
    borderColor: "#cbd5e0",
  };
};

export const parseCSV = (text: string): string[][] => {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  return lines.map((line) => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  });
};

export const createTableFromCSV = (data: string[][], w: number): TableData => {
  const rows = data.length;
  const cols = Math.max(...data.map((r) => r.length));
  const colW = Math.floor(w / cols);
  const cells: TableCell[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: TableCell[] = [];
    for (let c = 0; c < cols; c++) {
      row.push({
        id: generateUUID(),
        text: data[r]?.[c] || "",
        align: "left",
        colSpan: 1,
        rowSpan: 1,
        hidden: false,
        fontSize: 10,
        bold: false,
        italic: false,
        fontColor: "#1a202c",
      });
    }
    cells.push(row);
  }
  return {
    rows,
    cols,
    cells,
    colWidths: Array(cols).fill(colW),
    rowHeights: Array(rows).fill(32),
    borderOn: true,
    borderThickness: 1,
    cellPadding: 4,
    headerHighlight: true,
    headerBgColor: "#1a3a6b",
    borderColor: "#cbd5e0",
  };
};

const isCellSel = (sel: CellCoord[], r: number, c: number) =>
  sel.some((s) => s.r === r && s.c === c);

const selBounds = (sel: CellCoord[]) => {
  if (!sel.length) return null;
  let r1 = sel[0].r,
    c1 = sel[0].c,
    r2 = sel[0].r,
    c2 = sel[0].c;
  sel.forEach(({ r, c }) => {
    r1 = Math.min(r1, r);
    c1 = Math.min(c1, c);
    r2 = Math.max(r2, r);
    c2 = Math.max(c2, c);
  });
  return { r1, c1, r2, c2 };
};

// ─── Merge / Split ────────────────────────────────────────────────────────────

export const mergeCells = (td: TableData, sel: CellCoord[]): TableData => {
  const b = selBounds(sel);
  if (!b || (b.r1 === b.r2 && b.c1 === b.c2)) return td;
  const nc = td.cells.map((row) => row.map((c) => ({ ...c })));
  const tl = nc[b.r1][b.c1];
  tl.colSpan = b.c2 - b.c1 + 1;
  tl.rowSpan = b.r2 - b.r1 + 1;
  const texts: string[] = [];
  for (let r = b.r1; r <= b.r2; r++)
    for (let c = b.c1; c <= b.c2; c++) {
      if (r === b.r1 && c === b.c1) continue;
      if (nc[r][c].text) texts.push(nc[r][c].text);
      nc[r][c] = {
        ...nc[r][c],
        hidden: true,
        text: "",
        colSpan: 1,
        rowSpan: 1,
      };
    }
  if (texts.length && !tl.text) tl.text = texts.join(" ");
  return { ...td, cells: nc };
};

export const splitCell = (td: TableData, r: number, c: number): TableData => {
  const nc = td.cells.map((row) => row.map((cl) => ({ ...cl })));
  const cell = nc[r][c];
  if (cell.colSpan <= 1 && cell.rowSpan <= 1) return td;
  const rs = cell.rowSpan,
    cs = cell.colSpan;
  cell.colSpan = 1;
  cell.rowSpan = 1;
  for (let ri = r; ri < r + rs && ri < td.rows; ri++)
    for (let ci = c; ci < c + cs && ci < td.cols; ci++) {
      if (ri === r && ci === c) continue;
      nc[ri][ci].hidden = false;
    }
  return { ...td, cells: nc };
};

export const splitSelected = (td: TableData, sel: CellCoord[]): TableData => {
  let res = td;
  sel.forEach(({ r, c }) => {
    const cell = res.cells[r]?.[c];
    if (cell && (cell.colSpan > 1 || cell.rowSpan > 1))
      res = splitCell(res, r, c);
  });
  return res;
};

// ─── Row/Col ops ──────────────────────────────────────────────────────────────

export const addRow = (td: TableData, afterIdx?: number): TableData => {
  const idx = afterIdx !== undefined ? afterIdx + 1 : td.rows;
  const newRow: TableCell[] = Array.from({ length: td.cols }, () => ({
    id: generateUUID(),
    text: "",
    align: "left" as const,
    colSpan: 1,
    rowSpan: 1,
    hidden: false,
    fontSize: 10,
    bold: false,
    italic: false,
    fontColor: "#1a202c",
  }));
  const nc = [...td.cells];
  nc.splice(idx, 0, newRow);
  const nh = [...td.rowHeights];
  nh.splice(idx, 0, td.rowHeights[0] || 32);
  return { ...td, rows: td.rows + 1, cells: nc, rowHeights: nh };
};
export const deleteRow = (td: TableData, idx: number): TableData => {
  if (td.rows <= 1) return td;
  return {
    ...td,
    rows: td.rows - 1,
    cells: td.cells.filter((_, i) => i !== idx),
    rowHeights: td.rowHeights.filter((_, i) => i !== idx),
  };
};
export const addColumn = (td: TableData, afterIdx?: number): TableData => {
  const idx = afterIdx !== undefined ? afterIdx + 1 : td.cols;
  const nc = td.cells.map((row) => {
    const nr = [...row];
    nr.splice(idx, 0, {
      id: generateUUID(),
      text: "",
      align: "left" as const,
      colSpan: 1,
      rowSpan: 1,
      hidden: false,
      fontSize: 10,
      bold: false,
      italic: false,
      fontColor: "#1a202c",
    });
    return nr;
  });
  const nw = [...td.colWidths];
  nw.splice(idx, 0, td.colWidths[0] || 80);
  return { ...td, cols: td.cols + 1, cells: nc, colWidths: nw };
};
export const deleteColumn = (td: TableData, idx: number): TableData => {
  if (td.cols <= 1) return td;
  return {
    ...td,
    cols: td.cols - 1,
    cells: td.cells.map((row) => row.filter((_, i) => i !== idx)),
    colWidths: td.colWidths.filter((_, i) => i !== idx),
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Table Canvas Component ──────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

interface TableEditorCanvasProps {
  tableData: TableData;
  elW: number;
  elH: number;
  isSelected: boolean;
  selectedCells: CellCoord[];
  onSelectCells: (cells: CellCoord[]) => void;
  onPatchTable: (td: TableData) => void;
}

export const TableEditorCanvas: React.FC<TableEditorCanvasProps> = ({
  tableData: td,
  elW,
  elH,
  isSelected,
  selectedCells,
  onSelectCells,
  onPatchTable,
}) => {
  const [editingCell, setEditingCell] = useState<CellCoord | null>(null);
  const [colResizeIdx, setColResizeIdx] = useState<number | null>(null);
  const [rowResizeIdx, setRowResizeIdx] = useState<number | null>(null);
  const resizeRef = useRef({ startX: 0, startY: 0, origSize: 0 });
  const lastClickedRef = useRef<CellCoord | null>(null);

  // Scale
  const totalCW = td.colWidths.reduce((s, w) => s + w, 0);
  const scX = totalCW > 0 ? elW / totalCW : 1;
  const scaledCW = td.colWidths.map((w) => w * scX);
  const totalRH = td.rowHeights.reduce((s, h) => s + h, 0);
  const scY = totalRH > 0 ? elH / totalRH : 1;
  const scaledRH = td.rowHeights.map((h) => h * scY);
  const bw = td.borderOn ? td.borderThickness : 0;

  // Positions
  const xPos: number[] = [0];
  for (let i = 0; i < scaledCW.length; i++) xPos.push(xPos[i] + scaledCW[i]);
  const yPos: number[] = [0];
  for (let i = 0; i < scaledRH.length; i++) yPos.push(yPos[i] + scaledRH[i]);

  // ── Resize handlers ──
  const onColResizeDown = (e: React.PointerEvent, ci: number) => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setColResizeIdx(ci);
    resizeRef.current = {
      startX: e.clientX,
      startY: 0,
      origSize: td.colWidths[ci],
    };
  };
  const onRowResizeDown = (e: React.PointerEvent, ri: number) => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setRowResizeIdx(ri);
    resizeRef.current = {
      startX: 0,
      startY: e.clientY,
      origSize: td.rowHeights[ri],
    };
  };
  const onResizeMove = (e: React.PointerEvent) => {
    if (colResizeIdx !== null) {
      const dx = e.clientX - resizeRef.current.startX;
      const nw = [...td.colWidths];
      nw[colResizeIdx] = Math.max(30, resizeRef.current.origSize + dx / scX);
      onPatchTable({ ...td, colWidths: nw });
    }
    if (rowResizeIdx !== null) {
      const dy = e.clientY - resizeRef.current.startY;
      const nh = [...td.rowHeights];
      nh[rowResizeIdx] = Math.max(20, resizeRef.current.origSize + dy / scY);
      onPatchTable({ ...td, rowHeights: nh });
    }
  };
  const onResizeUp = () => {
    setColResizeIdx(null);
    setRowResizeIdx(null);
  };

  // ── Cell text edit ──
  const setCellText = (r: number, c: number, text: string) => {
    const nc = td.cells.map((row) => row.map((cl) => ({ ...cl })));
    nc[r][c].text = text;
    onPatchTable({ ...td, cells: nc });
  };

  // ── Cell selection ──
  const onCellPointerDown = (e: React.PointerEvent, r: number, c: number) => {
    // If the table is already selected, we want to stop propagation
    // so that the parent wrapper doesn't capture the pointer and prevent clicking on cells.
    if (isSelected) {
      e.stopPropagation();
    }
  };

  const onCellClick = (e: React.MouseEvent, r: number, c: number) => {
    if (!isSelected) return; // Let parent handle selection
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      // Toggle
      if (isCellSel(selectedCells, r, c))
        onSelectCells(selectedCells.filter((s) => !(s.r === r && s.c === c)));
      else onSelectCells([...selectedCells, { r, c }]);
    } else if (e.shiftKey && lastClickedRef.current) {
      // Range
      const lr = lastClickedRef.current.r,
        lc = lastClickedRef.current.c;
      const rMin = Math.min(lr, r),
        rMax = Math.max(lr, r);
      const cMin = Math.min(lc, c),
        cMax = Math.max(lc, c);
      const range: CellCoord[] = [];
      for (let ri = rMin; ri <= rMax; ri++)
        for (let ci = cMin; ci <= cMax; ci++)
          if (!td.cells[ri]?.[ci]?.hidden) range.push({ r: ri, c: ci });
      onSelectCells(range);
    } else {
      onSelectCells([{ r, c }]);
      setEditingCell({ r, c });
    }
    lastClickedRef.current = { r, c };
  };

  const onCellDblClick = (e: React.MouseEvent, r: number, c: number) => {
    if (!isSelected) return;
    e.stopPropagation();
    e.preventDefault();
    setEditingCell({ r, c });
  };

  // ── Row/Col header click ──
  const onRowHdrClick = (e: React.MouseEvent, r: number) => {
    e.stopPropagation();
    const cells: CellCoord[] = [];
    for (let c = 0; c < td.cols; c++)
      if (!td.cells[r]?.[c]?.hidden) cells.push({ r, c });
    onSelectCells(
      e.ctrlKey
        ? [
            ...selectedCells,
            ...cells.filter((nc2) => !isCellSel(selectedCells, nc2.r, nc2.c)),
          ]
        : cells,
    );
  };
  const onColHdrClick = (e: React.MouseEvent, c: number) => {
    e.stopPropagation();
    const cells: CellCoord[] = [];
    for (let r = 0; r < td.rows; r++)
      if (!td.cells[r]?.[c]?.hidden) cells.push({ r, c });
    onSelectCells(
      e.ctrlKey
        ? [
            ...selectedCells,
            ...cells.filter((nc2) => !isCellSel(selectedCells, nc2.r, nc2.c)),
          ]
        : cells,
    );
  };

  const HDR_W = isSelected ? 22 : 0;
  const HDR_H = isSelected ? 16 : 0;

  return (
    <div
      className="absolute inset-0"
      style={{ overflow: "visible" }}
      onPointerMove={onResizeMove}
      onPointerUp={onResizeUp}
    >
      {/* ── Column headers ── */}
      {isSelected &&
        scaledCW.map((w, ci) => (
          <div
            key={`ch-${ci}`}
            className="absolute select-none cursor-pointer hover:bg-indigo-100"
            style={{
              left: HDR_W + xPos[ci],
              top: 0,
              width: w,
              height: HDR_H,
              fontSize: 8,
              color: "#6b7280",
              background: "#f1f5f9",
              borderRight: "1px solid #e2e8f0",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={(e) => onColHdrClick(e, ci)}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {String.fromCharCode(65 + (ci % 26))}
          </div>
        ))}

      {/* ── Row headers ── */}
      {isSelected &&
        scaledRH.map((h, ri) => (
          <div
            key={`rh-${ri}`}
            className="absolute select-none cursor-pointer hover:bg-indigo-100"
            style={{
              left: 0,
              top: HDR_H + yPos[ri],
              width: HDR_W,
              height: h,
              fontSize: 8,
              color: "#6b7280",
              background: "#f1f5f9",
              borderRight: "1px solid #e2e8f0",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={(e) => onRowHdrClick(e, ri)}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {ri + 1}
          </div>
        ))}

      {/* ── Cells ── */}
      {td.cells.map((row, ri) =>
        row.map((cell, ci) => {
          if (cell.hidden) return null;
          const cx = HDR_W + xPos[ci];
          const cy = HDR_H + yPos[ri];
          const cw =
            (xPos[ci + cell.colSpan] ?? xPos[xPos.length - 1]) - xPos[ci];
          const ch =
            (yPos[ri + cell.rowSpan] ?? yPos[yPos.length - 1]) - yPos[ri];
          const isHdr = td.headerHighlight && ri === 0;
          const bg = cell.bgColor || (isHdr ? td.headerBgColor : "transparent");
          const txtColor = cell.fontColor || (isHdr ? "#fff" : "#1a202c");
          const fWeight = (cell.bold ?? isHdr) ? "bold" : "normal";
          const fStyle = cell.italic ? "italic" : "normal";
          const fSize = cell.fontSize ?? (isHdr ? 11 : 10);
          const isSel2 = isCellSel(selectedCells, ri, ci);
          const isEdit = editingCell?.r === ri && editingCell?.c === ci;

          return (
            <div
              key={cell.id}
              className="absolute"
              style={{
                left: cx,
                top: cy,
                width: cw,
                height: ch,
                backgroundColor: bg,
                borderTopWidth:
                  (cell.borderTop ?? td.borderOn)
                    ? (cell.borderWidth ?? bw)
                    : 0,
                borderRightWidth:
                  (cell.borderRight ?? td.borderOn)
                    ? (cell.borderWidth ?? bw)
                    : 0,
                borderBottomWidth:
                  (cell.borderBottom ?? td.borderOn)
                    ? (cell.borderWidth ?? bw)
                    : 0,
                borderLeftWidth:
                  (cell.borderLeft ?? td.borderOn)
                    ? (cell.borderWidth ?? bw)
                    : 0,
                borderStyle: "solid",
                borderColor: cell.borderColor ?? td.borderColor,
                padding: td.cellPadding,
                boxSizing: "border-box",
                overflow: "hidden",
                outline: isSel2 ? "2px solid #6366f1" : "none",
                outlineOffset: "-2px",
                zIndex: isSel2 ? 5 : 1,
                cursor: isSelected ? "text" : "pointer",
              }}
              onPointerDown={(e) => onCellPointerDown(e, ri, ci)}
              onClick={(e) => onCellClick(e, ri, ci)}
              onDoubleClick={(e) => onCellDblClick(e, ri, ci)}
            >
              {isEdit ? (
                <textarea
                  autoFocus
                  className="w-full h-full bg-white/90 outline-none resize-none p-0 border-none"
                  style={{
                    fontSize: fSize,
                    fontWeight: fWeight,
                    fontStyle: fStyle,
                    color: txtColor,
                    textAlign: cell.align,
                    lineHeight: 1.3,
                    fontFamily: cell.fontFamily
                      ? cssFontFamily(cell.fontFamily)
                      : "inherit",
                  }}
                  value={cell.text}
                  onChange={(e) => setCellText(ri, ci, e.target.value)}
                  onBlur={() => setEditingCell(null)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setEditingCell(null);
                    if (e.key === "Tab") {
                      e.preventDefault();
                      setEditingCell(null);
                      const nc = ci + cell.colSpan;
                      if (nc < td.cols) setEditingCell({ r: ri, c: nc });
                      else if (ri + 1 < td.rows)
                        setEditingCell({ r: ri + 1, c: 0 });
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                />
              ) : (
                <div
                  className="w-full h-full overflow-hidden"
                  style={{
                    fontSize: fSize,
                    fontWeight: fWeight,
                    fontStyle: fStyle,
                    color: txtColor,
                    textAlign: cell.align,
                    lineHeight: 1.3,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    pointerEvents: "none",
                    fontFamily: cell.fontFamily
                      ? cssFontFamily(cell.fontFamily)
                      : "inherit",
                  }}
                >
                  {cell.text}
                </div>
              )}
            </div>
          );
        }),
      )}

      {/* ── Column resize handles ── */}
      {isSelected &&
        scaledCW.map((_, ci) => {
          if (ci >= td.cols - 1) return null;
          return (
            <div
              key={`cr-${ci}`}
              className="absolute"
              style={{
                left: HDR_W + xPos[ci + 1] - 3,
                top: HDR_H,
                width: 6,
                height: yPos[yPos.length - 1],
                cursor: "col-resize",
                zIndex: 20,
                background:
                  colResizeIdx === ci ? "rgba(99,102,241,0.3)" : "transparent",
              }}
              onPointerDown={(e) => onColResizeDown(e, ci)}
            />
          );
        })}

      {/* ── Row resize handles ── */}
      {isSelected &&
        scaledRH.map((_, ri) => {
          if (ri >= td.rows - 1) return null;
          return (
            <div
              key={`rr-${ri}`}
              className="absolute"
              style={{
                left: HDR_W,
                top: HDR_H + yPos[ri + 1] - 3,
                width: xPos[xPos.length - 1],
                height: 6,
                cursor: "row-resize",
                zIndex: 20,
                background:
                  rowResizeIdx === ri ? "rgba(99,102,241,0.3)" : "transparent",
              }}
              onPointerDown={(e) => onRowResizeDown(e, ri)}
            />
          );
        })}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Properties Panel ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

interface TablePropertiesPanelProps {
  tableData: TableData;
  selectedCells: CellCoord[];
  onPatchTable: (td: TableData) => void;
  elementW: number;
}

export const TablePropertiesPanel: React.FC<TablePropertiesPanelProps> = ({
  tableData: td,
  selectedCells,
  onPatchTable,
  elementW,
}) => {
  const L =
    "text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5";
  const B =
    "w-full py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-all";
  const hasSel = selectedCells.length > 0;
  const selN = selectedCells.length;

  const hasMerged = selectedCells.some(({ r, c }) => {
    const cl = td.cells[r]?.[c];
    return cl && (cl.colSpan > 1 || cl.rowSpan > 1);
  });

  const getP = <K extends keyof TableCell>(key: K): TableCell[K] | "mixed" => {
    if (!selN) return undefined as any;
    const first = td.cells[selectedCells[0].r]?.[selectedCells[0].c]?.[key];
    for (const { r, c } of selectedCells)
      if (td.cells[r]?.[c]?.[key] !== first) return "mixed";
    return first;
  };

  const patchSel = (patch: Partial<TableCell>) => {
    const nc = td.cells.map((row) => row.map((cl) => ({ ...cl })));
    selectedCells.forEach(({ r, c }) => {
      if (nc[r]?.[c]) Object.assign(nc[r][c], patch);
    });
    onPatchTable({ ...td, cells: nc });
  };

  const sAlign = getP("align");
  const sBold = getP("bold");
  const sItalic = getP("italic");
  const sFontSize = getP("fontSize");
  const sFontFamily = getP("fontFamily");
  const sFontColor = getP("fontColor");
  const sBgColor = getP("bgColor");

  return (
    <div className="space-y-3">
      <div>
        <label className={L}>Table</label>
        <p className="text-xs text-slate-600">
          {td.rows}×{td.cols} · {selN} selected
        </p>
      </div>

      {/* ── Per-cell styling ── */}
      {hasSel && (
        <div className="border border-indigo-200 bg-indigo-50/50 rounded-lg p-3 space-y-3">
          <label className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider block">
            Selected ({selN} cell{selN > 1 ? "s" : ""})
          </label>

          {/* Font size & Family */}
          <div>
            <label className="text-[9px] text-slate-500 block mb-1">
              Font family & size
            </label>
            <FontSelector
              value={sFontFamily === "mixed" ? "" : sFontFamily || "Helvetica"}
              onChange={(f) => patchSel({ fontFamily: f })}
              className="mb-1.5"
            />
            <input
              type="number"
              min={6}
              max={48}
              value={sFontSize === "mixed" ? "" : (sFontSize ?? 10)}
              placeholder={sFontSize === "mixed" ? "Mixed" : ""}
              onChange={(e) =>
                patchSel({ fontSize: Number(e.target.value) || 10 })
              }
              className="w-full px-2 py-1 border border-slate-200 rounded text-xs outline-none focus:ring-1 focus:ring-indigo-400"
            />
          </div>

          {/* Bold / Italic */}
          <div className="flex gap-1.5">
            <button
              onClick={() => patchSel({ bold: sBold === true ? false : true })}
              className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                sBold === true
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              B
            </button>
            <button
              onClick={() =>
                patchSel({ italic: sItalic === true ? false : true })
              }
              className={`flex-1 py-1.5 rounded-lg border text-xs italic transition-all ${
                sItalic === true
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              I
            </button>
          </div>

          {/* Alignment */}
          <div className="flex gap-1.5">
            {(["left", "center", "right"] as const).map((a) => (
              <button
                key={a}
                onClick={() => patchSel({ align: a })}
                className={`flex-1 py-1.5 rounded-lg border flex items-center justify-center transition-all ${
                  sAlign === a
                    ? "bg-indigo-600 border-indigo-600 text-white"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {a === "left" ? (
                  <AlignLeft className="w-3 h-3" />
                ) : a === "center" ? (
                  <AlignCenter className="w-3 h-3" />
                ) : (
                  <AlignRight className="w-3 h-3" />
                )}
              </button>
            ))}
          </div>

          {/* Font color */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-slate-500 w-10">Text</span>
            <input
              type="color"
              value={
                sFontColor === "mixed" ? "#000000" : sFontColor || "#1a202c"
              }
              onChange={(e) => patchSel({ fontColor: e.target.value })}
              className="w-6 h-6 rounded border-0 p-0 bg-transparent cursor-pointer"
            />
            <span className="text-[9px] text-slate-500 font-mono">
              {sFontColor === "mixed" ? "Mixed" : sFontColor || "#1a202c"}
            </span>
          </div>

          {/* BG color */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-slate-500 w-10">BG</span>
            <input
              type="color"
              value={sBgColor === "mixed" ? "#ffffff" : sBgColor || "#ffffff"}
              onChange={(e) => patchSel({ bgColor: e.target.value })}
              className="w-6 h-6 rounded border-0 p-0 bg-transparent cursor-pointer"
            />
            <button
              onClick={() => patchSel({ bgColor: undefined })}
              className="text-[9px] text-slate-400 hover:text-red-500 underline"
            >
              Clear
            </button>
          </div>

          {/* Per-cell borders */}
          <div>
            <label className="text-[9px] text-slate-500 block mb-1">
              Cell Borders
            </label>
            <div className="grid grid-cols-4 gap-1">
              {(
                [
                  "borderTop",
                  "borderRight",
                  "borderBottom",
                  "borderLeft",
                ] as const
              ).map((side) => {
                const label = side.replace("border", "");
                const val = getP(side);
                const isOn = val === true || val === undefined;
                return (
                  <button
                    key={side}
                    onClick={() =>
                      patchSel({ [side]: isOn ? false : true } as any)
                    }
                    className={`py-1 rounded text-[8px] border transition-all ${
                      isOn
                        ? "bg-slate-700 text-white border-slate-700"
                        : "bg-white text-slate-400 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {label[0].toUpperCase()}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[8px] text-slate-400">Color</span>
              <input
                type="color"
                value={(getP("borderColor") as string) || td.borderColor}
                onChange={(e) => patchSel({ borderColor: e.target.value })}
                className="w-5 h-5 rounded border-0 p-0 bg-transparent cursor-pointer"
              />
              <span className="text-[8px] text-slate-400">Width</span>
              <input
                type="number"
                min={0}
                max={5}
                step={0.5}
                value={(getP("borderWidth") as number) || td.borderThickness}
                onChange={(e) =>
                  patchSel({ borderWidth: Number(e.target.value) })
                }
                className="w-12 px-1 py-0.5 border border-slate-200 rounded text-[9px] outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Merge / Split ── */}
      {hasSel && (
        <div className="space-y-1.5">
          <label className={L}>Merge / Split</label>
          {selN >= 2 && (
            <button
              onClick={() => onPatchTable(mergeCells(td, selectedCells))}
              className={`${B} text-indigo-700 border-indigo-200 hover:bg-indigo-50`}
            >
              <Merge className="w-3 h-3" /> Merge {selN} cells
            </button>
          )}
          {hasMerged && (
            <button
              onClick={() => onPatchTable(splitSelected(td, selectedCells))}
              className={`${B} text-amber-700 border-amber-200 hover:bg-amber-50`}
            >
              <SplitSquareHorizontal className="w-3 h-3" /> Split merged
            </button>
          )}
          {selN < 2 && !hasMerged && (
            <p className="text-[9px] text-slate-400 italic">
              Select 2+ cells to merge.
            </p>
          )}
        </div>
      )}

      {/* ── Row / Col ── */}
      <div className="border-t border-slate-100 pt-3">
        <label className={L}>Rows</label>
        <div className="flex gap-1.5">
          <button onClick={() => onPatchTable(addRow(td))} className={B}>
            <Plus className="w-3 h-3" /> Add
          </button>
          <button
            onClick={() => onPatchTable(deleteRow(td, td.rows - 1))}
            className={`${B} ${td.rows <= 1 ? "opacity-40" : "text-red-500 border-red-200 hover:bg-red-50"}`}
            disabled={td.rows <= 1}
          >
            <Trash2 className="w-3 h-3" /> Del
          </button>
        </div>
      </div>
      <div>
        <label className={L}>Columns</label>
        <div className="flex gap-1.5">
          <button onClick={() => onPatchTable(addColumn(td))} className={B}>
            <Plus className="w-3 h-3" /> Add
          </button>
          <button
            onClick={() => onPatchTable(deleteColumn(td, td.cols - 1))}
            className={`${B} ${td.cols <= 1 ? "opacity-40" : "text-red-500 border-red-200 hover:bg-red-50"}`}
            disabled={td.cols <= 1}
          >
            <Trash2 className="w-3 h-3" /> Del
          </button>
        </div>
      </div>

      {/* ── Table-wide styles ── */}
      <div className="border-t border-slate-100 pt-3">
        <label className={L}>Border</label>
        <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer mb-2">
          <input
            type="checkbox"
            checked={td.borderOn}
            onChange={(e) =>
              onPatchTable({ ...td, borderOn: e.target.checked })
            }
            className="accent-indigo-600 w-3.5 h-3.5"
          />{" "}
          Show
        </label>
        {td.borderOn && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-slate-400 w-14">Thick</span>
              <input
                type="range"
                min={0.5}
                max={4}
                step={0.5}
                value={td.borderThickness}
                onChange={(e) =>
                  onPatchTable({
                    ...td,
                    borderThickness: Number(e.target.value),
                  })
                }
                className="flex-1 accent-indigo-600"
              />
              <span className="text-[9px] text-slate-500 w-6">
                {td.borderThickness}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-slate-400 w-14">Color</span>
              <input
                type="color"
                value={td.borderColor}
                onChange={(e) =>
                  onPatchTable({ ...td, borderColor: e.target.value })
                }
                className="w-5 h-5 rounded border-0 p-0 bg-transparent cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      <div>
        <label className={L}>Padding</label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={20}
            value={td.cellPadding}
            onChange={(e) =>
              onPatchTable({ ...td, cellPadding: Number(e.target.value) })
            }
            className="flex-1 accent-indigo-600"
          />
          <span className="text-[9px] text-slate-500 w-6">
            {td.cellPadding}
          </span>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-3">
        <label className={L}>Header Row</label>
        <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer mb-2">
          <input
            type="checkbox"
            checked={td.headerHighlight}
            onChange={(e) =>
              onPatchTable({ ...td, headerHighlight: e.target.checked })
            }
            className="accent-indigo-600 w-3.5 h-3.5"
          />{" "}
          Highlight
        </label>
        {td.headerHighlight && (
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-slate-400">BG</span>
            <input
              type="color"
              value={td.headerBgColor}
              onChange={(e) =>
                onPatchTable({ ...td, headerBgColor: e.target.value })
              }
              className="w-5 h-5 rounded border-0 p-0 bg-transparent cursor-pointer"
            />
          </div>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Insert Table Modal ───────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

interface InsertTableModalProps {
  onInsert: (rows: number, cols: number) => void;
  onClose: () => void;
}

export const InsertTableModal: React.FC<InsertTableModalProps> = ({
  onInsert,
  onClose,
}) => {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [hoverR, setHoverR] = useState(-1);
  const [hoverC, setHoverC] = useState(-1);
  const MR = 10,
    MC = 8;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl p-6 w-[380px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Grid3X3 className="w-4 h-4 text-indigo-600" /> Insert Table
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-xs text-slate-500 mb-2">Click to select size:</p>
          <div
            className="inline-grid gap-[2px] p-2 bg-slate-50 rounded-lg border border-slate-200"
            style={{ gridTemplateColumns: `repeat(${MC}, 1fr)` }}
            onMouseLeave={() => {
              setHoverR(-1);
              setHoverC(-1);
            }}
          >
            {Array.from({ length: MR * MC }).map((_, i) => {
              const r = Math.floor(i / MC),
                c = i % MC;
              const active =
                r <= (hoverR >= 0 ? hoverR : rows - 1) &&
                c <= (hoverC >= 0 ? hoverC : cols - 1);
              return (
                <div
                  key={i}
                  className={`w-6 h-5 rounded-sm border cursor-pointer transition-all ${active ? "bg-indigo-500 border-indigo-600" : "bg-white border-slate-200 hover:bg-indigo-100"}`}
                  onMouseEnter={() => {
                    setHoverR(r);
                    setHoverC(c);
                  }}
                  onClick={() => {
                    setRows(r + 1);
                    setCols(c + 1);
                    setHoverR(-1);
                    setHoverC(-1);
                  }}
                />
              );
            })}
          </div>
          <p className="text-xs text-slate-500 mt-1.5">
            {hoverR >= 0
              ? `${hoverR + 1} × ${hoverC + 1}`
              : `${rows} × ${cols}`}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">
              Rows
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={rows}
              onChange={(e) =>
                setRows(Math.max(1, Math.min(50, +e.target.value)))
              }
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-1">
              Columns
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={cols}
              onChange={(e) =>
                setCols(Math.max(1, Math.min(20, +e.target.value)))
              }
              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onInsert(rows, cols);
              onClose();
            }}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" /> Insert
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ─── PDF Export ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

interface TablePdfExportProps {
  tableData: TableData;
  elX: number;
  elY: number;
  elW: number;
  elH: number;
  px2pt: (v: number, axis: "x" | "y") => number;
}

export const TablePdfExport: React.FC<TablePdfExportProps> = ({
  tableData: td,
  elX,
  elY,
  elW,
  elH,
  px2pt,
}) => {
  const totalCW = td.colWidths?.reduce((s, w) => s + w, 0) || 0;
  const sc = totalCW > 0 && elW > 0 ? elW / totalCW : 1;
  const sCW = (td.colWidths || []).map((w) => w * sc);
  const totalRH = td.rowHeights?.reduce((s, h) => s + h, 0) || 0;
  const rs = totalRH > 0 && elH > 0 ? elH / totalRH : 1;
  const sRH = (td.rowHeights || []).map((h) => h * rs);
  const tableBw = td.borderOn ? (td.borderThickness ?? 1) : 0;

  const xP: number[] = [0];
  for (let i = 0; i < sCW.length; i++) xP.push(xP[i] + sCW[i]);
  const yP: number[] = [0];
  for (let i = 0; i < sRH.length; i++) yP.push(yP[i] + sRH[i]);

  return (
    <View
      style={{
        position: "absolute",
        left: px2pt(elX, "x"),
        top: px2pt(elY, "y"),
        width: Math.max(1, px2pt(elW, "x")),
        height: Math.max(1, px2pt(elH, "y")),
      }}
    >
      {(td.cells || []).map((row, ri) =>
        (row || []).map((cell, ci) => {
          if (!cell || cell.hidden) return null;
          const x = xP[ci] ?? 0,
            y = yP[ri] ?? 0;
          // Use Math.min to clamp index within bounds — prevents negative dimensions
          const w = Math.max(
            0,
            (xP[Math.min(ci + cell.colSpan, sCW.length)] ?? xP[xP.length - 1]) -
              x,
          );
          const h = Math.max(
            0,
            (yP[Math.min(ri + cell.rowSpan, sRH.length)] ?? yP[yP.length - 1]) -
              y,
          );
          if (w <= 0 || h <= 0) return null; // Skip degenerate cells
          const isHdr = td.headerHighlight && ri === 0;
          const bg = cell.bgColor || (isHdr ? td.headerBgColor : undefined);
          const tc = cell.fontColor || (isHdr ? "#fff" : "#1a202c");
          const fs = cell.fontSize ?? (isHdr ? 9 : 8);
          const isBold = cell.bold ?? isHdr;
          const isItalic = cell.italic ?? false;

          // Borders logic: use per-cell borders if defined, else table default
          const bt =
            (cell.borderTop ?? td.borderOn) ? (cell.borderWidth ?? tableBw) : 0;
          const br =
            (cell.borderRight ?? td.borderOn)
              ? (cell.borderWidth ?? tableBw)
              : 0;
          const bb =
            (cell.borderBottom ?? td.borderOn)
              ? (cell.borderWidth ?? tableBw)
              : 0;
          const bl =
            (cell.borderLeft ?? td.borderOn)
              ? (cell.borderWidth ?? tableBw)
              : 0;

          const isCustomFont =
            cell.fontFamily === "Inter" || cell.fontFamily === "Roboto";

          return (
            <View
              key={cell.id}
              style={{
                position: "absolute",
                left: px2pt(x, "x"),
                top: px2pt(y, "y"),
                width: Math.max(1, px2pt(w, "x")),
                height: Math.max(1, px2pt(h, "y")),
                backgroundColor: bg,
                borderTopWidth: Math.max(0, px2pt(bt, "y")),
                borderRightWidth: Math.max(0, px2pt(br, "x")),
                borderBottomWidth: Math.max(0, px2pt(bb, "y")),
                borderLeftWidth: Math.max(0, px2pt(bl, "x")),
                borderColor: cell.borderColor ?? td.borderColor,
                padding: Math.max(0, px2pt((td.cellPadding || 4) * 0.75, "y")),
                overflow: "hidden",
              }}
            >
              <PdfText
                style={{
                  fontSize: Math.max(4, px2pt(fs, "y")),
                  fontFamily: isCustomFont
                    ? cell.fontFamily
                    : isBold
                      ? "Helvetica-Bold"
                      : isItalic
                        ? "Helvetica-Oblique"
                        : "Helvetica",
                  fontWeight: isCustomFont && isBold ? "bold" : "normal",
                  fontStyle: isCustomFont && isItalic ? "italic" : "normal",
                  color: tc,
                  textAlign: cell.align || "left",
                }}
              >
                {cell.text ?? ""}
              </PdfText>
            </View>
          );
        }),
      )}
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Thumbnail renderer ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export const renderTableToCanvas = (
  ctx: CanvasRenderingContext2D,
  td: TableData,
  x: number,
  y: number,
  w: number,
  h: number,
  thumbScale: number,
) => {
  const totalCW = td.colWidths.reduce((s, v) => s + v, 0);
  const cs = totalCW > 0 ? w / totalCW : 1;
  const sCW = td.colWidths.map((v) => v * cs);
  const totalRH = td.rowHeights.reduce((s, v) => s + v, 0);
  const rs = totalRH > 0 ? h / totalRH : 1;
  const sRH = td.rowHeights.map((v) => v * rs);
  const xP: number[] = [0];
  for (let i = 0; i < sCW.length; i++) xP.push(xP[i] + sCW[i]);
  const yP: number[] = [0];
  for (let i = 0; i < sRH.length; i++) yP.push(yP[i] + sRH[i]);
  const bw = td.borderOn ? Math.max(0.5, td.borderThickness * thumbScale) : 0;

  for (let ri = 0; ri < td.rows; ri++) {
    for (let ci = 0; ci < td.cols; ci++) {
      const cell = td.cells[ri]?.[ci];
      if (!cell || cell.hidden) continue;
      const cx = x + xP[ci] * thumbScale,
        cy = y + yP[ri] * thumbScale;
      const cw = (xP[ci + cell.colSpan] - xP[ci]) * thumbScale;
      const ch = (yP[ri + cell.rowSpan] - yP[ri]) * thumbScale;
      const isHdr = td.headerHighlight && ri === 0;
      ctx.fillStyle = cell.bgColor || (isHdr ? td.headerBgColor : "#ffffff");
      ctx.fillRect(cx, cy, cw, ch);
      if (bw > 0) {
        ctx.strokeStyle = td.borderColor;
        ctx.lineWidth = bw;
        ctx.strokeRect(cx, cy, cw, ch);
      }
      if (cell.text) {
        const fs = Math.max(1.2, (cell.fontSize ?? 8) * thumbScale);
        ctx.fillStyle = cell.fontColor || (isHdr ? "#fff" : "#1a202c");
        ctx.font = `${cell.italic ? "italic " : ""}${(cell.bold ?? isHdr) ? "bold " : ""}${fs}px sans-serif`;
        ctx.textBaseline = "top";
        const pad = td.cellPadding * thumbScale;
        const maxW = cw - pad * 2;
        const txt = cell.text.substring(0, 30);
        if (cell.align === "center") {
          const tw = ctx.measureText(txt).width;
          ctx.fillText(txt, cx + (cw - tw) / 2, cy + pad, maxW);
        } else if (cell.align === "right") {
          const tw = ctx.measureText(txt).width;
          ctx.fillText(txt, cx + cw - tw - pad, cy + pad, maxW);
        } else ctx.fillText(txt, cx + pad, cy + pad, maxW);
      }
    }
  }
};
