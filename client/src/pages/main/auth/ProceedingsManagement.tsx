import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Book,
  FileText,
  Users,
  Clock,
  Map as MapIcon,
  Download,
  Globe,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  UserCheck,
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
  Sparkles,
  ChevronsUpDown,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { DefaultLayout } from "@/layouts/DefaultLayout";
import {
  type TableData,
  type CellCoord,
  createEmptyTable,
  TableEditorCanvas,
  TablePropertiesPanel,
  InsertTableModal,
  TablePdfExport,
  renderTableToCanvas,
} from "@/components/ui/table-editor";
import { FontSelector, cssFontFamily } from "@/components/ui/font-manager";
import {
  type EditorEl,
  type EditorPage,
  type HFConfig,
  type KeynoteSpeaker,
  CANVAS_W,
  CANVAS_H,
} from "@/features/proceedings/types";
import {
  useRenderProceedingsPdfMutation,
  useSaveProceedingsConfigMutation,
  useUploadProceedingsPdfCacheMutation,
} from "@/features/proceedings/services/mutations";
import {
  fetchProceedingsBootstrap as fetchProceedingsBootstrapQuery,
  fetchProceedingsCachedPdfUrl,
  fetchProceedingsPapers as fetchProceedingsPapersQuery,
  fetchProceedingsReviewers as fetchProceedingsReviewersQuery,
} from "@/features/proceedings/services/queries";
import {
  buildEditorPages,
  hashPayload,
  regenerateToc,
  renderThumbnail,
  stripPagesForCache,
} from "@/features/proceedings/utils/editor-helpers";
import {
  DIRS,
  DIR_CURSOR,
  getHandlePosition,
  urlToBase64,
} from "@/features/proceedings/utils/canvas-helpers";
import {
  PAPERS_PAGE_SIZE,
  BG_CATEGORIES,
  GRADIENT_BACKGROUNDS,
  PRESET_BACKGROUNDS,
} from "@/features/proceedings/management/constants";
import { ProceedingsBasicTabsSection } from "@/features/proceedings/management/sections/ProceedingsBasicTabsSection";
import { ProceedingsEditorSection } from "@/features/proceedings/management/sections/ProceedingsEditorSection";
import { generateUUID } from "@/features/proceedings/utils/uuid";

const handlePos = getHandlePosition;
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
/** Bar element that stretches from its top to the bottom of its linked abstract element */
const BarElement: React.FC<{ el: EditorEl }> = ({ el }) => {
  const [height, setHeight] = React.useState(el.h);
  React.useEffect(() => {
    if (!el.linkedAbstractId) return;
    const target = document.getElementById(`editor-el-${el.linkedAbstractId}`);
    if (!target) return;
    // Measure once immediately
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

const ProceedingsManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const onNavigateBack = () => navigate({ to: "/" });
  const [conferences, setConferences] = useState<any[]>([]);
  const [selectedConfId, setSelectedConfId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("cover");

  const saveProceedingsConfigMutation = useSaveProceedingsConfigMutation();
  const uploadProceedingsPdfCacheMutation =
    useUploadProceedingsPdfCacheMutation();
  const renderProceedingsPdfMutation = useRenderProceedingsPdfMutation();
  const saving = saveProceedingsConfigMutation.isPending;

  const [openConfSelector, setOpenConfSelector] = useState(false);
  const initialProcDataStrRef = useRef<string>("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (activeTab === "cover") {
      ensureCoverLogosLoaded();
    }
  }, [activeTab]);

  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewGenerating, setPreviewGenerating] = useState(false);
  const [previewCacheKey, setPreviewCacheKey] = useState<string | null>(null);
  const [previewCacheUrl, setPreviewCacheUrl] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Auto-generate preview when switching to preview tab OR when procData changes (previewBlobUrl reset to null)
  // Always build from procDataRef.current for reliability — no stale edPages race condition.
  // Manual "Sync View" button passes edPages explicitly for editor-change sync.
  useEffect(() => {
    if (
      activeTab !== "preview" ||
      previewBlobUrl ||
      previewGenerating ||
      !selectedConfId
    )
      return;
    generateBlobInBackground(
      procDataRef.current,
      edReadyRef.current ? edPagesRef.current : undefined,
    );
  }, [activeTab, previewBlobUrl]);

  // Committee UI state
  const COMMITTEE_ROLES = [
    "Honorary Chair",
    "General Chair",
    "Program Chair",
    "Track Chair",
    "Organizing Chair",
    "Publication Chair",
    "Session Chair",
    "Program Committee",
    "Tutorial Chair",
  ] as const;
  const [committeeActiveRole, setCommitteeActiveRole] = useState<string>("All");
  const [committeeCollapsed, setCommitteeCollapsed] = useState<
    Record<string, boolean>
  >({});
  const prevBlobRef = useRef<string | null>(null); //  revoke URL c
  const bgGenAbortRef = useRef<boolean>(false);

  // ── Autocomplete states ───────────────────────────────────────────────────
  // Per-keynote search state — use type alias to avoid JSX parser confusion with nested generics
  type KSearchState = {
    userQuery: string;
    userResults: any[];
    userSearching: boolean;
    paperQuery: string;
    paperResults: any[];
    paperSearching: boolean;
    isEditingTitle: boolean;
  };
  const kSearchDefault: KSearchState = {
    userQuery: "",
    userResults: [],
    userSearching: false,
    paperQuery: "",
    paperResults: [],
    paperSearching: false,
    isEditingTitle: false,
  };
  const [keynoteSearchState, setKeynoteSearchState] = useState<
    Record<string, KSearchState>
  >({});
  const getKState = (kId: string): KSearchState =>
    keynoteSearchState[kId] ?? kSearchDefault;
  // Use prev in functional update to avoid stale closure on rapid calls
  const patchKState = (kId: string, patch: Partial<KSearchState>) =>
    setKeynoteSearchState((prev) => ({
      ...prev,
      [kId]: { ...(prev[kId] ?? kSearchDefault), ...patch },
    }));

  // (paper/user search state moved to per-keynote keynoteSearchState)

  // ── PDF Editor state ──────────────────────────────────────────────────────
  const [edPages, setEdPages] = useState<EditorPage[]>([]);
  const edPagesRef = useRef<EditorPage[]>([]); // always-current ref for use in effects
  const [edReady, setEdReady] = useState(false);
  const edReadyRef = useRef(false); // always-current ref for use in effects
  const [edLoading, setEdLoading] = useState(false);
  const [selPage, setSelPage] = useState(0);
  const scrollAreaRef = useRef<HTMLDivElement>(null); // Thêm ref này
  const [clipboard, setClipboard] = useState<EditorEl | null>(null);
  const [history, setHistory] = useState<EditorPage[][]>([]);
  const historyRef = useRef<EditorPage[][]>([]); // undo stack — never stale
  const redoRef = useRef<EditorPage[][]>([]); // redo stack

  // Snapshot toàn bộ edPages trước mỗi action (đồng thời clear redo stack)
  const saveHistory = () => {
    const snapshot = JSON.parse(JSON.stringify(edPages)) as EditorPage[];
    historyRef.current = [snapshot, ...historyRef.current].slice(0, 50);
    redoRef.current = []; // any new action clears redo
    setHistory(historyRef.current);
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
    startFrom: 1,
  });
  const [showHFPanel, setShowHFPanel] = useState(false);
  const [showPagesSidebar, setShowPagesSidebar] = useState(true);
  type CropState = {
    elId: string;
    src: string;
    natW: number;
    natH: number;
    cx: number;
    cy: number;
    cw: number;
    ch: number;
  };
  const [cropState, setCropState] = useState<CropState | null>(null);
  type AbstractModal = { title: string; authors: string; abstract: string };
  const [abstractModal, setAbstractModal] = useState<AbstractModal | null>(
    null,
  );
  const [showInsertTable, setShowInsertTable] = useState(false);
  const [imageToInsert, setImageToInsert] = useState<string | null>(null);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [bgPickerCategory, setBgPickerCategory] = useState("all");
  const [bgPickerSearch, setBgPickerSearch] = useState("");
  const [bgApplyScope, setBgApplyScope] = useState<"current" | "all">(
    "current",
  );
  const [bgPickerTab, setBgPickerTab] = useState<"gradients" | "solid">(
    "gradients",
  );
  const [customBgColor, setCustomBgColor] = useState("#4f46e5");
  const [tableSelectedCells, setTableSelectedCells] = useState<CellCoord[]>([]);
  const [dragFromIdx, setDragFromIdx] = useState<number | null>(null);
  const dragRef = useRef<{
    type: "move" | "resize";
    elId: string;
    dir: string;
    sx: number;
    sy: number;
    orig: EditorEl;
  } | null>(null);
  /** Vị trí đang drag — không dùng state để tránh re-render 60fps */
  const dragPosRef = useRef<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const lastPointerEventRef = useRef<{
    clientX: number;
    clientY: number;
  } | null>(null);
  const tocDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const thumbRefreshRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track which pages need thumbnail refresh (by index)
  const thumbDirtyRef = useRef<Set<number>>(new Set());
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
      sponsorLogos: [] as { src: string; selected: boolean }[],
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
  const [papersTotal, setPapersTotal] = useState(0);
  const [papersLoading, setPapersLoading] = useState(false);
  const [papersError, setPapersError] = useState<string | null>(null);
  const procDataRef = useRef(procData);

  useEffect(() => {
    if (!initialProcDataStrRef.current) return;
    const currentStr = JSON.stringify(procData);
    setHasUnsavedChanges(currentStr !== initialProcDataStrRef.current);
  }, [procData]);

  const confStartRef = useRef<Date | null>(null);
  const pendingBannerUrlsRef = useRef<string[]>([]);
  const bannerLogosPendingRef = useRef(false);
  const coverLogosLoadingRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    supabase
      .from("conferences")
      .select("*")
      .order("start_date", { ascending: false })
      .then(({ data }) => setConferences(data || []));
  }, []);

  useEffect(() => {
    if (selectedConfId) {
      bgGenAbortRef.current = true;
      setPreviewBlobUrl(null);
      setPreviewGenerating(false);
      setPreviewCacheKey(null);
      setPreviewCacheUrl(null);
      loadFullConferenceData(selectedConfId);
    }
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

  const getObj = (o: any) => (Array.isArray(o) ? o[0] : o);

  const fetchProceedingsBootstrap = async (
    confId: number,
    limit: number = PAPERS_PAGE_SIZE,
  ): Promise<any> => {
    return fetchProceedingsBootstrapQuery(confId, limit);
  };

  const fetchProceedingsPapers = async (
    confId: number,
    offset: number,
    limit: number,
    includeAbstract = true,
  ): Promise<{ papers: any[]; total: number }> => {
    return fetchProceedingsPapersQuery(confId, offset, limit, includeAbstract);
  };

  const fetchProceedingsReviewers = async (confId: number): Promise<any[]> => {
    return fetchProceedingsReviewersQuery(confId);
  };

  const mapPapersToSchedule = (papers: any[], confStart: Date) =>
    (papers || []).map((p) => {
      const a = getObj(p.author);
      const sp = p.session;

      const timeStr = sp?.start_time
        ? new Date(sp.start_time).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
        : "";

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
        id: generateUUID(),
        paperTitle: p.title,
        authors: a?.full_name || "",
        abstract: p.abstract || "",
        timeSlot: timeStr,
        location: sp?.room_location || "",
        sessionDayLabel,
        sessionDayOrder,
        paper_id: p.paper_id,
      };
    });

  const appendSchedule = (items: any[]) => {
    if (!items.length) return;
    setProcData((prev) => {
      const next = {
        ...prev,
        detailedSchedule: [...prev.detailedSchedule, ...items],
      };
      procDataRef.current = next;
      return next;
    });
  };

  const loadMorePapers = async () => {
    if (!selectedConfId || papersLoading) return;
    const confStart = confStartRef.current;
    if (!confStart) return;
    setPapersLoading(true);
    setPapersError(null);
    try {
      const offset = procDataRef.current.detailedSchedule.length;
      const { papers, total } = await fetchProceedingsPapers(
        selectedConfId,
        offset,
        PAPERS_PAGE_SIZE,
        true,
      );
      const mapped = mapPapersToSchedule(papers, confStart);
      appendSchedule(mapped);
      setPapersTotal(total || 0);
    } catch (e) {
      console.error(e);
      setPapersError("Failed to load more papers.");
    } finally {
      setPapersLoading(false);
    }
  };

  const ensureAllPapersLoaded = async () => {
    if (!selectedConfId || papersLoading) return;
    const confStart = confStartRef.current;
    if (!confStart) return;
    const total = Math.max(
      papersTotal,
      procDataRef.current.detailedSchedule.length,
    );
    if (total === 0 || procDataRef.current.detailedSchedule.length >= total)
      return;

    setPapersLoading(true);
    setPapersError(null);
    try {
      let offset = procDataRef.current.detailedSchedule.length;
      let knownTotal = total;
      while (offset < knownTotal) {
        const { papers, total: newTotal } = await fetchProceedingsPapers(
          selectedConfId,
          offset,
          PAPERS_PAGE_SIZE,
          true,
        );
        if (!papers.length) break;
        const mapped = mapPapersToSchedule(papers, confStart);
        appendSchedule(mapped);
        offset += papers.length;
        if (newTotal) {
          knownTotal = newTotal;
          setPapersTotal(newTotal);
        }
      }
    } catch (e) {
      console.error(e);
      setPapersError("Failed to load all papers.");
    } finally {
      setPapersLoading(false);
    }
  };

  const getCachedPdfUrl = async (confId: number, key: string) => {
    return fetchProceedingsCachedPdfUrl(confId, key);
  };

  const uploadCachedPdf = async (confId: number, key: string, blob: Blob) => {
    return uploadProceedingsPdfCacheMutation.mutateAsync({ confId, key, blob });
  };

  const renderProceedingsPdf = async (
    confId: number,
    payload: Record<string, any>,
  ): Promise<{ url?: string; blob?: Blob }> => {
    return renderProceedingsPdfMutation.mutateAsync({ confId, payload });
  };

  const downloadPdfFromUrl = async (url: string, filename: string) => {
    try {
      if (url.startsWith("blob:")) {
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        return;
      }
      const resp = await fetch(url);
      if (!resp.ok) {
        window.open(url, "_blank");
        return;
      }
      const blob = await resp.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(objUrl);
    } catch {
      window.open(url, "_blank");
    }
  };

  const ensureCoverLogosLoaded = async () => {
    if (!bannerLogosPendingRef.current) return;
    if (coverLogosLoadingRef.current) return coverLogosLoadingRef.current;
    const urls = pendingBannerUrlsRef.current;
    if (!urls.length) {
      bannerLogosPendingRef.current = false;
      return;
    }
    coverLogosLoadingRef.current = (async () => {
      const base64Logos = await Promise.all(
        urls.map((url) => urlToBase64(url)),
      );
      const validLogos = base64Logos.filter(Boolean) as string[];
      if (!validLogos.length) return;
      setProcData((d) => {
        const next = {
          ...d,
          cover: {
            ...d.cover,
            sponsorLogos: [
              ...d.cover.sponsorLogos,
              ...validLogos.map((src) => ({ src, selected: true })),
            ],
          },
        };
        procDataRef.current = next;
        return next;
      });
    })().finally(() => {
      bannerLogosPendingRef.current = false;
      coverLogosLoadingRef.current = null;
    });
    return coverLogosLoadingRef.current;
  };

  const buildPagesForRender = async (
    pages?: EditorPage[],
  ): Promise<EditorPage[]> => {
    if (pages && pages.length > 0) return pages;
    await ensureAllPapersLoaded();
    await ensureCoverLogosLoaded();
    const base = procDataRef.current;
    let built = buildEditorPages(base);
    built = regenerateToc(built);
    return built;
  };

  // Holds deserialized editor state loaded from DB during bootstrap.
  // Used by initEditor to restore instead of rebuilding from procData.
  const savedEditorStateRef = useRef<{ pages: EditorPage[]; hf: HFConfig } | null>(null);

  const loadFullConferenceData = async (confId: number) => {
    setLoading(true);
    setError(null);
    setPapersError(null);
    setPapersTotal(0);
    setProcData((prev) => ({ ...prev, detailedSchedule: [] }));
    pendingBannerUrlsRef.current = [];
    bannerLogosPendingRef.current = false;
    coverLogosLoadingRef.current = null;
    savedEditorStateRef.current = null; // reset on new conference load
    try {
      const conf = conferences.find((c) => c.conf_id === confId);
      if (!conf) {
        throw new Error("Conference not found.");
      }

      setPapersLoading(true);
      const bootstrap = await fetchProceedingsBootstrap(
        confId,
        PAPERS_PAGE_SIZE,
      );
      setPapersLoading(false);
      const config = bootstrap?.config;
      const sessions = bootstrap?.sessions || [];
      const reviewers = bootstrap?.reviewers || [];
      const papers = bootstrap?.papers || [];
      const total = bootstrap?.total || 0;

      const confStart = new Date(conf.start_date);
      confStartRef.current = confStart;

      // Build committee from chairs + reviewers
      const chairSet = new Map<string, any>();
      sessions?.forEach((s) => {
        const c = getObj(s.chair);
        if (c?.full_name && !chairSet.has(c.full_name))
          chairSet.set(c.full_name, {
            id: generateUUID(),
            name: c.full_name,
            role: "Session Chair",
            affiliation: c.organization || "",
          });
      });
      const reviewerSet = new Map<string, any>();
      reviewers?.forEach((rv: any) => {
        if (rv?.full_name && !reviewerSet.has(rv.full_name))
          reviewerSet.set(rv.full_name, {
            id: rv.id || generateUUID(),
            name: rv.full_name,
            role: "Program Committee",
            affiliation: rv.organization || "",
          });
      });

      // Restore keynotes from config if saved
      let savedKeynotes: KeynoteSpeaker[] = [];
      try {
        savedKeynotes = JSON.parse(config?.keynotes_json || "[]");
      } catch {
        /* ignore */
      }

      // Restore editor state from DB if available
      try {
        if (config?.editor_pages_json) {
          const parsedPages = JSON.parse(config.editor_pages_json) as EditorPage[];
          const parsedHf = config.editor_hf_json
            ? (JSON.parse(config.editor_hf_json) as HFConfig)
            : null;
          if (Array.isArray(parsedPages) && parsedPages.length > 0) {
            savedEditorStateRef.current = {
              pages: parsedPages,
              hf: parsedHf ?? hf,
            };
          }
        }
      } catch {
        savedEditorStateRef.current = null;
      }

      const newProcData = {
        cover: {
          title:
            config?.proceedings_title ||
            `PROCEEDINGS OF ${conf.conf_name.toUpperCase()}`,
          conferenceName: conf.conf_name,
          date: `${new Date(conf.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} – ${new Date(conf.end_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`,
          location: conf.location,
          sponsorLogos: [], // Sẽ được convert từ URL sang base64 bên dưới
        },
        foreword: config?.foreword || "",
        summarySchedule: (sessions || []).map((s) => {
          // Tính toán Day 1, Day 2... dựa trên start_date của conference
          const currentSlot = new Date(s.start_time);
          const dayDiff =
            Math.floor(
              (currentSlot.getTime() - confStart.getTime()) /
                (1000 * 3600 * 24),
            ) + 1;
          return {
            id: generateUUID(),
            date: `Day ${dayDiff} - ${currentSlot.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}`,
            time: `${currentSlot.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – ${new Date(s.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
            location: s.room_location,
            topic: s.session_name,
          };
        }),
        committee: [...chairSet.values(), ...reviewerSet.values()],
        generalInfo: {
          venueDetails: config?.venue_details || conf.location,
          registrationHours: config?.registration_hours || "",
          roomAssignments: config?.room_assignments || "",
          coffeeInternetInfo: config?.coffee_internet || "",
          galaDinner: config?.gala_info || "",
          floorPlan: "",
        },
        keynotes: savedKeynotes,
        detailedSchedule: mapPapersToSchedule(papers || [], confStart),
      };
      setProcData(newProcData);
      procDataRef.current = newProcData;
      initialProcDataStrRef.current = JSON.stringify(newProcData);
      setHasUnsavedChanges(false);
      setPapersTotal(total || (papers?.length ?? 0));

      if (new Date(conf.end_date) > new Date()) {
        setError(
          `Note: Conference is still ongoing (ends ${new Date(conf.end_date).toLocaleDateString()}). You may finalize proceedings after it concludes.`,
        );
      }

      const bannerUrls: string[] = Array.isArray(conf.banner_urls)
        ? (conf.banner_urls as string[])
        : [];
      if (bannerUrls.length > 0) {
        pendingBannerUrlsRef.current = bannerUrls;
        bannerLogosPendingRef.current = true;
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load conference data. Please try again.");
      setPapersLoading(false);
    } finally {
      setLoading(false);
    }
  };


  const handleSaveConfig = async () => {
    if (!selectedConfId) return;
    try {
      const payload: Parameters<typeof saveProceedingsConfigMutation.mutateAsync>[0] = {
        confId: selectedConfId,
        proceedingsTitle: procData.cover.title,
        foreword: procData.foreword,
        venueDetails: procData.generalInfo.venueDetails,
        registrationHours: procData.generalInfo.registrationHours,
        roomAssignments: procData.generalInfo.roomAssignments,
        internetInfo: procData.generalInfo.coffeeInternetInfo,
        galaInfo: procData.generalInfo.galaDinner,
        keynotesJson: JSON.stringify(procData.keynotes),
      };

      // If the PDF Editor has been opened and pages are ready, persist the full
      // editor state so it can be restored on next load.
      if (edReady && edPages.length > 0) {
        // Strip thumbnail data-URLs before saving to keep payload small
        const pagesForSave = stripPagesForCache(edPages);
        payload.editorPagesJson = JSON.stringify(pagesForSave);
        payload.editorHfJson = JSON.stringify(hf);
      }

      await saveProceedingsConfigMutation.mutateAsync(payload);
      setError(null);
      initialProcDataStrRef.current = JSON.stringify(procData);
      setHasUnsavedChanges(false);
      toast.success("Proceedings saved successfully!");
    } catch (e: any) {
      setError("Save failed: " + (e?.message || "Unknown error"));
    }
  };


  // ✅ SAU — render toàn bộ, không chunk, không auto-trigger
  const generateBlobInBackground = async (
    data: typeof procData,
    pages?: EditorPage[],
  ) => {
    bgGenAbortRef.current = false;
    setPreviewGenerating(true);
    try {
      const livePages = await buildPagesForRender(pages);
      const conferenceName = procDataRef.current?.cover?.conferenceName ?? "";
      const payload = {
        pages: stripPagesForCache(livePages),
        hf,
        conferenceName,
      };
      const cacheKey = await hashPayload(payload);
      if (previewCacheKey === cacheKey && previewCacheUrl) {
        setPreviewBlobUrl(previewCacheUrl);
        return;
      }

      if (selectedConfId) {
        const cachedUrl = await getCachedPdfUrl(selectedConfId, cacheKey);
        if (cachedUrl) {
          if (prevBlobRef.current?.startsWith("blob:")) {
            URL.revokeObjectURL(prevBlobRef.current);
            prevBlobRef.current = null;
          }
          setPreviewCacheKey(cacheKey);
          setPreviewCacheUrl(cachedUrl);
          setPreviewBlobUrl(cachedUrl);
          return;
        }
      }

      if (selectedConfId) {
        const result = await renderProceedingsPdf(selectedConfId, {
          ...payload,
          key: cacheKey,
          cache: true,
        });
        if (bgGenAbortRef.current) return;
        if (result.url) {
          if (prevBlobRef.current?.startsWith("blob:")) {
            URL.revokeObjectURL(prevBlobRef.current);
            prevBlobRef.current = null;
          }
          setPreviewCacheKey(cacheKey);
          setPreviewCacheUrl(result.url);
          setPreviewBlobUrl(result.url);
          return;
        }
        if (result.blob) {
          let uploadedUrl: string | null = null;
          uploadedUrl = await uploadCachedPdf(
            selectedConfId,
            cacheKey,
            result.blob,
          );
          if (uploadedUrl) {
            if (prevBlobRef.current?.startsWith("blob:")) {
              URL.revokeObjectURL(prevBlobRef.current);
              prevBlobRef.current = null;
            }
            setPreviewCacheKey(cacheKey);
            setPreviewCacheUrl(uploadedUrl);
            setPreviewBlobUrl(uploadedUrl);
            return;
          }
          if (prevBlobRef.current?.startsWith("blob:")) {
            URL.revokeObjectURL(prevBlobRef.current);
          }
          const url = URL.createObjectURL(result.blob);
          prevBlobRef.current = url;
          setPreviewBlobUrl(url);
        }
      }
    } catch (e: any) {
      console.error("Preview generation failed", e);
      toast.error("Failed to generate PDF preview: " + (e?.message || "Unknown error"));
    } finally {
      if (!bgGenAbortRef.current) setPreviewGenerating(false);
    }
  };

  const exportPdf = async () => {
    if (exportingPdf) return;
    setExportingPdf(true);
    try {
      const livePages = await buildPagesForRender(
        edPages.length > 0 ? edPages : undefined,
      );
      const conferenceName = procDataRef.current?.cover?.conferenceName ?? "";
      const payload = {
        pages: stripPagesForCache(livePages),
        hf,
        conferenceName,
      };
      const cacheKey = await hashPayload(payload);

      let url =
        previewCacheKey === cacheKey && previewCacheUrl
          ? previewCacheUrl
          : null;

      if (!url && selectedConfId) {
        url = await getCachedPdfUrl(selectedConfId, cacheKey);
      }

      if (!url && selectedConfId) {
        const result = await renderProceedingsPdf(selectedConfId, {
          ...payload,
          key: cacheKey,
          cache: true,
        });
        if (result.url) {
          url = result.url;
        } else if (result.blob) {
          url = await uploadCachedPdf(selectedConfId, cacheKey, result.blob);
          if (!url) {
            const localUrl = URL.createObjectURL(result.blob);
            await downloadPdfFromUrl(localUrl, "proceedings-edited.pdf");
            URL.revokeObjectURL(localUrl);
            return;
          }
        }
      }

      if (url) {
        setPreviewCacheKey(cacheKey);
        setPreviewCacheUrl(url);
        setPreviewBlobUrl(url);
        await downloadPdfFromUrl(url, "proceedings-edited.pdf");
      }
    } catch (e: any) {
      console.error("Export PDF failed", e);
      toast.error("Failed to export PDF: " + (e?.message || "Unknown error"));
    } finally {
      setExportingPdf(false);
    }
  };
  // ── Editor helpers ────────────────────────────────────────────────────────

  /** Build pages from procData, regenerate TOC, render thumbnails */
  const initEditor = async (forceRebuild = false) => {
    if ((!forceRebuild && edReady) || edLoading) return;
    setEdLoading(true);
    try {
      // ── Restore from saved DB state ─────────────────────────────────────────
      const saved = forceRebuild ? null : savedEditorStateRef.current;
      if (saved && saved.pages.length > 0) {
        // Pages were saved without thumbnails — re-render them now
        const pagesWithThumbs: EditorPage[] = [];
        for (const pg of saved.pages) {
          const thumb = await renderThumbnail(pg);
          pagesWithThumbs.push({ ...pg, bg: thumb });
          if (pagesWithThumbs.length % 3 === 0) {
            setEdPages([...pagesWithThumbs]);
          }
        }
        setEdPages(pagesWithThumbs);
        setHF(saved.hf);
        setSelPage(0);
        setEdReady(true);
        return;
      }

      // ── Fresh build from procData ────────────────────────────────────────────
      await ensureAllPapersLoaded();
      await ensureCoverLogosLoaded();
      let pages = buildEditorPages(procDataRef.current);
      pages = regenerateToc(pages);
      // Render tuần tự, update sidebar từng trang một (user thấy progress)
      const pagesWithThumbs: EditorPage[] = [];
      for (const pg of pages) {
        const thumb = pg.bg || (await renderThumbnail(pg));
        pagesWithThumbs.push({ ...pg, bg: thumb });
        // Update UI sau mỗi 3 trang để sidebar hiện dần
        if (pagesWithThumbs.length % 3 === 0) {
          setEdPages([...pagesWithThumbs]);
        }
      }
      setEdPages(pagesWithThumbs);
      setSelPage(0);
      setEdReady(true);
    } catch (e) {
      console.error("Editor init failed", e);
    } finally {
      setEdLoading(false);
    }
  };

  // Keep refs in sync with state so preview trigger useEffect never uses stale values
  useEffect(() => {
    edPagesRef.current = edPages;
  }, [edPages]);
  useEffect(() => {
    edReadyRef.current = edReady;
  }, [edReady]);

  // Invalidates the preview blob so it is regenerated on next preview
  useEffect(() => {
    setPreviewBlobUrl(null);
    setPreviewCacheKey(null);
    setPreviewCacheUrl(null);
  }, [edPages]);

  // Auto-sync: Khi procData thay đổi và editor đã mở, rebuild lại editor pages
  // Also invalidate preview cache so preview tab re-renders with new data
  useEffect(() => {
    procDataRef.current = procData;
    // Invalidate preview so it regenerates with latest data
    setPreviewBlobUrl(null);
    setPreviewCacheKey(null);
    setPreviewCacheUrl(null);
    if (!edReady) return;
    const timer = setTimeout(() => {
      initEditor(true);
    }, 500);
    return () => clearTimeout(timer);
  }, [procData]);

  /** Regenerate TOC page and refresh its thumbnail */
  const syncToc = async () => {
    const synced = regenerateToc(edPages);
    const tocThumb = await renderThumbnail(synced[1]);
    setEdPages(synced.map((pg, i) => (i === 1 ? { ...pg, bg: tocThumb } : pg)));
  };

  // ─── Auto-adjust cover font colors — pure math, no API ───────────────────────

  /** sRGB channel → linear (WCAG 2.x formula) */
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };

  /** Relative luminance of an RGB triplet (0-255 each) */
  const relativeLuminance = (r: number, g: number, b: number) =>
    0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

  /** WCAG contrast ratio between two luminance values */
  const contrastRatio = (L1: number, L2: number) => {
    const lighter = Math.max(L1, L2);
    const darker = Math.min(L1, L2);
    return (lighter + 0.05) / (darker + 0.05);
  };

  /** Parse a CSS hex color (#rgb or #rrggbb) → [r,g,b] */
  const hexToRgb = (hex: string): [number, number, number] | null => {
    const h = hex.replace("#", "");
    if (h.length === 3) {
      return [
        parseInt(h[0] + h[0], 16),
        parseInt(h[1] + h[1], 16),
        parseInt(h[2] + h[2], 16),
      ];
    }
    if (h.length >= 6) {
      return [
        parseInt(h.substring(0, 2), 16),
        parseInt(h.substring(2, 4), 16),
        parseInt(h.substring(4, 6), 16),
      ];
    }
    return null;
  };

  /**
   * Extract all color stops from a CSS gradient/solid string,
   * weight them by their % position (or equally if no positions).
   * Returns weighted-average [r,g,b].
   */
  const parseBgAvgRGB = (css: string): [number, number, number] => {
    type Stop = { r: number; g: number; b: number; pos: number | null };
    const stops: Stop[] = [];

    // Match hex colors with optional position: #rrggbb [0-9]+%
    const hexPattern = /#([0-9a-fA-F]{3,8})\b(?:\s+([\d.]+)%)?/g;
    let m: RegExpExecArray | null;
    while ((m = hexPattern.exec(css)) !== null) {
      const rgb = hexToRgb("#" + m[1]);
      if (rgb)
        stops.push({
          r: rgb[0],
          g: rgb[1],
          b: rgb[2],
          pos: m[2] ? parseFloat(m[2]) : null,
        });
    }

    // Match rgb/rgba: rgb(r,g,b) with optional position
    const rgbPattern =
      /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)[^)]*\)(?:\s+([\d.]+)%)?/g;
    while ((m = rgbPattern.exec(css)) !== null) {
      stops.push({
        r: parseInt(m[1]),
        g: parseInt(m[2]),
        b: parseInt(m[3]),
        pos: m[4] ? parseFloat(m[4]) : null,
      });
    }

    if (stops.length === 0) return [26, 58, 107]; // fallback navy

    // Assign positions if missing (distribute evenly 0…100)
    const withPos = stops.map((s, i) => ({
      ...s,
      pos:
        s.pos !== null
          ? s.pos
          : stops.length === 1
            ? 50
            : (i / (stops.length - 1)) * 100,
    }));

    // Weighted average: weight = distance to neighbours (trapezoidal integration)
    let sumR = 0,
      sumG = 0,
      sumB = 0,
      sumW = 0;
    for (let i = 0; i < withPos.length; i++) {
      const prev = i === 0 ? withPos[0].pos : withPos[i - 1].pos;
      const next =
        i === withPos.length - 1 ? withPos[i].pos : withPos[i + 1].pos;
      const w = (next - prev) / 2;
      sumR += withPos[i].r * w;
      sumG += withPos[i].g * w;
      sumB += withPos[i].b * w;
      sumW += w;
    }
    if (sumW <= 0) {
      sumW = 1;
      sumR = stops[0].r;
      sumG = stops[0].g;
      sumB = stops[0].b;
    }
    return [sumR / sumW, sumG / sumW, sumB / sumW];
  };

  /**
   * Given a background average RGB, derive a 4-color text palette
   * that guarantees WCAG AA contrast (≥ 4.5:1 for body, ≥ 3:1 for large text).
   *
   * Strategy:
   *  1. Compute bg luminance.
   *  2. Decide primary text: white or black (whichever has higher contrast).
   *  3. Derive tinted variants by blending primary with the bg hue.
   */
  const deriveTextPalette = (avgR: number, avgG: number, avgB: number) => {
    const bgLum = relativeLuminance(avgR, avgG, avgB);
    const whiteLum = 1.0;
    const blackLum = 0.0;
    const cWhite = contrastRatio(whiteLum, bgLum);
    const cBlack = contrastRatio(blackLum, bgLum);

    // Dominant hue direction for accent tinting
    const max = Math.max(avgR, avgG, avgB);
    const isBlue = avgB === max;
    const isGreen = avgG === max && avgG > avgR;
    const isRed = avgR === max && avgR > avgB;
    const isWarm = avgR + avgG > avgB * 1.8; // orange/yellow/red family
    const isNeutral = Math.abs(avgR - avgG) < 20 && Math.abs(avgG - avgB) < 20;

    if (cWhite >= cBlack) {
      // Dark background → use white family
      // subtitle/meta: slightly tinted versions of white
      const subtitleColor = isBlue
        ? "#bfdbfe"
        : isGreen
          ? "#bbf7d0"
          : isRed
            ? "#fecaca"
            : isWarm
              ? "#fed7aa"
              : "#e2e8f0"; // neutral
      const metaColor = isBlue
        ? "#93c5fd"
        : isGreen
          ? "#86efac"
          : isRed
            ? "#fca5a5"
            : isWarm
              ? "#fdba74"
              : "#cbd5e1";
      const tagColor = isBlue
        ? "#60a5fa"
        : isGreen
          ? "#4ade80"
          : isRed
            ? "#f87171"
            : isWarm
              ? "#fb923c"
              : "#94a3b8";
      return {
        title: "#ffffff",
        subtitle: subtitleColor,
        meta: metaColor,
        tag: tagColor,
      };
    } else {
      // Light background → use dark family
      // Check if bg is colorful light (e.g. pastel pink/blue) for tinted darks
      const subtitleColor = isBlue
        ? "#1e3a5f"
        : isGreen
          ? "#14532d"
          : isRed
            ? "#7f1d1d"
            : isWarm
              ? "#78350f"
              : "#334155";
      const metaColor = isBlue
        ? "#1e40af"
        : isGreen
          ? "#166534"
          : isRed
            ? "#991b1b"
            : isWarm
              ? "#92400e"
              : "#475569";
      const tagColor = isBlue
        ? "#2563eb"
        : isGreen
          ? "#16a34a"
          : isRed
            ? "#dc2626"
            : isWarm
              ? "#d97706"
              : "#64748b";
      return {
        title: "#0f172a",
        subtitle: subtitleColor,
        meta: metaColor,
        tag: tagColor,
      };
    }
  };

  const [fontColorMsg, setFontColorMsg] = useState<string | null>(null);

  /** Auto-adjust cover page font colors — pure math, zero API calls */
  const autoAdjustCoverFontColor = () => {
    if (!edPages[0]) return;

    try {
      const coverPage = edPages[0];
      const bgStr = coverPage.bgColor || "#1a3a6b";

      const [avgR, avgG, avgB] = parseBgAvgRGB(bgStr);
      const suggestedColors = deriveTextPalette(avgR, avgG, avgB);

      setEdPages((prev) => {
        const newPages = [...prev];
        const cover = {
          ...newPages[0],
          els: newPages[0].els.map((el) => {
            if (el.type !== "text") return el;
            const z = el.zIndex ?? 10;
            if (z === 11) return { ...el, color: suggestedColors.tag };
            if (z === 13) return { ...el, color: suggestedColors.title };
            if (z === 14) return { ...el, color: suggestedColors.subtitle };
            if (z === 15) return { ...el, color: suggestedColors.meta };
            if (z === 16) return { ...el, color: suggestedColors.tag };
            return el;
          }),
        };
        newPages[0] = cover;
        thumbDirtyRef.current.add(0);
        return newPages;
      });

      if (thumbRefreshRef.current) clearTimeout(thumbRefreshRef.current);
      thumbRefreshRef.current = setTimeout(() => triggerThumbRefresh(), 400);
      setFontColorMsg("✓ Colors adjusted!");
      setTimeout(() => setFontColorMsg(null), 2000);
    } catch (err) {
      console.error("Auto font color error:", err);
    }
  };

  /** Re-render thumbnails for dirty pages (marked in thumbDirtyRef) */
  const triggerThumbRefresh = () => {
    const dirty = new Set(thumbDirtyRef.current);
    thumbDirtyRef.current.clear();
    if (dirty.size === 0) return;
    setEdPages((prev) => {
      // Render asynchronously then patch
      const work = async () => {
        const updates: Record<number, string> = {};
        for (const idx of dirty) {
          if (prev[idx]) updates[idx] = await renderThumbnail(prev[idx]);
        }
        setEdPages((p) =>
          p.map((pg, i) =>
            updates[i] !== undefined ? { ...pg, bg: updates[i] } : pg,
          ),
        );
      };
      work();
      return prev; // Return immediately, async update will follow
    });
  };

  /** Patch the currently selected page — O(1), không iterate toàn bộ array */
  const patchPage = (fn: (p: EditorPage) => EditorPage) => {
    saveHistory();
    setEdPages((ps) => {
      const next = [...ps];
      next[selPage] = fn(next[selPage]);
      return next;
    });
  };

  /** Patch a specific element on the current page */
  const patchEl = (id: string, fn: (e: EditorEl) => EditorEl) =>
    patchPage((p) => ({
      ...p,
      els: p.els.map((e) => (e.id === id ? fn(e) : e)),
    }));

  const curPg = edPages[selPage];
  const selEl = curPg?.els.find((e) => e.id === selElId) ?? null;

  // Unified keyboard shortcuts: Ctrl+C, Ctrl+V, Ctrl+Z, Ctrl+Y, Delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "TEXTAREA" ||
        document.activeElement?.tagName === "INPUT"
      )
        return;

      // 1. Delete element
      if (e.key === "Delete" && selElId) {
        e.preventDefault();
        deleteEl(selElId); // patchPage already saves history
      }

      // 2. Ctrl+Z — Undo using ref (never stale)
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (historyRef.current.length > 0) {
          // Push current state to redo stack before undoing
          const currentSnapshot = JSON.parse(
            JSON.stringify(edPages),
          ) as EditorPage[];
          redoRef.current = [currentSnapshot, ...redoRef.current].slice(0, 50);
          const prev = historyRef.current[0];
          historyRef.current = historyRef.current.slice(1);
          setHistory(historyRef.current);
          setEdPages(prev);
          setSelElId(null);
        }
      }

      // 3. Ctrl+Y (or Ctrl+Shift+Z) — Redo
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || (e.key === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        if (redoRef.current.length > 0) {
          // Push current state to undo stack before redoing
          const currentSnapshot = JSON.parse(
            JSON.stringify(edPages),
          ) as EditorPage[];
          historyRef.current = [currentSnapshot, ...historyRef.current].slice(
            0,
            50,
          );
          setHistory(historyRef.current);
          const next = redoRef.current[0];
          redoRef.current = redoRef.current.slice(1);
          setEdPages(next);
          setSelElId(null);
        }
      }

      // 4. Ctrl+C Copy
      if ((e.ctrlKey || e.metaKey) && e.key === "c" && selEl) {
        e.preventDefault();
        setClipboard({ ...selEl });
      }

      // 5. Ctrl+V Paste — patchPage saves history
      if ((e.ctrlKey || e.metaKey) && e.key === "v" && clipboard) {
        e.preventDefault();
        const newId = generateUUID();
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
  }, [selEl, clipboard, selPage, selElId, edPages]);

  const addText = () => {
    const id = generateUUID();
    const maxTxtZ = curPg?.els
      ? curPg.els
          .filter((e) => e.type === "text")
          .reduce((m, e) => Math.max(m, e.zIndex ?? 100), 100)
      : 100;
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

  /** Apply a solid color as page background (current or all pages) + schedule thumbnail refresh */
  const applyBgColor = (color: string, scope: "current" | "all") => {
    saveHistory();
    if (scope === "all") {
      setEdPages((prev) => {
        prev.forEach((_, i) => thumbDirtyRef.current.add(i));
        return prev.map((pg) => ({ ...pg, bgColor: color, bg: "" }));
      });
    } else {
      thumbDirtyRef.current.add(selPage);
      setEdPages((ps) => {
        const next = [...ps];
        next[selPage] = { ...next[selPage], bgColor: color, bg: "" };
        return next;
      });
    }
    if (thumbRefreshRef.current) clearTimeout(thumbRefreshRef.current);
    thumbRefreshRef.current = setTimeout(() => triggerThumbRefresh(), 400);
  };

  /** Apply an image as full-page background element (current or all pages) + schedule thumbnail refresh */
  const applyBgImage = (src: string, scope: "current" | "all") => {
    saveHistory();
    const makeEl = (): EditorEl => ({
      id: generateUUID(),
      type: "image",
      src,
      x: 0,
      y: 0,
      w: CANVAS_W,
      h: CANVAS_H,
      zIndex: 1,
    });
    if (scope === "all") {
      setEdPages((prev) => {
        prev.forEach((_, i) => thumbDirtyRef.current.add(i));
        return prev.map((pg) => ({
          ...pg,
          bg: "",
          els: [
            makeEl(),
            ...pg.els.filter((e) => !(e.type === "image" && e.zIndex === 1)),
          ],
        }));
      });
    } else {
      thumbDirtyRef.current.add(selPage);
      patchPage((pg) => ({
        ...pg,
        bg: "",
        els: [
          makeEl(),
          ...pg.els.filter((e) => !(e.type === "image" && e.zIndex === 1)),
        ],
      }));
    }
    if (thumbRefreshRef.current) clearTimeout(thumbRefreshRef.current);
    thumbRefreshRef.current = setTimeout(() => triggerThumbRefresh(), 400);
  };

  const addImage = (src: string, isBackground: boolean = false) => {
    const img = new window.Image();
    img.onload = () => {
      const id = generateUUID();
      const maxImgZ = curPg?.els
        ? curPg.els
            .filter((e) => e.type === "image")
            .reduce((m, e) => Math.max(m, e.zIndex ?? 10), 10)
        : 10;

      let imageProps: Partial<EditorEl>;

      if (isBackground) {
        // Chế độ Ảnh nền: Full trang, đẩy về lớp dưới cùng
        imageProps = {
          x: 0,
          y: 0,
          w: CANVAS_W, //
          h: CANVAS_H, //
          zIndex: 1, // Đảm bảo nằm dưới các text/table (thường là 100+)
        };
      } else {
        // Chế độ Ảnh bình thường: scale để vừa canvas, tối đa 80% page
        const aspect = img.naturalHeight / img.naturalWidth;
        const maxW = Math.round(CANVAS_W * 0.8);
        const maxH = Math.round(CANVAS_H * 0.8);
        let w = Math.min(img.naturalWidth, maxW);
        let h = Math.round(w * aspect);
        if (h > maxH) {
          h = maxH;
          w = Math.round(h / aspect);
        }
        imageProps = {
          x: Math.round((CANVAS_W - w) / 2),
          y: Math.round((CANVAS_H - h) / 4),
          w,
          h,
          zIndex: maxImgZ + 1,
        };
      }

      patchPage((p) => ({
        ...p,
        els: [
          ...p.els,
          {
            id,
            type: "image",
            src,
            ...imageProps,
          } as EditorEl,
        ],
      }));
      setSelElId(id);
    };
    img.src = src;
  };

  const addTable = (rows: number, cols: number) => {
    const id = generateUUID();
    const tW = 500,
      tH = rows * 32 + 10;
    const tblData = createEmptyTable(rows, cols, tW, tH);
    const maxZ = curPg?.els
      ? curPg.els.reduce((m, e) => Math.max(m, e.zIndex ?? 10), 10)
      : 10;
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

  /** Pointer move/resize — cập nhật DOM trực tiếp, KHÔNG setState (tránh re-render 60fps) */
  const onCanvasPointerMove = (e: React.PointerEvent) => {
    lastPointerEventRef.current = { clientX: e.clientX, clientY: e.clientY };
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.sx,
      dy = e.clientY - d.sy;

    let newX = d.orig.x,
      newY = d.orig.y,
      newW = d.orig.w,
      newH = d.orig.h;
    if (d.type === "move") {
      newX = Math.max(0, d.orig.x + dx);
      newY = Math.max(0, d.orig.y + dy);
    } else {
      if (d.dir.includes("e")) newW = Math.max(30, d.orig.w + dx);
      if (d.dir.includes("s")) newH = Math.max(20, d.orig.h + dy);
      if (d.dir.includes("w")) {
        newX = d.orig.x + dx;
        newW = Math.max(30, d.orig.w - dx);
      }
      if (d.dir.includes("n")) {
        newY = d.orig.y + dy;
        newH = Math.max(20, d.orig.h - dy);
      }
    }
    dragPosRef.current = { x: newX, y: newY, w: newW, h: newH };

    // Cập nhật DOM trực tiếp — không qua React state, 0 re-render
    const elDom = document.getElementById(`editor-el-${d.elId}`);
    if (elDom) {
      elDom.style.left = newX + "px";
      elDom.style.top = newY + "px";
      elDom.style.width = newW + "px";
      elDom.style.height = newH + "px";
    }
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
    saveHistory();
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
    saveHistory();
    const blank: EditorPage = {
      id: generateUUID(),
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

  const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

  const addKeynote = () => {
    const nextIndex = procData.keynotes.length;
    updateKeynotes([
      ...procData.keynotes,
      {
        id: generateUUID(),
        name: "",
        photo: "",
        presentationTitle: "",
        abstract: "",
        bio: "",
        dayLabel: "",
        timeSlot: "",
        location: "",
        keynoteLabel: `KEYNOTE ${ROMAN[nextIndex] || nextIndex + 1}`,
        affiliation: "",
      },
    ]);
  };
  const removeKeynote = (id: string) =>
    updateKeynotes(procData.keynotes.filter((k) => k.id !== id));
  const patchKeynote = (id: string, patch: Partial<KeynoteSpeaker>) =>
    updateKeynotes(
      procData.keynotes.map((k) => (k.id === id ? { ...k, ...patch } : k)),
    );

  const handleUserSearch = async (kId: string, query: string) => {
    patchKState(kId, { userQuery: query });
    if (!query.trim()) {
      patchKState(kId, { userResults: [] });
      return;
    }
    patchKState(kId, { userSearching: true });
    try {
      const { data } = await supabase
        .from("profiles")
        .select(
          "user_id, full_name, email, avatar_url, description, organization",
        )
        .ilike("full_name", `%${query}%`)
        .limit(10);
      patchKState(kId, { userResults: data || [], userSearching: false });
    } catch {
      patchKState(kId, { userSearching: false });
    }
  };

  const handleUserSelect = async (kId: string, user: any) => {
    let photoDataUrl = "";
    if (user.avatar_url) {
      try {
        photoDataUrl = await urlToBase64(user.avatar_url);
      } catch {
        photoDataUrl = "";
      }
    }
    patchKeynote(kId, {
      name: user.full_name || "",
      photo: photoDataUrl,
      bio: user.description || "",
      affiliation: user.organization || "",
    });
    patchKState(kId, { userQuery: "", userResults: [] });
  };

  const handlePaperSearch = (kId: string, query: string) => {
    if (!query.trim()) {
      patchKState(kId, {
        paperQuery: query,
        paperResults: [],
        isEditingTitle: query !== "",
      });
      return;
    }
    const results = procData.detailedSchedule
      .filter((p) =>
        (p.paperTitle || "").toLowerCase().includes(query.toLowerCase()),
      )
      .slice(0, 10);
    // Batch into single state update to avoid stale reads
    patchKState(kId, {
      paperQuery: query,
      paperResults: results,
      paperSearching: false,
      isEditingTitle: true,
    });
  };

  const handlePaperSelect = (kId: string, paper: any) => {
    patchKeynote(kId, {
      presentationTitle: paper.paperTitle || "",
      abstract: paper.abstract || "",
      dayLabel: paper.sessionDayLabel || "",
      timeSlot: paper.timeSlot || "",
      location: paper.location || "",
    });
    patchKState(kId, {
      paperQuery: "",
      paperResults: [],
      isEditingTitle: false,
    });
  };

  // Committee helpers
  const addCommitteeMember = () =>
    updateCommittee([
      ...procData.committee,
      {
        id: generateUUID(),
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
    "w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 transition-all";
  const labelCls =
    "block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5";

  const vm = {
    abstractModal,
    activeTab,
    addCommitteeMember,
    addImage,
    addKeynote,
    addTable,
    addText,
    appendSchedule,
    applyBgColor,
    applyBgImage,
    applyCrop,
    autoAdjustCoverFontColor,
    bannerLogosPendingRef,
    bgApplyScope,
    bgGenAbortRef,
    bgPickerCategory,
    bgPickerSearch,
    bgPickerTab,
    buildPagesForRender,
    clipboard,
    COMMITTEE_ROLES,
    committeeByRole,
    committeeActiveRole,
    committeeCollapsed,
    conferences,
    confStartRef,
    contrastRatio,
    coverLogosLoadingRef,
    cropDragRef,
    cropState,
    curPg,
    customBgColor,
    deleteEl,
    deriveTextPalette,
    downloadPdfFromUrl,
    dragFromIdx,
    dragPosRef,
    dragRef,
    editingTxtId,
    edLoading,
    edPages,
    edPagesRef,
    edReady,
    edReadyRef,
    ensureAllPapersLoaded,
    ensureCoverLogosLoaded,
    error,
    exportingPdf,
    exportPdf,
    fetchProceedingsBootstrap,
    fetchProceedingsPapers,
    fetchProceedingsReviewers,
    fieldCls,
    fontColorMsg,
    generateBlobInBackground,
    getCachedPdfUrl,
    getKState,
    getObj,
    handlePaperSearch,
    handlePaperSelect,
    handleSaveConfig,
    handleUserSearch,
    handleUserSelect,
    hexToRgb,
    hf,
    history,
    historyRef,
    imageToInsert,
    initEditor,
    insertPage,
    jumpToPage,
    keynoteSearchState,
    labelCls,
    lastPointerEventRef,
    loadFullConferenceData,
    loading,
    loadMorePapers,
    mapPapersToSchedule,
    navigate,
    onCanvasPointerMove,
    onElPointerDown,
    onNavigateBack,
    openCrop,
    papersError,
    papersLoading,
    papersTotal,
    parseBgAvgRGB,
    patchCommitteeMember,
    patchEl,
    patchKeynote,
    patchKState,
    patchPage,
    pendingBannerUrlsRef,
    prevBlobRef,
    previewBlobUrl,
    previewCacheKey,
    previewCacheUrl,
    previewGenerating,
    procData,
    procDataRef,
    redoRef,
    relativeLuminance,
    removeCommitteeMember,
    removeKeynote,
    renderProceedingsPdf,
    reorderPage,
    ROMAN,
    saveHistory,
    saving,
    scrollAreaRef,
    selectedConfId,
    selEl,
    selElId,
    selPage,
    setAbstractModal,
    setActiveTab,
    setBgApplyScope,
    setBgPickerCategory,
    setBgPickerSearch,
    setBgPickerTab,
    setClipboard,
    setCommitteeActiveRole,
    setCommitteeCollapsed,
    setConferences,
    setCropState,
    setCustomBgColor,
    setDragFromIdx,
    setEditingTxtId,
    setEdLoading,
    setEdPages,
    setEdReady,
    setError,
    setExportingPdf,
    setFontColorMsg,
    setHF,
    setHistory,
    setImageToInsert,
    setKeynoteSearchState,
    setLoading,
    setPapersError,
    setPapersLoading,
    setPapersTotal,
    setPreviewBlobUrl,
    setPreviewCacheKey,
    setPreviewCacheUrl,
    setPreviewGenerating,
    setProcData,
    setSelectedConfId,
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
    syncToc,
    tableSelectedCells,
    thumbDirtyRef,
    thumbRefreshRef,
    tocDebounceRef,
    toLinear,
    triggerThumbRefresh,
    updateCommittee,
    updateCover,
    updateGeneralInfo,
    updateKeynotes,
    uploadCachedPdf,
  };
  return (
    <DefaultLayout meta={{ title: "Proceedings Publisher" }}>
      <div className="min-h-screen bg-slate-50">
        {/* ── Top bar ── */}
        <div className="bg-white border-b border-slate-200 sticky top-16 z-10">
          <div className="max-w-screen-xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={onNavigateBack}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="w-px h-5 bg-slate-200" />
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <Book className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h1 className="text-base font-semibold text-slate-900 leading-none">
                    Proceedings Publisher
                  </h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Build your conference program book
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Popover open={openConfSelector} onOpenChange={setOpenConfSelector}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openConfSelector}
                    className="w-[300px] justify-between bg-slate-50 text-slate-700"
                  >
                    <span className="truncate flex-1 text-left">
                      {selectedConfId
                        ? conferences.find((c) => c.conf_id === selectedConfId)?.conf_name
                        : "— Select Conference —"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput placeholder="Search conference..." />
                    <CommandList>
                      <CommandEmpty>No conference found.</CommandEmpty>
                      <CommandGroup>
                        {conferences.map((c) => (
                          <CommandItem
                            key={c.conf_id}
                            value={c.conf_name}
                            onSelect={() => {
                              setSelectedConfId(c.conf_id);
                              setOpenConfSelector(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedConfId === c.conf_id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {c.conf_name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <Button
                variant={hasUnsavedChanges ? "default" : "outline"}
                onClick={handleSaveConfig}
                disabled={!selectedConfId || saving}
                className={cn("rounded-lg text-sm flex items-center gap-1.5", hasUnsavedChanges && "bg-indigo-600 hover:bg-indigo-700 text-white")}
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>

        {/* ── Warning ── */}
        {error && (
          <div className="max-w-screen-xl mx-auto px-6 pt-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-800">{error}</p>
            </div>
          </div>
        )}

        {/* ── Unsaved Changes Warning ── */}
        {hasUnsavedChanges && !error && (
          <div className="max-w-screen-xl mx-auto px-6 pt-4">
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 flex items-start gap-2.5 shadow-sm transition-all">
              <Info className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
              <p className="text-sm text-indigo-800">
                You have unsaved changes. Don't forget to click "Save" to keep your updates.
              </p>
            </div>
          </div>
        )}

        <div className="max-w-screen-xl mx-auto px-6 py-6 flex gap-6">
          {/* ── Sidebar ── */}
          <aside className="w-52 shrink-0">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
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
                          ? "bg-indigo-50 text-indigo-700"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 ${active ? "text-indigo-600" : "text-slate-400"}`}
                      />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Stats card */}
            {selectedConfId && (
              <div className="mt-3 bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Summary
                </p>
                {[
                  {
                    label: "Papers",
                    count: Math.max(
                      papersTotal,
                      procData.detailedSchedule.length,
                    ),
                  },
                  { label: "Sessions", count: procData.summarySchedule.length },
                  { label: "Committee", count: procData.committee.length },
                  { label: "Keynotes", count: procData.keynotes.length },
                ].map(({ label, count }) => (
                  <div
                    key={label}
                    className="flex justify-between items-center"
                  >
                    <span className="text-xs text-slate-500">{label}</span>
                    <span className="text-sm font-semibold text-slate-800">
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
              <div className="bg-white rounded-xl border border-slate-200 h-96 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                <p className="text-sm text-slate-500">
                  Loading conference data…
                </p>
              </div>
            ) : !selectedConfId ? (
              <div className="bg-white rounded-xl border border-slate-200 h-96 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Book className="w-12 h-12 opacity-20" />
                <p className="text-sm font-medium">
                  Select a conference to begin
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200">
                <div className="px-7 py-5 border-b border-slate-100">
                  <h2 className="text-base font-semibold text-slate-900">
                    {TABS.find((t) => t.key === activeTab)?.label}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
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
                  <ProceedingsBasicTabsSection vm={vm} />
                  <ProceedingsEditorSection vm={vm} />
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
