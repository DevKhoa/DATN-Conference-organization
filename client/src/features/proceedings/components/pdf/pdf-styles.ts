import { StyleSheet, Font } from "@react-pdf/renderer";

// Register Inter font using local TTF files in public folder
Font.register({
  family: "Inter",
  fonts: [
    { src: "/fonts/Inter-Regular.ttf", fontWeight: "normal" },
    { src: "/fonts/Inter-Bold.ttf", fontWeight: "bold" },
    { src: "/fonts/Inter-Italic.ttf", fontStyle: "italic" },
  ],
});

// Register Roboto font using Inter as fallback
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

export const pdfStyles = StyleSheet.create({
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
    bottom: 30,
    left: 55,
    right: 55,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.5,
    borderTopColor: "#e2e8f0",
    paddingTop: 10,
  },
  footerTitle: {
    fontSize: 8,
    color: "#718096",
    fontFamily: "Inter",
    maxWidth: "80%",
  },
  pageNumber: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#1a3a6b",
  },
});
