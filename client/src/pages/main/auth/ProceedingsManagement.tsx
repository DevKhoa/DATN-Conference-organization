import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Book,
  FileText,
  Users,
  Download,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  ChevronRight,
  Image as ImageLucide,
  ArrowLeft,
  Save,
  Mic,
  Info,
  CalendarDays,
  Eye,
  List,
  PenLine,
  Type,
  Crop,
  FilePlus,
  GripVertical,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Move,
  Settings2,
  X,
  Check,
  ImagePlus,
  RefreshCw,
  LayoutTemplate,
  RotateCw,
  Grid3X3,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { DefaultLayout } from "@/layouts/DefaultLayout";
import {
  Document,
  Page,
  Text,
  View,
  PDFViewer,
  PDFDownloadLink,
} from "@react-pdf/renderer";
import {
  CellCoord,
  createEmptyTable,
  TableEditorCanvas,
  TablePropertiesPanel,
  InsertTableModal,
} from "@/components/ui/table-editor";
import { FontSelector, cssFontFamily } from "@/components/ui/font-manager";
import {
  ProceedingsDocument,
  EditorExportDoc,
  type EditorEl,
  type EditorPage,
  type HFConfig,
  type KeynoteSpeaker,
  CANVAS_W,
  CANVAS_H,
  THUMB_W,
  THUMB_H,
  DIRS,
  DIR_CURSOR,
  getHandlePosition,
  solidColorImg,
  urlToBase64,
  buildEditorPages,
  regenerateToc,
  renderThumbnail,
} from "@/features/proceedings";

// ─── Tab definitions ──────────────────────────────────────────────────────────
const TABS = [
  { key: "cover", label: "Cover", icon: ImageLucide },
  { key: "foreword", label: "Foreword", icon: FileText },
  { key: "committee", label: "Committee", icon: Users },
  { key: "generalInfo", label: "Venue & Info", icon: Info },
  { key: "schedule", label: "At a Glance", icon: CalendarDays },
  { key: "keynotes", label: "Keynotes", icon: Mic },
  { key: "papers", label: "Papers", icon: List },
  { key: "editor", label: "PDF Editor", icon: PenLine },
  { key: "preview", label: "PDF Preview", icon: Eye },
];

// ─── Main Component ───────────────────────────────────────────────────────────
const ProceedingsManagementPage: React.FC = () => {
  const navigate = useNavigate();

  const [conferences, setConferences] = useState<any[]>([]);
  const [selectedConfId, setSelectedConfId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("cover");

  // ── Autocomplete states ───────────────────────────────────────────────────
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [activeKeynoteId, setActiveKeynoteId] = useState<string | null>(null);

  const [paperSearchQuery, setPaperSearchQuery] = useState("");
  const [paperSearchResults, setPaperSearchResults] = useState<any[]>([]);
  const [isSearchingPapers, setIsSearchingPapers] = useState(false);
  const [activePaperKeynoteId, setActivePaperKeynoteId] = useState<
    string | null
  >(null);

  // ── PDF Editor state ──────────────────────────────────────────────────────
  const [edPages, setEdPages] = useState<EditorPage[]>([]);
  const [edReady, setEdReady] = useState(false);
  const [edLoading, setEdLoading] = useState(false);
  const [selPage, setSelPage] = useState(0);
  const scrollAreaRef = useRef<HTMLDivElement>(null); // Thêm ref này
  const [clipboard, setClipboard] = useState<EditorEl | null>(null);
  const [history, setHistory] = useState<EditorPage[][]>([]);
  // Hàm helper để lưu lại trạng thái trước khi thay đổi
  const saveHistory = () => {
    setHistory((prev) =>
      [JSON.parse(JSON.stringify(edPages)), ...prev].slice(0, 20),
    ); // Lưu tối đa 20 bước
  };

  // Hàm để cuộn đến trang cụ thể khi click thumbnail
  const jumpToPage = (idx: number) => {
    setSelPage(idx);
    const el = document.getElementById(`editor-page-${idx}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const [selElId, setSelElId] = useState<string | null>(null);
  const [editingTxtId, setEditingTxtId] = useState<string | null>(null);
  const [hf, setHF] = useState<HFConfig>({
    headerText: "",
    footerText: "",
    showPageNum: true,
    pageNumPos: "right",
    startFrom: 1,
  });
  const [showHFPanel, setShowHFPanel] = useState(false);
  const [showPagesSidebar, setShowPagesSidebar] = useState(true);
  const [cropState, setCropState] = useState<{
    elId: string;
    src: string;
    natW: number;
    natH: number;
    cx: number;
    cy: number;
    cw: number;
    ch: number;
  } | null>(null);
  const [abstractModal, setAbstractModal] = useState<{
    title: string;
    authors: string;
    abstract: string;
  } | null>(null);
  const [showInsertTable, setShowInsertTable] = useState(false);
  const [tableSelectedCells, setTableSelectedCells] = useState<CellCoord[]>([]);
  const [dragFromIdx, setDragFromIdx] = useState<number | null>(null);
  const [debouncedEdPages, setDebouncedEdPages] = useState<EditorPage[]>([]);
  const dragRef = useRef<{
    type: "move" | "resize";
    elId: string;
    dir: string;
    sx: number;
    sy: number;
    orig: EditorEl;
  } | null>(null);
  const cropDragRef = useRef<{
    active: boolean;
    mode: string;
    sx: number;
    sy: number;
    origCx: number;
    origCy: number;
    origCw: number;
    origCh: number;
  }>({
    active: false,
    mode: "",
    sx: 0,
    sy: 0,
    origCx: 0,
    origCy: 0,
    origCw: 0,
    origCh: 0,
  });

  const [procData, setProcData] = useState({
    cover: {
      title: "",
      conferenceName: "",
      date: "",
      location: "",
      sponsorLogos: [] as string[],
    },
    foreword: "",
    committee: [] as any[],
    generalInfo: {
      venueDetails: "",
      registrationHours: "",
      roomAssignments: "",
      coffeeInternetInfo: "",
      galaDinner: "",
      floorPlan: "",
    },
    summarySchedule: [] as any[],
    keynotes: [] as KeynoteSpeaker[],
    detailedSchedule: [] as any[],
  });

  useEffect(() => {
    supabase
      .from("conferences")
      .select("*")
      .order("start_date", { ascending: false })
      .then(({ data }) => setConferences(data || []));
  }, []);

  useEffect(() => {
    if (selectedConfId) loadFullConferenceData(selectedConfId);
  }, [selectedConfId]);

  useEffect(() => {
    if (!edReady || !scrollAreaRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(
              entry.target.getAttribute("data-page-index") || "0",
            );
            setSelPage(index); // Cập nhật sidebar khi cuộn
          }
        });
      },
      { threshold: 0.5, root: scrollAreaRef.current }, // Kích hoạt khi thấy 50% trang
    );

    const pageElements = document.querySelectorAll(".editor-page-container");
    pageElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [edReady, edPages.length]);

  const loadFullConferenceData = async (confId: number) => {
    setLoading(true);
    setError(null);
    try {
      const conf = conferences.find((c) => c.conf_id === confId);

      const [
        { data: config },
        { data: papers },
        { data: sessions },
        { data: sessionPapers },
      ] = await Promise.all([
        supabase
          .from("proceedings_configs")
          .select("*")
          .eq("conf_id", confId)
          .maybeSingle(),
        supabase
          .from("papers")
          .select(
            "*, author:profiles!primary_author_id(full_name, organization)",
          )
          .eq("submitted_conf", confId)
          .eq("status", "ACCEPTED"),
        supabase
          .from("sessions")
          .select("*, chair:profiles!chair_person_id(full_name, organization)")
          .eq("conf_id", confId)
          .order("start_time", { ascending: true }),
        supabase
          .from("session_papers")
          .select("session_id, paper_id, start_time, end_time"),
      ]);
      const confStart = new Date(conf.start_date);

      // Filter session_papers to only those belonging to this conference's sessions
      const confSessionIds = new Set((sessions || []).map((s) => s.session_id));
      const confSessionPapers = (sessionPapers || []).filter((sp) =>
        confSessionIds.has(sp.session_id),
      );

      const { data: reviewers } = await supabase
        .from("reviewer_assignments")
        .select(
          "paper_id, reviewer:profiles!reviewer_id(full_name, organization)",
        )
        .in("paper_id", papers?.map((p) => p.paper_id) || []);

      // Build committee from chairs + reviewers
      const getObj = (o: any) => (Array.isArray(o) ? o[0] : o);
      const chairSet = new Map<string, any>();
      sessions?.forEach((s) => {
        const c = getObj(s.chair);
        if (c?.full_name && !chairSet.has(c.full_name))
          chairSet.set(c.full_name, {
            id: crypto.randomUUID(),
            name: c.full_name,
            role: "Session Chair",
            affiliation: c.organization || "",
          });
      });
      const reviewerSet = new Map<string, any>();
      reviewers?.forEach((r) => {
        const rv = getObj(r.reviewer);
        if (rv?.full_name && !reviewerSet.has(rv.full_name))
          reviewerSet.set(rv.full_name, {
            id: crypto.randomUUID(),
            name: rv.full_name,
            role: "Program Committee",
            affiliation: rv.organization || "",
          });
      });

      // Restore keynotes from config if saved
      let savedKeynotes: KeynoteSpeaker[] = [];
      try {
        const keynoteData = config?.keynotes_json;
        savedKeynotes = JSON.parse(
          typeof keynoteData === "string" ? keynoteData : "[]",
        );
      } catch {
        /* ignore */
      }

      setProcData({
        cover: {
          title:
            config?.proceedings_title ||
            `PROCEEDINGS OF ${conf.conf_name.toUpperCase()}`,
          conferenceName: conf.conf_name,
          date: `${new Date(conf.start_date || Date.now()).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} – ${new Date(conf.end_date || Date.now()).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`,
          location: conf.location,
          sponsorLogos: [], // Sẽ được convert từ URL sang base64 bên dưới
        },
        foreword: config?.foreword || "",
        summarySchedule: (sessions || []).map((s) => {
          // Tính toán Day 1, Day 2... dựa trên start_date của conference
          const currentSlot = new Date(s.start_time || Date.now());
          const dayDiff =
            Math.floor(
              (currentSlot.getTime() - confStart.getTime()) /
                (1000 * 3600 * 24),
            ) + 1;
          return {
            id: crypto.randomUUID(),
            date: `Day ${dayDiff} - ${currentSlot.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}`,
            time: `${currentSlot.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – ${new Date(s.end_time || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
            location: s.room_location,
            topic: s.session_name,
          };
        }),
        committee: [...chairSet.values(), ...reviewerSet.values()],
        generalInfo: {
          venueDetails: config?.venue_details || conf.location,
          registrationHours: config?.registration_hours || "",
          roomAssignments: config?.room_assignments || "",
          coffeeInternetInfo: config?.internet_info || "",
          galaDinner: config?.gala_info || "",
          floorPlan: "",
        },
        keynotes: savedKeynotes,
        detailedSchedule: (papers || []).map((p) => {
          const a = getObj(p.author);
          const sp = confSessionPapers.find(
            (item) => item.paper_id === p.paper_id,
          );

          // Time-only string (HH:MM) to show next to title
          const timeStr = sp?.start_time
            ? new Date(sp.start_time).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })
            : "";

          // Day label for grouping, e.g. "DAY 1 - FRIDAY, 12 DECEMBER 2025"
          let sessionDayLabel = "";
          let sessionDayOrder = 0;
          if (sp?.start_time) {
            const spDate = new Date(sp.start_time);
            const dayDiff =
              Math.floor(
                (spDate.getTime() - confStart.getTime()) / (1000 * 3600 * 24),
              ) + 1;
            const dayName = spDate
              .toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })
              .toUpperCase();
            sessionDayLabel = `DAY ${dayDiff} - ${dayName}`;
            sessionDayOrder = spDate.getTime();
          }

          return {
            id: crypto.randomUUID(),
            paperTitle: p.title,
            authors: a?.full_name || "",
            abstract: p.abstract || "",
            timeSlot: timeStr,
            sessionDayLabel,
            sessionDayOrder,
            paper_id: p.paper_id,
          };
        }),
      });

      if (new Date(conf.end_date) > new Date()) {
        setError(
          `Note: Conference is still ongoing (ends ${new Date(conf.end_date).toLocaleDateString()}). You may finalize proceedings after it concludes.`,
        );
      }

      // Convert sponsor logo URLs thành base64 (tránh lỗi CORS trong react-pdf)
      const bannerUrls: string[] = Array.isArray(conf.banner_urls)
        ? conf.banner_urls
        : [];
      if (bannerUrls.length > 0) {
        const base64Logos = await Promise.all(
          bannerUrls.map((url) => urlToBase64(url)),
        );
        setProcData((d) => ({
          ...d,
          cover: { ...d.cover, sponsorLogos: base64Logos },
        }));
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load conference data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!selectedConfId) return;
    setSaving(true);
    const { error } = await supabase.from("proceedings_configs").upsert({
      conf_id: selectedConfId,
      proceedings_title: procData.cover.title,
      foreword: procData.foreword,
      venue_details: procData.generalInfo.venueDetails,
      registration_hours: procData.generalInfo.registrationHours,
      room_assignments: procData.generalInfo.roomAssignments,
      internet_info: procData.generalInfo.coffeeInternetInfo,
      gala_info: procData.generalInfo.galaDinner,
      keynotes_json: JSON.stringify(procData.keynotes),
    });
    setSaving(false);
    if (!error) {
      setError(null);
    } else {
      setError("Save failed: " + error.message);
    }
  };

  // ── Editor helpers ────────────────────────────────────────────────────────

  /** Build pages from procData, regenerate TOC, render thumbnails */
  const initEditor = async (forceRebuild = false) => {
    if ((!forceRebuild && edReady) || edLoading) return;
    setEdLoading(true);
    try {
      let pages = buildEditorPages(procData);
      pages = regenerateToc(pages);
      const pagesWithThumbs = await Promise.all(
        pages.map(async (pg) => ({
          ...pg,
          bg: pg.bg || (await renderThumbnail(pg)),
        })),
      );
      setEdPages(pagesWithThumbs);
      setSelPage(0);
      setEdReady(true);
    } catch (e) {
      console.error("Editor init failed", e);
    } finally {
      setEdLoading(false);
    }
  };

  // Auto-sync: Khi procData thay đổi và editor đã mở, rebuild lại editor pages
  const procDataJson = JSON.stringify(procData);
  useEffect(() => {
    if (!edReady) return;
    const timer = setTimeout(() => {
      initEditor(true);
    }, 500); // debounce 500ms để tránh rebuild liên tục khi gõ
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [procDataJson]);

  /** Regenerate TOC page and refresh its thumbnail */
  const syncToc = async () => {
    const synced = regenerateToc(edPages);
    const tocThumb = await renderThumbnail(synced[1]);
    setEdPages(synced.map((pg, i) => (i === 1 ? { ...pg, bg: tocThumb } : pg)));
  };

  /** Patch the currently selected page */
  const patchPage = (fn: (p: EditorPage) => EditorPage) =>
    setEdPages((ps) => ps.map((p, i) => (i === selPage ? fn(p) : p)));

  /** Patch a specific element on the current page */
  const patchEl = (id: string, fn: (e: EditorEl) => EditorEl) =>
    patchPage((p) => ({
      ...p,
      els: p.els.map((e) => (e.id === id ? fn(e) : e)),
    }));

  const curPg = edPages[selPage];
  const selEl = curPg?.els.find((e) => e.id === selElId) ?? null;

  // Logic Ctrl C + Ctrl V
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Phớt lờ nếu đang gõ trong textarea
      if (
        document.activeElement?.tagName === "TEXTAREA" ||
        document.activeElement?.tagName === "INPUT"
      )
        return;

      // Ctrl + C (Copy)
      if ((e.ctrlKey || e.metaKey) && e.key === "c" && selEl) {
        e.preventDefault();
        setClipboard({ ...selEl });
      }

      // Ctrl + V (Paste)
      if ((e.ctrlKey || e.metaKey) && e.key === "v" && clipboard) {
        e.preventDefault();
        const newId = crypto.randomUUID();
        const pastedEl = {
          ...clipboard,
          id: newId,
          x: clipboard.x + 20, // Lệch một chút để thấy
          y: clipboard.y + 20,
          zIndex: clipboard.type === "image" ? 90 : 190, // Lên trên cùng theo loại
        };
        patchPage((p) => ({ ...p, els: [...p.els, pastedEl] }));
        setSelElId(newId);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selEl, clipboard, selPage]);

  // Debounce edPages for PDF Export to prevent lag during rapid updates
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedEdPages(edPages);
    }, 1500); // 1.5s delay after user stops typing/dragging
    return () => clearTimeout(timer);
  }, [edPages]);

  const editorPdfDoc = useMemo(() => {
    const pagesToRender =
      debouncedEdPages.length > 0 ? debouncedEdPages : edPages;
    // Avoid crashing if no pages exist yet
    if (pagesToRender.length === 0) {
      return (
        <Document>
          <Page size="A4">
            <View style={{ padding: 40 }}>
              <Text>No pages generated yet.</Text>
            </View>
          </Page>
        </Document>
      );
    }
    return <EditorExportDoc pages={pagesToRender} hf={hf} />;
  }, [debouncedEdPages, edPages, hf]);

  const procPdfDoc = useMemo(() => {
    return <ProceedingsDocument data={procData} />;
  }, [procData]);

  // Logic Del + Ctrl Z
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "TEXTAREA" ||
        document.activeElement?.tagName === "INPUT"
      )
        return;

      // 1. Phím Delete để xóa element
      if (e.key === "Delete" && selElId) {
        e.preventDefault();
        saveHistory();
        deleteEl(selElId);
      }

      // 2. Ctrl + Z để Undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (history.length > 0) {
          const prev = history[0];
          setEdPages(prev);
          setHistory(history.slice(1));
          setSelElId(null);
        }
      }

      // Ctrl + C / Ctrl + V giữ nguyên nhưng thêm saveHistory() vào trước khi Paste
      if ((e.ctrlKey || e.metaKey) && e.key === "c" && selEl) {
        e.preventDefault();
        setClipboard({ ...selEl });
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "v" && clipboard) {
        e.preventDefault();
        saveHistory(); // Lưu lịch sử trước khi dán
        const newId = crypto.randomUUID();
        const pastedEl = {
          ...clipboard,
          id: newId,
          x: clipboard.x + 20,
          y: clipboard.y + 20,
          zIndex: clipboard.type === "image" ? 90 : 190,
        };
        patchPage((p) => ({ ...p, els: [...p.els, pastedEl] }));
        setSelElId(newId);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selEl, clipboard, edPages, history, selPage, selElId]);

  const addText = () => {
    const id = crypto.randomUUID();
    const maxTxtZ = curPg.els
      .filter((e) => e.type === "text")
      .reduce((m, e) => Math.max(m, e.zIndex ?? 100), 100);
    patchPage((p) => ({
      ...p,
      els: [
        ...p.els,
        {
          id,
          type: "text",
          x: 60,
          y: 80,
          w: 320,
          h: 44,
          text: "New Text",
          fontSize: 14,
          bold: false,
          italic: false,
          color: "#000000",
          align: "left",
          zIndex: maxTxtZ + 1,
        },
      ],
    }));
    setSelElId(id);
    setEditingTxtId(id);
  };

  const addImage = (src: string) => {
    const img = new window.Image();
    img.onload = () => {
      const id = crypto.randomUUID();
      const aspect = img.naturalHeight / img.naturalWidth;
      const w = 200;
      const maxImgZ = curPg.els
        .filter((e) => e.type === "image")
        .reduce((m, e) => Math.max(m, e.zIndex ?? 10), 10);
      patchPage((p) => ({
        ...p,
        els: [
          ...p.els,
          {
            id,
            type: "image",
            x: 60,
            y: 80,
            w,
            h: Math.round(w * aspect),
            src,
            zIndex: maxImgZ + 1,
          },
        ],
      }));
      setSelElId(id);
    };
    img.src = src;
  };

  const addTable = (rows: number, cols: number) => {
    const id = crypto.randomUUID();
    const tW = 500,
      tH = rows * 32 + 10;
    const tblData = createEmptyTable(rows, cols, tW, tH);
    const maxZ = curPg.els.reduce((m, e) => Math.max(m, e.zIndex ?? 10), 10);
    patchPage((p) => ({
      ...p,
      els: [
        ...p.els,
        {
          id,
          type: "table" as const,
          x: 60,
          y: 80,
          w: tW,
          h: tH,
          zIndex: maxZ + 1,
          tableData: tblData,
        },
      ],
    }));
    setSelElId(id);
  };

  const deleteEl = (id: string) => {
    patchPage((p) => ({ ...p, els: p.els.filter((e) => e.id !== id) }));
    if (selElId === id) {
      setSelElId(null);
      setTableSelectedCells([]);
    }
  };

  /** Pointer move/resize on canvas */
  const onCanvasPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.sx,
      dy = e.clientY - d.sy;
    patchEl(d.elId, (el) => {
      if (d.type === "move")
        return { ...el, x: d.orig.x + dx, y: d.orig.y + dy };
      let { x, y, w, h } = d.orig;
      if (d.dir.includes("e")) w = Math.max(30, d.orig.w + dx);
      if (d.dir.includes("s")) h = Math.max(20, d.orig.h + dy);
      if (d.dir.includes("w")) {
        x = d.orig.x + dx;
        w = Math.max(30, d.orig.w - dx);
      }
      if (d.dir.includes("n")) {
        y = d.orig.y + dy;
        h = Math.max(20, d.orig.h - dy);
      }
      return { ...el, x, y, w, h };
    });
  };

  const onElPointerDown = (
    e: React.PointerEvent,
    el: EditorEl,
    type: "move" | "resize",
    dir = "",
  ) => {
    e.stopPropagation();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    dragRef.current = {
      type,
      elId: el.id,
      dir,
      sx: e.clientX,
      sy: e.clientY,
      orig: { ...el },
    };
    setSelElId(el.id);
    setEditingTxtId(null);
  };

  /** Page reorder by drag */
  const reorderPage = (from: number, to: number) => {
    if (from === to) return;
    setEdPages((ps) => {
      const a = [...ps];
      const [item] = a.splice(from, 1);
      a.splice(to, 0, item);
      return regenerateToc(a);
    });
    setSelPage(to);
  };

  /** Insert a blank page after afterIdx */
  const insertPage = (afterIdx: number) => {
    const blank: EditorPage = {
      id: crypto.randomUUID(),
      bg: "",
      bgColor: "#ffffff",
      els: [],
    };
    setEdPages((ps) => {
      const a = [...ps];
      a.splice(afterIdx + 1, 0, blank);
      return regenerateToc(a);
    });
    setSelPage(afterIdx + 1);
  };

  /** Open crop modal for an image element */
  const openCrop = (el: EditorEl) => {
    if (!el.src) return;
    const img = new window.Image();
    img.onload = () =>
      setCropState({
        elId: el.id,
        src: el.src!,
        natW: img.naturalWidth,
        natH: img.naturalHeight,
        cx: 0,
        cy: 0,
        cw: img.naturalWidth,
        ch: img.naturalHeight,
      });
    img.src = el.src;
  };

  /** Apply crop: draw sub-rect onto canvas then swap src */
  const applyCrop = () => {
    if (!cropState) return;
    const { elId, src, cx, cy, cw, ch } = cropState;
    const cnv = document.createElement("canvas");
    cnv.width = cw;
    cnv.height = ch;
    const ctx = cnv.getContext("2d")!;
    const img = new window.Image();
    img.onload = () => {
      ctx.drawImage(img, cx, cy, cw, ch, 0, 0, cw, ch);
      const cropped = cnv.toDataURL("image/png");
      patchEl(elId, (el) => ({
        ...el,
        src: cropped,
        h: Math.round(el.h * (ch / (cropState.natH || 1))),
        w: Math.round(el.w * (cw / (cropState.natW || 1))),
      }));
      setCropState(null);
    };
    img.src = src;
  };

  // ── helpers ──
  const updateCover = (patch: any) =>
    setProcData((d) => ({ ...d, cover: { ...d.cover, ...patch } }));
  const updateGeneralInfo = (patch: any) =>
    setProcData((d) => ({ ...d, generalInfo: { ...d.generalInfo, ...patch } }));
  const updateCommittee = (list: any[]) =>
    setProcData((d) => ({ ...d, committee: list }));
  const updateKeynotes = (list: KeynoteSpeaker[]) =>
    setProcData((d) => ({ ...d, keynotes: list }));

  const addKeynote = () =>
    updateKeynotes([
      ...procData.keynotes,
      {
        id: crypto.randomUUID(),
        name: "",
        photo: "",
        presentationTitle: "",
        abstract: "",
        bio: "",
      },
    ]);
  const removeKeynote = (id: string) =>
    updateKeynotes(procData.keynotes.filter((k) => k.id !== id));
  const patchKeynote = (id: string, patch: Partial<KeynoteSpeaker>) =>
    updateKeynotes(
      procData.keynotes.map((k) => (k.id === id ? { ...k, ...patch } : k)),
    );

  const handleUserSearch = async (query: string) => {
    setUserSearchQuery(query);
    if (!query.trim()) {
      setUserSearchResults([]);
      return;
    }
    setIsSearchingUsers(true);
    try {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, avatar_url, description")
        .ilike("full_name", `%${query}%`)
        .limit(10);
      setUserSearchResults(data || []);
    } catch (err) {
      console.error("Failed to search users:", err);
    } finally {
      setIsSearchingUsers(false);
    }
  };

  const handleUserSelect = async (kId: string, user: any) => {
    let photoDataUrl = "";
    if (user.avatar_url) {
      try {
        // Sử dụng hàm proxy có sẵn của tác giả để vượt qua CORS
        photoDataUrl = await urlToBase64(user.avatar_url);
      } catch (err) {
        console.warn(
          "Failed to fetch avatar for PDF. Clearing photo to prevent crash.",
          err,
        );
        photoDataUrl = "";
      }
    }

    patchKeynote(kId, {
      name: user.full_name || "",
      photo: photoDataUrl,
      bio: user.description || "",
    });
    setUserSearchQuery("");
    setUserSearchResults([]);
    setActiveKeynoteId(null);
  };

  const handlePaperSearch = (query: string) => {
    setPaperSearchQuery(query);
    if (!query.trim()) {
      setPaperSearchResults([]);
      return;
    }
    setIsSearchingPapers(true);

    const results = procData.detailedSchedule
      .filter((p) =>
        (p.paperTitle || "").toLowerCase().includes(query.toLowerCase()),
      )
      .slice(0, 10);

    setPaperSearchResults(results);
    setIsSearchingPapers(false);
  };

  const handlePaperSelect = (kId: string, paper: any) => {
    patchKeynote(kId, {
      presentationTitle: paper.paperTitle || "",
      abstract: paper.abstract || "",
    });
    setPaperSearchQuery("");
    setPaperSearchResults([]);
    setActivePaperKeynoteId(null);
  };

  // Committee helpers
  const addCommitteeMember = () =>
    updateCommittee([
      ...procData.committee,
      {
        id: crypto.randomUUID(),
        role: "Program Committee",
        name: "",
        affiliation: "",
      },
    ]);
  const removeCommitteeMember = (id: string) =>
    updateCommittee(procData.committee.filter((m) => m.id !== id));
  const patchCommitteeMember = (id: string, patch: any) =>
    updateCommittee(
      procData.committee.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    );

  // Committee role groups for display
  const committeeByRole: Record<string, any[]> = {};
  procData.committee.forEach((m) => {
    if (!committeeByRole[m.role]) committeeByRole[m.role] = [];
    committeeByRole[m.role].push(m);
  });

  const fieldCls =
    "w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm text-foreground outline-none focus:ring-2 focus:ring-ring focus:border-ring transition-all";
  const labelCls =
    "block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5";

  return (
    <DefaultLayout meta={{ title: "Proceedings Publisher" }}>
      <div className="min-h-screen bg-background text-foreground">
        {/* ── Top bar ── */}
        <div className="bg-card border-b border-border sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate({ to: "/" })}
                className="p-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="w-px h-5 bg-border" />
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Book className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-base font-semibold text-foreground leading-none">
                    Proceedings Publisher
                  </h1>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Build your conference program book
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select
                className="text-sm bg-background border border-input text-foreground px-3 py-2 rounded-lg outline-none cursor-pointer focus:ring-2 focus:ring-ring"
                onChange={(e) => setSelectedConfId(Number(e.target.value))}
                value={selectedConfId || ""}
              >
                <option value="">— Select Conference —</option>
                {conferences.map((c) => (
                  <option key={c.conf_id} value={c.conf_id}>
                    {c.conf_name}
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                onClick={handleSaveConfig}
                disabled={!selectedConfId || saving}
                className="rounded-lg text-sm"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>

        {/* ── Warning ── */}
        {error && (
          <div className="max-w-7xl mx-auto px-6 pt-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-800">{error}</p>
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-6 py-6 flex gap-6">
          {/* ── Sidebar ── */}
          <aside className="w-52 shrink-0">
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Sections
                </p>
              </div>
              <nav className="p-2 space-y-0.5">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`}
                      />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Stats card */}
            {selectedConfId && (
              <div className="mt-3 bg-card rounded-xl border border-border p-4 space-y-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Summary
                </p>
                {[
                  { label: "Papers", count: procData.detailedSchedule.length },
                  { label: "Sessions", count: procData.summarySchedule.length },
                  { label: "Committee", count: procData.committee.length },
                  { label: "Keynotes", count: procData.keynotes.length },
                ].map(({ label, count }) => (
                  <div
                    key={label}
                    className="flex justify-between items-center"
                  >
                    <span className="text-xs text-muted-foreground">
                      {label}
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </aside>

          {/* ── Main content ── */}
          <main className="flex-1 min-w-0">
            {loading ? (
              <div className="bg-card rounded-xl border border-border h-96 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">
                  Loading conference data…
                </p>
              </div>
            ) : !selectedConfId ? (
              <div className="bg-card rounded-xl border border-border h-96 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Book className="w-12 h-12 opacity-20" />
                <p className="text-sm font-medium">
                  Select a conference to begin
                </p>
              </div>
            ) : (
              <div className="bg-card rounded-xl border border-border">
                <div className="px-7 py-5 border-b border-border">
                  <h2 className="text-base font-semibold text-foreground">
                    {TABS.find((t) => t.key === activeTab)?.label}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {activeTab === "cover" &&
                      "Title, date, location and sponsor logos for the cover page."}
                    {activeTab === "foreword" &&
                      "Welcome message from the program chairs."}
                    {activeTab === "committee" &&
                      "Organizing and program committee members. Grouped by role in the PDF."}
                    {activeTab === "generalInfo" &&
                      "Venue address, registration hours, room assignments, Wi-Fi and gala dinner details."}
                    {activeTab === "schedule" &&
                      'High-level session schedule shown in "Program at a Glance" table.'}
                    {activeTab === "keynotes" &&
                      "Invited keynote speakers with abstract and biography."}
                    {activeTab === "papers" &&
                      "Accepted papers auto-loaded from the database. Click the abstract icon to read."}
                    {activeTab === "preview" &&
                      'Live PDF preview. Use "Export PDF" button to download.'}
                    {activeTab === "editor" &&
                      "Visual editor: add text & images, move/resize/crop, reorder pages, set header & footer, then export."}
                  </p>
                </div>

                <div className="p-7">
                  {/* ─── COVER ─── */}
                  {activeTab === "cover" && (
                    <div className="space-y-5 max-w-2xl">
                      <div>
                        <label className={labelCls}>Publication Title</label>
                        <input
                          className={fieldCls}
                          value={procData.cover.title}
                          onChange={(e) =>
                            updateCover({ title: e.target.value })
                          }
                          placeholder="e.g. Proceedings of the 14th International Symposium…"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-5">
                        <div>
                          <label className={labelCls}>Event Dates</label>
                          <input
                            className={fieldCls}
                            value={procData.cover.date}
                            onChange={(e) =>
                              updateCover({ date: e.target.value })
                            }
                          />
                        </div>
                        <div>
                          <label className={labelCls}>Location</label>
                          <input
                            className={fieldCls}
                            value={procData.cover.location}
                            onChange={(e) =>
                              updateCover({ location: e.target.value })
                            }
                          />
                        </div>
                      </div>
                      <div>
                        <label className={labelCls}>
                          Sponsor / Partner Logos
                        </label>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files) {
                              const files = Array.from(
                                e.target.files as FileList,
                              );
                              // Sử dụng mảng tạm để thu thập toàn bộ Base64 trước khi cập nhật State 1 lần duy nhất
                              const loadedBase64: string[] = [];
                              let count = 0;

                              files.forEach((file) => {
                                const reader = new FileReader();
                                reader.onload = (ev) => {
                                  loadedBase64.push(
                                    ev.target?.result as string,
                                  );
                                  count++;
                                  // Khi đã đọc xong tất cả các file
                                  if (count === files.length) {
                                    setProcData((d) => ({
                                      ...d,
                                      cover: {
                                        ...d.cover,
                                        sponsorLogos: [
                                          ...d.cover.sponsorLogos,
                                          ...loadedBase64,
                                        ],
                                      },
                                    }));
                                  }
                                };
                                reader.readAsDataURL(file);
                              });
                            }
                          }}
                          className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                        />
                        {procData.cover.sponsorLogos.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-3">
                            {procData.cover.sponsorLogos.map((logo, idx) => (
                              <div
                                key={idx}
                                className="relative w-20 h-16 border border-border rounded-lg bg-muted/40 flex items-center justify-center"
                              >
                                <img
                                  src={logo}
                                  alt=""
                                  className="max-w-full max-h-full object-contain p-1"
                                />
                                <button
                                  onClick={() =>
                                    updateCover({
                                      sponsorLogos:
                                        procData.cover.sponsorLogos.filter(
                                          (_, i) => i !== idx,
                                        ),
                                    })
                                  }
                                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-full text-xs flex items-center justify-center"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ─── FOREWORD ─── */}
                  {activeTab === "foreword" && (
                    <div className="max-w-2xl">
                      <textarea
                        rows={18}
                        className={`${fieldCls} resize-none font-serif leading-relaxed`}
                        value={procData.foreword}
                        onChange={(e) =>
                          setProcData((d) => ({
                            ...d,
                            foreword: e.target.value,
                          }))
                        }
                        placeholder="Write the foreword here. Each paragraph separated by a blank line will be rendered as a separate paragraph in the PDF."
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        {
                          procData.foreword.split("\n").filter((l) => l.trim())
                            .length
                        }{" "}
                        paragraph(s)
                      </p>
                    </div>
                  )}

                  {/* ─── COMMITTEE ─── */}
                  {activeTab === "committee" && (
                    <div className="space-y-6">
                      {/* Role-grouped preview */}
                      {Object.keys(committeeByRole).length > 0 && (
                        <div className="grid grid-cols-2 gap-3">
                          {Object.entries(committeeByRole).map(
                            ([role, members]) => (
                              <div
                                key={role}
                                className="bg-muted/40 border border-border rounded-lg p-4"
                              >
                                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                                  {role}
                                </span>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {members.length} member
                                  {members.length !== 1 ? "s" : ""}
                                </p>
                              </div>
                            ),
                          )}
                        </div>
                      )}

                      {/* Editable list */}
                      <div className="space-y-2.5">
                        {procData.committee.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center gap-3 p-3 bg-muted/40 border border-border rounded-lg"
                          >
                            <select
                              value={m.role}
                              onChange={(e) =>
                                patchCommitteeMember(m.id, {
                                  role: e.target.value,
                                })
                              }
                              className="text-xs border border-input rounded-md px-2 py-1.5 bg-background text-foreground outline-none focus:ring-2 focus:ring-ring w-44 shrink-0"
                            >
                              <option>Honorary Chair</option>
                              <option>General Chair</option>
                              <option>Program Chair</option>
                              <option>Track Chair</option>
                              <option>Organizing Chair</option>
                              <option>Publication Chair</option>
                              <option>Session Chair</option>
                              <option>Program Committee</option>
                              <option>Tutorial Chair</option>
                            </select>
                            <input
                              className="flex-1 min-w-0 text-sm border border-input rounded-md px-2.5 py-1.5 bg-background text-foreground outline-none focus:ring-2 focus:ring-ring"
                              placeholder="Full name"
                              value={m.name}
                              onChange={(e) =>
                                patchCommitteeMember(m.id, {
                                  name: e.target.value,
                                })
                              }
                            />
                            <input
                              className="flex-1 min-w-0 text-sm border border-input rounded-md px-2.5 py-1.5 bg-background text-foreground outline-none focus:ring-2 focus:ring-ring"
                              placeholder="Affiliation / Institution"
                              value={m.affiliation}
                              onChange={(e) =>
                                patchCommitteeMember(m.id, {
                                  affiliation: e.target.value,
                                })
                              }
                            />
                            <button
                              onClick={() => removeCommitteeMember(m.id)}
                              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={addCommitteeMember}
                        className="w-full py-3 border-2 border-dashed border-border rounded-lg text-sm text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/10 transition-all flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> Add Member
                      </button>
                    </div>
                  )}

                  {/* ─── GENERAL INFO ─── */}
                  {activeTab === "generalInfo" && (
                    <div className="space-y-5 max-w-2xl">
                      {[
                        {
                          key: "venueDetails",
                          label: "Conference Venue",
                          rows: 3,
                          placeholder: "Hotel name, address, city, country…",
                        },
                        {
                          key: "registrationHours",
                          label: "Registration Desk Hours",
                          rows: 2,
                          placeholder:
                            "e.g. Friday 12 Dec 2025 | 07:30 – 18:00",
                        },
                        {
                          key: "roomAssignments",
                          label: "Function Rooms / Layout",
                          rows: 2,
                          placeholder:
                            "e.g. Level 2: Grand Ballroom A, B – Yersin Ballroom A, B",
                        },
                        {
                          key: "coffeeInternetInfo",
                          label: "Refreshments & Internet",
                          rows: 2,
                          placeholder:
                            "Tea break location, Wi-Fi network name and password…",
                        },
                        {
                          key: "galaDinner",
                          label: "Gala Dinner",
                          rows: 2,
                          placeholder:
                            "Venue name, address, date, time, bus pickup…",
                        },
                      ].map(({ key, label, rows, placeholder }) => (
                        <div key={key}>
                          <label className={labelCls}>{label}</label>
                          <textarea
                            rows={rows}
                            className={`${fieldCls} resize-none`}
                            placeholder={placeholder}
                            value={(procData.generalInfo as any)[key]}
                            onChange={(e) =>
                              updateGeneralInfo({ [key]: e.target.value })
                            }
                          />
                        </div>
                      ))}
                      <div>
                        <label className={labelCls}>
                          Venue Floor Plan (image)
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files?.[0])
                              updateGeneralInfo({
                                floorPlan: URL.createObjectURL(
                                  e.target.files[0],
                                ),
                              });
                          }}
                          className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                        />
                        {procData.generalInfo.floorPlan && (
                          <div className="mt-3 relative inline-block">
                            <img
                              src={procData.generalInfo.floorPlan}
                              alt="Floor plan"
                              className="max-h-48 rounded-lg border border-border"
                            />
                            <button
                              onClick={() =>
                                updateGeneralInfo({ floorPlan: "" })
                              }
                              className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center hover:bg-destructive/90"
                            >
                              ×
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ─── SCHEDULE AT A GLANCE ─── */}
                  {activeTab === "schedule" && (
                    <div className="space-y-4">
                      <div className="border border-border rounded-xl overflow-hidden">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-muted/40 text-xs font-semibold text-muted-foreground border-b border-border">
                            <tr>
                              <th className="px-4 py-3 w-40">Date</th>
                              <th className="px-4 py-3 w-36">Time</th>
                              <th className="px-4 py-3">Session / Event</th>
                              <th className="px-4 py-3 w-36">Location</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {procData.summarySchedule.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={4}
                                  className="px-4 py-6 text-center text-muted-foreground italic text-sm"
                                >
                                  No sessions found for this conference.
                                </td>
                              </tr>
                            ) : (
                              procData.summarySchedule.map((s, i) => (
                                <tr
                                  key={s.id}
                                  className="hover:bg-accent/60 transition-colors"
                                >
                                  <td className="px-4 py-3 text-muted-foreground text-xs">
                                    {s.date}
                                  </td>
                                  <td className="px-4 py-3 font-semibold text-foreground text-xs">
                                    {s.time}
                                  </td>
                                  <td className="px-4 py-3 text-foreground">
                                    {s.topic}
                                  </td>
                                  <td className="px-4 py-3 text-muted-foreground text-xs">
                                    {s.location}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Session schedule is auto-loaded from the database. Edit
                        sessions via the Sessions management screen.
                      </p>
                    </div>
                  )}

                  {/* ─── KEYNOTES ─── */}
                  {activeTab === "keynotes" && (
                    <div className="space-y-5">
                      {procData.keynotes.length === 0 && (
                        <div className="bg-muted/40 border border-dashed border-border rounded-xl p-8 text-center">
                          <Mic className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                          <p className="text-sm text-muted-foreground">
                            No keynote speakers added yet.
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Keynote speakers will appear in the PDF after the
                            schedule section.
                          </p>
                        </div>
                      )}
                      {procData.keynotes.map((k, idx) => (
                        <div
                          key={k.id}
                          className="border border-border rounded-xl overflow-hidden"
                        >
                          <div className="flex items-center justify-between px-5 py-3 bg-muted/40 border-b border-border">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              Keynote {idx + 1}
                            </span>
                            <button
                              onClick={() => removeKeynote(k.id)}
                              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="p-5 grid grid-cols-3 gap-5">
                            {/* Photo */}
                            <div className="col-span-1 flex flex-col items-center gap-3">
                              <div className="w-28 h-28 rounded-full border-2 border-border bg-muted overflow-hidden flex items-center justify-center">
                                {k.photo ? (
                                  <img
                                    src={k.photo}
                                    alt={k.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Users className="w-10 h-10 text-muted-foreground" />
                                )}
                              </div>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  if (e.target.files?.[0])
                                    patchKeynote(k.id, {
                                      photo: URL.createObjectURL(
                                        e.target.files[0],
                                      ),
                                    });
                                }}
                                className="block w-full text-[11px] text-muted-foreground file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:font-medium file:bg-primary/10 file:text-primary"
                              />
                            </div>
                            <div className="col-span-2 space-y-3">
                              <div className="relative">
                                <label className={labelCls}>Speaker Name</label>
                                <input
                                  className={fieldCls}
                                  value={
                                    activeKeynoteId === k.id
                                      ? userSearchQuery
                                      : k.name
                                  }
                                  placeholder="e.g. Prof. Vincent Wong"
                                  onChange={(e) => {
                                    if (activeKeynoteId !== k.id) {
                                      setActiveKeynoteId(k.id);
                                    }
                                    handleUserSearch(e.target.value);
                                    patchKeynote(k.id, {
                                      name: e.target.value,
                                    });
                                  }}
                                  onFocus={() => {
                                    setActiveKeynoteId(k.id);
                                    setUserSearchQuery(k.name);
                                  }}
                                  onBlur={() => {
                                    // Delay hiding to allow click on dropdown
                                    setTimeout(() => {
                                      if (activeKeynoteId === k.id) {
                                        setActiveKeynoteId(null);
                                        setUserSearchResults([]);
                                      }
                                    }, 200);
                                  }}
                                />
                                {activeKeynoteId === k.id &&
                                  (userSearchResults.length > 0 ||
                                    isSearchingUsers) && (
                                    <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-auto">
                                      {isSearchingUsers ? (
                                        <div className="px-4 py-3 text-xs text-muted-foreground flex items-center gap-2">
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />{" "}
                                          Searching users...
                                        </div>
                                      ) : (
                                        <ul className="py-1">
                                          {userSearchResults.map((user) => (
                                            <li
                                              key={user.user_id}
                                              className="px-4 py-2 hover:bg-accent cursor-pointer transition-colors"
                                              onClick={() =>
                                                handleUserSelect(k.id, user)
                                              }
                                            >
                                              <div className="flex items-center gap-2.5">
                                                <div className="w-6 h-6 rounded-full bg-muted overflow-hidden shrink-0">
                                                  {user.avatar_url ? (
                                                    <img
                                                      src={user.avatar_url}
                                                      alt=""
                                                      className="w-full h-full object-cover"
                                                    />
                                                  ) : (
                                                    <Users className="w-3 h-3 m-auto text-muted-foreground mt-1.5" />
                                                  )}
                                                </div>
                                                <div className="min-w-0">
                                                  <p className="text-sm font-medium text-foreground truncate">
                                                    {user.full_name}
                                                  </p>
                                                  <p className="text-[10px] text-muted-foreground truncate">
                                                    {user.email}
                                                  </p>
                                                </div>
                                              </div>
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                    </div>
                                  )}
                              </div>
                              <div className="relative">
                                <label className={labelCls}>
                                  Presentation Title
                                </label>
                                <input
                                  className={fieldCls}
                                  value={
                                    activePaperKeynoteId === k.id
                                      ? paperSearchQuery
                                      : k.presentationTitle
                                  }
                                  placeholder="e.g. Machine Learning for Integrated Sensing and Communication"
                                  onChange={(e) => {
                                    if (activePaperKeynoteId !== k.id) {
                                      setActivePaperKeynoteId(k.id);
                                    }
                                    handlePaperSearch(e.target.value);
                                    patchKeynote(k.id, {
                                      presentationTitle: e.target.value,
                                    });
                                  }}
                                  onFocus={() => {
                                    setActivePaperKeynoteId(k.id);
                                    setPaperSearchQuery(k.presentationTitle);
                                  }}
                                  onBlur={() => {
                                    setTimeout(() => {
                                      if (activePaperKeynoteId === k.id) {
                                        setActivePaperKeynoteId(null);
                                        setPaperSearchResults([]);
                                      }
                                    }, 200);
                                  }}
                                />
                                {activePaperKeynoteId === k.id &&
                                  paperSearchResults.length > 0 && (
                                    <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-auto">
                                      <ul className="py-1">
                                        {paperSearchResults.map((paper) => (
                                          <li
                                            key={paper.paper_id}
                                            className="px-4 py-2.5 hover:bg-accent cursor-pointer transition-colors"
                                            onClick={() =>
                                              handlePaperSelect(k.id, paper)
                                            }
                                          >
                                            <div className="min-w-0">
                                              <p className="text-sm border-slate-900 font-medium line-clamp-2 leading-tight mb-1">
                                                {paper.paperTitle}
                                              </p>
                                              <p className="text-[10px] text-muted-foreground truncate italic">
                                                {paper.authors}
                                              </p>
                                            </div>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                              </div>
                            </div>
                            <div className="col-span-3">
                              <label className={labelCls}>Abstract</label>
                              <textarea
                                rows={4}
                                className={`${fieldCls} resize-none`}
                                value={k.abstract}
                                placeholder="Keynote abstract…"
                                onChange={(e) =>
                                  patchKeynote(k.id, {
                                    abstract: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div className="col-span-3">
                              <label className={labelCls}>Biography</label>
                              <textarea
                                rows={3}
                                className={`${fieldCls} resize-none`}
                                value={k.bio}
                                placeholder="Speaker's biography…"
                                onChange={(e) =>
                                  patchKeynote(k.id, { bio: e.target.value })
                                }
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={addKeynote}
                        className="w-full py-3 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/10 transition-all flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> Add Keynote Speaker
                      </button>
                    </div>
                  )}

                  {/* ─── PAPERS ─── */}
                  {activeTab === "papers" && (
                    <div className="space-y-4">
                      <div className="border border-border rounded-xl overflow-hidden">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-muted/40 text-xs font-semibold text-muted-foreground border-b border-border">
                            <tr>
                              <th className="px-5 py-3">#</th>
                              <th className="px-5 py-3">Title & Authors</th>
                              <th className="px-5 py-3 w-24 text-center">
                                Abstract
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {procData.detailedSchedule.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={3}
                                  className="px-5 py-8 text-center text-muted-foreground italic"
                                >
                                  No accepted papers found for this conference.
                                </td>
                              </tr>
                            ) : (
                              procData.detailedSchedule.map((p, i) => (
                                <tr
                                  key={p.id}
                                  className="hover:bg-accent/60 transition-colors"
                                >
                                  <td className="px-5 py-3 text-muted-foreground text-xs">
                                    {i + 1}
                                  </td>
                                  <td className="px-5 py-3">
                                    <p className="font-semibold text-foreground leading-snug text-sm">
                                      {p.paperTitle}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5 italic">
                                      {p.authors}
                                    </p>
                                  </td>
                                  <td className="px-5 py-3 text-center">
                                    {p.abstract ? (
                                      <button
                                        onClick={() =>
                                          setAbstractModal({
                                            title: p.paperTitle,
                                            authors: p.authors,
                                            abstract: p.abstract,
                                          })
                                        }
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium transition-all"
                                        title="View abstract"
                                      >
                                        <Eye className="w-3.5 h-3.5" /> Read
                                      </button>
                                    ) : (
                                      <span className="text-muted-foreground text-xs">
                                        —
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Papers are auto-loaded from the database (status =
                        ACCEPTED).
                      </p>

                      {/* Abstract modal */}
                      {abstractModal && (
                        <div
                          className="fixed inset-0 bg-black/50 flex items-center justify-center p-6"
                          style={{ zIndex: 9999 }}
                          onClick={() => setAbstractModal(null)}
                        >
                          <div
                            className="bg-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col border border-border"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-start justify-between p-6 pb-4 border-b border-border">
                              <div className="flex-1 min-w-0 pr-4">
                                <h3 className="font-bold text-foreground text-base leading-snug">
                                  {abstractModal.title}
                                </h3>
                                <p className="text-sm text-muted-foreground mt-1 italic">
                                  {abstractModal.authors}
                                </p>
                              </div>
                              <button
                                onClick={() => setAbstractModal(null)}
                                className="p-1.5 rounded-lg hover:bg-accent shrink-0"
                              >
                                <X className="w-4 h-4 text-muted-foreground" />
                              </button>
                            </div>
                            <div className="p-6 overflow-y-auto">
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                                Abstract
                              </p>
                              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                                {abstractModal.abstract}
                              </p>
                            </div>
                            <div className="p-4 border-t border-border flex justify-end">
                              <button
                                onClick={() => setAbstractModal(null)}
                                className="px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-xl transition-all"
                              >
                                Close
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ─── PREVIEW ─── */}
                  {activeTab === "preview" && (
                    <div className="space-y-4">
                      {/* Thêm nút Export PDF ngay trong tab Preview */}
                      <div className="flex justify-end">
                        <PDFDownloadLink
                          document={edReady ? editorPdfDoc : procPdfDoc}
                          fileName="conference-proceedings.pdf"
                        >
                          {({ loading }) => (
                            <Button
                              disabled={loading}
                              className="shadow-md shadow-primary/20"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              {loading ? "Preparing Document..." : "Export PDF"}
                            </Button>
                          )}
                        </PDFDownloadLink>
                      </div>

                      <div className="h-180 rounded-xl overflow-hidden border border-border bg-muted">
                        <PDFViewer
                          width="100%"
                          height="100%"
                          className="border-none"
                        >
                          {/* Đồng bộ: Nếu người dùng đã mở Editor (edReady = true), Preview sẽ 
                                                hiển thị EditorExportDoc (chứa các thay đổi visual). 
                                                Nếu chưa, hiển thị bản ProceedingsDocument mặc định.
                                                */}
                          {edReady ? editorPdfDoc : procPdfDoc}
                        </PDFViewer>
                      </div>
                    </div>
                  )}

                  {/* ─── PDF EDITOR ─── */}
                  {activeTab === "editor" && (
                    <div className="-mx-7 -mb-7">
                      {/* ── Init splash ── */}
                      {!edReady && !edLoading && (
                        <div className="flex flex-col items-center justify-center h-80 gap-4">
                          <LayoutTemplate className="w-12 h-12 text-primary/40" />
                          <p className="text-sm font-medium text-muted-foreground">
                            Render the current PDF into the visual editor
                          </p>
                          <button
                            onClick={() => initEditor()}
                            className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold rounded-xl transition-all shadow-md shadow-primary/20"
                          >
                            Open in Editor
                          </button>
                          <p className="text-xs text-muted-foreground max-w-xs text-center">
                            All pages are rasterised from your current data.
                            Finish filling in the other tabs first, then come
                            back here to make final tweaks.
                          </p>
                        </div>
                      )}

                      {/* ── Loading ── */}
                      {edLoading && (
                        <div className="flex flex-col items-center justify-center h-80 gap-3">
                          <Loader2 className="w-8 h-8 text-primary animate-spin" />
                          <p className="text-sm text-muted-foreground">
                            Rendering PDF pages…
                          </p>
                        </div>
                      )}

                      {/* ── Main editor layout ── */}
                      {edReady &&
                        edPages.length > 0 &&
                        (() => {
                          const btnCls = (on: boolean) =>
                            `p-2 rounded-lg border transition-all text-sm ${
                              on
                                ? "bg-primary border-primary text-primary-foreground"
                                : "bg-card border-border text-muted-foreground hover:bg-accent"
                            }`;

                          return (
                            <div className="flex" style={{ height: 800 }}>
                              {/* ──── Left: page strip (collapsible) ──── */}
                              <div
                                className="shrink-0 bg-muted/40 border-r border-border flex flex-col transition-all duration-200 overflow-hidden"
                                style={{
                                  width: showPagesSidebar ? 136 : 0,
                                  minWidth: showPagesSidebar ? 136 : 0,
                                }}
                              >
                                <div className="px-3 py-2.5 border-b border-border bg-card flex items-center justify-between">
                                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                    Pages
                                  </span>
                                  <span className="text-[11px] text-muted-foreground">
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
                                      className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all select-none ${selPage === idx ? "border-primary shadow-lg" : dragFromIdx === idx ? "opacity-40 border-border" : "border-transparent hover:border-border"}`}
                                      style={{
                                        width: THUMB_W,
                                        height: THUMB_H,
                                      }}
                                    >
                                      {pg.bg ? (
                                        <img
                                          src={pg.bg}
                                          alt=""
                                          className="w-full h-full object-cover pointer-events-none"
                                        />
                                      ) : (
                                        <div className="w-full h-full bg-card flex items-center justify-center">
                                          <span className="text-[10px] text-muted-foreground">
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
                                <div className="p-2 border-t border-border bg-card">
                                  <button
                                    onClick={() => insertPage(selPage)}
                                    className="w-full py-1.5 border border-dashed border-border rounded-lg text-[11px] text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/10 transition-all flex items-center justify-center gap-1"
                                  >
                                    <FilePlus className="w-3 h-3" /> Insert
                                    after
                                  </button>
                                </div>
                              </div>
                              {/* Toggle sidebar button */}
                              <button
                                onClick={() => setShowPagesSidebar((v) => !v)}
                                className="shrink-0 w-5 bg-muted hover:bg-accent border-r border-border flex items-center justify-center transition-all"
                                title={
                                  showPagesSidebar ? "Hide pages" : "Show pages"
                                }
                              >
                                <ChevronRight
                                  className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${showPagesSidebar ? "rotate-180" : ""}`}
                                />
                              </button>

                              {/* ──── Centre: canvas ──── */}
                              <div className="flex-1 flex flex-col min-w-0 bg-muted">
                                {/* toolbar */}
                                <div className="bg-card border-b border-border px-4 py-2 flex items-center gap-2 shrink-0 flex-wrap">
                                  {/* add text */}
                                  <button
                                    title="Add text block"
                                    onClick={addText}
                                    className={btnCls(false)}
                                  >
                                    <Type className="w-4 h-4" />
                                  </button>
                                  {/* add image */}
                                  <button
                                    title="Add image"
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
                                          addImage(ev.target!.result as string);
                                        r.readAsDataURL(f);
                                      };
                                      inp.click();
                                    }}
                                    className={btnCls(false)}
                                  >
                                    <ImagePlus className="w-4 h-4" />
                                  </button>
                                  {/* add table */}
                                  <button
                                    title="Insert table"
                                    onClick={() => setShowInsertTable(true)}
                                    className={btnCls(false)}
                                  >
                                    <Grid3X3 className="w-4 h-4" />
                                  </button>

                                  <div className="w-px h-5 bg-border mx-0.5" />

                                  {/* delete selected */}
                                  {selElId && (
                                    <button
                                      title="Delete element"
                                      onClick={() => deleteEl(selElId)}
                                      className="p-2 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-all"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}

                                  {/* H/F toggle */}
                                  <button
                                    onClick={() => setShowHFPanel((v) => !v)}
                                    className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${showHFPanel ? "bg-primary/10 border-primary/40 text-primary" : "bg-card border-border text-muted-foreground hover:bg-accent"}`}
                                  >
                                    <Settings2 className="w-3.5 h-3.5" /> Header
                                    / Footer
                                  </button>

                                  {/* re-render */}
                                  <button
                                    onClick={() => {
                                      setEdReady(false);
                                      setEdPages([]);
                                      setTimeout(initEditor, 50);
                                    }}
                                    title="Re-render from current data"
                                    className="p-2 rounded-lg border border-border text-muted-foreground hover:bg-accent transition-all"
                                  >
                                    <RefreshCw className="w-4 h-4" />
                                  </button>

                                  {/* Sync TOC */}
                                  <button
                                    onClick={syncToc}
                                    title="Sync Table of Contents from TOC-entry elements"
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-primary/10 hover:border-primary/40 hover:text-primary text-xs font-medium transition-all"
                                  >
                                    <List className="w-3.5 h-3.5" /> Sync TOC
                                  </button>

                                  {/* Export */}
                                  <PDFDownloadLink
                                    document={editorPdfDoc}
                                    fileName="proceedings-edited.pdf"
                                  >
                                    {({ loading: dl }) => (
                                      <button
                                        disabled={dl}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground text-xs font-semibold rounded-lg transition-all"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                        {dl ? "Generating…" : "Export PDF"}
                                      </button>
                                    )}
                                  </PDFDownloadLink>
                                </div>

                                {/* Header/Footer config panel */}
                                {showHFPanel && (
                                  <div className="bg-primary/10 border-b border-primary/20 px-5 py-3 grid grid-cols-3 gap-4 items-end shrink-0">
                                    <div>
                                      <label className="text-[10px] font-semibold text-primary uppercase tracking-wider block mb-1">
                                        Header (all pages)
                                      </label>
                                      <input
                                        className="w-full px-2.5 py-1.5 text-xs border border-primary/30 rounded-lg bg-card outline-none focus:ring-2 focus:ring-ring"
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
                                      <label className="text-[10px] font-semibold text-primary uppercase tracking-wider block mb-1">
                                        Footer text
                                      </label>
                                      <input
                                        className="w-full px-2.5 py-1.5 text-xs border border-primary/30 rounded-lg bg-card outline-none focus:ring-2 focus:ring-ring"
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
                                      <label className="text-[10px] font-semibold text-primary uppercase tracking-wider block">
                                        Page numbers
                                      </label>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={hf.showPageNum}
                                            onChange={(e) =>
                                              setHF((h) => ({
                                                ...h,
                                                showPageNum: e.target.checked,
                                              }))
                                            }
                                            className="accent-primary"
                                          />
                                          Show
                                        </label>
                                        <select
                                          value={hf.pageNumPos}
                                          onChange={(e) =>
                                            setHF((h) => ({
                                              ...h,
                                              pageNumPos: e.target.value as any,
                                            }))
                                          }
                                          className="text-xs border border-primary/30 rounded px-1.5 py-1 bg-card outline-none"
                                        >
                                          <option value="left">Left</option>
                                          <option value="center">Center</option>
                                          <option value="right">Right</option>
                                        </select>
                                        <span className="text-xs text-muted-foreground">
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
                                          className="w-12 text-xs border border-primary/30 rounded px-1.5 py-1 bg-card outline-none"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* canvas scroll area */}
                                {/* Vùng cuộn chính của Editor */}
                                <div
                                  ref={scrollAreaRef}
                                  className="flex-1 overflow-auto flex flex-col items-center pt-6 pb-10 gap-10 bg-muted/70 transition-all"
                                  onClick={() => {
                                    setSelElId(null);
                                    setEditingTxtId(null);
                                    setTableSelectedCells([]);
                                  }}
                                >
                                  {edPages.map((pg, idx) => (
                                    <div
                                      key={pg.id}
                                      id={`editor-page-${idx}`} // ID để scroll Area tìm đến khi click thumbnail
                                      data-page-index={idx} // Thuộc tính để IntersectionObserver nhận diện trang hiện tại
                                      className={`editor-page-container relative shadow-2xl shrink-0`}
                                      style={{
                                        width: CANVAS_W,
                                        height: CANVAS_H,
                                        backgroundColor:
                                          pg.bgColor || "#ffffff",
                                      }}
                                      onPointerMove={onCanvasPointerMove}
                                      onPointerUp={() => {
                                        dragRef.current = null;
                                      }}
                                    >
                                      {/* 1. Page Background */}
                                      <div
                                        className="absolute inset-0"
                                        style={{
                                          zIndex: 0,
                                          backgroundColor:
                                            pg.bgColor || "#ffffff",
                                        }}
                                      />

                                      {/* 2. Header Preview (Dùng dữ liệu của từng trang pg) */}
                                      {hf.headerText.trim() && idx > 1 && (
                                        <div
                                          className="absolute top-3 left-12 right-12 text-center text-[9px] text-muted-foreground border-b border-border pb-0.5 pointer-events-none"
                                          style={{ zIndex: 10 }}
                                        >
                                          {hf.headerText}
                                        </div>
                                      )}

                                      {/* 3. Footer Preview (Số trang tính theo index idx của vòng lặp) */}
                                      {(hf.footerText.trim() ||
                                        hf.showPageNum) &&
                                        idx > 1 && (
                                          <div
                                            className={`absolute bottom-3 left-12 right-12 flex items-center text-[9px] text-muted-foreground border-t border-border pt-0.5 pointer-events-none ${hf.pageNumPos === "right" ? "justify-between" : hf.pageNumPos === "center" ? "justify-center gap-4" : "justify-start gap-4"}`}
                                            style={{ zIndex: 10 }}
                                          >
                                            {hf.footerText.trim() && (
                                              <span>{hf.footerText}</span>
                                            )}
                                            {hf.showPageNum && (
                                              <span>{hf.startFrom + idx}</span>
                                            )}
                                          </div>
                                        )}

                                      {/* 4. Overlay Elements (Các phần tử text/image trên trang pg) */}
                                      {[...pg.els]
                                        .sort(
                                          (a, b) =>
                                            (a.zIndex ?? 0) - (b.zIndex ?? 0),
                                        )
                                        .map((el) => {
                                          const isSel = selElId === el.id;
                                          return (
                                            <div
                                              key={el.id}
                                              className={`absolute group ${isSel ? "ring-2 ring-ring" : "hover:ring-1 hover:ring-ring/50"}`}
                                              style={{
                                                left:
                                                  el.x -
                                                  (isSel && el.type === "table"
                                                    ? 22
                                                    : 0),
                                                top:
                                                  el.y -
                                                  (isSel && el.type === "table"
                                                    ? 16
                                                    : 0),
                                                width:
                                                  el.w +
                                                  (isSel && el.type === "table"
                                                    ? 22
                                                    : 0),
                                                height:
                                                  el.h +
                                                  (isSel && el.type === "table"
                                                    ? 16
                                                    : 0),
                                                cursor:
                                                  el.type === "table"
                                                    ? isSel
                                                      ? "default"
                                                      : "pointer"
                                                    : "move",
                                                userSelect: "none",
                                                zIndex: el.zIndex ?? 10,
                                                transform: el.rotation
                                                  ? `rotate(${el.rotation}deg)`
                                                  : undefined,
                                                transformOrigin:
                                                  "center center",
                                                overflow:
                                                  el.type === "table"
                                                    ? "visible"
                                                    : undefined,
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
                                                if (el.type === "text")
                                                  setEditingTxtId(el.id);
                                              }}
                                            >
                                              {el.type === "text" &&
                                                (editingTxtId === el.id ? (
                                                  <textarea
                                                    autoFocus
                                                    className="w-full h-full bg-transparent outline-none resize-none p-0 border-none"
                                                    style={{
                                                      fontSize: el.fontSize,
                                                      fontWeight: el.bold
                                                        ? "bold"
                                                        : "normal",
                                                      fontStyle: el.italic
                                                        ? "italic"
                                                        : "normal",
                                                      color: el.color,
                                                      textAlign:
                                                        el.align as any,
                                                      lineHeight: 1.4,
                                                      fontFamily: el.fontFamily
                                                        ? cssFontFamily(
                                                            el.fontFamily,
                                                          )
                                                        : "inherit",
                                                    }}
                                                    value={el.text ?? ""}
                                                    onChange={(ev) =>
                                                      patchEl(el.id, (e2) => ({
                                                        ...e2,
                                                        text: ev.target.value,
                                                      }))
                                                    }
                                                    onBlur={() =>
                                                      setEditingTxtId(null)
                                                    }
                                                    onKeyDown={(ev) =>
                                                      ev.key === "Escape" &&
                                                      setEditingTxtId(null)
                                                    }
                                                    onClick={(ev) =>
                                                      ev.stopPropagation()
                                                    }
                                                    onPointerDown={(ev) =>
                                                      ev.stopPropagation()
                                                    }
                                                  />
                                                ) : (
                                                  <div
                                                    className="w-full h-full overflow-hidden pointer-events-none"
                                                    style={{
                                                      fontSize: el.fontSize,
                                                      fontWeight: el.bold
                                                        ? "bold"
                                                        : "normal",
                                                      fontStyle: el.italic
                                                        ? "italic"
                                                        : "normal",
                                                      color: el.color,
                                                      textAlign:
                                                        el.align as any,
                                                      lineHeight: 1.4,
                                                      whiteSpace: "pre-wrap",
                                                      fontFamily: el.fontFamily
                                                        ? cssFontFamily(
                                                            el.fontFamily,
                                                          )
                                                        : "inherit",
                                                    }}
                                                  >
                                                    {el.text}
                                                  </div>
                                                ))}
                                              {el.type === "image" &&
                                                el.src && (
                                                  <img
                                                    src={el.src}
                                                    alt=""
                                                    draggable={false}
                                                    className="w-full h-full object-contain pointer-events-none select-none"
                                                  />
                                                )}
                                              {/* Move handles for table */}
                                              {isSel && el.type === "table" && (
                                                <>
                                                  <div
                                                    className="absolute -top-1.5 -left-1.5 -right-1.5 h-3 cursor-move z-10"
                                                    onPointerDown={(e) =>
                                                      onElPointerDown(
                                                        e,
                                                        el,
                                                        "move",
                                                      )
                                                    }
                                                  />
                                                  <div
                                                    className="absolute -bottom-1.5 -left-1.5 -right-1.5 h-3 cursor-move z-10"
                                                    onPointerDown={(e) =>
                                                      onElPointerDown(
                                                        e,
                                                        el,
                                                        "move",
                                                      )
                                                    }
                                                  />
                                                  <div
                                                    className="absolute -left-1.5 -top-1.5 -bottom-1.5 w-3 cursor-move z-10"
                                                    onPointerDown={(e) =>
                                                      onElPointerDown(
                                                        e,
                                                        el,
                                                        "move",
                                                      )
                                                    }
                                                  />
                                                  <div
                                                    className="absolute -right-1.5 -top-1.5 -bottom-1.5 w-3 cursor-move z-10"
                                                    onPointerDown={(e) =>
                                                      onElPointerDown(
                                                        e,
                                                        el,
                                                        "move",
                                                      )
                                                    }
                                                  />
                                                </>
                                              )}
                                              {el.type === "table" &&
                                                el.tableData && (
                                                  <TableEditorCanvas
                                                    tableData={el.tableData}
                                                    elW={el.w}
                                                    elH={el.h}
                                                    isSelected={
                                                      selElId === el.id
                                                    }
                                                    selectedCells={
                                                      selElId === el.id
                                                        ? tableSelectedCells
                                                        : []
                                                    }
                                                    onSelectCells={(cells) => {
                                                      setSelElId(el.id);
                                                      setTableSelectedCells(
                                                        cells,
                                                      );
                                                    }}
                                                    onPatchTable={(td) =>
                                                      patchEl(el.id, (e2) => ({
                                                        ...e2,
                                                        tableData: td,
                                                        h: td.rowHeights.reduce(
                                                          (s, v) => s + v,
                                                          0,
                                                        ),
                                                      }))
                                                    }
                                                  />
                                                )}
                                              {isSel &&
                                                DIRS.map((dir) => (
                                                  <div
                                                    key={dir}
                                                    style={getHandlePosition(
                                                      dir,
                                                    )}
                                                    onPointerDown={(e) =>
                                                      onElPointerDown(
                                                        e,
                                                        el,
                                                        "resize",
                                                        dir,
                                                      )
                                                    }
                                                  />
                                                ))}
                                            </div>
                                          );
                                        })}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* ──── Right: properties panel ──── */}
                              <div className="w-55 shrink-0 bg-card border-l border-border overflow-y-auto flex flex-col">
                                <div className="px-4 py-3 border-b border-border shrink-0">
                                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                    Properties
                                  </p>
                                </div>

                                {/* no selection → page controls */}
                                {!selEl && (
                                  <div className="p-4 space-y-4">
                                    <p className="text-xs text-muted-foreground italic leading-relaxed">
                                      Click an element on the canvas to edit it.
                                      Double-click a text block to type.
                                    </p>
                                    <div className="border-t border-border pt-4 space-y-2">
                                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                        Page {selPage + 1} / {edPages.length}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {curPg.els.length} element
                                        {curPg.els.length !== 1 ? "s" : ""} on
                                        this page
                                      </p>
                                      <button
                                        onClick={() => insertPage(selPage)}
                                        className="w-full py-2 text-xs border border-dashed border-border rounded-lg text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/10 flex items-center justify-center gap-1.5 transition-all"
                                      >
                                        <FilePlus className="w-3.5 h-3.5" />{" "}
                                        Insert page after
                                      </button>
                                      {edPages.length > 1 && (
                                        <button
                                          onClick={() => {
                                            setEdPages((ps) =>
                                              ps.filter(
                                                (_, i) => i !== selPage,
                                              ),
                                            );
                                            setSelPage(
                                              Math.max(0, selPage - 1),
                                            );
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
                                                fontSize: Number(
                                                  e.target.value,
                                                ),
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
                                              [
                                                "left",
                                                "center",
                                                "right",
                                              ] as const
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
                                        <button
                                          onClick={() =>
                                            setEditingTxtId(selEl.id)
                                          }
                                          className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all"
                                        >
                                          <Type className="w-3.5 h-3.5" /> Edit
                                          text content
                                        </button>
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
                                            className={`flex-1 py-1 text-[10px] rounded border transition-all ${
                                              (selEl.rotation ?? 0) === deg
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
                                            onChange={(e) => {
                                              const checked = e.target.checked;
                                              const elId = selEl.id;
                                              const scX = CANVAS_W / 595;
                                              const scY = CANVAS_H / 842;
                                              const ML = Math.round(55 * scX);
                                              const CW = CANVAS_W - ML * 2;

                                              saveHistory(); // Lưu lại để có thể Ctrl Z nếu bấm nhầm

                                              setEdPages((prev) =>
                                                prev.map((pg, pi) => {
                                                  if (pi !== selPage) return pg;

                                                  let newEls = pg.els.map(
                                                    (el) => {
                                                      if (el.id === elId) {
                                                        return {
                                                          ...el,
                                                          isTocEntry: checked,
                                                          // Tự động format text chuẩn Header (Ảnh 2)
                                                          fontSize: checked
                                                            ? Math.round(
                                                                13 * scY,
                                                              )
                                                            : el.fontSize,
                                                          bold: checked
                                                            ? true
                                                            : el.bold,
                                                          color: checked
                                                            ? "#1a3a6b"
                                                            : el.color,
                                                          text: checked
                                                            ? el.text?.toUpperCase()
                                                            : el.text,
                                                          tocLabel: checked
                                                            ? el.text
                                                            : "",
                                                        };
                                                      }
                                                      return el;
                                                    },
                                                  );

                                                  // NẾU TÍCH CHỌN: Thêm element thanh ngang ngay bên dưới
                                                  if (checked) {
                                                    const lineY =
                                                      selEl.y + selEl.h + 4;
                                                    const lineId =
                                                      crypto.randomUUID();
                                                    newEls.push({
                                                      id: lineId,
                                                      type: "image",
                                                      x: ML, // Căn lề trái theo nội dung
                                                      y: lineY,
                                                      w: CW, // Kéo dài hết chiều ngang nội dung
                                                      h: Math.round(2 * scY),
                                                      src: solidColorImg(
                                                        "#1a3a6b",
                                                        CW,
                                                        2,
                                                      ),
                                                      zIndex: selEl.zIndex,
                                                    });
                                                  }

                                                  return { ...pg, els: newEls };
                                                }),
                                              );
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
                                                          els: pg.els.map(
                                                            (el) =>
                                                              el.id === elId
                                                                ? {
                                                                    ...el,
                                                                    tocLabel:
                                                                      val,
                                                                  }
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
                                        {selEl.isTocEntry && (
                                          <p className="text-[10px] text-indigo-500 mt-1.5 flex items-center gap-1">
                                            <List className="w-3 h-3" /> Click
                                            "Sync TOC" to update thumbnail
                                          </p>
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
                                      boxShadow:
                                        "0 0 0 9999px rgba(0,0,0,0.45)",
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
                                          ...getHandlePosition(dir),
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

                      {/* ──── Insert Table Modal ──── */}
                      {showInsertTable && (
                        <InsertTableModal
                          onInsert={(rows, cols) => addTable(rows, cols)}
                          onClose={() => setShowInsertTable(false)}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </DefaultLayout>
  );
};

export default ProceedingsManagementPage;
