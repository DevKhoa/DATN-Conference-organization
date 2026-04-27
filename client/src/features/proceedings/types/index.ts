import type { TableData } from "@/components/ui/table-editor";

export interface KeynoteSpeaker {
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

export interface SponsorLogo {
  src: string;
  selected: boolean;
}

export interface EditorEl {
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

export interface EditorPage {
  id: string;
  bg: string;
  bgColor?: string;
  els: EditorEl[];
}

export interface HFConfig {
  headerText: string;
  footerText: string;
  showPageNum: boolean;
  pageNumPos: "left" | "center" | "right";
  startFrom: number;
}

export interface ProceedingsData {
  cover: {
    title: string;
    conferenceName: string;
    date: string;
    location: string;
    sponsorLogos: SponsorLogo[];
    organizerLogos: SponsorLogo[];
  };
  isbn?: string;
  publisher?: string;
  foreword: string;
  committee: CommitteeMember[];
  generalInfo: {
    venueDetails: string;
    registrationHours: string;
    roomAssignments: string;
    coffeeInternetInfo: string;
    galaDinner: string;
    floorPlan: string;
    breakInfo: string;
  };
  summarySchedule: ScheduleItem[];
  keynotes: KeynoteSpeaker[];
  detailedSchedule: SessionSchedule[];
}

export interface CommitteeMember {
  id: string;
  role: string;
  name: string;
  affiliation?: string;
}

export interface ScheduleItem {
  id: string;
  date: string;
  time: string;
  session: string;
  location: string;
  topic?: string;
}

export interface SessionSchedule {
  sessionId?: number;
  sessionName?: string;
  // flat paper model (from backup)
  id?: string;
  paper_id?: number;
  paperTitle?: string;
  title?: string;
  authors?: string;
  abstract?: string;
  timeSlot?: string;
  sessionDayLabel?: string;
  sessionDayOrder?: number;
  chair?: string;
  time?: string;
  location?: string;
  papers?: PaperEntry[];
}

export interface PaperEntry {
  paperId?: number;
  paper_id?: number;
  paperTitle?: string;
  title?: string;
  authors: string;
  abstract?: string;
  timeSlot?: string;
}

/** A4 canvas size in display-pixels (matches 595×842 pt at ~1.24× scale) */
export const CANVAS_W = 744;
export const CANVAS_H = Math.round((CANVAS_W * 842) / 595); // ≈ 1052
export const THUMB_W = 106;
export const THUMB_H = Math.round((THUMB_W * 842) / 595); // ≈ 150

/** Convert display-px → PDF points for export */
export const px2pt = (v: number, axis: "x" | "y"): number =>
  axis === "x" ? (v / CANVAS_W) * 595 : (v / CANVAS_H) * 842;
