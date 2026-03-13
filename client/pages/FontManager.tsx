import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  Star,
  StarOff,
  ChevronDown,
  Type,
  X,
  Check,
} from "lucide-react";

// ─── Font catalogue ───────────────────────────────────────────────────────────
// Each entry: { name, category, googleName (for @import URL) }
export interface FontEntry {
  name: string;
  category: "serif" | "sans-serif" | "monospace" | "display" | "handwriting";
  googleName: string; // URL-safe name used in Google Fonts API
}

export const FONT_CATALOGUE: FontEntry[] = [
  // ── Serif ─────────────────────────────────────────────────────────────────
  { name: "Times New Roman", category: "serif", googleName: "Tinos" },
  { name: "Georgia", category: "serif", googleName: "Gelasio" },
  { name: "Palatino", category: "serif", googleName: "GFS+Didot" },
  { name: "Garamond", category: "serif", googleName: "EB+Garamond" },
  { name: "Crimson Text", category: "serif", googleName: "Crimson+Text" },
  {
    name: "Playfair Display",
    category: "serif",
    googleName: "Playfair+Display",
  },
  {
    name: "Libre Baskerville",
    category: "serif",
    googleName: "Libre+Baskerville",
  },
  { name: "Lora", category: "serif", googleName: "Lora" },
  { name: "Merriweather", category: "serif", googleName: "Merriweather" },
  { name: "PT Serif", category: "serif", googleName: "PT+Serif" },
  { name: "Source Serif 4", category: "serif", googleName: "Source+Serif+4" },
  {
    name: "Cormorant Garamond",
    category: "serif",
    googleName: "Cormorant+Garamond",
  },
  { name: "Noto Serif", category: "serif", googleName: "Noto+Serif" },
  { name: "Bitter", category: "serif", googleName: "Bitter" },
  { name: "Spectral", category: "serif", googleName: "Spectral" },
  { name: "Arvo", category: "serif", googleName: "Arvo" },
  { name: "Zilla Slab", category: "serif", googleName: "Zilla+Slab" },
  { name: "Abhaya Libre", category: "serif", googleName: "Abhaya+Libre" },
  { name: "Vollkorn", category: "serif", googleName: "Vollkorn" },
  { name: "Cardo", category: "serif", googleName: "Cardo" },

  // ── Sans-serif ────────────────────────────────────────────────────────────
  { name: "Arial", category: "sans-serif", googleName: "Arimo" },
  { name: "Helvetica", category: "sans-serif", googleName: "Helvetica" }, // system
  { name: "Roboto", category: "sans-serif", googleName: "Roboto" },
  { name: "Open Sans", category: "sans-serif", googleName: "Open+Sans" },
  { name: "Lato", category: "sans-serif", googleName: "Lato" },
  { name: "Montserrat", category: "sans-serif", googleName: "Montserrat" },
  { name: "Poppins", category: "sans-serif", googleName: "Poppins" },
  { name: "Inter", category: "sans-serif", googleName: "Inter" },
  { name: "Nunito", category: "sans-serif", googleName: "Nunito" },
  { name: "Raleway", category: "sans-serif", googleName: "Raleway" },
  {
    name: "Source Sans 3",
    category: "sans-serif",
    googleName: "Source+Sans+3",
  },
  { name: "PT Sans", category: "sans-serif", googleName: "PT+Sans" },
  { name: "Noto Sans", category: "sans-serif", googleName: "Noto+Sans" },
  { name: "Mulish", category: "sans-serif", googleName: "Mulish" },
  { name: "Josefin Sans", category: "sans-serif", googleName: "Josefin+Sans" },
  { name: "Work Sans", category: "sans-serif", googleName: "Work+Sans" },
  { name: "Figtree", category: "sans-serif", googleName: "Figtree" },
  { name: "Outfit", category: "sans-serif", googleName: "Outfit" },
  { name: "DM Sans", category: "sans-serif", googleName: "DM+Sans" },
  { name: "Cabin", category: "sans-serif", googleName: "Cabin" },
  { name: "Quicksand", category: "sans-serif", googleName: "Quicksand" },
  { name: "Barlow", category: "sans-serif", googleName: "Barlow" },
  { name: "Exo 2", category: "sans-serif", googleName: "Exo+2" },
  {
    name: "Titillium Web",
    category: "sans-serif",
    googleName: "Titillium+Web",
  },
  { name: "Ubuntu", category: "sans-serif", googleName: "Ubuntu" },
  { name: "Lexend", category: "sans-serif", googleName: "Lexend" },
  { name: "Jost", category: "sans-serif", googleName: "Jost" },
  { name: "Manrope", category: "sans-serif", googleName: "Manrope" },
  {
    name: "Plus Jakarta Sans",
    category: "sans-serif",
    googleName: "Plus+Jakarta+Sans",
  },
  { name: "Sora", category: "sans-serif", googleName: "Sora" },

  // ── Monospace ─────────────────────────────────────────────────────────────
  { name: "Courier New", category: "monospace", googleName: "Cousine" },
  {
    name: "Source Code Pro",
    category: "monospace",
    googleName: "Source+Code+Pro",
  },
  { name: "Roboto Mono", category: "monospace", googleName: "Roboto+Mono" },
  { name: "Fira Code", category: "monospace", googleName: "Fira+Code" },
  {
    name: "JetBrains Mono",
    category: "monospace",
    googleName: "JetBrains+Mono",
  },
  { name: "Space Mono", category: "monospace", googleName: "Space+Mono" },
  { name: "Inconsolata", category: "monospace", googleName: "Inconsolata" },
  { name: "IBM Plex Mono", category: "monospace", googleName: "IBM+Plex+Mono" },
  {
    name: "Noto Sans Mono",
    category: "monospace",
    googleName: "Noto+Sans+Mono",
  },
  { name: "Overpass Mono", category: "monospace", googleName: "Overpass+Mono" },

  // ── Display ───────────────────────────────────────────────────────────────
  { name: "Bebas Neue", category: "display", googleName: "Bebas+Neue" },
  { name: "Anton", category: "display", googleName: "Anton" },
  { name: "Righteous", category: "display", googleName: "Righteous" },
  { name: "Fjalla One", category: "display", googleName: "Fjalla+One" },
  { name: "Oswald", category: "display", googleName: "Oswald" },
  { name: "Abril Fatface", category: "display", googleName: "Abril+Fatface" },
  { name: "Cinzel", category: "display", googleName: "Cinzel" },
  { name: "Alfa Slab One", category: "display", googleName: "Alfa+Slab+One" },
  { name: "Black Han Sans", category: "display", googleName: "Black+Han+Sans" },
  { name: "Boogaloo", category: "display", googleName: "Boogaloo" },
  { name: "Lobster", category: "display", googleName: "Lobster" },
  { name: "Fredoka One", category: "display", googleName: "Fredoka+One" },
  {
    name: "Permanent Marker",
    category: "display",
    googleName: "Permanent+Marker",
  },
  { name: "Rubik", category: "display", googleName: "Rubik" },
  { name: "Secular One", category: "display", googleName: "Secular+One" },
  {
    name: "Yanone Kaffeesatz",
    category: "display",
    googleName: "Yanone+Kaffeesatz",
  },
  { name: "Acme", category: "display", googleName: "Acme" },
  { name: "Russo One", category: "display", googleName: "Russo+One" },
  { name: "Teko", category: "display", googleName: "Teko" },
  { name: "Space Grotesk", category: "display", googleName: "Space+Grotesk" },

  // ── Handwriting ───────────────────────────────────────────────────────────
  {
    name: "Dancing Script",
    category: "handwriting",
    googleName: "Dancing+Script",
  },
  { name: "Pacifico", category: "handwriting", googleName: "Pacifico" },
  { name: "Great Vibes", category: "handwriting", googleName: "Great+Vibes" },
  { name: "Caveat", category: "handwriting", googleName: "Caveat" },
  { name: "Kalam", category: "handwriting", googleName: "Kalam" },
  {
    name: "Architects Daughter",
    category: "handwriting",
    googleName: "Architects+Daughter",
  },
  { name: "Satisfy", category: "handwriting", googleName: "Satisfy" },
  { name: "Indie Flower", category: "handwriting", googleName: "Indie+Flower" },
  { name: "Handlee", category: "handwriting", googleName: "Handlee" },
  { name: "Patrick Hand", category: "handwriting", googleName: "Patrick+Hand" },
];

// ─── Font loader ──────────────────────────────────────────────────────────────
const loadedFonts = new Set<string>();

export const loadFont = (entry: FontEntry) => {
  if (loadedFonts.has(entry.name)) return;
  // system fonts don't need loading
  if (entry.googleName === "Helvetica") {
    loadedFonts.add(entry.name);
    return;
  }
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${entry.googleName}:wght@400;700&display=swap`;
  document.head.appendChild(link);
  loadedFonts.add(entry.name);
};

/** Get the CSS font-family string from a font name */
export const cssFontFamily = (fontName?: string): string => {
  if (!fontName) return "Helvetica, Arial, sans-serif";
  const entry = FONT_CATALOGUE.find((f) => f.name === fontName);
  if (!entry) return `"${fontName}", Helvetica, Arial, sans-serif`;
  // Use the Google Font family name as the CSS family
  const cssName = entry.googleName.replace(/\+/g, " ");
  return `"${cssName}", "${fontName}", Helvetica, Arial, sans-serif`;
};

// ─── FontSelector — drop-down picker ─────────────────────────────────────────
interface FontSelectorProps {
  value?: string;
  onChange: (fontName: string) => void;
  className?: string;
}

export const FontSelector: React.FC<FontSelectorProps> = ({
  value,
  onChange,
  className = "",
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [starred, setStarred] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("fm_starred") || "[]");
    } catch {
      return [];
    }
  });
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Focus search when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60);
  }, [open]);

  const toggleStar = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStarred((prev) => {
      const next = prev.includes(name)
        ? prev.filter((n) => n !== name)
        : [...prev, name];
      localStorage.setItem("fm_starred", JSON.stringify(next));
      return next;
    });
  };

  const categories = [
    "all",
    "starred",
    "serif",
    "sans-serif",
    "monospace",
    "display",
    "handwriting",
  ];

  const filtered = FONT_CATALOGUE.filter((f) => {
    const matchQ = !query || f.name.toLowerCase().includes(query.toLowerCase());
    const matchC =
      activeCategory === "all"
        ? true
        : activeCategory === "starred"
          ? starred.includes(f.name)
          : f.category === activeCategory;
    return matchQ && matchC;
  });

  const select = (f: FontEntry) => {
    loadFont(f);
    onChange(f.name);
    setOpen(false);
    setQuery("");
  };

  const displayEntry = FONT_CATALOGUE.find((f) => f.name === value);

  return (
    <div ref={panelRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white hover:border-indigo-300 transition-all text-sm"
        style={{ fontFamily: value ? cssFontFamily(value) : undefined }}
      >
        <span className="truncate text-slate-800">
          {value || "Select font…"}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute z-50 top-full -left-4 sm:left-0 mt-1 w-full min-w-[240px] bg-white border border-slate-200 rounded-xl shadow-2xl flex flex-col overflow-hidden"
          style={{ maxHeight: 420 }}
        >
          {/* Search */}
          <div className="p-2 border-b border-slate-100 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search fonts…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 text-xs outline-none text-slate-700 placeholder:text-slate-300"
            />
            {query && (
              <button onClick={() => setQuery("")}>
                <X className="w-3 h-3 text-slate-400" />
              </button>
            )}
          </div>

          {/* Category tabs */}
          <div className="flex gap-0.5 px-2 pt-1.5 pb-1 overflow-x-auto shrink-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap transition-all ${
                  activeCategory === cat
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {cat === "starred" ? "★" : cat}
              </button>
            ))}
          </div>

          {/* Font list */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-6">
                No fonts found
              </p>
            ) : (
              filtered.map((f) => {
                loadFont(f); // lazy-load as they appear
                const isSelected = f.name === value;
                const isStarred = starred.includes(f.name);
                return (
                  <div
                    key={f.name}
                    onClick={() => select(f)}
                    className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-all ${isSelected ? "bg-indigo-50" : "hover:bg-slate-50"}`}
                  >
                    <div className="flex-1 min-w-0">
                      <span
                        className="text-sm text-slate-800 block truncate"
                        style={{ fontFamily: cssFontFamily(f.name) }}
                      >
                        {f.name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {f.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isSelected && (
                        <Check className="w-3 h-3 text-indigo-500" />
                      )}
                      <button
                        onClick={(e) => toggleStar(f.name, e)}
                        className="opacity-60 hover:opacity-100 transition-opacity"
                      >
                        {isStarred ? (
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        ) : (
                          <StarOff className="w-3 h-3 text-slate-300" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── FontManagerPage — full standalone page ───────────────────────────────────
interface FontManagerPageProps {
  onBack?: () => void;
}

const PREVIEW_TEXT = "The quick brown fox jumps over the lazy dog";
const CATEGORIES = [
  "all",
  "serif",
  "sans-serif",
  "monospace",
  "display",
  "handwriting",
] as const;

export const FontManagerPage: React.FC<FontManagerPageProps> = ({ onBack }) => {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [previewText, setPreviewText] = useState(PREVIEW_TEXT);
  const [previewSize, setPreviewSize] = useState(20);
  const [starred, setStarred] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("fm_starred") || "[]");
    } catch {
      return [];
    }
  });
  const [loadedSet, setLoadedSet] = useState<Set<string>>(new Set());

  const toggleStar = (name: string) => {
    setStarred((prev) => {
      const next = prev.includes(name)
        ? prev.filter((n) => n !== name)
        : [...prev, name];
      localStorage.setItem("fm_starred", JSON.stringify(next));
      return next;
    });
  };

  const handleLoad = useCallback(
    (f: FontEntry) => {
      if (loadedSet.has(f.name)) return;
      loadFont(f);
      setLoadedSet((prev) => new Set(prev).add(f.name));
    },
    [loadedSet],
  );

  // Load all visible fonts when filter changes
  const filtered = FONT_CATALOGUE.filter((f) => {
    const matchQ = !query || f.name.toLowerCase().includes(query.toLowerCase());
    const matchC =
      activeCategory === "all"
        ? true
        : activeCategory === "starred"
          ? starred.includes(f.name)
          : f.category === activeCategory;
    return matchQ && matchC;
  });

  useEffect(() => {
    filtered.forEach((f) => handleLoad(f));
  }, [filtered.map((f) => f.name).join(",")]);

  const catCounts: Record<string, number> = { all: FONT_CATALOGUE.length };
  FONT_CATALOGUE.forEach((f) => {
    catCounts[f.category] = (catCounts[f.category] || 0) + 1;
  });
  catCounts["starred"] = starred.length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        {onBack && (
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            ←
          </button>
        )}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Type className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">Font Manager</h1>
            <p className="text-xs text-slate-400">
              {FONT_CATALOGUE.length} fonts available
            </p>
          </div>
        </div>

        {/* Preview controls */}
        <div className="ml-auto flex items-center gap-3">
          <input
            type="text"
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
            placeholder="Preview text…"
            className="w-72 px-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">Size</span>
            <input
              type="range"
              min={12}
              max={48}
              value={previewSize}
              onChange={(e) => setPreviewSize(Number(e.target.value))}
              className="w-24 accent-indigo-600"
            />
            <span className="text-xs text-slate-500 w-6">{previewSize}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <div className="w-48 shrink-0 bg-white border-r border-slate-200 flex flex-col py-3 gap-0.5 px-2">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 mb-1">
            Category
          </p>
          {[...CATEGORIES, "starred"].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                activeCategory === cat
                  ? "bg-indigo-600 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span className="capitalize">
                {cat === "starred" ? "★ Starred" : cat}
              </span>
              <span
                className={`text-xs ${activeCategory === cat ? "text-indigo-200" : "text-slate-400"}`}
              >
                {catCounts[cat] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Search bar */}
          <div className="bg-white border-b border-slate-100 px-4 py-2.5 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search fonts by name…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 text-sm outline-none text-slate-700 placeholder:text-slate-300 bg-transparent"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="p-0.5 hover:bg-slate-100 rounded"
              >
                <X className="w-3.5 h-3.5 text-slate-400" />
              </button>
            )}
            <span className="text-xs text-slate-400">
              {filtered.length} fonts
            </span>
          </div>

          {/* Font grid */}
          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 gap-2">
            {filtered.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-24 text-slate-400">
                <Type className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">No fonts match your search</p>
              </div>
            ) : (
              filtered.map((f) => {
                const isStarred = starred.includes(f.name);
                return (
                  <div
                    key={f.name}
                    className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-4 hover:border-indigo-200 hover:shadow-sm transition-all group"
                  >
                    {/* Star */}
                    <button
                      onClick={() => toggleStar(f.name)}
                      className="shrink-0 opacity-40 group-hover:opacity-100 transition-opacity"
                    >
                      {isStarred ? (
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      ) : (
                        <StarOff className="w-4 h-4 text-slate-300" />
                      )}
                    </button>

                    {/* Name + category */}
                    <div className="w-44 shrink-0">
                      <p className="text-xs font-semibold text-slate-700">
                        {f.name}
                      </p>
                      <p className="text-[10px] text-slate-400 capitalize">
                        {f.category}
                      </p>
                    </div>

                    {/* Preview */}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p
                        className="truncate text-slate-800"
                        style={{
                          fontFamily: cssFontFamily(f.name),
                          fontSize: previewSize,
                          lineHeight: 1.3,
                        }}
                      >
                        {previewText || PREVIEW_TEXT}
                      </p>
                    </div>

                    {/* Category badge */}
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        f.category === "serif"
                          ? "bg-blue-50 text-blue-600"
                          : f.category === "sans-serif"
                            ? "bg-emerald-50 text-emerald-600"
                            : f.category === "monospace"
                              ? "bg-violet-50 text-violet-600"
                              : f.category === "display"
                                ? "bg-orange-50 text-orange-600"
                                : "bg-pink-50 text-pink-600"
                      }`}
                    >
                      {f.category}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
