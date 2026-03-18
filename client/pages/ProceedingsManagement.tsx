import React, { useState, useEffect, useRef } from "react";
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
import { supabase } from "../lib/supabase";
import Button from "../components/ui/Button";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  pdf,
  Font,
} from "@react-pdf/renderer";
import { v4 as uuidv4 } from "uuid";

const BASE_API_URL = "http://localhost:8080";
const PAPERS_PAGE_SIZE = 50;

// Register Inter font using local TTF files in public folder
Font.register({
  family: "Inter",
  fonts: [
    { src: "/fonts/Inter-Regular.ttf", fontWeight: "normal" },
    { src: "/fonts/Inter-Bold.ttf", fontWeight: "bold" },
    { src: "/fonts/Inter-Italic.ttf", fontStyle: "italic" },
  ],
});

// Register Roboto font using standard UI sans-serif fallbacks since we don't have local TTF yet
Font.register({
  family: "Roboto",
  fonts: [
    { src: "/fonts/Inter-Regular.ttf", fontWeight: "normal" },
    { src: "/fonts/Inter-Bold.ttf", fontWeight: "bold" },
    { src: "/fonts/Inter-Italic.ttf", fontStyle: "italic" },
  ],
});

// Suppress react-pdf hyphenation warnings
Font.registerHyphenationCallback((word) => [word]);
import {
  TableData,
  CellCoord,
  createEmptyTable,
  TableEditorCanvas,
  TablePropertiesPanel,
  InsertTableModal,
  TablePdfExport,
  renderTableToCanvas,
} from "./TableEditor";
import { FontSelector, cssFontFamily } from "./FontManager";

interface ProceedingsManagementProps {
  userRoleId: number;
  onNavigateBack: () => void;
}

interface KeynoteSpeaker {
  id: string;
  name: string;
  photo: string;
  presentationTitle: string;
  abstract: string;
  bio: string;
  dayLabel?: string;
  timeSlot?: string;
  location?: string;
  keynoteLabel?: string;
  affiliation?: string;
}

// ─── PDF Styles ────────────────────────────────────────────────────────────────
const pdfStyles = StyleSheet.create({
  page: {
    padding: "50pt 55pt",
    fontFamily: "Inter",
    fontSize: 10,
    lineHeight: 1.5,
    color: "#1a202c",
  },
  coverPage: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    backgroundColor: "#1a3a6b",
    padding: 60,
  },
  coverTag: {
    fontSize: 11,
    color: "#93c5fd",
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 20,
    fontFamily: "Inter",
  },
  coverTitle: {
    fontSize: 30,
    fontFamily: "Inter",
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
    lineHeight: 1.3,
    marginBottom: 16,
  },
  coverSubtitle: {
    fontSize: 13,
    color: "#bfdbfe",
    textAlign: "center",
    marginBottom: 8,
  },
  coverDateLoc: {
    fontSize: 11,
    color: "#93c5fd",
    textAlign: "center",
    marginBottom: 50,
  },
  coverDivider: {
    width: 60,
    height: 2,
    backgroundColor: "#60a5fa",
    marginBottom: 50,
  },
  coverSponsorLabel: {
    fontSize: 9,
    color: "#93c5fd",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 14,
  },
  coverLogos: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
  },

  // TOC (SOICT 2025 style)
  tocTitle: {
    fontSize: 24,
    fontFamily: "Inter",
    fontWeight: "bold",
    color: "#2b5797",
    textAlign: "center",
    marginBottom: 30,
    letterSpacing: 1,
  },
  tocEntryRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 28,
    paddingLeft: 10,
  },
  tocPageNum: {
    fontSize: 22,
    fontFamily: "Inter",
    fontWeight: "bold",
    color: "#3b6cb5",
    width: 48,
    marginRight: 14,
  },
  tocLabel: { fontSize: 12, color: "#3b6cb5", fontFamily: "Inter" },

  // Section headings
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Inter",
    fontWeight: "bold",
    marginTop: 0,
    marginBottom: 18,
    color: "#1a3a6b",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sectionDivider: { height: 2, backgroundColor: "#1a3a6b", marginBottom: 18 },
  // Committee
  roleHeader: {
    fontSize: 10,
    fontFamily: "Inter",
    fontWeight: "bold",
    color: "#1a3a6b",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 14,
    marginBottom: 4,
  },
  memberLine: {
    fontSize: 9.5,
    color: "#2d3748",
    marginBottom: 3,
    paddingLeft: 8,
  },

  // Program at a Glance — day bar
  glanceDayBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1a3a6b",
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginTop: 18,
    marginBottom: 0,
  },
  glanceDayLeft: {
    fontSize: 11,
    fontFamily: "Inter",
    fontWeight: "bold",
    color: "#ffffff",
    textTransform: "uppercase",
  },
  glanceDayRight: {
    fontSize: 11,
    fontFamily: "Inter",
    fontWeight: "bold",
    color: "#ffffff",
  },
  // Program at a Glance — table rows
  glanceRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#cbd5e0",
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: "flex-start",
  },
  glanceColTime: { width: "18%", fontSize: 9, color: "#2d3748" },
  glanceColSession: { width: "57%", fontSize: 9, color: "#2d3748" },
  glanceColLocation: {
    width: "25%",
    fontSize: 9,
    color: "#2d3748",
    textAlign: "right",
  },

  // Keynotes
  keynoteCard: {
    marginBottom: 24,
    padding: "12pt 0",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  keynoteTitle: {
    fontSize: 13,
    fontFamily: "Inter",
    fontWeight: "bold",
    color: "#1a3a6b",
    marginBottom: 6,
  },
  keynoteHeader: {
    flexDirection: "row",
    marginBottom: 10,
    alignItems: "flex-start",
  },
  keynoteSpeaker: {
    fontSize: 11,
    fontFamily: "Inter",
    fontStyle: "italic",
    color: "#4a5568",
    marginBottom: 10,
  },
  keynotePhoto: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginRight: 15,
    objectFit: "cover",
  },
  keynoteInfo: { flex: 1 },
  abstractLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#718096",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 3,
    marginTop: 6,
  },
  abstractText: {
    fontSize: 9.5,
    fontFamily: "Inter",
    color: "#2d3748",
    lineHeight: 1.55,
    textAlign: "justify",
  },
  bioText: {
    fontSize: 9,
    color: "#4a5568",
    lineHeight: 1.5,
    textAlign: "justify",
    marginTop: 6,
    fontFamily: "Inter",
    fontStyle: "italic",
  },

  // Detailed papers
  sessionHeader: {
    backgroundColor: "#eef2f7",
    padding: "8pt 10pt",
    marginBottom: 8,
    marginTop: 16,
  },
  sessionName: {
    fontSize: 11,
    fontFamily: "Inter",
    fontWeight: "bold",
    color: "#1a3a6b",
  },
  sessionMeta: { fontSize: 8.5, color: "#718096", marginTop: 2 },
  paperBlock: {
    marginBottom: 8,
    paddingLeft: 10,
    borderLeftWidth: 2.5,
    borderLeftColor: "#93c5fd",
    width: "100%",
  },
  paperTitle: {
    fontSize: 10.5,
    fontFamily: "Inter",
    fontWeight: "bold",
    color: "#1a202c",
    marginBottom: 2,
  },
  paperAuthors: {
    fontSize: 8.5,
    fontFamily: "Inter",
    fontStyle: "italic",
    color: "#4a5568",
    marginBottom: 4,
  },

  // General info
  infoSection: { marginBottom: 16 },
  infoLabelBar: {
    backgroundColor: "#3b5488",
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginBottom: 4,
  },
  infoLabelText: {
    fontSize: 10,
    fontFamily: "Inter",
    fontWeight: "bold",
    color: "#ffffff",
    textTransform: "uppercase",
  },
  infoText: {
    fontSize: 10,
    color: "#1a202c",
    lineHeight: 1.5,
    paddingHorizontal: 2,
  },

  footerContainer: {
    position: "absolute",
    bottom: 22,
    left: 55,
    right: 55,
  },
  footerTitle: {
    fontSize: 8,
    color: "#1a3a6b",
    fontFamily: "Inter",
    marginBottom: 4,
  },
  footerLine: {
    height: 0.75,
    backgroundColor: "#1a3a6b",
    marginBottom: 4,
  },
  footerBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: {
    fontSize: 8,
    color: "#1a3a6b",
    fontFamily: "Inter",
    flex: 1,
  },
  pageNumber: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#1a3a6b",
  },
});

const formatAbstract = (text?: string) => {
  if (!text) return "";
  return text
    .replace(/\r?\n/g, " ") // bỏ line break
    .replace(/\s+/g, " ") // bỏ double space
    .trim();
};

/** Reusable footer: conferenceName above line, optional footerText below line + page number */
const PdfFooter: React.FC<{ conferenceName: string; footerText?: string }> = ({ conferenceName, footerText }) => {
  // Auto-shrink font so conferenceName always fits in one line
  const nameLen = (conferenceName || "").length;
  const nameFontSize = nameLen > 80 ? 6.5 : nameLen > 55 ? 7 : 8;
  return (
    <View style={pdfStyles.footerContainer} fixed>
      <Text style={{ ...pdfStyles.footerTitle, fontSize: nameFontSize }}>{conferenceName}</Text>
      <View style={pdfStyles.footerLine} />
      <View style={pdfStyles.footerBottom}>
        {footerText ? (
          <Text style={pdfStyles.footerText}>{footerText}</Text>
        ) : (
          <Text style={pdfStyles.footerText}> </Text>
        )}
        <Text style={pdfStyles.pageNumber} render={({ pageNumber }) => `${pageNumber}`} />
      </View>
    </View>
  );
};

// ─── PDF Document ─────────────────────────────────────────────────────────────
const ProceedingsDocument = ({ data }: { data: any }) => {
  // Group committee by role
  const committeeByRole: Record<string, any[]> = {};
  (data.committee || []).forEach((m: any) => {
    if (!committeeByRole[m.role]) committeeByRole[m.role] = [];
    committeeByRole[m.role].push(m);
  });

  // Group summary schedule by date
  const scheduleByDate: Record<string, any[]> = {};
  (data.summarySchedule || []).forEach((s: any) => {
    const key = s.date || "Unscheduled";
    if (!scheduleByDate[key]) scheduleByDate[key] = [];
    scheduleByDate[key].push(s);
  });

  // Trong ProceedingsDocument
  // Page layout: Cover(1), TOC(2), Foreword(3), Committee(4), Info(5), Schedule(6), [Keynotes(7)], Detailed(7 or 8)
  const tocItems = [
    { label: "Foreword", page: 3 },
    { label: "Organizing Committee", page: 4 },
    { label: "General Information", page: 5 },
    { label: "Program at a Glance", page: 6 },
    ...(data.keynotes?.length > 0
      ? [{ label: "Keynote Speakers", page: 7 }]
      : []),
    {
      label: "Detailed Program with Abstracts",
      page: data.keynotes?.length > 0 ? 8 : 7,
    },
  ];

  return (
    <Document>
      {/* ── COVER ── */}
      <Page size="A4" style={pdfStyles.coverPage}>
        <Text style={pdfStyles.coverTag}>Program Book</Text>
        <View style={pdfStyles.coverDivider} />
        {(() => {
          const title = data.cover.title || "CONFERENCE PROCEEDINGS";
          const titleFs = Math.max(16, Math.min(30, Math.floor(420 / (title.length * 0.55))));
          const subName = data.cover.conferenceName || "";
          const dateLoc = `${data.cover.date} · ${data.cover.location}`;
          const dateFs = Math.max(8, Math.min(11, Math.floor(460 / (dateLoc.length * 0.52))));
          return (
            <>
              <Text style={{ ...pdfStyles.coverTitle, fontSize: titleFs }}>{title}</Text>
              <Text style={{ ...pdfStyles.coverSubtitle, fontSize: 13, textAlign: "center", lineHeight: 1.4 }}>{subName}</Text>
              <Text style={{ ...pdfStyles.coverDateLoc, fontSize: dateFs }}>{dateLoc}</Text>
            </>
          );
        })()}

        {(() => {
          const selectedLogos = (data.cover.sponsorLogos || []).filter(
            (l: any) => l.selected,
          );
          if (selectedLogos.length === 0) return null;

          const count = selectedLogos.length;
          // Max width for logos container is ~475pt
          // Each logo width ~80pt, spacing 10pt
          const logoW = 80;
          const logoH = 60;
          const spacing = 15;

          return (
            <View style={{ marginTop: 40, alignItems: "center", width: "100%" }}>
              <Text style={pdfStyles.coverSponsorLabel}>
                Sponsors & Partners
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: spacing,
                  width: "100%",
                }}
              >
                {selectedLogos.map((logo: any, i: number) => (
                  <Image
                    key={i}
                    src={logo.src}
                    style={{
                      width: logoW,
                      height: logoH,
                      objectFit: "contain",
                    }}
                  />
                ))}
              </View>
            </View>
          );
        })()}
      </Page>

      {/* ── TABLE OF CONTENTS */}
      <Page size="A4" style={{ ...pdfStyles.page, position: "relative" }}>
        {/* Vertical conference name: fixed 18pt, anchored left strip */}
        {(() => {
          const cn = data.cover.conferenceName || "CONFERENCE";
          const fs = 18;
          const tw = 720; // ~85% of 842pt page height → fills left side
          const lft = Math.round(28 - tw / 2); // center at x=28pt from left
          const lineH = Math.round(fs * 1.4);
          const tp = Math.round(421 - lineH / 2); // center vertically
          return (
            <Text
              style={{
                position: "absolute",
                left: lft,
                top: tp,
                width: tw,
                fontSize: fs,
                fontFamily: "Helvetica-Bold",
                color: "#3b6cb5",
                letterSpacing: 1,
                opacity: 0.85,
                textAlign: "center",
                transform: "rotate(-90deg)",
              }}
            >
              {cn}
            </Text>
          );
        })()}

        {/* Title */}
        <Text style={pdfStyles.tocTitle}>TABLE OF CONTENT</Text>

        {/* Entries: page number before label */}
        <View style={{ paddingLeft: 120, paddingTop: 15 }}>
          {tocItems.map((item, i) => {
            const fs = Math.max(9, Math.min(12, Math.floor(350 / (item.label.length * 0.55))));
            return (
              <View key={i} style={pdfStyles.tocEntryRow}>
                <Text style={pdfStyles.tocPageNum}>{item.page}</Text>
                <Text style={{ ...pdfStyles.tocLabel, fontSize: fs }}>{item.label}</Text>
              </View>
            );
          })}
        </View>
      </Page>

      {/* ── FOREWORD ── */}
      <Page size="A4" style={pdfStyles.page}>
        {(() => {
          const title = "Foreword";
          const fs = Math.max(12, Math.min(15, Math.floor(450 / (title.length * 0.55))));
          return (
            <>
              <Text style={{ ...pdfStyles.sectionTitle, fontSize: fs }}>{title}</Text>
              <View style={pdfStyles.sectionDivider} />
            </>
          );
        })()}
        {data.foreword ? (
          data.foreword
            .split("\n")
            .filter((p: string) => p.trim())
            .map((p: string, i: number) => (
              <Text
                key={i}
                style={{
                  marginBottom: 10,
                  textAlign: "justify",
                  fontSize: 10,
                  lineHeight: 1.7,
                  color: "#2d3748",
                }}
              >
                {p.trim()}
              </Text>
            ))
        ) : (
          <Text
            style={{
              color: "#718096",
              fontFamily: "Inter",
              fontStyle: "italic",
            }}
          >
            No foreword provided.
          </Text>
        )}
        <PdfFooter conferenceName={data.cover.conferenceName} />
      </Page>

      {/* ── ORGANIZING COMMITTEE ── */}
      <Page size="A4" style={pdfStyles.page}>
        {(() => {
          const title = "Organizing Committee";
          const fs = Math.max(12, Math.min(15, Math.floor(450 / (title.length * 0.55))));
          return (
            <>
              <Text style={{ ...pdfStyles.sectionTitle, fontSize: fs }}>{title}</Text>
              <View style={pdfStyles.sectionDivider} />
            </>
          );
        })()}
        {Object.keys(committeeByRole).length === 0 ? (
          <Text
            style={{
              color: "#718096",
              fontFamily: "Inter",
              fontStyle: "italic",
            }}
          >
            No committee members added.
          </Text>
        ) : (
          Object.entries(committeeByRole).map(([role, members], i) => (
            <View key={i}>
              <Text style={pdfStyles.roleHeader}>{role}</Text>
              {members.map((m: any, j: number) => (
                <Text key={j} style={pdfStyles.memberLine}>
                  {m.name}
                  {m.affiliation ? `, ${m.affiliation}` : ""}
                </Text>
              ))}
            </View>
          ))
        )}
        <PdfFooter conferenceName={data.cover.conferenceName} />
      </Page>

      {/* ── CONFERENCE INFORMATION ── */}
      <Page size="A4" style={pdfStyles.page}>
        {(() => {
          const infoTitle = data.cover.conferenceName
            ? `${data.cover.conferenceName.toUpperCase()} INFORMATION`
            : "CONFERENCE INFORMATION";
          return (
            <Text
              style={{
                fontSize: 14,
                fontFamily: "Helvetica-Bold",
                color: "#2a4365",
                textAlign: "center",
                lineHeight: 1.3,
                marginBottom: 20,
              }}
            >
              {infoTitle}
            </Text>
          );
        })()}

        {(() => {
          const renderInf = (label: string, text?: string) => {
            if (!text?.trim()) return null;
            return (
              <View wrap={false} style={{ marginBottom: 15 }}>
                <View
                  style={{
                    backgroundColor: "#2a4365",
                    padding: "4px 6px",
                    marginBottom: 5,
                  }}
                >
                  <Text
                    style={{
                      fontSize: Math.max(7, Math.min(9, Math.floor(250 / (label.length * 0.55)))),
                      fontFamily: "Helvetica-Bold",
                      color: "#ffffff",
                      textTransform: "uppercase",
                    }}
                  >
                    {label}
                  </Text>
                </View>
                {text
                  .split("\n")
                  .filter((l) => l.trim())
                  .map((line, i) => (
                    <Text
                      key={i}
                      style={{ fontSize: 9, color: "#2d3748", lineHeight: 1.5 }}
                    >
                      {line.trim()}
                    </Text>
                  ))}
              </View>
            );
          };
          return (
            <>
              {renderInf("Conference Venue", data.generalInfo?.venueDetails)}
              {renderInf(
                "Registration Desk Opening Time",
                data.generalInfo?.registrationHours,
              )}
              {renderInf("Function Rooms", data.generalInfo?.roomAssignments)}
              {renderInf(
                "Refreshments & Internet Access",
                data.generalInfo?.coffeeInternetInfo,
              )}
              {renderInf("Gala Dinner", data.generalInfo?.galaDinner)}
            </>
          );
        })()}

        {data.generalInfo?.floorPlan &&
          (() => {
            const layoutTitle = data.cover.conferenceName
              ? `${data.cover.conferenceName.toUpperCase()} LAYOUT`
              : "VENUE LAYOUT";
            const layoutFontSize = Math.max(
              10,
              Math.min(24, Math.floor(460 / (layoutTitle.length * 0.52))),
            );
            return (
              <View style={{ marginTop: 10 }}>
                <Text
                  style={{
                    fontSize: layoutFontSize,
                    fontFamily: "Helvetica-Bold",
                    color: "#2a4365",
                    textAlign: "center",
                    marginBottom: 12,
                  }}
                >
                  {layoutTitle}
                </Text>
                <Image
                  src={data.generalInfo.floorPlan}
                  style={{
                    width: "100%",
                    maxHeight: 220,
                    objectFit: "contain",
                  }}
                />
              </View>
            );
          })()}

        <PdfFooter conferenceName={data.cover.conferenceName} />
      </Page>

      {/* ── PROGRAM AT A GLANCE ── */}
      <Page size="A4" style={pdfStyles.page}>
        {(() => {
          const title = "Program at a Glance";
          const fs = Math.max(16, Math.min(22, Math.floor(400 / (title.length * 0.55))));
          return (
            <Text style={{ fontSize: fs, fontFamily: "Helvetica-Bold", color: "#1a3a6b", textTransform: "uppercase", letterSpacing: 1, textAlign: "center", marginBottom: 14 }}>
              {title}
            </Text>
          );
        })()}

        {Object.keys(scheduleByDate).length === 0 ? (
          <Text style={{ color: "#718096", fontFamily: "Helvetica-Oblique" }}>No schedule data loaded.</Text>
        ) : (
          Object.entries(scheduleByDate).map(([dateStr, items], di) => {
            // Group sessions by time slot (same as buildEditorPages)
            const timeGroups: { time: string; sessions: any[] }[] = [];
            (items as any[]).forEach((s: any) => {
              const ex = timeGroups.find(g => g.time === s.time);
              if (ex) ex.sessions.push(s);
              else timeGroups.push({ time: s.time || "", sessions: [s] });
            });
            const parts = dateStr.split(" - ");
            const dayLabel = (parts[0] || "").toUpperCase();
            const dateLabel = parts.slice(1).join(" - ");
            const borderC = "#e2e8f0";
            const pad = { paddingVertical: 6, paddingHorizontal: 6 };
            return (
              <View key={di} style={{ marginBottom: 18, marginTop: di === 0 ? 0 : 6 }}>
                {/* ── Day header: dark blue, dayLabel left / dateLabel right ── */}
                <View style={{ flexDirection: "row", backgroundColor: "#2a4365", borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: borderC }}>
                  <Text style={{ width: "25%", color: "#ffffff", fontFamily: "Helvetica-Bold", fontSize: Math.max(7, Math.min(9, Math.floor((475 * 0.25) / (dayLabel.length * 0.6)))), ...pad }}>{dayLabel}</Text>
                  <Text style={{ width: "75%", color: "#ffffff", fontFamily: "Helvetica-Bold", fontSize: Math.max(7, Math.min(9, Math.floor((475 * 0.75) / (dateLabel.length * 0.55)))), textAlign: "right", ...pad }}>{dateLabel}</Text>
                </View>
                {/* ── Session rows ── */}
                {timeGroups.map((group, gi) =>
                  group.sessions.map((s: any, si: number) => {
                    const isLastRow = gi === timeGroups.length - 1 && si === group.sessions.length - 1;
                    return (
                      <View key={`${gi}-${si}`} wrap={false} style={{ flexDirection: "row", borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: isLastRow ? 1 : 0, borderColor: borderC }}>
                        {/* Time — only show on first session of time group */}
                        <Text style={{ width: "25%", color: "#1a3a6b", fontFamily: "Helvetica-Bold", fontSize: 8, ...pad }}>
                          {si === 0 ? group.time : ""}
                        </Text>
                        {/* Topic */}
                        <Text style={{ width: "55%", color: "#4a5568", fontFamily: "Helvetica", fontSize: 8, ...pad }}>
                          {s.topic || ""}
                        </Text>
                        {/* Location */}
                        <Text style={{ width: "20%", color: "#a0aec0", fontFamily: "Helvetica", fontSize: 8, textAlign: "right", ...pad }}>
                          {s.location || ""}
                        </Text>
                      </View>
                    );
                  })
                )}
              </View>
            );
          })
        )}

        <PdfFooter conferenceName={data.cover.conferenceName} />
      </Page>

      {/* ── KEYNOTE SPEAKERS ── */}
      {data.keynotes?.length > 0 ? (
        <Page size="A4" style={pdfStyles.page}>
          {data.keynotes.map((k: KeynoteSpeaker, i: number) => (
            // wrap={false} = toàn bộ 1 speaker luôn nằm cùng 1 trang, không bị tách
            <View key={i} wrap={false} break={i > 0}>

              {/* DAY HEADER */}
              {k.dayLabel ? (
                <View
                  style={{
                    backgroundColor: "#2a4365",
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                    marginBottom: 20,
                  }}
                >
                  <Text
                    style={{
                      color: "#ffffff",
                      fontFamily: "Helvetica-Bold",
                      fontSize: 10,
                      letterSpacing: 1,
                      textTransform: "uppercase",
                    }}
                  >
                    {k.dayLabel}
                  </Text>
                </View>
              ) : null}

              {/* SPEAKER INFO BLOCK */}
              <View
                style={{
                  flexDirection: "row",
                  marginBottom: 20,
                  minHeight: 150,
                }}
              >
                <View style={{ width: 130, flexShrink: 0 }}>
                  {k.photo ? (
                    <Image
                      src={k.photo}
                      style={{
                        width: 130,
                        height: 150,
                        objectFit: "cover",
                        objectPosition: "center top",
                      }}
                    />
                  ) : (
                    <View style={{ width: 130, height: 150, backgroundColor: "#e2e8f0" }} />
                  )}
                </View>

                <View
                  style={{
                    backgroundColor: "#e8eff5",
                    flex: 1,
                    paddingVertical: 15,
                    paddingLeft: 20,
                    paddingRight: 15,
                    justifyContent: "center",
                  }}
                >
                  {(k.timeSlot || k.location) && (
                    <Text style={{ fontSize: 8.5, color: "#1a202c", marginBottom: 4, fontFamily: "Inter" }}>
                      {[k.timeSlot, k.location].filter(Boolean).join(" | ")}
                    </Text>
                  )}
                  {k.keynoteLabel && (
                    <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: "#1a3a6b", marginBottom: 3, textTransform: "uppercase" }}>
                      {k.keynoteLabel}:
                    </Text>
                  )}
                  <Text
                    style={{
                      fontSize: Math.max(9, Math.min(13, Math.floor(370 / (Math.max(1, (k.presentationTitle || "").length) * 0.55)))),
                      fontFamily: "Inter",
                      color: "#2d3748",
                      lineHeight: 1.3,
                      marginBottom: 4,
                    }}
                  >
                    {k.presentationTitle || "Untitled Keynote"}
                  </Text>
                  <Text style={{ fontSize: 14, fontFamily: "Helvetica-Bold", color: "#1a3a6b", marginBottom: 3, textTransform: "uppercase" }}>
                    {k.name || "Unknown Speaker"}
                  </Text>
                  {k.affiliation && (
                    <Text style={{ fontSize: 8.5, fontFamily: "Inter", color: "#4a5568" }}>
                      {k.affiliation}
                    </Text>
                  )}
                </View>
              </View>

              {/* ABSTRACT */}
              {k.abstract ? (
                <View style={{ marginBottom: 14 }}>
                  <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 10, color: "#1a3a6b", marginBottom: 6, textTransform: "uppercase" }}>
                    ABSTRACT
                  </Text>
                  <Text style={[pdfStyles.abstractText, { textAlign: "justify", lineHeight: 1.6 }]}>
                    {formatAbstract(k.abstract)}
                  </Text>
                </View>
              ) : null}

              {/* BIOGRAPHY */}
              {k.bio ? (
                <View style={{ marginTop: 10 }}>
                  <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 10, color: "#1a3a6b", marginBottom: 6, textTransform: "uppercase" }}>
                    BIOGRAPHY
                  </Text>
                  <Text style={{ fontSize: 9.5, fontFamily: "Inter", color: "#2d3748", lineHeight: 1.6, textAlign: "justify" }}>
                    {k.bio}
                  </Text>
                </View>
              ) : null}

            </View>
          ))}

          <PdfFooter conferenceName={data.cover.conferenceName} />
        </Page>
      ) : null}

      {/* ── DETAILED PROGRAM WITH ABSTRACTS ── */}
      <Page size="A4" style={pdfStyles.page}>
        {(() => {
          const title = "Detailed Program with Abstracts";
          const fs = Math.max(12, Math.min(15, Math.floor(450 / (title.length * 0.55))));
          return (
            <>
              <Text style={{ ...pdfStyles.sectionTitle, fontSize: fs }}>{title}</Text>
              <View style={pdfStyles.sectionDivider} />
            </>
          );
        })()}
        {(() => {
          const schedule: any[] = data.detailedSchedule || [];
          if (schedule.length === 0) {
            return (
              <Text
                style={{ color: "#718096", fontFamily: "Helvetica-Oblique" }}
              >
                No accepted papers found for this conference.
              </Text>
            );
          }

          // Sort by sessionDayOrder, then by timeSlot
          const sorted = [...schedule].sort((a, b) => {
            if (a.sessionDayOrder !== b.sessionDayOrder)
              return (a.sessionDayOrder || 0) - (b.sessionDayOrder || 0);
            return (a.timeSlot || "").localeCompare(b.timeSlot || "");
          });

          // Group by day label
          const days: { label: string; papers: any[] }[] = [];
          sorted.forEach((p) => {
            const label = p.sessionDayLabel || "Unscheduled";
            const existing = days.find((d) => d.label === label);
            if (existing) existing.papers.push(p);
            else days.push({ label, papers: [p] });
          });

          return days.map((day, di) => (
            <View key={di}>
              {/* Day header */}
              <View
                style={{
                  backgroundColor: "#1a3a6b",
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  marginTop: di === 0 ? 0 : 16,
                  marginBottom: 8,
                }}
                wrap={false}
              >
                <Text
                  style={{
                    fontSize: Math.max(9, Math.min(11, Math.floor(450 / (day.label.length * 0.55)))),
                    fontFamily: "Helvetica-Bold",
                    color: "#ffffff",
                    letterSpacing: 0.5,
                  }}
                >
                  {day.label}
                </Text>
              </View>

              {day.papers.map((p: any, i: number) => (
                <View key={i} style={pdfStyles.paperBlock} wrap={false}>
                  {/* Row 1: time + authors */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "baseline",
                      marginBottom: 2,
                    }}
                  >
                    {p.timeSlot ? (
                      <Text
                        style={{
                          fontSize: 8.5,
                          fontFamily: "Helvetica-Bold",
                          color: "#1a3a6b",
                          width: 34,
                          marginRight: 4,
                        }}
                      >
                        {p.timeSlot}
                      </Text>
                    ) : null}
                    <Text
                      style={[
                        pdfStyles.paperAuthors,
                        { marginBottom: 0, flex: 1 },
                      ]}
                    >
                      {p.authors}
                    </Text>
                  </View>

                  {/* Row 2: Bold title */}
                  <Text
                    style={[
                      pdfStyles.paperTitle,
                      { paddingLeft: p.timeSlot ? 38 : 0 },
                    ]}
                  >
                    {p.paperTitle}
                  </Text>

                  {/* Row 3: Abstract — justified */}
                  {p.abstract ? (
                    <Text
                      style={[
                        pdfStyles.abstractText,
                        { paddingLeft: p.timeSlot ? 38 : 0 },
                      ]}
                    >
                      {"ABSTRACT. " + formatAbstract(p.abstract)}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          ));
        })()}
        <PdfFooter conferenceName={data.cover.conferenceName} />
      </Page>
    </Document>
  );
};

// ─── PDF Editor — types ───────────────────────────────────────────────────────
interface EditorEl {
  id: string;
  type: "text" | "image" | "table" | "bar";
  x: number;
  y: number;
  w: number;
  h: number;
  // text
  text?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  color?: string;
  align?: "left" | "center" | "right" | "justify";
  fontFamily?: string;
  // image
  src?: string;
  zIndex?: number;
  rotation?: number;
  // TOC detection
  isTocEntry?: boolean;
  tocLabel?: string;
  // table
  tableData?: TableData;
  // bar: linked to an abstract element — stretches to match its bottom
  linkedAbstractId?: string;
  barColor?: string;
}
interface EditorPage {
  id: string;
  bg: string;
  bgColor?: string;
  els: EditorEl[];
}
interface HFConfig {
  headerText: string;
  footerText: string;
  showPageNum: boolean;
  pageNumPos: "left" | "center" | "right";
  startFrom: number;
}

/** A4 canvas size in display-pixels (matches 595×842 pt at ~1.24× scale) */
const CANVAS_W = 744;
const CANVAS_H = Math.round((CANVAS_W * 842) / 595); // ≈ 1052
const THUMB_W = 106;
const THUMB_H = Math.round((THUMB_W * 842) / 595); // ≈ 150

/** Convert display-px → PDF points for export */
const px2pt = (v: number, axis: "x" | "y") =>
  axis === "x" ? (v / CANVAS_W) * 595 : (v / CANVAS_H) * 842;

const stripPagesForCache = (pages: EditorPage[]) =>
  pages.map(({ bg, ...rest }) => ({
    ...rest,
    els: rest.els?.map((el) => ({ ...el })),
  }));

const hashPayload = async (payload: any): Promise<string> => {
  const data = new TextEncoder().encode(JSON.stringify(payload));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

// ─── Editor export document ──────────────────────────────────────────────────
const EditorExportDoc = ({
  pages,
  hf,
  conferenceName = "",
}: {
  pages: EditorPage[];
  hf: HFConfig;
  conferenceName?: string;
}) => {
  const nameLen = conferenceName.length;
  const nameFontSize = nameLen > 80 ? 6.5 : nameLen > 55 ? 7 : 8;
  return (
    <Document>
      {pages.map((pg, pi) => (
        <Page
          key={pg.id}
          size="A4"
          wrap={false}
          style={{
            padding: 0,
            position: "relative",
            minHeight: 842,
            backgroundColor: pg.bgColor || "#ffffff",
          }}
        >
          {/* overlay elements */}
          {[...pg.els]
            .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
            .map((el) =>
              el.type === "table" && el.tableData ? (
                <TablePdfExport
                  key={el.id}
                  tableData={el.tableData}
                  elX={el.x}
                  elY={el.y}
                  elW={el.w}
                  elH={el.h}
                  px2pt={px2pt}
                />
              ) : el.type === "bar" ? (
                <View
                  key={el.id}
                  style={{
                    position: "absolute",
                    left: px2pt(el.x, "x"),
                    top: px2pt(el.y, "y"),
                    width: px2pt(el.w, "x"),
                    height: px2pt(el.h, "y"),
                    backgroundColor: el.barColor ?? "#93c5fd",
                  }}
                />
              ) : el.type === "text" ? (
                <Text
                  key={el.id}
                  style={{
                    position: "absolute",
                    left: px2pt(el.x, "x"),
                    top: px2pt(el.y, "y"),
                    width: px2pt(el.w, "x"),
                    fontSize: px2pt(el.fontSize ?? 12, "y"),
                    fontFamily:
                      el.fontFamily === "Inter" || el.fontFamily === "Roboto"
                        ? el.fontFamily
                        : "Inter",
                    fontWeight: el.bold ? "bold" : "normal",
                    fontStyle: el.italic ? "italic" : "normal",
                    color: el.color ?? "#000000",
                    textAlign: (el.align ?? "left") as any,
                    ...(el.rotation
                      ? { transform: `rotate(${el.rotation}deg)` }
                      : {}),
                  }}
                >
                  {el.text ?? ""}
                </Text>
              ) : el.type === "image" && el.src ? (
                <Image
                  key={el.id}
                  src={el.src}
                  style={{
                    position: "absolute",
                    left: px2pt(el.x, "x"),
                    top: px2pt(el.y, "y"),
                    width: px2pt(el.w, "x"),
                    height: px2pt(el.h, "y"),
                    objectFit: "contain",
                    ...(el.rotation
                      ? { transform: `rotate(${el.rotation}deg)` }
                      : {}),
                  }}
                />
              ) : null,
            )}

          {/* global header */}
          {hf.headerText.trim() && pi > 1 && (
            <Text
              style={{
                position: "absolute",
                top: 14,
                left: 42,
                right: 42,
                fontSize: 8,
                color: "#1a3a6b",
                textAlign: "center",
                fontFamily: "Helvetica-Bold",
              }}
            >
              {hf.headerText}
            </Text>
          )}
          {/* global footer: conferenceName above line, footerText+pageNum below */}
          {pi > 1 && (
            <View
              style={{
                position: "absolute",
                bottom: 22,
                left: 42,
                right: 42,
              }}
            >
              {/* conferenceName above divider */}
              {conferenceName ? (
                <Text style={{ fontSize: nameFontSize, color: "#1a3a6b", fontFamily: "Helvetica", marginBottom: 4 }}>
                  {conferenceName}
                </Text>
              ) : null}
              {/* divider line */}
              <View style={{ height: 0.75, backgroundColor: "#1a3a6b", marginBottom: 4 }} />
              {/* footer row */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                {hf.footerText.trim() ? (
                  <Text style={{ fontSize: 8, color: "#1a3a6b", fontFamily: "Helvetica", flex: 1 }}>
                    {hf.footerText}
                  </Text>
                ) : (
                  <Text style={{ fontSize: 8, color: "#1a3a6b", fontFamily: "Helvetica", flex: 1 }}> </Text>
                )}
                {hf.showPageNum && (
                  <Text style={{ fontSize: 10, color: "#1a3a6b", fontFamily: "Helvetica-Bold" }}>
                    {hf.startFrom + (pi - 2)}
                  </Text>
                )}
              </View>
            </View>
          )}
        </Page>
      ))}
    </Document>
  );
};

// ─── Resize handle helpers (used by editor canvas & crop modal) ───────────────
const DIRS = ["n", "s", "e", "w", "ne", "nw", "se", "sw"] as const;
const DIR_CURSOR: Record<string, string> = {
  n: "ns-resize",
  s: "ns-resize",
  e: "ew-resize",
  w: "ew-resize",
  ne: "ne-resize",
  nw: "nw-resize",
  se: "se-resize",
  sw: "sw-resize",
};
const handlePos = (dir: string): React.CSSProperties => ({
  position: "absolute",
  width: 9,
  height: 9,
  background: "#4f46e5",
  border: "1.5px solid white",
  borderRadius: 2,
  cursor: DIR_CURSOR[dir],
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

// ─── Shared canvas helper ─────────────────────────────────────────────────────
// Module-level cache — tất cả các lần gọi giống nhau trả về string đã có sẵn
const _solidColorCache = new Map<string, string>();

const solidColorImg = (color: string, w: number, h: number): string => {
  const key = `${color}_${Math.round(w)}_${Math.round(h)}`;
  if (_solidColorCache.has(key)) return _solidColorCache.get(key)!;
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = color; ctx.fillRect(0, 0, c.width, c.height);
  const dataUrl = c.toDataURL('image/png');
  _solidColorCache.set(key, dataUrl);
  return dataUrl;
};

/** Convert an external image URL to base64 data URL (qua server proxy để bypass CORS) */
const urlToBase64 = async (url: string): Promise<string> => {
  // Nếu đã là data URL thì trả về luôn
  if (url.startsWith("data:")) return url;
  try {
    // Gọi server proxy để fetch ảnh (server không bị CORS)
    const resp = await fetch(
      `${BASE_API_URL}/proxy-image?url=${encodeURIComponent(url)}`,
    );
    if (resp.ok) {
      const json = await resp.json();
      if (json.data_url) return json.data_url;
    }
  } catch {
    /* server không khả dụng, thử fallback */
  }
  // Fallback: thử client-side canvas (chỉ hoạt động nếu server ảnh cho phép CORS)
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

// ─── Measure actual wrapped text height using offscreen canvas ────────────────
/**
 * Calculate wrapped text height in canvas pixels.
 * Uses pt-space calculation (font sizes in pt → convert to canvas px via scY).
 * fontPx: font size already in canvas pixels (= ptSize * scY)
 * maxWidth: available width in canvas pixels
 */
const measureWrappedTextHeight = (
  text: string,
  fontPx: number,
  maxWidth: number,
  lineHeightMultiplier = 1.6,
  bold = false,
): number => {
  if (!text || maxWidth <= 0) return fontPx * lineHeightMultiplier * 2;
  let lines = 1;
  try {
    // Use real canvas measureText for accurate word-wrap
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d")!;
    ctx.font = `${bold ? "bold " : ""}${fontPx}px Helvetica, Arial, sans-serif`;
    const words = text.split(" ");
    let curLine = "";
    for (const word of words) {
      const test = curLine ? curLine + " " + word : word;
      if (ctx.measureText(test).width > maxWidth && curLine) {
        lines++;
        curLine = word;
      } else {
        curLine = test;
      }
    }
  } catch {
    // Fallback: char-count heuristic, Helvetica avg ~0.50 * fontSize
    const charsPerLine = Math.max(1, Math.floor(maxWidth / (fontPx * 0.50)));
    const words = text.split(" ");
    let lineLen = 0;
    lines = 1;
    for (const word of words) {
      const wl = word.length + (lineLen > 0 ? 1 : 0);
      if (lineLen > 0 && lineLen + wl > charsPerLine) { lines++; lineLen = word.length; }
      else lineLen += wl;
    }
  }
  // Small buffer: +0.3 lines only
  return Math.ceil((lines + 0.3) * fontPx * lineHeightMultiplier);
};

// ─── Build editor pages directly from procData (overflow-aware) ───────────────
const buildEditorPages = (data: any): EditorPage[] => {
  const scX = CANVAS_W / 595;
  const scY = CANVAS_H / 842;
  const ML = Math.round(55 * scX);
  const MT = Math.round(50 * scY);
  const CW = CANVAS_W - ML * 2;
  const MAX_Y = CANVAS_H - Math.round(56 * scY);

  const allPages: EditorPage[] = [];
  let els: EditorEl[] = [];
  let curY = MT;
  // Tách zIndex theo loại: image 10-99, text 100-199
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
  const addRectFlat = (
    color: string,
    x: number,
    y: number,
    w: number,
    h: number,
  ) => {
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
      fontSize: opts.fontSize ?? Math.round(9 * scY),
      bold: opts.bold ?? false,
      italic: opts.italic ?? false,
      color: opts.color ?? "#1a202c",
      align: opts.align ?? "left",
      fontFamily: opts.fontFamily ?? "Inter",
      zIndex: opts.zIndex !== undefined ? opts.zIndex : nzTxt(),
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
    // Không cần tạo ảnh nền solid color vì bgColor đã xử lý background
    // (ảnh lớn 744x1052px base64 gây lỗi render các ảnh khác trong react-pdf)
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
    const nameFs = Math.round(11 * scY); // font cố định, không thu nhỏ
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

      // Group logos into rows
      for (let i = 0; i < selectedLogos.length; i += logosPerRow) {
        const row = selectedLogos.slice(i, i + logosPerRow);
        const rowW = row.length * lw + (row.length - 1) * gap;
        let lx = ML + (CW - rowW) / 2; // Center this row

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
  const infoTitleFs = Math.round(14 * scY); // font cố định, không thu nhỏ
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
  addInfoSection(
    "REGISTRATION DESK OPENING TIME",
    data.generalInfo?.registrationHours,
  );
  addInfoSection("FUNCTION ROOMS", data.generalInfo?.roomAssignments);
  addInfoSection(
    "REFRESHMENTS & INTERNET ACCESS",
    data.generalInfo?.coffeeInternetInfo,
  );
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

      // Calculate total rows: header (Day), plus session rows
      const totalRows =
        1 + timeGroups.reduce((acc, g) => acc + g.sessions.length, 0);

      // Calculate required height (~22px per row, slightly more for header)
      const rowH = Math.round(22 * scY);
      const totalHs = (totalRows + 1) * rowH; // extra space buffer
      fit(totalHs);

      const cells: any[][] = [];
      // Row 0: Day Header (top outer borders, inner bottom border as separator)
      const hr: any[] = [];
      const dayFs = Math.max(Math.round(8 * scY), Math.min(Math.round(12 * scY), Math.round((CW * 0.25) / (dayLabel.length * 0.6))));
      const dateFs = Math.max(Math.round(8 * scY), Math.min(Math.round(12 * scY), Math.round((CW * 0.75) / (dateLabel.length * 0.55))));
      hr.push({
        id: uuidv4(),
        text: dayLabel,
        align: "left",
        colSpan: 1,
        rowSpan: 1,
        hidden: false,
        bgColor: "#2a4365",
        fontColor: "#ffffff",
        bold: true,
        fontSize: dayFs,
        borderBottom: true,
        borderRight: false,
        borderTop: true,
        borderLeft: true,
        fontFamily: "Inter",
      });
      hr.push({
        id: uuidv4(),
        text: dateLabel,
        align: "right",
        colSpan: 2,
        rowSpan: 1,
        hidden: false,
        bgColor: "#2a4365",
        fontColor: "#ffffff",
        bold: true,
        fontSize: dateFs,
        borderBottom: true,
        borderLeft: false,
        borderTop: true,
        borderRight: true,
        fontFamily: "Inter",
      });
      hr.push({
        id: uuidv4(),
        text: "",
        align: "right",
        colSpan: 1,
        rowSpan: 1,
        hidden: true,
      }); // covered by colSpan 2
      cells.push(hr);

      // Session Rows (inner borders removed, outer borders preserved)
      timeGroups.forEach((group, gi) => {
        const sLen = group.sessions.length;
        group.sessions.forEach((s, si) => {
          const r: any[] = [];
          const isLastRow = gi === timeGroups.length - 1 && si === sLen - 1;

          // Time cell (merged if first of group, hidden otherwise)
          if (si === 0) {
            r.push({
              id: uuidv4(),
              text: group.time,
              align: "left",
              colSpan: 1,
              rowSpan: sLen,
              hidden: false,
              fontColor: "#1a3a6b",
              bold: true,
              fontSize: Math.round(9 * scY),
              borderTop: false,
              borderRight: false,
              borderBottom: gi === timeGroups.length - 1,
              borderLeft: true,
              fontFamily: "Inter",
            });
          } else {
            r.push({
              id: uuidv4(),
              text: "",
              align: "left",
              colSpan: 1,
              rowSpan: 1,
              hidden: true,
            });
          }

          // Topic
          r.push({
            id: uuidv4(),
            text: s.topic || "",
            align: "left",
            colSpan: 1,
            rowSpan: 1,
            hidden: false,
            fontColor: "#4a5568",
            fontSize: Math.round(9 * scY),
            borderTop: false,
            borderRight: false,
            borderLeft: false,
            borderBottom: isLastRow,
            fontFamily: "Inter",
          });

          // Location
          r.push({
            id: uuidv4(),
            text: s.location || "",
            align: "right",
            colSpan: 1,
            rowSpan: 1,
            hidden: false,
            fontColor: "#a0aec0",
            fontSize: Math.round(9 * scY),
            borderTop: false,
            borderLeft: false,
            borderRight: true,
            borderBottom: isLastRow,
            fontFamily: "Inter",
          });

          cells.push(r);
        });
      });

      // Calculate heights based on contents
      const rHeights: number[] = Array(totalRows).fill(rowH);
      // Day header padding
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
        headerHighlight: false, // We did manual headers
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
    (data.keynotes as KeynoteSpeaker[]).forEach((k, idx) => {
      // Mỗi speaker là 1 page, ta flush output trước khi thêm speaker (trừ speaker đầu tiên vì có thể đã sang trang)
      // Nếu là speaker đầu tiên thì có thể đang ở trang rỗng do TOC, ta không cần flush nếu curY đang ở đỉnh.
      if (curY > MT) flushPage();

      const pad = Math.round(10 * scX);
      const photoW = Math.round(130 * scX);
      const photoH = Math.round(150 * scY);

      // TOC Entry (Chỉ add label trên hidden element hoặc gán cờ isTocEntry cho phần tử đầu tiên)
      // Chèn 1 text rỗng để có thẻ TOC
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

      // 1. DAY HEADER (Dark Blue Bar)
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

      // 2. SPEAKER INFO BLOCK (Light Blue Background & Photo)
      const blockStartY = curY;

      // Calculate text content height dynamically
      const vPad = Math.round(15 * scY);
      const lineGap = Math.round(4 * scY);
      let contentH = vPad * 2; // top + bottom padding
      if (k.timeSlot || k.location) contentH += Math.round(12 * scY) + lineGap;
      if (k.keynoteLabel) contentH += Math.round(14 * scY) + lineGap;
      const pTitle = k.presentationTitle || "Untitled Keynote";
      const pTitleFs = Math.max(9, Math.min(13, Math.floor(370 / (Math.max(1, pTitle.length) * 0.55))));
      const titleLines = pTitle.length > 55 ? 2 : 1;
      contentH += Math.round(pTitleFs * scY * 1.3 * titleLines) + lineGap;
      contentH += Math.round(16 * scY) + lineGap; // speaker name
      if (k.affiliation) contentH += Math.round(12 * scY);

      // bg height is max of photo height and content height
      const lightBgH = Math.max(photoH, contentH);

      // Text background starts at same Y as photo, fills to right
      const textBgX = ML + photoW;
      const textBgW = CW - photoW;
      addRectFlat("#e8eff5", textBgX, blockStartY, textBgW, lightBgH);

      // Photo drawn on top
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
      // vertically center content inside the bg
      const bgCenterOffsetY = Math.round((lightBgH - contentH) / 2);
      let infoY = blockStartY + bgCenterOffsetY + vPad;

      // Time & Location
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

      // Keynote Label
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

      // Presentation Title
      const titleH = Math.round(pTitleFs * scY * 1.3 * titleLines);
      els.push({
        id: uuidv4(),
        type: "text",
        x: infoX,
        y: infoY,
        w: infoW,
        h: titleH,
        text: pTitle,
        fontSize: Math.round(pTitleFs * scY),
        color: "#2d3748",
        align: "left",
        fontFamily: "Inter",
        zIndex: nzTxt(),
      });
      infoY += titleH + lineGap;

      // Speaker Name
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

      // Affiliation
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

      // Advance curY past the whole block
      curY = blockStartY + lightBgH + Math.round(15 * scY);

      // 3. ABSTRACT SECTION
      if (k.abstract) {
        addT("ABSTRACT", ML, CW, Math.round(16 * scY), {
          fontSize: Math.round(10 * scY),
          bold: true,
          color: "#1a3a6b",
        });
        curY += Math.round(6 * scY);

        const abText = formatAbstract(k.abstract);
        const abFontPx = 9.5 * scY;
        const abH = measureWrappedTextHeight(abText, abFontPx, CW, 1.6);
        addT(abText, ML, CW, abH, {
          fontSize: Math.round(abFontPx),
          color: "#2d3748",
          align: "justify",
          fontFamily: "Inter",
        });
        curY += Math.round(12 * scY);
      }

      // 4. BIOGRAPHY SECTION
      if (k.bio) {
        addT("BIOGRAPHY", ML, CW, Math.round(16 * scY), {
          fontSize: Math.round(10 * scY),
          bold: true,
          color: "#1a3a6b",
        });
        curY += Math.round(6 * scY);

        const bioFontPx = 9.5 * scY;
        const bioH = measureWrappedTextHeight(k.bio, bioFontPx, CW, 1.6);
        addT(k.bio, ML, CW, bioH, {
          fontSize: Math.round(bioFontPx),
          color: "#2d3748",
          align: "justify",
          fontFamily: "Inter",
        });
        curY += Math.round(10 * scY);
      }

      // Force flush this page for the next speaker/section
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
        const authH = Math.round(14 * scY);
        const tLines = Math.ceil((p.paperTitle || "").length / 65) + 1;
        const tH = Math.round(Math.max(tLines * 12 * scY, 14));
        const abText = p.abstract
          ? "ABSTRACT. " +
          p.abstract.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim()
          : "";
        const abFontPx = 8.5 * scY;
        const pML = ML + Math.round(12 * scX),
          pCW = CW - Math.round(10 * scX);
        const timeW = p.timeSlot ? Math.round(44 * scX) : 0;
        const pCW_for_measure = pCW - timeW;
        // Use lineHeightMultiplier 1.4 to match DOM render (lineHeight: 1.4)
        const abH = abText
          ? measureWrappedTextHeight(abText, abFontPx, pCW_for_measure, 1.4)
          : 0;

        // Fit the whole block together so it doesn't split mid-paper
        const totalH = authH + Math.round(2 * scY) + tH + Math.round(2 * scY) + abH + Math.round(3 * scY) + Math.round(14 * scY);
        fit(totalH);

        // Record exact Y AFTER fit() in case page was flushed
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

        // Blue bar: type "bar" — DOM renderer will stretch it to match abstract bottom
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

        // Spacing between papers
        curY += Math.round(16 * scY);
      });
    });
  }
  flushPage();
  return allPages;
};

// ─── Regenerate TOC page (always index 1) — SOICT 2025 style ────────────────
const regenerateToc = (pages: EditorPage[]): EditorPage[] => {
  if (pages.length < 2) return pages;
  const scX = CANVAS_W / 595,
    scY = CANVAS_H / 842;
  const ML = Math.round(55 * scX),
    MT = Math.round(50 * scY);
  const CW = CANVAS_W - ML * 2;
  const entries: { label: string; pageNum: number }[] = [];
  pages.forEach((pg, idx) => {
    if (idx <= 1) return; // skip Cover and TOC
    pg.els.forEach((el) => {
      if (el.isTocEntry && el.text)
        entries.push({ label: el.tocLabel || el.text, pageNum: idx - 1 }); // idx-2+1: skip cover(0)+toc(1), start from 1
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

  // Vertical conference name: rotated -90deg, anchored to left strip
  // vertW = page height in canvas px (so text can fill the full height when rotated)
  const vertFontSize = Math.round(18 * scY); // fixed readable size
  const vertW = Math.round(CANVAS_H * 0.85); // 85% of page height as text width
  const vertH = Math.round(24 * scY);         // single-line height after rotation
  // After -90 rotation: the element's visual center maps to (cx, cy) on page
  // We want visual center x ≈ 28px from left edge (center of the left strip)
  const cx = Math.round(28 * scX);
  const cy = Math.round(CANVAS_H / 2);
  // CSS rotation is around element center, so:
  // rendered center_x = el.x + el.w/2  →  cx = vertX + vertW/2
  // rendered center_y = el.y + el.h/2  →  cy = vertY + vertH/2
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

  // Title centered
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

  // Entries: large page number + label
  let y = MT + titleH + Math.round(30 * scY);
  const entryML = ML + Math.round(120 * scX);
  const numW = Math.round(48 * scX);
  entries.forEach((entry) => {
    const rowH = Math.round(35 * scY);
    // Large page number
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
    // Label
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

// ─── Render page elements to a thumbnail JPEG ────────────────────────────────
const renderThumbnail = (page: EditorPage): Promise<string> => {
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
      } else if (el.type === "bar") {
        ctx.fillStyle = el.barColor ?? "#93c5fd";
        ctx.fillRect(x, y, w, h);
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
        const lineH = fs * 1.4;
        // Word-wrap: split into lines that fit within w
        const rawLines = el.text.split("\n");
        const wrappedLines: string[] = [];
        for (const rawLine of rawLines) {
          if (!rawLine.trim()) { wrappedLines.push(""); continue; }
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
          if (ly + lineH > y + h + lineH) return; // clip to element bounds with 1 line tolerance
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
      const rect = target.getBoundingClientRect();
      const parentEl = target.offsetParent as HTMLElement | null;
      if (!parentEl) return;
      const parentRect = parentEl.getBoundingClientRect();
      const abstractBottom = rect.bottom - parentRect.top;
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

const ProceedingsManagement: React.FC<ProceedingsManagementProps> = ({
  userRoleId,
  onNavigateBack,
}) => {
  const [conferences, setConferences] = useState<any[]>([]);
  const [selectedConfId, setSelectedConfId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("cover");

  // Auto-generate preview when switching to preview tab (if not already generated)
  useEffect(() => {
    if (activeTab === "preview" && !previewBlobUrl && !previewGenerating && selectedConfId) {
      generateBlobInBackground(procData, edReady ? edPages : undefined);
    }
  }, [activeTab]);

  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewGenerating, setPreviewGenerating] = useState(false);
  const [previewCacheKey, setPreviewCacheKey] = useState<string | null>(null);
  const [previewCacheUrl, setPreviewCacheUrl] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const prevBlobRef = useRef<string | null>(null); //  revoke URL c
  const bgGenAbortRef = useRef<boolean>(false);

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
    const snapshot = {
      pageIndex: selPage,
      page: JSON.parse(JSON.stringify(edPages[selPage])),
    };
    setHistory(prev => [snapshot as any, ...prev].slice(0, 20));
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
  const [imageToInsert, setImageToInsert] = useState<string | null>(null);
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
  const dragPosRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const lastPointerEventRef = useRef<{ clientX: number; clientY: number } | null>(null);
  const tocDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const confStartRef = useRef<Date | null>(null);

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
  }, [selectedConfId])

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

  const fetchProceedingsPapers = async (
    confId: number,
    offset: number,
    limit: number,
    includeAbstract = true,
  ): Promise<{ papers: any[]; total: number }> => {
    const resp = await fetch(
      `${BASE_API_URL}/proceedings/${confId}/papers?offset=${offset}&limit=${limit}&include_abstract=${includeAbstract}`,
    );
    if (!resp.ok) {
      const msg = await resp.text();
      throw new Error(msg || "Failed to load proceedings papers");
    }
    const json = await resp.json();
    return {
      papers: json.papers || [],
      total: json.total || 0,
    };
  };

  const fetchProceedingsReviewers = async (confId: number): Promise<any[]> => {
    const resp = await fetch(
      `${BASE_API_URL}/proceedings/${confId}/reviewers`,
    );
    if (!resp.ok) {
      const msg = await resp.text();
      throw new Error(msg || "Failed to load reviewers");
    }
    const json = await resp.json();
    return json.reviewers || [];
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
        id: uuidv4(),
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
    try {
      const resp = await fetch(
        `${BASE_API_URL}/proceedings/${confId}/pdf-cache?key=${key}`,
      );
      if (!resp.ok) return null;
      const json = await resp.json();
      return json.url as string;
    } catch {
      return null;
    }
  };

  const uploadCachedPdf = async (
    confId: number,
    key: string,
    blob: Blob,
  ) => {
    try {
      const form = new FormData();
      form.append("key", key);
      form.append(
        "file",
        new File([blob], `proceedings-${confId}.pdf`, {
          type: "application/pdf",
        }),
      );
      const resp = await fetch(
        `${BASE_API_URL}/proceedings/${confId}/pdf-cache`,
        {
          method: "POST",
          body: form,
        },
      );
      if (!resp.ok) return null;
      const json = await resp.json();
      return json.url as string;
    } catch {
      return null;
    }
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

  const loadFullConferenceData = async (confId: number) => {
    setLoading(true);
    setError(null);
    setPapersError(null);
    setPapersTotal(0);
    setProcData((prev) => ({ ...prev, detailedSchedule: [] }));
    try {
      const conf = conferences.find((c) => c.conf_id === confId);
      if (!conf) {
        throw new Error("Conference not found.");
      }

      const [
        { data: config },
        { data: sessions },
      ] = await Promise.all([
        supabase
          .from("proceedings_configs")
          .select("*")
          .eq("conf_id", confId)
          .maybeSingle(),
        supabase
          .from("sessions")
          .select("*, chair:users!chair_person_id(full_name, organization)")
          .eq("conf_id", confId)
          .order("start_time", { ascending: true }),
      ]);

      const confStart = new Date(conf.start_date);
      confStartRef.current = confStart;

      setPapersLoading(true);
      const [{ papers, total }, reviewers] = await Promise.all([
        fetchProceedingsPapers(confId, 0, PAPERS_PAGE_SIZE, true),
        fetchProceedingsReviewers(confId),
      ]);
      setPapersLoading(false);

      // Build committee from chairs + reviewers
      const chairSet = new Map<string, any>();
      sessions?.forEach((s) => {
        const c = getObj(s.chair);
        if (c?.full_name && !chairSet.has(c.full_name))
          chairSet.set(c.full_name, {
            id: uuidv4(),
            name: c.full_name,
            role: "Session Chair",
            affiliation: c.organization || "",
          });
      });
      const reviewerSet = new Map<string, any>();
      reviewers?.forEach((rv: any) => {
        if (rv?.full_name && !reviewerSet.has(rv.full_name))
          reviewerSet.set(rv.full_name, {
            id: rv.id || uuidv4(),
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
            id: uuidv4(),
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
      setPapersTotal(total || (papers?.length ?? 0));

      if (new Date(conf.end_date) > new Date()) {
        setError(
          `Note: Conference is still ongoing (ends ${new Date(conf.end_date).toLocaleDateString()}). You may finalize proceedings after it concludes.`,
        );
      }

      // Convert sponsor logo URLs thành base64 (tránh lỗi CORS trong react-pdf)
      const bannerUrls: string[] = Array.isArray(conf.banner_urls)
        ? (conf.banner_urls as string[])
        : [];
      if (bannerUrls.length > 0) {
        const base64Logos = await Promise.all(
          bannerUrls.map((url) => urlToBase64(url)),
        );
        setProcData((d) => ({
          ...d,
          cover: {
            ...d.cover,
            sponsorLogos: base64Logos.map((src) => ({ src, selected: true })),
          },
        }));
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

  // ✅ SAU — render toàn bộ, không chunk, không auto-trigger
  const generateBlobInBackground = async (
    data: typeof procData,
    pages?: EditorPage[],
  ) => {
    bgGenAbortRef.current = false;
    setPreviewGenerating(true);
    try {
      await ensureAllPapersLoaded();
      const liveData = procDataRef.current ?? data;
      const livePages = pages && pages.length > 0 ? pages : undefined;
      const payload = livePages
        ? { pages: stripPagesForCache(livePages), hf }
        : { procData: liveData };

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

      // Nếu có editor pages (edReady) → dùng EditorExportDoc để giữ inserted pages
      // Nếu không → dùng ProceedingsDocument với toàn bộ papers (không cắt)
      const doc = livePages
        ? <EditorExportDoc pages={livePages} hf={hf} conferenceName={procDataRef.current?.cover?.conferenceName ?? ""} />
        : <ProceedingsDocument data={liveData} />;

      const blob = await pdf(doc).toBlob();
      if (bgGenAbortRef.current) return;

      let uploadedUrl: string | null = null;
      if (selectedConfId) {
        uploadedUrl = await uploadCachedPdf(selectedConfId, cacheKey, blob);
      }

      if (uploadedUrl) {
        if (prevBlobRef.current?.startsWith("blob:")) {
          URL.revokeObjectURL(prevBlobRef.current);
          prevBlobRef.current = null;
        }
        setPreviewCacheKey(cacheKey);
        setPreviewCacheUrl(uploadedUrl);
        setPreviewBlobUrl(uploadedUrl);
      } else {
        if (prevBlobRef.current?.startsWith("blob:"))
          URL.revokeObjectURL(prevBlobRef.current);
        const url = URL.createObjectURL(blob);
        prevBlobRef.current = url;
        setPreviewBlobUrl(url);
      }
    } catch (e) {
      console.error('Preview generation failed', e);
    } finally {
      if (!bgGenAbortRef.current) setPreviewGenerating(false);
    }
  };

  const exportPdf = async () => {
    if (exportingPdf) return;
    setExportingPdf(true);
    try {
      await ensureAllPapersLoaded();
      const liveData = procDataRef.current;
      const livePages = edPages.length > 0 ? edPages : undefined;
      const payload = livePages
        ? { pages: stripPagesForCache(livePages), hf }
        : { procData: liveData };
      const cacheKey = await hashPayload(payload);

      let url =
        previewCacheKey === cacheKey && previewCacheUrl
          ? previewCacheUrl
          : null;

      if (!url && selectedConfId) {
        url = await getCachedPdfUrl(selectedConfId, cacheKey);
      }

      if (!url) {
        const doc = livePages
          ? <EditorExportDoc pages={livePages} hf={hf} conferenceName={procDataRef.current?.cover?.conferenceName ?? ""} />
          : <ProceedingsDocument data={liveData} />;
        const blob = await pdf(doc).toBlob();
        if (selectedConfId) {
          url = await uploadCachedPdf(selectedConfId, cacheKey, blob);
        }
        if (!url) {
          const localUrl = URL.createObjectURL(blob);
          await downloadPdfFromUrl(localUrl, "proceedings-edited.pdf");
          URL.revokeObjectURL(localUrl);
          return;
        }
      }

      setPreviewCacheKey(cacheKey);
      setPreviewCacheUrl(url);
      setPreviewBlobUrl(url);
      await downloadPdfFromUrl(url, "proceedings-edited.pdf");
    } catch (e) {
      console.error("Export PDF failed", e);
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
      await ensureAllPapersLoaded();
      let pages = buildEditorPages(procDataRef.current);
      pages = regenerateToc(pages);
      // Render tuần tự, update sidebar từng trang một (user thấy progress)
      const pagesWithThumbs: EditorPage[] = [];
      for (const pg of pages) {
        const thumb = pg.bg || await renderThumbnail(pg);
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

  // Auto-sync: Khi procData thay đổi và editor đã mở, rebuild lại editor pages
  useEffect(() => {
    procDataRef.current = procData;
    if (!edReady) return;
    const timer = setTimeout(() => { initEditor(true); }, 500);
    return () => clearTimeout(timer);
  }, [procData]);

  /** Regenerate TOC page and refresh its thumbnail */
  const syncToc = async () => {
    const synced = regenerateToc(edPages);
    const tocThumb = await renderThumbnail(synced[1]);
    setEdPages(synced.map((pg, i) => (i === 1 ? { ...pg, bg: tocThumb } : pg)));
  };

  /** Patch the currently selected page — O(1), không iterate toàn bộ array */
  const patchPage = (fn: (p: EditorPage) => EditorPage) =>
    setEdPages((ps) => {
      const next = [...ps];
      next[selPage] = fn(next[selPage]);
      return next;
    });

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
        const newId = uuidv4();
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
        const newId = uuidv4();
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
    const id = uuidv4();
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

  const addImage = (src: string, isBackground: boolean = false) => {
    const img = new window.Image();
    img.onload = () => {
      const id = uuidv4();
      const maxImgZ = curPg.els
        .filter((e) => e.type === "image")
        .reduce((m, e) => Math.max(m, e.zIndex ?? 10), 10);

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
        // Chế độ Ảnh bình thường: Giữ nguyên logic cũ
        const aspect = img.naturalHeight / img.naturalWidth;
        const w = 200;
        imageProps = {
          x: 60,
          y: 80,
          w,
          h: Math.round(w * aspect),
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
    const id = uuidv4();
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

  /** Pointer move/resize — cập nhật DOM trực tiếp, KHÔNG setState (tránh re-render 60fps) */
  const onCanvasPointerMove = (e: React.PointerEvent) => {
    lastPointerEventRef.current = { clientX: e.clientX, clientY: e.clientY };
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.sx,
      dy = e.clientY - d.sy;

    let newX = d.orig.x, newY = d.orig.y, newW = d.orig.w, newH = d.orig.h;
    if (d.type === "move") {
      newX = Math.max(0, d.orig.x + dx);
      newY = Math.max(0, d.orig.y + dy);
    } else {
      if (d.dir.includes("e")) newW = Math.max(30, d.orig.w + dx);
      if (d.dir.includes("s")) newH = Math.max(20, d.orig.h + dy);
      if (d.dir.includes("w")) { newX = d.orig.x + dx; newW = Math.max(30, d.orig.w - dx); }
      if (d.dir.includes("n")) { newY = d.orig.y + dy; newH = Math.max(20, d.orig.h - dy); }
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
      id: uuidv4(),
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

  if (userRoleId !== 1 && userRoleId !== 2)
    return (
      <div className="p-20 text-center font-bold text-slate-500">
        Access Denied. Chairs only.
      </div>
    );

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
        id: uuidv4(),
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

  const handleUserSearch = async (query: string) => {
    setUserSearchQuery(query);
    if (!query.trim()) {
      setUserSearchResults([]);
      return;
    }
    setIsSearchingUsers(true);
    try {
      const { data } = await supabase
        .from("users")
        .select("user_id, full_name, email, avatar_url, description, organization")
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
      affiliation: user.organization || "",
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
      dayLabel: paper.sessionDayLabel || "",
      timeSlot: paper.timeSlot || "",
      location: paper.location || "",
    });
    setPaperSearchQuery("");
    setPaperSearchResults([]);
    setActivePaperKeynoteId(null);
  };

  // Committee helpers
  const addCommitteeMember = () =>
    updateCommittee([
      ...procData.committee,
      { id: uuidv4(), role: "Program Committee", name: "", affiliation: "" },
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

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Top bar ── */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
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
            <select
              className="text-sm bg-slate-50 border border-slate-200 text-slate-700 px-3 py-2 rounded-lg outline-none cursor-pointer focus:ring-2 focus:ring-indigo-500"
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
              icon={Save}
              disabled={!selectedConfId || saving}
              className="rounded-lg text-sm"
            >
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
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active
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
                <div key={label} className="flex justify-between items-center">
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
              <p className="text-sm text-slate-500">Loading conference data…</p>
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
                {/* ─── COVER ─── */}
                {activeTab === "cover" && (
                  <div className="space-y-5 max-w-2xl">
                    <div>
                      <label className={labelCls}>Publication Title</label>
                      <input
                        className={fieldCls}
                        value={procData.cover.title}
                        onChange={(e) => updateCover({ title: e.target.value })}
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
                                loadedBase64.push(ev.target?.result as string);
                                count++;
                                // Khi đã đọc xong tất cả các file
                                if (count === files.length) {
                                  setProcData((d) => ({
                                    ...d,
                                    cover: {
                                      ...d.cover,
                                      sponsorLogos: [
                                        ...d.cover.sponsorLogos,
                                        ...loadedBase64.map((src) => ({
                                          src,
                                          selected: true,
                                        })),
                                      ],
                                    },
                                  }));
                                }
                              };
                              reader.readAsDataURL(file);
                            });
                          }
                        }}
                        className="block w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      />
                      {procData.cover.sponsorLogos.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-3">
                          {procData.cover.sponsorLogos.map((logo, idx) => (
                            <div
                              key={idx}
                              className={`relative w-24 h-20 border rounded-lg bg-slate-50 flex items-center justify-center transition-all ${logo.selected ? "border-indigo-400 ring-2 ring-indigo-100" : "border-slate-200 opacity-60"}`}
                            >
                              <img
                                src={logo.src}
                                alt=""
                                className="max-w-full max-h-full object-contain p-1.5"
                              />
                              {/* Selection checkbox */}
                              <input
                                type="checkbox"
                                checked={logo.selected}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  updateCover({
                                    sponsorLogos:
                                      procData.cover.sponsorLogos.map((lg, i) =>
                                        i === idx
                                          ? { ...lg, selected: checked }
                                          : lg,
                                      ),
                                  });
                                }}
                                className="absolute -top-2 -left-2 w-4 h-4 accent-indigo-600 rounded cursor-pointer z-10"
                                title={
                                  logo.selected ? "Deselect" : "Select to show"
                                }
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
                                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs flex items-center justify-center shadow-sm z-10"
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
                        setProcData((d) => ({ ...d, foreword: e.target.value }))
                      }
                      placeholder="Write the foreword here. Each paragraph separated by a blank line will be rendered as a separate paragraph in the PDF."
                    />
                    <p className="text-xs text-slate-400 mt-2">
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
                              className="bg-slate-50 border border-slate-200 rounded-lg p-4"
                            >
                              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                                {role}
                              </span>
                              <p className="text-xs text-slate-500 mt-1">
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
                          className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg"
                        >
                          <select
                            value={m.role}
                            onChange={(e) =>
                              patchCommitteeMember(m.id, {
                                role: e.target.value,
                              })
                            }
                            className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white outline-none focus:ring-2 focus:ring-indigo-400 w-44 shrink-0"
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
                            className="flex-1 min-w-0 text-sm border border-slate-200 rounded-md px-2.5 py-1.5 bg-white outline-none focus:ring-2 focus:ring-indigo-400"
                            placeholder="Full name"
                            value={m.name}
                            onChange={(e) =>
                              patchCommitteeMember(m.id, {
                                name: e.target.value,
                              })
                            }
                          />
                          <input
                            className="flex-1 min-w-0 text-sm border border-slate-200 rounded-md px-2.5 py-1.5 bg-white outline-none focus:ring-2 focus:ring-indigo-400"
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
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={addCommitteeMember}
                      className="w-full py-3 border-2 border-dashed border-slate-200 rounded-lg text-sm text-slate-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all flex items-center justify-center gap-2"
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
                        placeholder: "e.g. Friday 12 Dec 2025 | 07:30 – 18:00",
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
                              floorPlan: URL.createObjectURL(e.target.files[0]),
                            });
                        }}
                        className="block w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                      />
                      {procData.generalInfo.floorPlan && (
                        <div className="mt-3 relative inline-block">
                          <img
                            src={procData.generalInfo.floorPlan}
                            alt="Floor plan"
                            className="max-h-48 rounded-lg border border-slate-200"
                          />
                          <button
                            onClick={() => updateGeneralInfo({ floorPlan: "" })}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
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
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-xs font-semibold text-slate-500 border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-3 w-40">Date</th>
                            <th className="px-4 py-3 w-36">Time</th>
                            <th className="px-4 py-3">Session / Event</th>
                            <th className="px-4 py-3 w-36">Location</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {procData.summarySchedule.length === 0 ? (
                            <tr>
                              <td
                                colSpan={4}
                                className="px-4 py-6 text-center text-slate-400 italic text-sm"
                              >
                                No sessions found for this conference.
                              </td>
                            </tr>
                          ) : (
                            procData.summarySchedule.map((s, i) => (
                              <tr
                                key={s.id}
                                className="hover:bg-slate-50/60 transition-colors"
                              >
                                <td className="px-4 py-3 text-slate-600 text-xs">
                                  {s.date}
                                </td>
                                <td className="px-4 py-3 font-semibold text-slate-800 text-xs">
                                  {s.time}
                                </td>
                                <td className="px-4 py-3 text-slate-700">
                                  {s.topic}
                                </td>
                                <td className="px-4 py-3 text-slate-500 text-xs">
                                  {s.location}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-slate-400">
                      Session schedule is auto-loaded from the database. Edit
                      sessions via the Sessions management screen.
                    </p>
                  </div>
                )}

                {/* ─── KEYNOTES ─── */}
                {activeTab === "keynotes" && (
                  <div className="space-y-5">
                    {procData.keynotes.length === 0 && (
                      <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-8 text-center">
                        <Mic className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                        <p className="text-sm text-slate-500">
                          No keynote speakers added yet.
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Keynote speakers will appear in the PDF after the
                          schedule section.
                        </p>
                      </div>
                    )}
                    {procData.keynotes.map((k, idx) => (
                      <div
                        key={k.id}
                        className="border border-slate-200 rounded-xl overflow-hidden"
                      >
                        <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Keynote {idx + 1}
                          </span>
                          <button
                            onClick={() => removeKeynote(k.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="p-5 grid grid-cols-3 gap-5">
                          {/* Photo */}
                          <div className="col-span-1 flex flex-col items-center gap-3">
                            <div className="w-28 h-28 rounded-full border-2 border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center">
                              {k.photo ? (
                                <img
                                  src={k.photo}
                                  alt={k.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Users className="w-10 h-10 text-slate-300" />
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
                              className="block w-full text-[11px] text-slate-500 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:font-medium file:bg-indigo-50 file:text-indigo-600"
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
                                  patchKeynote(k.id, { name: e.target.value });
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
                                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                                    {isSearchingUsers ? (
                                      <div className="px-4 py-3 text-xs text-slate-500 flex items-center gap-2">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />{" "}
                                        Searching users...
                                      </div>
                                    ) : (
                                      <ul className="py-1">
                                        {userSearchResults.map((user) => (
                                          <li
                                            key={user.user_id}
                                            className="px-4 py-2 hover:bg-indigo-50 cursor-pointer transition-colors"
                                            onClick={() =>
                                              handleUserSelect(k.id, user)
                                            }
                                          >
                                            <div className="flex items-center gap-2.5">
                                              <div className="w-6 h-6 rounded-full bg-slate-100 overflow-hidden shrink-0">
                                                {user.avatar_url ? (
                                                  <img
                                                    src={user.avatar_url}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                  />
                                                ) : (
                                                  <Users className="w-3 h-3 m-auto text-slate-400 mt-1.5" />
                                                )}
                                              </div>
                                              <div className="min-w-0">
                                                <p className="text-sm font-medium text-slate-900 truncate">
                                                  {user.full_name}
                                                </p>
                                                <p className="text-[10px] text-slate-500 truncate">
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
                                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                                    <ul className="py-1">
                                      {paperSearchResults.map((paper) => (
                                        <li
                                          key={paper.paper_id}
                                          className="px-4 py-2.5 hover:bg-indigo-50 cursor-pointer transition-colors"
                                          onClick={() =>
                                            handlePaperSelect(k.id, paper)
                                          }
                                        >
                                          <div className="min-w-0">
                                            <p className="text-sm border-slate-900 font-medium line-clamp-2 leading-tight mb-1">
                                              {paper.paperTitle}
                                            </p>
                                            <p className="text-[10px] text-slate-500 truncate italic">
                                              {paper.authors}
                                            </p>
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-3">
                              <div>
                                <label className={labelCls}>Keynote Label</label>
                                <input
                                  className={fieldCls}
                                  value={k.keynoteLabel || ""}
                                  placeholder="e.g. KEYNOTE I"
                                  onChange={(e) =>
                                    patchKeynote(k.id, {
                                      keynoteLabel: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div>
                                <label className={labelCls}>Affiliation</label>
                                <input
                                  className={fieldCls}
                                  value={k.affiliation || ""}
                                  placeholder="e.g. The University of British Columbia, Canada"
                                  onChange={(e) =>
                                    patchKeynote(k.id, {
                                      affiliation: e.target.value,
                                    })
                                  }
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4 mt-3">
                              <div>
                                <label className={labelCls}>Day Label</label>
                                <input
                                  className={fieldCls}
                                  value={k.dayLabel || ""}
                                  placeholder="e.g. DAY 1 - FRIDAY, 12 DECEMBER 2025"
                                  onChange={(e) =>
                                    patchKeynote(k.id, {
                                      dayLabel: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div>
                                <label className={labelCls}>Time Slot</label>
                                <input
                                  className={fieldCls}
                                  value={k.timeSlot || ""}
                                  placeholder="e.g. 08:50 - 09:30"
                                  onChange={(e) =>
                                    patchKeynote(k.id, {
                                      timeSlot: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div>
                                <label className={labelCls}>Location</label>
                                <input
                                  className={fieldCls}
                                  value={k.location || ""}
                                  placeholder="e.g. Grand Ballroom - 2F"
                                  onChange={(e) =>
                                    patchKeynote(k.id, {
                                      location: e.target.value,
                                    })
                                  }
                                />
                              </div>
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
                                patchKeynote(k.id, { abstract: e.target.value })
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
                      className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Add Keynote Speaker
                    </button>
                  </div>
                )}

                {/* ─── PAPERS ─── */}
                {activeTab === "papers" && (
                  <div className="space-y-4">
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-xs font-semibold text-slate-500 border-b border-slate-200">
                          <tr>
                            <th className="px-5 py-3">#</th>
                            <th className="px-5 py-3">Title & Authors</th>
                            <th className="px-5 py-3 w-24 text-center">
                              Abstract
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {procData.detailedSchedule.length === 0 ? (
                            <tr>
                              <td
                                colSpan={3}
                                className="px-5 py-8 text-center text-slate-400 italic"
                              >
                                No accepted papers found for this conference.
                              </td>
                            </tr>
                          ) : (
                            procData.detailedSchedule.map((p, i) => (
                              <tr
                                key={p.id}
                                className="hover:bg-slate-50/60 transition-colors"
                              >
                                <td className="px-5 py-3 text-slate-400 text-xs">
                                  {i + 1}
                                </td>
                                <td className="px-5 py-3">
                                  <p className="font-semibold text-slate-900 leading-snug text-sm">
                                    {p.paperTitle}
                                  </p>
                                  <p className="text-xs text-slate-500 mt-0.5 italic">
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
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-medium transition-all"
                                      title="View abstract"
                                    >
                                      <Eye className="w-3.5 h-3.5" /> Read
                                    </button>
                                  ) : (
                                    <span className="text-slate-300 text-xs">
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
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-slate-400">
                        Loaded {procData.detailedSchedule.length}/
                        {Math.max(
                          papersTotal,
                          procData.detailedSchedule.length,
                        )}{" "}
                        papers (status = ACCEPTED).
                      </p>
                      {papersError && (
                        <p className="text-xs text-rose-500">{papersError}</p>
                      )}
                      {procData.detailedSchedule.length < papersTotal && (
                        <button
                          onClick={loadMorePapers}
                          disabled={papersLoading}
                          className="self-start px-3 py-2 text-xs bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-700 disabled:opacity-50"
                        >
                          {papersLoading ? "Loading…" : "Load more papers"}
                        </button>
                      )}
                    </div>

                    {/* Abstract modal */}
                    {abstractModal && (
                      <div
                        className="fixed inset-0 bg-black/50 flex items-center justify-center p-6"
                        style={{ zIndex: 9999 }}
                        onClick={() => setAbstractModal(null)}
                      >
                        <div
                          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-start justify-between p-6 pb-4 border-b border-slate-100">
                            <div className="flex-1 min-w-0 pr-4">
                              <h3 className="font-bold text-slate-900 text-base leading-snug">
                                {abstractModal.title}
                              </h3>
                              <p className="text-sm text-slate-500 mt-1 italic">
                                {abstractModal.authors}
                              </p>
                            </div>
                            <button
                              onClick={() => setAbstractModal(null)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 shrink-0"
                            >
                              <X className="w-4 h-4 text-slate-500" />
                            </button>
                          </div>
                          <div className="p-6 overflow-y-auto">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
                              Abstract
                            </p>
                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                              {abstractModal.abstract}
                            </p>
                          </div>
                          <div className="p-4 border-t border-slate-100 flex justify-end">
                            <button
                              onClick={() => setAbstractModal(null)}
                              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-all"
                            >
                              Close
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'preview' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-400 flex items-center gap-1.5">
                        {previewGenerating && <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />}
                        {previewGenerating
                          ? `Rendering ${Math.max(
                            papersTotal,
                            procData.detailedSchedule.length,
                          )} papers...`
                          : previewBlobUrl
                            ? "Preview ready. Edit in PDF Editor, then click Sync View to update."
                            : procData.detailedSchedule.length <
                              Math.max(
                                papersTotal,
                                procData.detailedSchedule.length,
                              )
                              ? `Loaded ${procData.detailedSchedule.length}/${Math.max(
                                papersTotal,
                                procData.detailedSchedule.length,
                              )} papers. Click Sync View to load remaining and render.`
                              : "Click Sync View to generate preview."}
                      </p>
                      <div className="flex gap-2">
                        {/* Sync View — explicit trigger, không auto-update khi edit */}
                        <button
                          onClick={() => generateBlobInBackground(procData, edReady ? edPages : undefined)}
                          disabled={previewGenerating || papersLoading}
                          className="flex items-center gap-1.5 px-3 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg disabled:opacity-50 transition-all shadow-md shadow-indigo-200"
                        >
                          {previewGenerating || papersLoading
                            ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                {papersLoading ? "Loading papers..." : "Rendering..."}
                              </>
                            )
                            : <><RefreshCw className="w-3.5 h-3.5" /> Sync View</>}
                        </button>
                        {previewBlobUrl && (
                          <button
                            onClick={() =>
                              downloadPdfFromUrl(previewBlobUrl, "proceedings.pdf")
                            }
                            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-all"
                          >
                            <Download className="w-3.5 h-3.5" /> Export PDF
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="h-[720px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                      {previewGenerating ? (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-slate-50">
                          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                          <p className="text-sm text-slate-500">
                            Rendering {Math.max(
                              papersTotal,
                              procData.detailedSchedule.length,
                            )} papers
                            {edReady ? ` across ${edPages.length} pages` : ""}...
                          </p>
                        </div>
                      ) : previewBlobUrl ? (
                        <iframe src={previewBlobUrl} width="100%" height="100%"
                          className="border-none" title="PDF Preview" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-slate-50">
                          <FileText className="w-12 h-12 text-slate-300" />
                          <p className="text-sm text-slate-500">
                            {Math.max(
                              papersTotal,
                              procData.detailedSchedule.length,
                            )} papers
                            · {procData.keynotes.length} keynotes
                            {edReady ? ` · ${edPages.length} editor pages` : ""}
                          </p>
                          <button
                            onClick={() => generateBlobInBackground(procData, edReady ? edPages : undefined)}
                            disabled={previewGenerating || papersLoading}
                            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-all shadow-md shadow-indigo-200"
                          >
                            {previewGenerating || papersLoading ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {papersLoading ? "Loading papers..." : "Rendering..."}
                              </>
                            ) : (
                              <>
                                <Eye className="w-4 h-4" /> Sync View
                              </>
                            )}
                          </button>
                          {edReady && (
                            <p className="text-xs text-slate-400 text-center max-w-xs">
                              Includes {edPages.length} pages from PDF Editor (with your inserted pages)
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ─── PDF EDITOR ─── */}
                {activeTab === "editor" && (
                  <div className="-mx-7 -mb-7">
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
                                {/* add image */}
                                <button
                                  title="Add image"
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
                                  className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${showHFPanel ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
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

                                {/* Export */}
                                <button
                                  onClick={exportPdf}
                                  disabled={exportingPdf || papersLoading}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-all"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  {exportingPdf
                                    ? "Exporting…"
                                    : papersLoading
                                      ? "Loading papers…"
                                      : "Export PDF"}
                                </button>
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
                                      <select
                                        value={hf.pageNumPos}
                                        onChange={(e) =>
                                          setHF((h) => ({
                                            ...h,
                                            pageNumPos: e.target.value as any,
                                          }))
                                        }
                                        className="text-xs border border-indigo-200 rounded px-1.5 py-1 bg-white outline-none"
                                      >
                                        <option value="left">Left</option>
                                        <option value="center">Center</option>
                                        <option value="right">Right</option>
                                      </select>
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
                                          // Convert y from fromPage coords to toPage coords
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
                                        backgroundColor: pg.bgColor || "#ffffff",
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
                                              backgroundColor: pg.bgColor || "#ffffff",
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
                                                    // Text: auto height. Bar: handled by BarElement. Others: fixed.
                                                    height: el.type === "text"
                                                      ? "auto"
                                                      : el.type === "bar"
                                                        ? "auto"
                                                        : el.h + (isSel && el.type === "table" ? 16 : 0),
                                                    minHeight: (el.type === "text" || el.type === "bar") ? el.h : undefined,
                                                    cursor: el.type === "table" ? (isSel ? "default" : "pointer") : "move",
                                                    userSelect: "none",
                                                    zIndex: el.zIndex ?? 10,
                                                    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                                                    transformOrigin: "center center",
                                                    overflow: el.type === "table" ? "visible" : undefined,
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
                                                          whiteSpace: "pre-wrap",
                                                          wordBreak: "break-word",
                                                          overflowWrap: "break-word",
                                                          fontFamily: el.fontFamily ? cssFontFamily(el.fontFamily) : "inherit",
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
                                                      className="w-full h-full object-contain pointer-events-none select-none"
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
                                  <div className="border-t border-slate-100 pt-4 space-y-2">
                                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                      Page {selPage + 1} / {edPages.length}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                      {curPg.els.length} element
                                      {curPg.els.length !== 1 ? "s" : ""} on
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
                        <div className="bg-white rounded-2xl shadow-2xl p-6 flex flex-col gap-5 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-lg">
                              <ImagePlus className="w-5 h-5 text-indigo-600" />
                              Add Image
                            </h3>
                            <button onClick={() => setImageToInsert(null)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                              <X className="w-4 h-4 text-slate-500" />
                            </button>
                          </div>

                          <div className="space-y-3">
                            <button
                              onClick={() => {
                                addImage(imageToInsert, false);
                                setImageToInsert(null);
                              }}
                              className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left"
                            >
                              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 grow-0 shrink-0">
                                <ImagePlus className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900">Normal Image</div>
                                <div className="text-xs text-slate-500">Insert at current cursor position (manual resize)</div>
                              </div>
                            </button>

                            <button
                              onClick={() => {
                                addImage(imageToInsert, true);
                                setImageToInsert(null);
                              }}
                              className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-left"
                            >
                              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 grow-0 shrink-0">
                                <LayoutTemplate className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="font-semibold text-slate-900">Background Image</div>
                                <div className="text-xs text-slate-500">Auto-scale to fit the entire page</div>
                              </div>
                            </button>
                          </div>

                          <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg flex gap-2">
                            <div className="text-amber-500 shrink-0 mt-0.5">
                              <Settings2 className="w-3.5 h-3.5" />
                            </div>
                            <div className="text-[10.5px] text-amber-800 leading-relaxed font-medium">
                              <strong className="block mb-0.5 uppercase tracking-wide opacity-70">Recommended Size:</strong>
                              For background, use 1240 × 1754 (A4 @ 150dpi) or any portrait image (e.g., 1920x2715) for best quality.
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ProceedingsManagement;