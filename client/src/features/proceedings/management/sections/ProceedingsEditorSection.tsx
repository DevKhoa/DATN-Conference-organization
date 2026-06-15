import React from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Check,
  ChevronRight,
  Crop,
  FilePlus,
  Grid3X3,
  GripVertical,
  ImagePlus,
  LayoutTemplate,
  Loader2,
  RefreshCw,
  RotateCw,
  Settings2,
  Sparkles,
  Trash2,
  Type,
  X,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import {
  type TableData,
  TableEditorCanvas,
  TablePropertiesPanel,
  InsertTableModal,
} from "@/components/ui/table-editor";
import { FontSelector, cssFontFamily } from "@/components/ui/font-manager";
import {
  type EditorEl,
  CANVAS_H,
  CANVAS_W,
  THUMB_H,
  THUMB_W,
} from "@/features/proceedings/types";
import {
  regenerateToc,
  renderThumbnail,
} from "@/features/proceedings/utils/editor-helpers";
import {
  DIRS,
  DIR_CURSOR,
  getHandlePosition,
  solidColorImg,
} from "@/features/proceedings/utils/canvas-helpers";
import {
  BG_CATEGORIES,
  GRADIENT_BACKGROUNDS,
  PRESET_BACKGROUNDS,
} from "@/features/proceedings/management/constants";

interface ProceedingsEditorSectionProps {
  vm: any;
}

const handlePos = getHandlePosition;

const BarElement: React.FC<{ el: EditorEl }> = ({ el }) => {
  const [height, setHeight] = React.useState(el.h);
  React.useEffect(() => {
    if (!el.linkedAbstractId) return;
    const target = document.getElementById(`editor-el-${el.linkedAbstractId}`);
    if (!target) return;

    const update = () => {
      const abstractBottom = target.offsetTop + target.offsetHeight;
      const newH = abstractBottom - el.y;
      if (newH > 0) setHeight(newH);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(target);
    return () => ro.disconnect();
  }, [el.linkedAbstractId, el.y]);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: el.w,
        height,
        backgroundColor: el.barColor ?? "#93c5fd",
        borderRadius: 1,
      }}
    />
  );
};

export const ProceedingsEditorSection = ({
  vm,
}: ProceedingsEditorSectionProps) => {
  const {
    activeTab,
    addImage,
    addTable,
    addText,
    applyBgColor,
    applyBgImage,
    applyCrop,
    autoAdjustCoverFontColor,
    bgApplyScope,
    bgPickerCategory,
    bgPickerSearch,
    bgPickerTab,
    cropDragRef,
    cropState,
    curPg,
    customBgColor,
    deleteEl,
    dragFromIdx,
    dragPosRef,
    dragRef,
    editingTxtId,
    edLoading,
    edPages,
    edReady,
    fontColorMsg,
    hf,
    imageToInsert,
    initEditor,
    insertPage,
    jumpToPage,
    loading,
    onCanvasPointerMove,
    onElPointerDown,
    openCrop,
    papersLoading,
    patchEl,
    patchPage,
    procData,
    reorderPage,
    saveHistory,
    scrollAreaRef,
    selEl,
    selElId,
    selPage,
    setBgApplyScope,
    setBgPickerCategory,
    setBgPickerSearch,
    setBgPickerTab,
    setCropState,
    setCustomBgColor,
    setDragFromIdx,
    setEditingTxtId,
    setEdPages,
    setEdReady,
    setHF,
    setImageToInsert,
    setSelElId,
    setSelPage,
    setShowBgPicker,
    setShowHFPanel,
    setShowInsertTable,
    setShowPagesSidebar,
    setTableSelectedCells,
    showBgPicker,
    showHFPanel,
    showInsertTable,
    showPagesSidebar,
    tableSelectedCells,
    thumbDirtyRef,
    thumbRefreshRef,
    tocDebounceRef,
    triggerThumbRefresh
  } = vm;

  return (
    <>
                      {/* ─── PDF EDITOR ─── */}
                      <div className="-mx-7 -mb-7" style={{ display: activeTab === "editor" ? "block" : "none" }}>
                        {/* ── Init splash ── */}
                        {!edReady && !edLoading && (
                          <div className="flex flex-col items-center justify-center h-80 gap-4">
                            <LayoutTemplate className="w-12 h-12 text-indigo-200" />
                            <p className="text-sm font-medium text-slate-600">
                              Render the current PDF into the visual editor
                            </p>
                            <button
                              onClick={() => initEditor()}
                              disabled={papersLoading}
                              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-indigo-200"
                            >
                              {papersLoading ? "Loading papers..." : "Open in Editor"}
                            </button>
                            <p className="text-xs text-slate-400 max-w-xs text-center">
                              All pages are rasterised from your current data.
                              Finish filling in the other tabs first, then come back
                              here to make final tweaks.
                            </p>
                          </div>
                        )}
      
                        {/* ── Loading ── */}
                        {edLoading && (
                          <div className="flex flex-col items-center justify-center h-80 gap-3">
                            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                            <p className="text-sm text-slate-500">
                              Rendering PDF pages…
                            </p>
                          </div>
                        )}
      
                        {/* ── Main editor layout ── */}
                        {edReady &&
                          edPages.length > 0 &&
                          (() => {
                            const btnCls = (on: boolean) =>
                              `p-2 rounded-lg border transition-all text-sm ${on
                                ? "bg-indigo-600 border-indigo-600 text-white"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                              }`;
      
                            return (
                              <div className="flex" style={{ height: 800 }}>
                                {/* ──── Left: page strip (collapsible) ──── */}
                                <div
                                  className="shrink-0 bg-slate-100 border-r border-slate-200 flex flex-col transition-all duration-200 overflow-hidden"
                                  style={{
                                    width: showPagesSidebar ? 136 : 0,
                                    minWidth: showPagesSidebar ? 136 : 0,
                                  }}
                                >
                                  <div className="px-3 py-2.5 border-b border-slate-200 bg-white flex items-center justify-between">
                                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                      Pages
                                    </span>
                                    <span className="text-[11px] text-slate-400">
                                      {edPages.length}
                                    </span>
                                  </div>
                                  <div className="flex-1 overflow-y-auto py-2 px-2 space-y-2">
                                    {edPages.map((pg, idx) => (
                                      <div
                                        key={pg.id}
                                        draggable
                                        onDragStart={(e) => {
                                          e.dataTransfer.effectAllowed = "move";
                                          setDragFromIdx(idx);
                                        }}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={() => {
                                          if (dragFromIdx !== null) {
                                            reorderPage(dragFromIdx, idx);
                                            setDragFromIdx(null);
                                          }
                                        }}
                                        onDragEnd={() => setDragFromIdx(null)}
                                        onClick={() => {
                                          jumpToPage(idx);
                                          setSelElId(null);
                                          setEditingTxtId(null);
                                        }}
                                        className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all select-none ${selPage === idx ? "border-indigo-500 shadow-lg" : dragFromIdx === idx ? "opacity-40 border-slate-300" : "border-transparent hover:border-slate-300"}`}
                                        style={{ width: THUMB_W, height: THUMB_H }}
                                      >
                                        {pg.bg ? (
                                          <img
                                            src={pg.bg}
                                            alt=""
                                            className="w-full h-full object-cover pointer-events-none"
                                          />
                                        ) : (
                                          <div className="w-full h-full bg-white flex items-center justify-center">
                                            <span className="text-[10px] text-slate-300">
                                              Blank
                                            </span>
                                          </div>
                                        )}
                                        <span className="absolute bottom-0 inset-x-0 text-center bg-black/40 text-white text-[9px] py-0.5">
                                          {idx + 1}
                                        </span>
                                        <GripVertical className="absolute top-1 left-1 w-3 h-3 text-white/60 pointer-events-none" />
                                      </div>
                                    ))}
                                  </div>
                                  <div className="p-2 border-t border-slate-200 bg-white">
                                    <button
                                      onClick={() => insertPage(selPage)}
                                      className="w-full py-1.5 border border-dashed border-slate-300 rounded-lg text-[11px] text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-1"
                                    >
                                      <FilePlus className="w-3 h-3" /> Insert after
                                    </button>
                                  </div>
                                </div>
                                {/* Toggle sidebar button */}
                                <button
                                  onClick={() => setShowPagesSidebar((v) => !v)}
                                  className="shrink-0 w-5 bg-slate-200 hover:bg-slate-300 border-r border-slate-300 flex items-center justify-center transition-all"
                                  title={
                                    showPagesSidebar ? "Hide pages" : "Show pages"
                                  }
                                >
                                  <ChevronRight
                                    className={`w-3.5 h-3.5 text-slate-500 transition-transform ${showPagesSidebar ? "rotate-180" : ""}`}
                                  />
                                </button>
      
                                {/* ──── Centre: canvas ──── */}
                                <div className="flex-1 flex flex-col min-w-0 bg-slate-200">
                                  {/* toolbar */}
                                  <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-2 shrink-0 flex-wrap">
                                    {/* add text */}
                                    <button
                                      title="Add text block"
                                      onClick={addText}
                                      className={btnCls(false)}
                                    >
                                      <Type className="w-4 h-4" />
                                    </button>
                                    {/* add image: upload */}
                                    <button
                                      title="Upload image"
                                      onClick={() => {
                                        const inp = document.createElement("input");
                                        inp.type = "file";
                                        inp.accept = "image/*";
                                        inp.onchange = () => {
                                          const f = inp.files?.[0];
                                          if (!f) return;
                                          const r = new FileReader();
                                          r.onload = (ev) =>
                                            setImageToInsert(ev.target!.result as string);
                                          r.readAsDataURL(f);
                                        };
                                        inp.click();
                                      }}
                                      className={btnCls(false)}
                                    >
                                      <ImagePlus className="w-4 h-4" />
                                    </button>
                                    {/* background picker */}
                                    <button
                                      title="Choose background"
                                      onClick={() => setShowBgPicker(true)}
                                      className={btnCls(showBgPicker)}
                                    >
                                      <LayoutTemplate className="w-4 h-4" />
                                    </button>
                                    {/* add table */}
                                    <button
                                      title="Insert table"
                                      onClick={() => setShowInsertTable(true)}
                                      className={btnCls(false)}
                                    >
                                      <Grid3X3 className="w-4 h-4" />
                                    </button>
      
                                    <div className="w-px h-5 bg-slate-200 mx-0.5" />
      
                                    {/* delete selected */}
                                    {selElId && (
                                      <button
                                        title="Delete element"
                                        onClick={() => deleteEl(selElId)}
                                        className="p-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-all"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
      
                                    {/* H/F toggle */}
                                    <button
                                      onClick={() => setShowHFPanel((v) => !v)}
                                      className={`ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${showHFPanel ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                                    >
                                      <Settings2 className="w-3.5 h-3.5" /> Header /
                                      Footer
                                    </button>
      
                                    {/* re-render */}
                                    <button
                                      onClick={() => {
                                        setEdReady(false);
                                        setEdPages([]);
                                        setTimeout(initEditor, 50);
                                      }}
                                      title="Re-render from current data"
                                      className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all"
                                    >
                                      <RefreshCw className="w-4 h-4" />
                                    </button>
      
                                    {/* Auto font color for cover page */}
                                    <div className="relative">
                                      <button
                                        onClick={autoAdjustCoverFontColor}
                                        title="Auto-adjust cover page font colors for best contrast (WCAG)"
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100 text-xs font-semibold transition-all"
                                      >
                                        <Sparkles className="w-3.5 h-3.5" />
                                        Auto Color
                                      </button>
                                      {fontColorMsg && (
                                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-medium px-2 py-1 rounded whitespace-nowrap z-50">
                                          {fontColorMsg}
                                        </div>
                                      )}
                                    </div>
                                  </div>
      
                                  {/* Header/Footer config panel */}
                                  {showHFPanel && (
                                    <div className="bg-indigo-50 border-b border-indigo-100 px-5 py-3 grid grid-cols-3 gap-4 items-end shrink-0">
                                      <div>
                                        <label className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider block mb-1">
                                          Header (all pages)
                                        </label>
                                        <input
                                          className="w-full px-2.5 py-1.5 text-xs border border-indigo-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-400"
                                          value={hf.headerText}
                                          onChange={(e) =>
                                            setHF((h) => ({
                                              ...h,
                                              headerText: e.target.value,
                                            }))
                                          }
                                          placeholder="e.g. SOICT 2025 Program Book"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider block mb-1">
                                          Footer text
                                        </label>
                                        <input
                                          className="w-full px-2.5 py-1.5 text-xs border border-indigo-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-400"
                                          value={hf.footerText}
                                          onChange={(e) =>
                                            setHF((h) => ({
                                              ...h,
                                              footerText: e.target.value,
                                            }))
                                          }
                                          placeholder="e.g. https://soict.org"
                                        />
                                      </div>
                                      <div className="space-y-1.5">
                                        <label className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider block">
                                          Page numbers
                                        </label>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <label className="flex items-center gap-1 text-xs text-slate-600 cursor-pointer">
                                            <input
                                              type="checkbox"
                                              checked={hf.showPageNum}
                                              onChange={(e) =>
                                                setHF((h) => ({
                                                  ...h,
                                                  showPageNum: e.target.checked,
                                                }))
                                              }
                                              className="accent-indigo-600"
                                            />
                                            Show
                                          </label>
                                          <span className="text-xs text-slate-500">
                                            Start:
                                          </span>
                                          <input
                                            type="number"
                                            min={1}
                                            value={hf.startFrom}
                                            onChange={(e) =>
                                              setHF((h) => ({
                                                ...h,
                                                startFrom: Number(e.target.value),
                                              }))
                                            }
                                            className="w-12 text-xs border border-indigo-200 rounded px-1.5 py-1 bg-white outline-none"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  )}
      
                                  {/* Vùng cuộn chính của Editor */}
                                  <div
                                    ref={scrollAreaRef}
                                    className="flex-1 overflow-auto flex flex-col items-center pt-6 pb-10 gap-10 bg-slate-300 transition-all"
                                    onPointerMove={onCanvasPointerMove}
                                    onPointerUp={(e) => {
                                      if (dragRef.current && dragPosRef.current) {
                                        const { x, y, w, h } = dragPosRef.current;
                                        const elId = dragRef.current.elId;
                                        const fromPage = selPage;
      
                                        saveHistory();
      
                                        // Find which page the pointer is over using clientY
                                        const pageEls = document.querySelectorAll(".editor-page-container");
                                        let targetPageIdx = fromPage;
                                        pageEls.forEach((pageEl, idx) => {
                                          const rect = pageEl.getBoundingClientRect();
                                          if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
                                            targetPageIdx = idx;
                                          }
                                        });
      
                                        if (targetPageIdx !== fromPage) {
                                          // Cross-page move: calculate y relative to target page
                                          const targetPageEl = document.getElementById(`editor-page-${targetPageIdx}`);
                                          let newY = y;
                                          if (targetPageEl) {
                                            const fromPageEl = document.getElementById(`editor-page-${fromPage}`);
                                            const fromRect = fromPageEl?.getBoundingClientRect();
                                            const toRect = targetPageEl.getBoundingClientRect();
                                            if (fromRect && toRect) {
                                              newY = y + (fromRect.top - toRect.top);
                                            }
                                          }
                                          setEdPages((prev) => {
                                            const el = prev[fromPage].els.find((e) => e.id === elId);
                                            if (!el) return prev;
                                            return prev.map((pg, pi) => {
                                              if (pi === fromPage) return { ...pg, els: pg.els.filter((e) => e.id !== elId) };
                                              if (pi === targetPageIdx) return { ...pg, els: [...pg.els, { ...el, x: Math.max(0, x), y: Math.max(0, newY), w, h }] };
                                              return pg;
                                            });
                                          });
                                          setSelPage(targetPageIdx);
                                          setSelElId(elId);
                                        } else {
                                          patchEl(elId, el => ({ ...el, x: Math.max(0, x), y: Math.max(0, y), w, h }));
                                        }
                                      }
                                      dragRef.current = null;
                                      dragPosRef.current = null;
                                    }}
                                    onClick={() => {
                                      setSelElId(null);
                                      setEditingTxtId(null);
                                      setTableSelectedCells([]);
                                    }}
                                  >
                                    {edPages.map((pg, idx) => {
                                      const isNearby = Math.abs(idx - selPage) <= 2;
                                      return (
                                        <div
                                          key={pg.id}
                                          id={`editor-page-${idx}`}
                                          data-page-index={idx}
                                          className="editor-page-container relative shadow-2xl flex-shrink-0"
                                          style={{
                                            width: CANVAS_W,
                                            height: CANVAS_H,
                                            background: pg.bgColor || "#ffffff",
                                          }}
                                        >
                                          {/* Trang xa: chỉ hiện thumbnail, không mount elements */}
                                          {!isNearby ? (
                                            pg.bg
                                              ? <img
                                                src={pg.bg}
                                                alt=""
                                                draggable={false}
                                                className="absolute inset-0 w-full h-full select-none cursor-pointer"
                                                onClick={() => jumpToPage(idx)}
                                              />
                                              : <div
                                                className="absolute inset-0 cursor-pointer"
                                                style={{ backgroundColor: pg.bgColor || "#ffffff" }}
                                                onClick={() => jumpToPage(idx)}
                                              />
                                          ) : (
                                            <>
                                              {/* 1. Page Background */}
                                              <div
                                                className="absolute inset-0"
                                                style={{
                                                  zIndex: 0,
                                                  background: pg.bgColor || "#ffffff",
                                                }}
                                              />
      
                                              {/* 2. Header Preview */}
                                              {hf.headerText.trim() && idx > 1 && (
                                                <div
                                                  className="absolute top-3 left-12 right-12 text-center text-[9px] font-semibold border-b pb-0.5 pointer-events-none"
                                                  style={{ zIndex: 10, color: "#1a3a6b", borderColor: "#1a3a6b" }}
                                                >
                                                  {hf.headerText}
                                                </div>
                                              )}
      
                                              {/* 3. Footer Preview */}
                                              {idx > 1 && (
                                                <div
                                                  className="absolute pointer-events-none"
                                                  style={{ bottom: 10, left: 48, right: 48, zIndex: 10 }}
                                                >
                                                  {/* conferenceName above line — shrink font if too long */}
                                                  {procData.cover.conferenceName && (
                                                    <div style={{
                                                      fontSize: procData.cover.conferenceName.length > 80 ? 6.5 : procData.cover.conferenceName.length > 55 ? 7 : 8,
                                                      color: "#1a3a6b",
                                                      fontFamily: "Helvetica, Arial, sans-serif",
                                                      whiteSpace: "nowrap",
                                                      overflow: "hidden",
                                                      textOverflow: "ellipsis",
                                                      marginBottom: 3,
                                                    }}>
                                                      {procData.cover.conferenceName}
                                                    </div>
                                                  )}
                                                  {/* divider */}
                                                  <div style={{ height: 1, backgroundColor: "#1a3a6b", marginBottom: 3 }} />
                                                  {/* footerText + page number */}
                                                  <div className="flex items-center justify-between">
                                                    <span style={{ fontSize: 8, color: "#1a3a6b", fontFamily: "Helvetica, Arial, sans-serif" }}>
                                                      {hf.footerText.trim() || "\u00a0"}
                                                    </span>
                                                    {hf.showPageNum && (
                                                      <span style={{ fontSize: 10, color: "#1a3a6b", fontWeight: "bold", fontFamily: "Helvetica, Arial, sans-serif" }}>
                                                        {hf.startFrom + (idx - 2)}
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              )}
      
                                              {/* 4. Overlay Elements */}
                                              {[...pg.els]
                                                .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
                                                .map((el) => {
                                                  const isSel = selElId === el.id;
                                                  return (
                                                    <div
                                                      id={`editor-el-${el.id}`}
                                                      key={el.id}
                                                      className={`absolute group ${isSel ? "ring-2 ring-indigo-500" : "hover:ring-1 hover:ring-indigo-300"}`}
                                                      style={{
                                                        left: el.x - (isSel && el.type === "table" ? 22 : 0),
                                                        top: el.y - (isSel && el.type === "table" ? 16 : 0),
                                                        width: el.w + (isSel && el.type === "table" ? 22 : 0),
                                                        // Text: fixed height with overflow hidden to clip content to measured box
                                                        // Text: auto height to visually stretch over logical el.h
                                                        height: (el.type === "bar" || el.type === "text")
                                                          ? "auto"
                                                          : el.h + (isSel && el.type === "table" ? 16 : 0),
                                                        minHeight: (el.type === "bar" || el.type === "text") ? el.h : undefined,
                                                        // Clip text that overflows the measured box (e.g. long bio chunks)
                                                        overflow: (el.type === "table" || el.type === "text") ? "visible" : "hidden",
                                                        cursor: el.type === "table" ? (isSel ? "default" : "pointer") : "move",
                                                        userSelect: "none",
                                                        zIndex: el.zIndex ?? 10,
                                                        transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                                                        transformOrigin: "center center",
                                                      }}
                                                      onPointerDown={(e) => {
                                                        setSelPage(idx);
                                                        onElPointerDown(e, el, "move");
                                                      }}
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelPage(idx);
                                                        setSelElId(el.id);
                                                      }}
                                                      onDoubleClick={(e) => {
                                                        e.stopPropagation();
                                                        if (el.type === "text") setEditingTxtId(el.id);
                                                      }}
                                                    >
                                                      {el.type === "bar" && (
                                                        <BarElement el={el} />
                                                      )}
                                                      {el.type === "text" && (
                                                        editingTxtId === el.id ? (
                                                          <textarea
                                                            autoFocus
                                                            className="w-full h-full bg-transparent outline-none resize-none p-0 border-none"
                                                            style={{
                                                              fontSize: el.fontSize,
                                                              fontWeight: el.bold ? "bold" : "normal",
                                                              fontStyle: el.italic ? "italic" : "normal",
                                                              color: el.color,
                                                              textAlign: el.align as any,
                                                              lineHeight: 1.4,
                                                              fontFamily: el.fontFamily ? cssFontFamily(el.fontFamily) : "inherit",
                                                            }}
                                                            value={el.text ?? ""}
                                                            onChange={(ev) => {
                                                              const val = ev.target.value;
                                                              patchEl(el.id, (e2) => ({ ...e2, text: val }));
                                                              if (el.isTocEntry) {
                                                                if (tocDebounceRef.current) clearTimeout(tocDebounceRef.current);
                                                                tocDebounceRef.current = setTimeout(() => {
                                                                  setEdPages((prev) => {
                                                                    const synced = regenerateToc(prev);
                                                                    renderThumbnail(synced[1]).then((thumb) => {
                                                                      setEdPages((p) => p.map((pg, i) => i === 1 ? { ...pg, bg: thumb } : pg));
                                                                    });
                                                                    return synced;
                                                                  });
                                                                }, 2000);
                                                              }
                                                            }}
                                                            onBlur={(ev) => {
                                                              patchEl(el.id, (e2) => ({ ...e2, text: ev.target.value }));
                                                              setEditingTxtId(null);
                                                            }}
                                                            onKeyDown={(ev) => {
                                                              if (ev.key === "Escape") {
                                                                patchEl(el.id, (e2) => ({ ...e2, text: (ev.target as HTMLTextAreaElement).value }));
                                                                setEditingTxtId(null);
                                                              }
                                                            }}
                                                            onClick={(ev) => ev.stopPropagation()}
                                                            onPointerDown={(ev) => ev.stopPropagation()}
                                                          />
                                                        ) : (
                                                          <div
                                                            className="w-full pointer-events-none"
                                                            style={{
                                                              fontSize: el.fontSize,
                                                              fontWeight: el.bold ? "bold" : "normal",
                                                              fontStyle: el.italic ? "italic" : "normal",
                                                              color: el.color,
                                                              textAlign: el.align as any,
                                                              lineHeight: 1.4,
                                                              // Use normal wrap so browser reflows with actual font metrics
                                                              // pre-wrap would make canvas-measured \n breaks visible as wrong line breaks
                                                              whiteSpace: "normal",
                                                              wordBreak: "break-word",
                                                              overflowWrap: "break-word",
                                                              fontFamily: el.fontFamily ? cssFontFamily(el.fontFamily) : "inherit",
                                                              overflow: "visible",
                                                            }}
                                                          >
                                                            {el.text}
                                                          </div>
                                                        )
                                                      )}
                                                      {el.type === "image" && el.src && (
                                                        <img
                                                          src={el.src}
                                                          alt=""
                                                          draggable={false}
                                                          className="w-full h-full pointer-events-none select-none"
                                                          style={{
                                                            // Background image (full-page, zIndex=1) → fill
                                                            // Normal image (logo, photo etc.) → contain to preserve ratio
                                                            objectFit: (el.zIndex === 1 && el.x === 0 && el.y === 0) ? "fill" : "contain",
                                                            display: "block",
                                                          }}
                                                        />
                                                      )}
                                                      {/* Move handles for table */}
                                                      {isSel && el.type === "table" && (
                                                        <>
                                                          <div className="absolute top-[-6px] left-[-6px] right-[-6px] h-[12px] cursor-move z-10" onPointerDown={(e) => onElPointerDown(e, el, "move")} />
                                                          <div className="absolute bottom-[-6px] left-[-6px] right-[-6px] h-[12px] cursor-move z-10" onPointerDown={(e) => onElPointerDown(e, el, "move")} />
                                                          <div className="absolute left-[-6px] top-[-6px] bottom-[-6px] w-[12px] cursor-move z-10" onPointerDown={(e) => onElPointerDown(e, el, "move")} />
                                                          <div className="absolute right-[-6px] top-[-6px] bottom-[-6px] w-[12px] cursor-move z-10" onPointerDown={(e) => onElPointerDown(e, el, "move")} />
                                                        </>
                                                      )}
                                                      {el.type === "table" && el.tableData && (
                                                        <TableEditorCanvas
                                                          tableData={el.tableData}
                                                          elW={el.w}
                                                          elH={el.h}
                                                          isSelected={selElId === el.id}
                                                          selectedCells={selElId === el.id ? tableSelectedCells : []}
                                                          onSelectCells={(cells) => {
                                                            setSelElId(el.id);
                                                            setTableSelectedCells(cells);
                                                          }}
                                                          onPatchTable={(td) =>
                                                            patchEl(el.id, (e2) => ({
                                                              ...e2,
                                                              tableData: td,
                                                              h: td.rowHeights.reduce((s, v) => s + v, 0),
                                                            }))
                                                          }
                                                        />
                                                      )}
                                                      {isSel && DIRS.map((dir) => (
                                                        <div
                                                          key={dir}
                                                          style={handlePos(dir)}
                                                          onPointerDown={(e) => onElPointerDown(e, el, "resize", dir)}
                                                        />
                                                      ))}
                                                    </div>
                                                  );
                                                })}
                                            </>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
      
                                {/* ──── Right: properties panel ──── */}
                                <div className="w-[220px] shrink-0 bg-white border-l border-slate-200 overflow-y-auto flex flex-col">
                                  <div className="px-4 py-3 border-b border-slate-100 shrink-0">
                                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                      Properties
                                    </p>
                                  </div>
      
                                  {/* no selection → page controls */}
                                  {!selEl && (
                                    <div className="p-4 space-y-4">
                                      <p className="text-xs text-slate-400 italic leading-relaxed">
                                        Click an element on the canvas to edit it.
                                        Double-click a text block to type.
                                      </p>
                                      {/* Keyboard shortcut hints */}
                                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1.5">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Keyboard Shortcuts</p>
                                        {[
                                          ["Ctrl + Z", "Undo"],
                                          ["Ctrl + Y", "Redo"],
                                          ["Ctrl + C", "Copy element"],
                                          ["Ctrl + V", "Paste element"],
                                          ["Delete", "Delete element"],
                                          ["Dbl-click", "Edit text"],
                                        ].map(([key, desc]) => (
                                          <div key={key} className="flex items-center justify-between gap-2">
                                            <kbd className="text-[9px] font-mono bg-white border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">{key}</kbd>
                                            <span className="text-[10px] text-slate-500 text-right">{desc}</span>
                                          </div>
                                        ))}
                                      </div>
                                      <div className="border-t border-slate-100 pt-4 space-y-2">
                                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                          Page {selPage + 1} / {edPages.length}
                                        </p>
                                        <p className="text-xs text-slate-400">
                                          {curPg?.els?.length ?? 0} element
                                          {(curPg?.els?.length ?? 0) !== 1 ? "s" : ""} on
                                          this page
                                        </p>
                                        <button
                                          onClick={() => insertPage(selPage)}
                                          className="w-full py-2 text-xs border border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center gap-1.5 transition-all"
                                        >
                                          <FilePlus className="w-3.5 h-3.5" />{" "}
                                          Insert page after
                                        </button>
                                        {edPages.length > 1 && (
                                          <button
                                            onClick={() => {
                                              saveHistory();
                                              setEdPages((ps) =>
                                                ps.filter((_, i) => i !== selPage),
                                              );
                                              setSelPage(Math.max(0, selPage - 1));
                                              setSelElId(null);
                                            }}
                                            className="w-full py-2 text-xs border border-dashed border-red-200 rounded-lg text-red-400 hover:bg-red-50 flex items-center justify-center gap-1.5 transition-all"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />{" "}
                                            Delete this page
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  )}
      
                                  {/* element selected */}
                                  {selEl && (
                                    <div className="p-4 space-y-4 flex-1">
                                      {/* ── Text props ── */}
                                      {selEl.type === "text" && (
                                        <>
                                          <div>
                                            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                                              Font Family & Size
                                            </label>
                                            <FontSelector
                                              value={selEl.fontFamily ?? ""}
                                              onChange={(f) =>
                                                patchEl(selEl.id, (el) => ({
                                                  ...el,
                                                  fontFamily: f,
                                                }))
                                              }
                                              className="mb-1.5"
                                            />
                                            <input
                                              type="number"
                                              min={6}
                                              max={96}
                                              value={selEl.fontSize ?? 14}
                                              onChange={(e) =>
                                                patchEl(selEl.id, (el) => ({
                                                  ...el,
                                                  fontSize: Number(e.target.value),
                                                }))
                                              }
                                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-400"
                                            />
                                          </div>
                                          <div>
                                            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                                              Style
                                            </label>
                                            <div className="flex gap-1.5">
                                              <button
                                                onClick={() =>
                                                  patchEl(selEl.id, (el) => ({
                                                    ...el,
                                                    bold: !el.bold,
                                                  }))
                                                }
                                                className={`flex-1 py-1.5 rounded-lg border text-sm font-bold transition-all ${selEl.bold ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"}`}
                                              >
                                                B
                                              </button>
                                              <button
                                                onClick={() =>
                                                  patchEl(selEl.id, (el) => ({
                                                    ...el,
                                                    italic: !el.italic,
                                                  }))
                                                }
                                                className={`flex-1 py-1.5 rounded-lg border text-sm italic transition-all ${selEl.italic ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"}`}
                                              >
                                                I
                                              </button>
                                            </div>
                                          </div>
                                          <div>
                                            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                                              Alignment
                                            </label>
                                            <div className="flex gap-1.5">
                                              {(
                                                ["left", "center", "right"] as const
                                              ).map((a) => (
                                                <button
                                                  key={a}
                                                  onClick={() =>
                                                    patchEl(selEl.id, (el) => ({
                                                      ...el,
                                                      align: a,
                                                    }))
                                                  }
                                                  className={`flex-1 py-1.5 rounded-lg border flex items-center justify-center transition-all ${selEl.align === a ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                                                >
                                                  {a === "left" ? (
                                                    <AlignLeft className="w-3.5 h-3.5" />
                                                  ) : a === "center" ? (
                                                    <AlignCenter className="w-3.5 h-3.5" />
                                                  ) : (
                                                    <AlignRight className="w-3.5 h-3.5" />
                                                  )}
                                                </button>
                                              ))}
                                            </div>
                                          </div>
                                          <div>
                                            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                                              Color
                                            </label>
                                            <div className="flex items-center gap-2">
                                              <input
                                                type="color"
                                                value={selEl.color ?? "#000000"}
                                                onChange={(e) =>
                                                  patchEl(selEl.id, (el) => ({
                                                    ...el,
                                                    color: e.target.value,
                                                  }))
                                                }
                                                className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
                                              />
                                              <input
                                                value={selEl.color ?? "#000000"}
                                                onChange={(e) =>
                                                  patchEl(selEl.id, (el) => ({
                                                    ...el,
                                                    color: e.target.value,
                                                  }))
                                                }
                                                className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-400"
                                              />
                                            </div>
                                          </div>
                                        </>
                                      )}
      
                                      {/* ── Image props ── */}
                                      {selEl.type === "image" && (
                                        <>
                                          <div>
                                            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                                              Preview
                                            </label>
                                            <div
                                              className="rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center"
                                              style={{ height: 72 }}
                                            >
                                              {selEl.src && (
                                                <img
                                                  src={selEl.src}
                                                  alt=""
                                                  className="max-h-full max-w-full object-contain"
                                                />
                                              )}
                                            </div>
                                          </div>
                                          <button
                                            onClick={() => openCrop(selEl)}
                                            className="w-full py-2 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all"
                                          >
                                            <Crop className="w-3.5 h-3.5" /> Crop
                                            image
                                          </button>
                                          <button
                                            onClick={() => {
                                              const inp =
                                                document.createElement("input");
                                              inp.type = "file";
                                              inp.accept = "image/*";
                                              inp.onchange = () => {
                                                const f = inp.files?.[0];
                                                if (!f) return;
                                                const r = new FileReader();
                                                r.onload = (ev) =>
                                                  patchEl(selEl.id, (el) => ({
                                                    ...el,
                                                    src: ev.target!
                                                      .result as string,
                                                  }));
                                                r.readAsDataURL(f);
                                              };
                                              inp.click();
                                            }}
                                            className="w-full py-2 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all"
                                          >
                                            <ImagePlus className="w-3.5 h-3.5" />{" "}
                                            Replace image
                                          </button>
                                        </>
                                      )}
      
                                      {/* ── Table props ── */}
                                      {selEl.type === "table" &&
                                        selEl.tableData && (
                                          <TablePropertiesPanel
                                            tableData={selEl.tableData}
                                            selectedCells={tableSelectedCells}
                                            onPatchTable={(td) =>
                                              patchEl(selEl.id, (el) => ({
                                                ...el,
                                                tableData: td,
                                                h: td.rowHeights.reduce(
                                                  (s, v) => s + v,
                                                  0,
                                                ),
                                              }))
                                            }
                                            elementW={selEl.w}
                                          />
                                        )}
      
                                      {/* ── Position & size (shared) ── */}
                                      <div className="border-t border-slate-100 pt-4">
                                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                                          Position & size
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                          {(["x", "y", "w", "h"] as const).map(
                                            (k) => (
                                              <div key={k}>
                                                <label className="text-[10px] text-slate-400 block mb-0.5">
                                                  {k.toUpperCase()}
                                                </label>
                                                <input
                                                  type="number"
                                                  value={Math.round(
                                                    (selEl as any)[k],
                                                  )}
                                                  onChange={(e) =>
                                                    patchEl(selEl.id, (el) => ({
                                                      ...el,
                                                      [k]: Number(e.target.value),
                                                    }))
                                                  }
                                                  className="w-full px-2 py-1 border border-slate-200 rounded text-xs outline-none focus:ring-1 focus:ring-indigo-400"
                                                />
                                              </div>
                                            ),
                                          )}
                                        </div>
                                      </div>
      
                                      {/* ── Rotation (shared) ── */}
                                      <div className="border-t border-slate-100 pt-4">
                                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                                          <RotateCw className="w-3 h-3 inline mr-1" />
                                          Rotation
                                        </label>
                                        <div className="flex items-center gap-2">
                                          <input
                                            type="range"
                                            min={-180}
                                            max={360}
                                            value={selEl.rotation ?? 0}
                                            onChange={(e) =>
                                              patchEl(selEl.id, (el) => ({
                                                ...el,
                                                rotation: Number(e.target.value),
                                              }))
                                            }
                                            className="flex-1 accent-indigo-600"
                                          />
                                          <input
                                            type="number"
                                            min={-360}
                                            max={360}
                                            value={selEl.rotation ?? 0}
                                            onChange={(e) =>
                                              patchEl(selEl.id, (el) => ({
                                                ...el,
                                                rotation: Number(e.target.value),
                                              }))
                                            }
                                            className="w-14 px-2 py-1 border border-slate-200 rounded text-xs outline-none focus:ring-1 focus:ring-indigo-400 text-center"
                                          />
                                        </div>
                                        <div className="flex gap-1.5 mt-2">
                                          {[0, 90, 180, 270].map((deg) => (
                                            <button
                                              key={deg}
                                              onClick={() =>
                                                patchEl(selEl.id, (el) => ({
                                                  ...el,
                                                  rotation: deg,
                                                }))
                                              }
                                              className={`flex-1 py-1 text-[10px] rounded border transition-all ${(selEl.rotation ?? 0) === deg
                                                ? "bg-indigo-600 border-indigo-600 text-white"
                                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                                }`}
                                            >
                                              {deg}°
                                            </button>
                                          ))}
                                        </div>
                                      </div>
      
                                      <button
                                        onClick={() => deleteEl(selEl.id)}
                                        className="w-full py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" /> Delete
                                        element
                                      </button>
                                      <div className="border-t border-slate-100 pt-3">
                                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                                          Layer
                                        </label>
                                        <div className="flex gap-2">
                                          <button
                                            onClick={() =>
                                              patchEl(selEl.id, (e) => ({
                                                ...e,
                                                zIndex: (e.zIndex ?? 10) + 1,
                                              }))
                                            }
                                            className="flex-1 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50"
                                          >
                                            ↑ Forward
                                          </button>
                                          <button
                                            onClick={() =>
                                              patchEl(selEl.id, (e) => ({
                                                ...e,
                                                zIndex: Math.max(
                                                  1,
                                                  (e.zIndex ?? 10) - 1,
                                                ),
                                              }))
                                            }
                                            className="flex-1 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50"
                                          >
                                            ↓ Backward
                                          </button>
                                        </div>
                                      </div>
      
                                      {/* ── TOC Entry ── */}
                                      {selEl.type === "text" && (
                                        <div className="border-t border-slate-100 pt-3">
                                          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                                            Table of Contents
                                          </label>
                                          <label className="flex items-center gap-2 cursor-pointer select-none mb-2">
                                            <input
                                              type="checkbox"
                                              checked={selEl.isTocEntry ?? false}
                                              onChange={async (e) => {
                                                const checked = e.target.checked;
                                                const elId = selEl.id;
                                                const scX = CANVAS_W / 595;
                                                const scY = CANVAS_H / 842;
                                                const ML = Math.round(55 * scX);
                                                const CW = CANVAS_W - ML * 2;
      
                                                saveHistory();
      
                                                setEdPages((prev) => {
                                                  let newPages = prev.map((pg, pi) => {
                                                    if (pi !== selPage) return pg;
      
                                                    let newEls = pg.els.map((el) => {
                                                      if (el.id === elId) {
                                                        return {
                                                          ...el,
                                                          isTocEntry: checked,
                                                          fontSize: checked ? Math.round(13 * scY) : el.fontSize,
                                                          bold: checked ? true : el.bold,
                                                          color: checked ? "#1a3a6b" : el.color,
                                                          text: checked ? el.text?.toUpperCase() : el.text,
                                                          tocLabel: checked ? el.text : "",
                                                        };
                                                      }
                                                      return el;
                                                    });
      
                                                    // Add divider line below when ticked
                                                    if (checked) {
                                                      const lineY = selEl.y + selEl.h + 4;
                                                      newEls.push({
                                                        id: uuidv4(),
                                                        type: "image",
                                                        x: ML,
                                                        y: lineY,
                                                        w: CW,
                                                        h: Math.round(2 * scY),
                                                        src: solidColorImg("#1a3a6b", CW, 2),
                                                        zIndex: selEl.zIndex,
                                                      });
                                                    }
      
                                                    return { ...pg, els: newEls };
                                                  });
      
                                                  // Auto-sync TOC immediately
                                                  return regenerateToc(newPages);
                                                });
      
                                                // Re-render TOC thumbnail
                                                setTimeout(async () => {
                                                  setEdPages((prev) => {
                                                    const synced = regenerateToc(prev);
                                                    renderThumbnail(synced[1]).then((thumb) => {
                                                      setEdPages((p) => p.map((pg, i) => i === 1 ? { ...pg, bg: thumb } : pg));
                                                    });
                                                    return synced;
                                                  });
                                                }, 50);
                                              }}
                                              className="accent-indigo-600 w-3.5 h-3.5"
                                            />
                                            <span className="text-xs text-slate-700">
                                              Add to TOC
                                            </span>
                                          </label>
                                          {selEl.isTocEntry && (
                                            <input
                                              type="text"
                                              placeholder="TOC label (default: element text)"
                                              value={selEl.tocLabel || ""}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                const elId = selEl.id;
                                                setEdPages((prev) => {
                                                  const patched = prev.map(
                                                    (pg, pi) =>
                                                      pi !== selPage
                                                        ? pg
                                                        : {
                                                          ...pg,
                                                          els: pg.els.map((el) =>
                                                            el.id === elId
                                                              ? { ...el, tocLabel: val }
                                                              : el,
                                                          ),
                                                        },
                                                  );
                                                  return regenerateToc(patched);
                                                });
                                              }}
                                              className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400"
                                            />
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
      
                        {/* ──── Crop modal ──── */}
                        {cropState &&
                          (() => {
                            const DISP = 460;
                            const scale = Math.min(
                              1,
                              DISP / cropState.natW,
                              DISP / cropState.natH,
                            );
                            const dw = cropState.natW * scale,
                              dh = cropState.natH * scale;
                            return (
                              <div
                                className="fixed inset-0 bg-black/60 flex items-center justify-center p-4"
                                style={{ zIndex: 9999 }}
                                onClick={(e) => e.stopPropagation()}
                                onPointerDown={(e) => e.stopPropagation()}
                              >
                                <div
                                  className="bg-white rounded-2xl shadow-2xl p-6 flex flex-col gap-4"
                                  style={{ maxWidth: 560, width: "100%" }}
                                >
                                  <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                                      <Crop className="w-4 h-4 text-indigo-600" />{" "}
                                      Crop Image
                                    </h3>
                                    <button
                                      onClick={() => setCropState(null)}
                                      className="p-1.5 rounded-lg hover:bg-slate-100"
                                    >
                                      <X className="w-4 h-4 text-slate-500" />
                                    </button>
                                  </div>
                                  {/* crop canvas */}
                                  <div
                                    className="relative overflow-hidden rounded-xl bg-slate-100 mx-auto"
                                    style={{ width: dw, height: dh }}
                                  >
                                    <img
                                      src={cropState.src}
                                      alt=""
                                      style={{ width: dw, height: dh }}
                                      draggable={false}
                                    />
                                    {/* dark vignette outside crop */}
                                    <div
                                      className="absolute inset-0 pointer-events-none"
                                      style={{ background: "rgba(0,0,0,0.45)" }}
                                    />
                                    {/* crop box */}
                                    <div
                                      className="absolute border-2 border-indigo-500"
                                      style={{
                                        left: cropState.cx * scale,
                                        top: cropState.cy * scale,
                                        width: cropState.cw * scale,
                                        height: cropState.ch * scale,
                                        background: "transparent",
                                        boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
                                        cursor: "move",
                                      }}
                                      onPointerDown={(e) => {
                                        e.stopPropagation();
                                        (
                                          e.currentTarget as Element
                                        ).setPointerCapture(e.pointerId);
                                        cropDragRef.current = {
                                          active: true,
                                          mode: "move",
                                          sx: e.clientX,
                                          sy: e.clientY,
                                          origCx: cropState.cx,
                                          origCy: cropState.cy,
                                          origCw: cropState.cw,
                                          origCh: cropState.ch,
                                        };
                                      }}
                                      onPointerMove={(e) => {
                                        const d = cropDragRef.current;
                                        if (!d.active) return;
                                        const dx = (e.clientX - d.sx) / scale,
                                          dy = (e.clientY - d.sy) / scale;
                                        if (d.mode === "move") {
                                          setCropState((c) =>
                                            c
                                              ? {
                                                ...c,
                                                cx: Math.max(
                                                  0,
                                                  Math.min(
                                                    c.natW - c.cw,
                                                    d.origCx + dx,
                                                  ),
                                                ),
                                                cy: Math.max(
                                                  0,
                                                  Math.min(
                                                    c.natH - c.ch,
                                                    d.origCy + dy,
                                                  ),
                                                ),
                                              }
                                              : c,
                                          );
                                        } else {
                                          setCropState((c) => {
                                            if (!c) return c;
                                            let { cx, cy, cw, ch } = {
                                              cx: d.origCx,
                                              cy: d.origCy,
                                              cw: d.origCw,
                                              ch: d.origCh,
                                            };
                                            if (d.mode.includes("e"))
                                              cw = Math.max(20, d.origCw + dx);
                                            if (d.mode.includes("s"))
                                              ch = Math.max(20, d.origCh + dy);
                                            if (d.mode.includes("w")) {
                                              cx = d.origCx + dx;
                                              cw = Math.max(20, d.origCw - dx);
                                            }
                                            if (d.mode.includes("n")) {
                                              cy = d.origCy + dy;
                                              ch = Math.max(20, d.origCh - dy);
                                            }
                                            return { ...c, cx, cy, cw, ch };
                                          });
                                        }
                                      }}
                                      onPointerUp={() => {
                                        cropDragRef.current.active = false;
                                      }}
                                    >
                                      {/* rule-of-thirds grid */}
                                      <div
                                        className="absolute inset-0 pointer-events-none"
                                        style={{
                                          backgroundImage:
                                            "linear-gradient(rgba(255,255,255,.25) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.25) 1px, transparent 1px)",
                                          backgroundSize: "33.33% 33.33%",
                                        }}
                                      />
                                      {/* resize handles on crop box */}
                                      {DIRS.map((dir) => (
                                        <div
                                          key={dir}
                                          style={{
                                            ...handlePos(dir),
                                            background: "white",
                                            border: "2px solid #4f46e5",
                                            cursor: DIR_CURSOR[dir],
                                          }}
                                          onPointerDown={(e) => {
                                            e.stopPropagation();
                                            (
                                              e.currentTarget as Element
                                            ).setPointerCapture(e.pointerId);
                                            cropDragRef.current = {
                                              active: true,
                                              mode: dir,
                                              sx: e.clientX,
                                              sy: e.clientY,
                                              origCx: cropState.cx,
                                              origCy: cropState.cy,
                                              origCw: cropState.cw,
                                              origCh: cropState.ch,
                                            };
                                          }}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                  <p className="text-xs text-slate-400 text-center">
                                    Drag box to move · Drag corner/edge handles to
                                    resize &nbsp;·&nbsp;
                                    {Math.round(cropState.cw)} ×{" "}
                                    {Math.round(cropState.ch)} px
                                  </p>
                                  <div className="flex gap-3">
                                    <button
                                      onClick={() => setCropState(null)}
                                      className="flex-1 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-all"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={applyCrop}
                                      className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all"
                                    >
                                      <Check className="w-4 h-4" /> Apply crop
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
      
                        {showBgPicker && (
                          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[9999]" onClick={() => setShowBgPicker(false)}>
                            <div className="bg-white rounded-2xl shadow-2xl flex flex-col w-full max-w-4xl h-[82vh]" onClick={e => e.stopPropagation()}>
                              {/* Header */}
                              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                  <LayoutTemplate className="w-5 h-5 text-indigo-600" />
                                  Choose Background
                                </h3>
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() => {
                                      const inp = document.createElement("input");
                                      inp.type = "file"; inp.accept = "image/*";
                                      inp.onchange = () => {
                                        const f = inp.files?.[0]; if (!f) return;
                                        const r = new FileReader();
                                        r.onload = (ev) => { applyBgImage(ev.target!.result as string, bgApplyScope); setShowBgPicker(false); };
                                        r.readAsDataURL(f);
                                      };
                                      inp.click();
                                    }}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                                  >
                                    <ImagePlus className="w-3.5 h-3.5" /> Upload Custom
                                  </button>
                                  <button onClick={() => setShowBgPicker(false)} className="p-1.5 rounded-lg hover:bg-slate-100">
                                    <X className="w-4 h-4 text-slate-500" />
                                  </button>
                                </div>
                              </div>
      
                              {/* Tabs + Apply scope + Search */}
                              <div className="px-6 py-3 border-b border-slate-100 shrink-0 space-y-2.5">
                                {/* Tab switcher */}
                                <div className="flex items-center gap-3">
                                  <div className="flex rounded-lg overflow-hidden border border-slate-200">
                                    <button onClick={() => setBgPickerTab("gradients")}
                                      className={`px-4 py-1.5 text-xs font-semibold transition-colors ${bgPickerTab === "gradients" ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>
                                      🎨 Gradients (100)
                                    </button>
                                    <button onClick={() => setBgPickerTab("solid")}
                                      className={`px-4 py-1.5 text-xs font-semibold transition-colors border-l border-slate-200 ${bgPickerTab === "solid" ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>
                                      🟦 Solid Colors
                                    </button>
                                  </div>
                                  <div className="flex-1" />
                                  {/* Apply scope */}
                                  <span className="text-xs font-semibold text-slate-500">Apply to:</span>
                                  <div className="flex rounded-lg overflow-hidden border border-slate-200">
                                    <button onClick={() => setBgApplyScope("current")}
                                      className={`px-3 py-1.5 text-xs font-semibold transition-colors ${bgApplyScope === "current" ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>
                                      Current page
                                    </button>
                                    <button onClick={() => setBgApplyScope("all")}
                                      className={`px-3 py-1.5 text-xs font-semibold transition-colors border-l border-slate-200 ${bgApplyScope === "all" ? "bg-indigo-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>
                                      All pages
                                    </button>
                                  </div>
                                </div>
      
                                {bgPickerTab === "solid" && (
                                  <div className="flex gap-2 items-center">
                                    <input type="text" placeholder="Search colors..." value={bgPickerSearch} onChange={e => setBgPickerSearch(e.target.value)}
                                      className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400" />
                                    <div className="flex gap-1 flex-wrap">
                                      {BG_CATEGORIES.map(cat => (
                                        <button key={cat.key} onClick={() => setBgPickerCategory(cat.key)}
                                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold transition-all ${bgPickerCategory === cat.key ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                                          {cat.label}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
      
                              {/* Grid area */}
                              <div className="flex-1 overflow-y-auto p-4">
                                {bgPickerTab === "gradients" ? (
                                  <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-8 gap-2">
                                    {GRADIENT_BACKGROUNDS.map(bg => (
                                      <div key={bg.id} title={bg.label}
                                        className="group relative cursor-pointer rounded-lg border-2 border-transparent hover:border-indigo-500 hover:scale-105 transition-all shadow-sm overflow-hidden"
                                        style={{ aspectRatio: "1/1.41", background: bg.css }}
                                        onClick={() => {
                                          // Apply gradient as bgColor (CSS string)
                                          if (bgApplyScope === "all") {
                                            setEdPages(prev => { prev.forEach((_, i) => thumbDirtyRef.current.add(i)); return prev.map(pg => ({ ...pg, bgColor: bg.css, bg: "" })); });
                                          } else {
                                            thumbDirtyRef.current.add(selPage);
                                            patchPage(pg => ({ ...pg, bgColor: bg.css, bg: "" }));
                                          }
                                          if (thumbRefreshRef.current) clearTimeout(thumbRefreshRef.current);
                                          thumbRefreshRef.current = setTimeout(() => triggerThumbRefresh(), 400);
                                          setShowBgPicker(false);
                                        }}
                                      >
                                        <div className="absolute inset-0 flex items-end">
                                          <span className="w-full text-center text-[7px] font-semibold py-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity truncate px-0.5 bg-black/30">
                                            {bg.label}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="space-y-4">
                                    {/* Custom color picker */}
                                    <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                      <div className="relative shrink-0">
                                        <div
                                          className="w-10 h-10 rounded-lg border-2 border-slate-300 cursor-pointer shadow-sm"
                                          style={{ backgroundColor: customBgColor }}
                                          onClick={() => document.getElementById("custom-bg-color-input")?.click()}
                                        />
                                        <input
                                          id="custom-bg-color-input"
                                          type="color"
                                          value={customBgColor}
                                          onChange={e => setCustomBgColor(e.target.value)}
                                          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                        />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-slate-700 mb-1">Custom Color</p>
                                        <div className="flex items-center gap-2">
                                          <input
                                            type="text"
                                            value={customBgColor}
                                            onChange={e => {
                                              const v = e.target.value;
                                              if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setCustomBgColor(v);
                                            }}
                                            className="w-24 px-2 py-1 text-xs font-mono border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                                            placeholder="#rrggbb"
                                          />
                                          <span className="text-[10px] text-slate-400">Click swatch or type hex</span>
                                        </div>
                                      </div>
                                      <button
                                        onClick={() => { applyBgColor(customBgColor, bgApplyScope); setShowBgPicker(false); }}
                                        className="shrink-0 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                                      >
                                        Apply
                                      </button>
                                    </div>
      
                                    {/* Preset grid */}
                                    <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
                                      {PRESET_BACKGROUNDS
                                        .filter(bg => {
                                          const matchCat = bgPickerCategory === "all" || bg.cat === bgPickerCategory;
                                          const matchSearch = !bgPickerSearch || bg.label.toLowerCase().includes(bgPickerSearch.toLowerCase());
                                          return matchCat && matchSearch;
                                        })
                                        .map(bg => {
                                          const isDark = ["dark", "blue", "purple"].includes(bg.cat) && !["bl01", "bl02", "bl03", "bl04", "bl05"].includes(bg.id);
                                          return (
                                            <div key={bg.id} title={bg.label}
                                              className="group relative cursor-pointer rounded-md border-2 border-slate-200 hover:border-indigo-500 hover:scale-105 transition-all shadow-sm"
                                              style={{ aspectRatio: "1/1.41", backgroundColor: bg.color }}
                                              onClick={() => {
                                                setCustomBgColor(bg.color);
                                                applyBgColor(bg.color, bgApplyScope);
                                                setShowBgPicker(false);
                                              }}
                                            >
                                              <div className="absolute inset-0 flex items-end rounded overflow-hidden">
                                                <span className={`w-full text-center text-[7px] font-semibold py-0.5 opacity-0 group-hover:opacity-100 transition-opacity truncate px-0.5 ${isDark ? "text-white" : "text-slate-700"}`}
                                                  style={{ backgroundColor: isDark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.6)" }}>
                                                  {bg.label}
                                                </span>
                                              </div>
                                            </div>
                                          );
                                        })}
                                    </div>
                                  </div>
                                )}
                              </div>
      
                              {/* Footer note */}
                              <div className="px-6 py-3 border-t border-slate-100 shrink-0">
                                <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-100 rounded-lg">
                                  <Settings2 className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                                  <p className="text-[10px] text-amber-800 font-medium leading-relaxed">
                                    <strong className="uppercase tracking-wide opacity-70 mr-1">Custom upload tip:</strong>
                                    For best quality, use portrait images at <strong>1240×1754px</strong> (A4 @150dpi). Landscape images will be stretched to fit the page.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        {/* ──── Insert Table Modal ──── */}
                        {showInsertTable && (
                          <InsertTableModal
                            onInsert={(rows, cols) => addTable(rows, cols)}
                            onClose={() => setShowInsertTable(false)}
                          />
                        )}
      
                        {/* ──── Insert Image Options Modal ──── */}
                        {imageToInsert && (
                          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[9999]" onClick={() => setImageToInsert(null)}>
                            <div className="bg-white rounded-2xl shadow-2xl p-6 flex flex-col gap-4 w-full max-w-xs" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-between">
                                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                  <ImagePlus className="w-5 h-5 text-indigo-600" />
                                  Insert Image
                                </h3>
                                <button onClick={() => setImageToInsert(null)} className="p-1.5 rounded-lg hover:bg-slate-100">
                                  <X className="w-4 h-4 text-slate-500" />
                                </button>
                              </div>
                              <div className="w-full h-28 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                                <img src={imageToInsert} alt="preview" className="max-w-full max-h-full object-contain" />
                              </div>
                              <p className="text-xs text-slate-500 text-center">Image will be scaled to fit the page. You can resize freely after inserting.</p>
                              <div className="flex gap-2">
                                <button onClick={() => setImageToInsert(null)} className="flex-1 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
                                <button
                                  onClick={() => { addImage(imageToInsert, false); setImageToInsert(null); }}
                                  className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
                                >Insert</button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
    </>
  );
};
