import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    Book, FileText, Users, Clock, Map as MapIcon, Download, Globe, Plus,
    Trash2, Loader2, AlertCircle, ChevronRight, Image as ImageLucide,
    ArrowLeft, Save, Mic, Info, CalendarDays, Eye, List,
    PenLine, Type, Crop, FilePlus, GripVertical, AlignLeft, AlignCenter,
    AlignRight, Move, Settings2, X, Check, ImagePlus, RefreshCw, LayoutTemplate, RotateCw,
    Grid3X3,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Button from '../components/ui/Button';
import { Document, Page, Text, View, StyleSheet, Image, PDFViewer, PDFDownloadLink, pdf, Font } from '@react-pdf/renderer';
import { v4 as uuidv4 } from 'uuid';

// Register fonts for Vietnamese support
Font.register({
    family: 'Inter',
    fonts: [
        { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZfOkw.ttf', fontWeight: 'normal' },
        { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYMZfOkw.ttf', fontWeight: 'bold' },
        { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYMZfOkw.ttf', fontStyle: 'italic' },
    ]
});

// Also register Roboto just in case it's selected (standard in FontManager)
Font.register({
    family: 'Roboto',
    fonts: [
        { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxKKTU1Kg.ttf', fontWeight: 'normal' },
        { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc4AMP6lQ.ttf', fontWeight: 'bold' },
        { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOkCnqEu92Fr1Mu51xIIzIXKMny.ttf', fontStyle: 'italic' },
    ]
});
import {
    TableData, CellCoord, createEmptyTable, TableEditorCanvas, TablePropertiesPanel,
    InsertTableModal, TablePdfExport, renderTableToCanvas,
} from './TableEditor';
import { FontSelector, cssFontFamily } from './FontManager';


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
}

// ─── PDF Styles ────────────────────────────────────────────────────────────────
const pdfStyles = StyleSheet.create({
    page: { padding: '50pt 55pt', fontFamily: 'Inter', fontSize: 10, lineHeight: 1.5, color: '#1a202c' },
    coverPage: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', backgroundColor: '#1a3a6b', padding: 60 },
    coverTag: { fontSize: 11, color: '#93c5fd', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 20, fontFamily: 'Inter' },
    coverTitle: { fontSize: 30, fontFamily: 'Inter', fontWeight: 'bold', color: '#ffffff', textAlign: 'center', lineHeight: 1.3, marginBottom: 16 },
    coverSubtitle: { fontSize: 13, color: '#bfdbfe', textAlign: 'center', marginBottom: 8 },
    coverDateLoc: { fontSize: 11, color: '#93c5fd', textAlign: 'center', marginBottom: 50 },
    coverDivider: { width: 60, height: 2, backgroundColor: '#60a5fa', marginBottom: 50 },
    coverSponsorLabel: { fontSize: 9, color: '#93c5fd', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 },
    coverLogos: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' },

    // TOC (SOICT 2025 style)
    tocTitle: { fontSize: 24, fontFamily: 'Inter', fontWeight: 'bold', color: '#2b5797', textAlign: 'center', marginBottom: 30, letterSpacing: 1 },
    tocEntryRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 28, paddingLeft: 10 },
    tocPageNum: { fontSize: 22, fontFamily: 'Inter', fontWeight: 'bold', color: '#3b6cb5', width: 48, marginRight: 14 },
    tocLabel: { fontSize: 12, color: '#3b6cb5', fontFamily: 'Inter' },

    // Section headings
    sectionTitle: { fontSize: 15, fontFamily: 'Inter', fontWeight: 'bold', marginTop: 0, marginBottom: 18, color: '#1a3a6b', textTransform: 'uppercase', letterSpacing: 1 },
    sectionDivider: { height: 2, backgroundColor: '#1a3a6b', marginBottom: 18 },
    // Committee
    roleHeader: { fontSize: 10, fontFamily: 'Inter', fontWeight: 'bold', color: '#1a3a6b', textTransform: 'uppercase', letterSpacing: 1, marginTop: 14, marginBottom: 4 },
    memberLine: { fontSize: 9.5, color: '#2d3748', marginBottom: 3, paddingLeft: 8 },

    // Program at a Glance — day bar
    glanceDayBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1a3a6b', paddingVertical: 7, paddingHorizontal: 10, marginTop: 18, marginBottom: 0 },
    glanceDayLeft: { fontSize: 11, fontFamily: 'Inter', fontWeight: 'bold', color: '#ffffff', textTransform: 'uppercase' },
    glanceDayRight: { fontSize: 11, fontFamily: 'Inter', fontWeight: 'bold', color: '#ffffff' },
    // Program at a Glance — table rows
    glanceRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#cbd5e0', paddingVertical: 6, paddingHorizontal: 4, alignItems: 'flex-start' },
    glanceColTime: { width: '18%', fontSize: 9, color: '#2d3748' },
    glanceColSession: { width: '57%', fontSize: 9, color: '#2d3748' },
    glanceColLocation: { width: '25%', fontSize: 9, color: '#2d3748', textAlign: 'right' },

    // Keynotes
    keynoteCard: { marginBottom: 30, padding: '16pt 0', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    keynoteTitle: { fontSize: 13, fontFamily: 'Inter', fontWeight: 'bold', color: '#1a3a6b', marginBottom: 6 },
    keynoteHeader: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-start' },
    keynoteSpeaker: { fontSize: 11, fontFamily: 'Inter', fontStyle: 'italic', color: '#4a5568', marginBottom: 12 },
    keynotePhoto: { width: 90, height: 90, borderRadius: 45, marginRight: 15, objectFit: 'cover' },
    keynoteInfo: { flex: 1 },
    abstractLabel: { fontSize: 8.5, fontFamily: 'Inter', fontWeight: 'bold', color: '#718096', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
    abstractText: { marginTop: 4, width: '100%', fontSize: 9.5, color: '#2d3748', lineHeight: 1.65, textAlign: 'justify' },
    bioText: { fontSize: 9, color: '#4a5568', lineHeight: 1.6, textAlign: 'justify', marginTop: 8, fontFamily: 'Inter', fontStyle: 'italic' },

    // Detailed papers
    sessionHeader: { backgroundColor: '#eef2f7', padding: '8pt 10pt', marginBottom: 10, marginTop: 20 },
    sessionName: { fontSize: 11, fontFamily: 'Inter', fontWeight: 'bold', color: '#1a3a6b' },
    sessionMeta: { fontSize: 8.5, color: '#718096', marginTop: 2 },
    paperBlock: { marginBottom: 20, paddingLeft: 12, borderLeftWidth: 3, borderLeftColor: '#93c5fd', width: '100%' },
    paperTitle: { fontSize: 11, fontFamily: 'Inter', fontWeight: 'bold', color: '#1a202c', marginBottom: 3 },
    paperAuthors: { fontSize: 9, fontFamily: 'Inter', fontStyle: 'italic', color: '#4a5568', marginBottom: 6 },

    // General info
    infoSection: { marginBottom: 16 },
    infoLabelBar: { backgroundColor: '#3b5488', paddingVertical: 4, paddingHorizontal: 6, marginBottom: 4 },
    infoLabelText: { fontSize: 10, fontFamily: 'Inter', fontWeight: 'bold', color: '#ffffff', textTransform: 'uppercase' },
    infoText: { fontSize: 10, color: '#1a202c', lineHeight: 1.5, paddingHorizontal: 2 },

    footerContainer: {
        position: 'absolute',
        bottom: 30,
        left: 55,
        right: 55,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 0.5,
        borderTopColor: '#e2e8f0',
        paddingTop: 10,
    },
    footerTitle: {
        fontSize: 8,
        color: '#718096',
        fontFamily: 'Inter',
        maxWidth: '80%',
    },
    pageNumber: {
        fontSize: 10,
        fontFamily: 'Helvetica-Bold',
        color: '#1a3a6b',
    },
});

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
        const key = s.date || 'Unscheduled';
        if (!scheduleByDate[key]) scheduleByDate[key] = [];
        scheduleByDate[key].push(s);
    });

    // Trong ProceedingsDocument
    const tocItems = [
        { label: 'Foreword', page: 1 },
        { label: 'Organizing Committee', page: 2 },
        { label: 'General Information', page: 3 },
        { label: 'Program at a Glance', page: 4 },
        ...(data.keynotes?.length > 0 ? [{ label: 'Keynote Speakers', page: 5 }] : []),
        { label: 'Detailed Program with Abstracts', page: data.keynotes?.length > 0 ? 6 : 5 },
    ];

    const formatAbstract = (text?: string) => {
        if (!text) return '';

        return text
            .replace(/\r?\n/g, ' ')     // bỏ line break
            .replace(/\s+/g, ' ')       // bỏ double space
            .trim();
    };

    return (
        <Document>
            {/* ── COVER ── */}
            <Page size="A4" style={pdfStyles.coverPage}>
                <Text style={pdfStyles.coverTag}>Program Book</Text>
                <View style={pdfStyles.coverDivider} />
                <Text style={pdfStyles.coverTitle}>{data.cover.title || 'CONFERENCE PROCEEDINGS'}</Text>
                <Text style={pdfStyles.coverSubtitle}>{data.cover.conferenceName}</Text>
                <Text style={pdfStyles.coverDateLoc}>{data.cover.date}  ·  {data.cover.location}</Text>

                {data.cover.sponsorLogos?.length > 0 ? (() => {
                    const count = data.cover.sponsorLogos.length;
                    // Tính kích thước logo tự động để vừa 1 hàng (max width ~475pt với padding 60 mỗi bên)
                    const logoW = Math.min(80, Math.floor((475 - (count - 1) * 10) / count));
                    const logoH = Math.round(logoW * 0.75);
                    return (
                        <>
                            <Text style={pdfStyles.coverSponsorLabel}>Sponsors & Partners</Text>
                            <View style={pdfStyles.coverLogos}>
                                {data.cover.sponsorLogos.map((logo: string, i: number) => (
                                    <Image key={i} src={logo} style={{ width: logoW, height: logoH, objectFit: 'contain', marginRight: i < count - 1 ? 10 : 0 }} />
                                ))}
                            </View>
                        </>
                    );
                })() : null}
            </Page>

            {/* ── TABLE OF CONTENTS */}
            <Page size="A4" style={{ ...pdfStyles.page, position: 'relative' }}>
                {/* Vertical conference name (decorative left side, auto-scaled to fill height) */}
                {(() => {
                    const cn = data.cover.conferenceName || 'CONFERENCE';
                    const len = cn.length;
                    // Auto-scale to fill ~800pt height
                    const fs = Math.max(16, Math.min(140, 800 / (Math.max(1, len) * 0.65)));
                    // Fixed width 800
                    const tw = 800;
                    // Visual center x ≈ 40pt (left margin)
                    const lft = Math.round(40 - tw / 2);
                    // Visual center y ≈ 421 (A4 half height 842/2)
                    const lineH = Math.round(Math.max(1, fs) * 1.4);
                    const tp = Math.round(421 - lineH / 2);
                    return (
                        <Text style={{
                            position: 'absolute', left: lft, top: tp, width: tw,
                            fontSize: fs, fontFamily: 'Helvetica-Bold', color: '#3b6cb5',
                            letterSpacing: Math.max(1, Math.round(fs * 0.05)), opacity: 0.8,
                            textAlign: 'center', transform: 'rotate(-90deg)',
                        }}>{cn}</Text>
                    );
                })()}

                {/* Title */}
                <Text style={pdfStyles.tocTitle}>TABLE OF CONTENT</Text>

                {/* Entries: page number before label */}
                <View style={{ paddingLeft: 120, paddingTop: 15 }}>
                    {tocItems.map((item, i) => (
                        <View key={i} style={pdfStyles.tocEntryRow}>
                            <Text style={pdfStyles.tocPageNum}>{item.page}</Text>
                            <Text style={pdfStyles.tocLabel}>{item.label}</Text>
                        </View>
                    ))}
                </View>
            </Page>

            {/* ── FOREWORD ── */}
            <Page size="A4" style={pdfStyles.page}>
                <Text style={pdfStyles.sectionTitle}>Foreword</Text>
                <View style={pdfStyles.sectionDivider} />
                {data.foreword
                    ? data.foreword.split('\n').filter((p: string) => p.trim()).map((p: string, i: number) => (
                        <Text key={i} style={{ marginBottom: 10, textAlign: 'justify', fontSize: 10, lineHeight: 1.7, color: '#2d3748' }}>{p.trim()}</Text>
                    ))
                    : <Text style={{ color: '#718096', fontFamily: 'Inter', fontStyle: 'italic' }}>No foreword provided.</Text>
                }
                <View style={pdfStyles.footerContainer} fixed>
                    <Text style={pdfStyles.footerTitle}>{data.cover.conferenceName} </Text>
                    <Text style={pdfStyles.pageNumber} render={({ pageNumber }) => `${pageNumber}`} />
                </View>
            </Page>

            {/* ── ORGANIZING COMMITTEE ── */}
            <Page size="A4" style={pdfStyles.page}>
                <Text style={pdfStyles.sectionTitle}>Organizing Committee</Text>
                <View style={pdfStyles.sectionDivider} />
                {Object.keys(committeeByRole).length === 0
                    ? <Text style={{ color: '#718096', fontFamily: 'Inter', fontStyle: 'italic' }}>No committee members added.</Text>
                    : Object.entries(committeeByRole).map(([role, members], i) => (
                        <View key={i} >
                            <Text style={pdfStyles.roleHeader}>{role}</Text>
                            {members.map((m: any, j: number) => (
                                <Text key={j} style={pdfStyles.memberLine}>
                                    {m.name}{m.affiliation ? `, ${m.affiliation}` : ''}
                                </Text>
                            ))}
                        </View>
                    ))
                }
                <View style={pdfStyles.footerContainer} fixed>
                    <Text style={pdfStyles.footerTitle}>{data.cover.conferenceName} </Text>
                    <Text style={pdfStyles.pageNumber} render={({ pageNumber }) => `${pageNumber}`} />
                </View>
            </Page>

            {/* ── CONFERENCE INFORMATION ── */}
            <Page size="A4" style={pdfStyles.page}>
                {(() => {
                    const infoTitle = data.cover.conferenceName ? `${data.cover.conferenceName.toUpperCase()} INFORMATION` : 'CONFERENCE INFORMATION';
                    const titleFontSize = Math.max(14, Math.min(24, Math.floor(475 / (infoTitle.length * 0.6))));
                    return (
                        <Text style={{ fontSize: titleFontSize, fontFamily: 'Helvetica-Bold', color: '#2a4365', textAlign: 'center', marginBottom: 20 }}>
                            {infoTitle}
                        </Text>
                    );
                })()}

                {(() => {
                    const renderInf = (label: string, text?: string) => {
                        if (!text?.trim()) return null;
                        return (
                            <View wrap={false} style={{ marginBottom: 15 }}>
                                <View style={{ backgroundColor: '#2a4365', padding: '4px 6px', marginBottom: 5 }}>
                                    <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#ffffff', textTransform: 'uppercase' }}>{label}</Text>
                                </View>
                                {text.split('\n').filter(l => l.trim()).map((line, i) => (
                                    <Text key={i} style={{ fontSize: 9, color: '#2d3748', lineHeight: 1.5 }}>{line.trim()}</Text>
                                ))}
                            </View>
                        );
                    };
                    return (
                        <>
                            {renderInf('Conference Venue', data.generalInfo?.venueDetails)}
                            {renderInf('Registration Desk Opening Time', data.generalInfo?.registrationHours)}
                            {renderInf('Function Rooms', data.generalInfo?.roomAssignments)}
                            {renderInf('Refreshments & Internet Access', data.generalInfo?.coffeeInternetInfo)}
                            {renderInf('Gala Dinner', data.generalInfo?.galaDinner)}
                        </>
                    );
                })()}

                {data.generalInfo?.floorPlan && (() => {
                    const layoutTitle = data.cover.conferenceName ? `${data.cover.conferenceName.toUpperCase()} LAYOUT` : 'VENUE LAYOUT';
                    const layoutFontSize = Math.max(14, Math.min(24, Math.floor(475 / (layoutTitle.length * 0.6))));
                    return (
                        <View style={{ marginTop: 10 }}>
                            <Text style={{ fontSize: layoutFontSize, fontFamily: 'Helvetica-Bold', color: '#2a4365', textAlign: 'center', marginBottom: 12 }}>
                                {layoutTitle}
                            </Text>
                            <Image src={data.generalInfo.floorPlan} style={{ width: '100%', maxHeight: 220, objectFit: 'contain' }} />
                        </View>
                    );
                })()}

                <View style={pdfStyles.footerContainer} fixed>
                    <Text style={pdfStyles.footerTitle}>{data.cover.conferenceName} </Text>
                    <Text style={pdfStyles.pageNumber} render={({ pageNumber }) => `${pageNumber}`} />
                </View>
            </Page>

            {/* ── PROGRAM AT A GLANCE ── */}
            <Page size="A4" style={pdfStyles.page}>
                <Text style={{ fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#1a3a6b', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center', marginBottom: 14 }}>Program at a Glance</Text>

                {/* The Program at a Glance is now generated as 'table' elements within the editor pages. */}
                {/* We no longer render it manually here. Provide a placeholder if there are no pages that were generated. */}
                {Object.keys(scheduleByDate).length === 0 && (
                    <Text style={{ color: '#718096', fontFamily: 'Helvetica-Oblique' }}>No schedule data loaded.</Text>
                )}

                <View style={pdfStyles.footerContainer} fixed>
                    <Text style={pdfStyles.footerTitle}>{data.cover.conferenceName} </Text>
                    <Text style={pdfStyles.pageNumber} render={({ pageNumber }) => `${pageNumber}`} />
                </View>
            </Page>

            {/* ── KEYNOTE SPEAKERS ── */}
            {data.keynotes?.length > 0 ? (
                <Page size="A4" style={pdfStyles.page}>
                    <Text style={pdfStyles.sectionTitle}>Keynote Speakers</Text>
                    <View style={pdfStyles.sectionDivider} />
                    {data.keynotes.map((k: KeynoteSpeaker, i: number) => (
                        <View key={i} style={pdfStyles.keynoteCard} wrap={false}>
                            {/* THÊM KHỐI HEADER NÀY ĐỂ HIỆN ẢNH KẾ BÊN TÊN */}
                            <View style={pdfStyles.keynoteHeader}>
                                {k.photo ? <Image src={k.photo} style={pdfStyles.keynotePhoto} /> : null}
                                <View style={pdfStyles.keynoteInfo}>
                                    <Text style={pdfStyles.keynoteTitle}>{k.presentationTitle || 'Untitled Keynote'}</Text>
                                    <Text style={pdfStyles.keynoteSpeaker}>{k.name || 'Unknown Speaker'}</Text>
                                </View>
                            </View>

                            {k.abstract ? (
                                <View>
                                    <Text style={pdfStyles.abstractLabel}>Abstract</Text>
                                    <Text style={pdfStyles.abstractText}>{k.abstract}</Text>
                                </View>
                            ) : null}
                            {k.bio ? (
                                <Text style={pdfStyles.bioText}>{k.bio}</Text>
                            ) : null}
                        </View>
                    ))}
                    <View style={pdfStyles.footerContainer} fixed>
                        <Text style={pdfStyles.footerTitle}>{data.cover.conferenceName} </Text>
                        <Text style={pdfStyles.pageNumber} render={({ pageNumber }) => `${pageNumber}`} />
                    </View>
                </Page>
            ) : null}

            {/* ── DETAILED PROGRAM WITH ABSTRACTS ── */}
            <Page size="A4" style={pdfStyles.page}>
                <Text style={pdfStyles.sectionTitle}>Detailed Program with Abstracts</Text>
                <View style={pdfStyles.sectionDivider} />
                {(() => {
                    const schedule: any[] = data.detailedSchedule || [];
                    if (schedule.length === 0) {
                        return <Text style={{ color: '#718096', fontFamily: 'Helvetica-Oblique' }}>No accepted papers found for this conference.</Text>;
                    }

                    // Sort by sessionDayOrder, then by timeSlot
                    const sorted = [...schedule].sort((a, b) => {
                        if (a.sessionDayOrder !== b.sessionDayOrder) return (a.sessionDayOrder || 0) - (b.sessionDayOrder || 0);
                        return (a.timeSlot || '').localeCompare(b.timeSlot || '');
                    });

                    // Group by day label
                    const days: { label: string; papers: any[] }[] = [];
                    sorted.forEach(p => {
                        const label = p.sessionDayLabel || 'Unscheduled';
                        const existing = days.find(d => d.label === label);
                        if (existing) existing.papers.push(p);
                        else days.push({ label, papers: [p] });
                    });

                    return days.map((day, di) => (
                        <View key={di}>
                            {/* Day header — styled like SOICT: dark blue background, white text */}
                            <View style={{
                                backgroundColor: '#1a3a6b',
                                paddingVertical: 8,
                                paddingHorizontal: 12,
                                marginTop: di === 0 ? 0 : 24,
                                marginBottom: 14,
                            }} wrap={false}>
                                <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#ffffff', letterSpacing: 0.5 }}>
                                    {day.label}
                                </Text>
                            </View>

                            {day.papers.map((p: any, i: number) => (
                                <View key={i} style={pdfStyles.paperBlock} wrap={false}>
                                    {/* Row 1: time + authors (like image 1: "13:50  Author1, Author2") */}
                                    <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 3 }}>
                                        {p.timeSlot ? (
                                            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1a3a6b', width: 36, marginRight: 6 }}>
                                                {p.timeSlot}
                                            </Text>
                                        ) : null}
                                        <Text style={[pdfStyles.paperAuthors, { marginBottom: 0, flex: 1 }]}>
                                            {p.authors}
                                        </Text>
                                    </View>

                                    {/* Row 2: Bold title */}
                                    <Text style={[pdfStyles.paperTitle, { paddingLeft: p.timeSlot ? 42 : 0 }]}>
                                        {p.paperTitle}
                                    </Text>


                                    {/* Row 4: Abstract */}
                                    {p.abstract ? (
                                        <View style={{ paddingLeft: p.timeSlot ? 42 : 0 }}>
                                            <Text style={pdfStyles.abstractText}>
                                                {'ABSTRACT. ' + formatAbstract(p.abstract)}
                                            </Text>
                                        </View>
                                    ) : null}
                                </View>
                            ))}
                        </View>
                    ));
                })()}
                <View style={pdfStyles.footerContainer} fixed>
                    <Text style={pdfStyles.footerTitle}>{data.cover.conferenceName} </Text>
                    <Text style={pdfStyles.pageNumber} render={({ pageNumber }) => `${pageNumber}`} />
                </View>
            </Page>
        </Document>
    );
};

// ─── PDF Editor — types ───────────────────────────────────────────────────────
interface EditorEl {
    id: string; type: 'text' | 'image' | 'table';
    x: number; y: number; w: number; h: number;
    // text
    text?: string; fontSize?: number; bold?: boolean; italic?: boolean;
    color?: string; align?: 'left' | 'center' | 'right'; fontFamily?: string;
    // image
    src?: string;
    zIndex?: number;
    rotation?: number;
    // TOC detection
    isTocEntry?: boolean;
    tocLabel?: string;
    // table
    tableData?: TableData;
}
interface EditorPage { id: string; bg: string; bgColor?: string; els: EditorEl[]; }
interface HFConfig {
    headerText: string; footerText: string;
    showPageNum: boolean; pageNumPos: 'left' | 'center' | 'right'; startFrom: number;
}

/** A4 canvas size in display-pixels (matches 595×842 pt at ~1.24× scale) */
const CANVAS_W = 744;
const CANVAS_H = Math.round(CANVAS_W * 842 / 595); // ≈ 1052
const THUMB_W = 106;
const THUMB_H = Math.round(THUMB_W * 842 / 595);   // ≈ 150

/** Convert display-px → PDF points for export */
const px2pt = (v: number, axis: 'x' | 'y') =>
    axis === 'x' ? (v / CANVAS_W) * 595 : (v / CANVAS_H) * 842;

// ─── Editor export document ──────────────────────────────────────────────────
const EditorExportDoc = ({ pages, hf }: { pages: EditorPage[]; hf: HFConfig }) => (
    <Document>
        {pages.map((pg, pi) => (
            <Page key={pg.id} size="A4" wrap={false} style={{ padding: 0, position: 'relative', minHeight: 842, backgroundColor: pg.bgColor || '#ffffff' }}>
                {/* overlay elements */}
                {[...pg.els]
                    .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
                    .map(el => el.type === 'table' && el.tableData ? (
                        <TablePdfExport key={el.id} tableData={el.tableData}
                            elX={el.x} elY={el.y} elW={el.w} elH={el.h} px2pt={px2pt} />
                    ) : el.type === 'text' ? (
                        <Text key={el.id} style={{
                            position: 'absolute',
                            left: px2pt(el.x, 'x'), top: px2pt(el.y, 'y'),
                            width: px2pt(el.w, 'x'),
                            fontSize: px2pt(el.fontSize ?? 12, 'y'),
                            fontFamily: el.fontFamily === 'Inter' || el.fontFamily === 'Roboto' ? el.fontFamily : 'Inter',
                            fontWeight: el.bold ? 'bold' : 'normal',
                            fontStyle: el.italic ? 'italic' : 'normal',
                            color: el.color ?? '#000000',
                            textAlign: (el.align ?? 'left') as any,
                            ...(el.rotation ? { transform: `rotate(${el.rotation}deg)` } : {}),
                        }}>{el.text ?? ''}</Text>
                    ) : el.type === 'image' && el.src ? (
                        <Image key={el.id} src={el.src} style={{
                            position: 'absolute',
                            left: px2pt(el.x, 'x'), top: px2pt(el.y, 'y'),
                            width: px2pt(el.w, 'x'), height: px2pt(el.h, 'y'),
                            objectFit: 'contain',
                            ...(el.rotation ? { transform: `rotate(${el.rotation}deg)` } : {}),
                        }} />
                    ) : null)
                }

                {/* global header */}
                {hf.headerText.trim() && pi > 1 && (
                    <Text style={{
                        position: 'absolute', top: 14, left: 42, right: 42,
                        fontSize: 8, color: '#888', textAlign: 'center', fontFamily: 'Helvetica',
                    }}>{hf.headerText}</Text>
                )}
                {/* global footer */}
                {(hf.footerText.trim() || hf.showPageNum) && pi > 1 && (
                    <View style={{
                        position: 'absolute', bottom: 14, left: 42, right: 42,
                        flexDirection: 'row',
                        justifyContent: hf.pageNumPos === 'left' ? 'flex-start'
                            : hf.pageNumPos === 'right' ? 'flex-end' : 'center',
                        borderTopWidth: 0.5, borderTopColor: '#ccc', paddingTop: 4,
                        alignItems: 'center',
                    }}>
                        {hf.footerText.trim() && (
                            <Text style={{ fontSize: 8, color: '#888', fontFamily: 'Helvetica', flex: 1 }}>
                                {hf.footerText}
                            </Text>
                        )}
                        {hf.showPageNum && (
                            <Text style={{ fontSize: 8, color: '#888', fontFamily: 'Helvetica' }}>
                                {hf.startFrom + (pi - 2)}
                            </Text>
                        )}
                    </View>
                )}
            </Page>
        ))}
    </Document>
);

// ─── Resize handle helpers (used by editor canvas & crop modal) ───────────────
const DIRS = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as const;
const DIR_CURSOR: Record<string, string> = {
    n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize',
    ne: 'ne-resize', nw: 'nw-resize', se: 'se-resize', sw: 'sw-resize',
};
const handlePos = (dir: string): React.CSSProperties => ({
    position: 'absolute', width: 9, height: 9,
    background: '#4f46e5', border: '1.5px solid white', borderRadius: 2,
    cursor: DIR_CURSOR[dir],
    top: dir.includes('n') ? -5 : dir.includes('s') ? 'calc(100% - 4px)' : 'calc(50% - 4px)',
    left: dir.includes('w') ? -5 : dir.includes('e') ? 'calc(100% - 4px)' : 'calc(50% - 4px)',
    zIndex: 20,
});

// ─── Shared canvas helper ─────────────────────────────────────────────────────
const solidColorImg = (color: string, w: number, h: number): string => {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = color; ctx.fillRect(0, 0, c.width, c.height);
    return c.toDataURL('image/png');
};

/** Convert an external image URL to base64 data URL (qua server proxy để bypass CORS) */
const urlToBase64 = async (url: string): Promise<string> => {
    // Nếu đã là data URL thì trả về luôn
    if (url.startsWith('data:')) return url;
    try {
        // Gọi server proxy để fetch ảnh (server không bị CORS)
        const resp = await fetch(`http://localhost:8080/proxy-image?url=${encodeURIComponent(url)}`);
        if (resp.ok) {
            const json = await resp.json();
            if (json.data_url) return json.data_url;
        }
    } catch { /* server không khả dụng, thử fallback */ }
    // Fallback: thử client-side canvas (chỉ hoạt động nếu server ảnh cho phép CORS)
    return new Promise((resolve) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const c = document.createElement('canvas');
                c.width = img.naturalWidth; c.height = img.naturalHeight;
                const ctx = c.getContext('2d')!;
                ctx.drawImage(img, 0, 0);
                resolve(c.toDataURL('image/png'));
            } catch { resolve(url); }
        };
        img.onerror = () => resolve(url);
        img.src = url;
    });
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
        allPages.push({ id: uuidv4(), bg: '', bgColor, els: [...els] });
        els = []; curY = MT; imgZ = 10; txtZ = 100;
    };
    const fit = (h: number) => { if (curY + h > MAX_Y) flushPage(); };

    const addT = (text: string, x: number, w: number, h: number, opts: Partial<EditorEl> = {}): EditorEl => {
        const el: EditorEl = {
            id: uuidv4(), type: 'text', x, y: curY, w, h, text,
            fontSize: opts.fontSize ?? Math.round(10 * scY),
            bold: opts.bold ?? false, italic: opts.italic ?? false,
            color: opts.color ?? '#1a202c', align: opts.align ?? 'left',
            fontFamily: opts.fontFamily ?? 'Inter',
            zIndex: opts.zIndex !== undefined ? opts.zIndex : nzTxt(),
            isTocEntry: opts.isTocEntry ?? false, tocLabel: opts.tocLabel,
        };
        els.push(el); curY += h; return el;
    };
    const addRect = (color: string, x: number, w: number, h: number): number => {
        const savedY = curY;
        els.push({ id: uuidv4(), type: 'image', x, y: savedY, w, h, src: solidColorImg(color, w, h), zIndex: nzImg() });
        curY += h; return savedY;
    };
    const addRectFlat = (color: string, x: number, y: number, w: number, h: number) => {
        els.push({ id: uuidv4(), type: 'image', x, y, w, h, src: solidColorImg(color, w, h), zIndex: nzImg() });
    };
    const addImg = (src: string, x: number, w: number, h: number) => {
        els.push({ id: uuidv4(), type: 'image', x, y: curY, w, h, src, zIndex: nzImg() }); curY += h;
    };
    const addTAt = (text: string, x: number, y: number, w: number, h: number, opts: Partial<EditorEl> = {}): EditorEl => {
        const el: EditorEl = {
            id: uuidv4(), type: 'text', x, y, w, h, text,
            fontSize: opts.fontSize ?? Math.round(9 * scY),
            bold: opts.bold ?? false, italic: opts.italic ?? false,
            color: opts.color ?? '#1a202c', align: opts.align ?? 'left',
            fontFamily: opts.fontFamily ?? 'Inter',
            zIndex: opts.zIndex !== undefined ? opts.zIndex : nzTxt(),
        };
        els.push(el); return el;
    };
    const addSecHeader = (title: string) => {
        const h = Math.round(20 * scY);
        addT(title, ML, CW, h, { fontSize: Math.round(13 * scY), bold: true, color: '#1a3a6b', isTocEntry: true, tocLabel: title });
        curY += Math.round(4 * scY);
        addRectFlat('#1a3a6b', ML, curY, CW, Math.round(2 * scY));
        curY += Math.round(2 * scY) + Math.round(18 * scY);
    };

    // ── COVER ─────────────────────────────────────────────────────────────────
    {
        const coverEls: EditorEl[] = [];
        let y = Math.round(CANVAS_H * 0.26);
        const addC = (el: EditorEl) => coverEls.push(el);
        // Không cần tạo ảnh nền solid color vì bgColor đã xử lý background
        // (ảnh lớn 744x1052px base64 gây lỗi render các ảnh khác trong react-pdf)
        addC({ id: uuidv4(), type: 'text', x: ML, y, w: CW, h: Math.round(16 * scY), text: 'P R O G R A M  B O O K', fontSize: Math.round(9 * scY), bold: false, italic: false, color: '#93c5fd', align: 'center', zIndex: 11 });
        y += Math.round(20 * scY);
        addC({ id: uuidv4(), type: 'image', x: Math.round((CANVAS_W - 60 * scX) / 2), y, w: Math.round(60 * scX), h: Math.round(2 * scY), src: solidColorImg('#60a5fa', Math.round(60 * scX), 2), zIndex: 12 });
        y += Math.round(22 * scY);
        const title = data.cover?.title || 'CONFERENCE PROCEEDINGS';
        const titleLines = Math.ceil(title.length / 22) + 1;
        const titleH = Math.round(titleLines * 30 * scY);
        addC({ id: uuidv4(), type: 'text', x: ML, y, w: CW, h: titleH, text: title, fontSize: Math.round(25 * scY), bold: true, italic: false, color: '#ffffff', align: 'center', zIndex: 13 });
        y += titleH + Math.round(10 * scY);
        if (data.cover?.conferenceName) {
            addC({ id: uuidv4(), type: 'text', x: ML, y, w: CW, h: Math.round(20 * scY), text: data.cover.conferenceName, fontSize: Math.round(11 * scY), bold: false, italic: false, color: '#bfdbfe', align: 'center', zIndex: 14 });
            y += Math.round(22 * scY);
        }
        const dl = [data.cover?.date, data.cover?.location].filter(Boolean).join('  ·  ');
        if (dl) {
            addC({ id: uuidv4(), type: 'text', x: ML, y, w: CW, h: Math.round(18 * scY), text: dl, fontSize: Math.round(10 * scY), bold: false, italic: false, color: '#93c5fd', align: 'center', zIndex: 15 });
            y += Math.round(44 * scY);
        }
        if (data.cover?.sponsorLogos?.length > 0) {
            addC({ id: uuidv4(), type: 'text', x: ML, y, w: CW, h: Math.round(14 * scY), text: 'S P O N S O R S  &  P A R T N E R S', fontSize: Math.round(8 * scY), bold: false, italic: false, color: '#93c5fd', align: 'center', zIndex: 16 });
            y += Math.round(18 * scY);
            let lx = ML;
            data.cover.sponsorLogos.forEach((logo: string) => {
                const lw = Math.round(80 * scX), lh = Math.round(60 * scY);
                addC({ id: uuidv4(), type: 'image', x: lx, y, w: lw, h: lh, src: logo, zIndex: 17 }); lx += lw + Math.round(16 * scX);
            });
        }
        allPages.push({ id: uuidv4(), bg: solidColorImg('#1a3a6b', THUMB_W, THUMB_H), bgColor: '#1a3a6b', els: coverEls });
    }

    // ── TOC placeholder (filled by regenerateToc) ─────────────────────────────
    allPages.push({ id: uuidv4(), bg: '', bgColor: '#ffffff', els: [] });

    // ── FOREWORD ──────────────────────────────────────────────────────────────
    addSecHeader('FOREWORD');
    const paras = (data.foreword || '').split('\n').filter((p: string) => p.trim());
    if (paras.length === 0) {
        addT('No foreword provided.', ML, CW, Math.round(18 * scY), { color: '#718096', italic: true });
    } else {
        paras.forEach((p: string) => {
            const lines = Math.ceil(p.trim().length / 85) + 1;
            const h = Math.round(lines * 16 * scY);
            fit(h + Math.round(10 * scY));
            addT(p.trim(), ML, CW, h, { color: '#2d3748' });
            curY += Math.round(10 * scY);
        });
    }
    flushPage();

    // ── ORGANIZING COMMITTEE ──────────────────────────────────────────────────
    addSecHeader('ORGANIZING COMMITTEE');
    const byRole: Record<string, any[]> = {};
    (data.committee || []).forEach((m: any) => {
        if (!byRole[m.role]) byRole[m.role] = [];
        byRole[m.role].push(m);
    });
    if (Object.keys(byRole).length === 0) {
        addT('No committee members added.', ML, CW, Math.round(18 * scY), { color: '#718096', italic: true });
    } else {
        Object.entries(byRole).forEach(([role, members]) => {
            fit(Math.round(60 * scY));
            addT(role, ML, CW, Math.round(16 * scY), { fontSize: Math.round(9 * scY), bold: true, color: '#1a3a6b' });
            curY += Math.round(4 * scY);
            (members as any[]).forEach((m: any) => {
                fit(Math.round(16 * scY));
                addT(m.name + (m.affiliation ? `, ${m.affiliation}` : ''), ML + Math.round(8 * scX), CW - Math.round(8 * scX), Math.round(16 * scY), { fontSize: Math.round(9 * scY), color: '#2d3748' });
            });
            curY += Math.round(8 * scY);
        });
    }
    flushPage();

    // ── CONFERENCE INFORMATION ────────────────────────────────────────────────
    const infoTitle = data.cover?.conferenceName ? `${data.cover.conferenceName.toUpperCase()} INFORMATION` : 'CONFERENCE INFORMATION';
    const titleFontSize = Math.max(14, Math.min(24, Math.floor(475 / (infoTitle.length * 0.6))));

    fit(Math.round(40 * scY));
    addT(infoTitle, ML, CW, Math.round(32 * scY), { fontSize: Math.round(titleFontSize * scY), bold: true, color: '#2a4365', align: 'center', isTocEntry: true, tocLabel: 'Conference Information' });
    curY += Math.round(16 * scY);

    const addInfoSection = (label: string, text?: string) => {
        if (!text?.trim()) return;
        const rH = Math.round(16 * scY);
        fit(Math.round(40 * scY));
        const bgY = curY;
        addRectFlat('#2a4365', ML, bgY, CW, rH);
        addTAt(label.toUpperCase(), ML + Math.round(4 * scX), bgY + Math.round(3 * scY), CW, rH, { fontSize: Math.round(9 * scY), bold: true, color: '#ffffff' });
        curY = bgY + rH + Math.round(4 * scY);

        const lines = Math.ceil(text.length / 90) + 1;
        const h = Math.round(lines * 16 * scY);
        fit(h); addT(text, ML, CW, h, { fontSize: Math.round(9 * scY), color: '#2d3748' });
        curY += Math.round(12 * scY);
    };

    addInfoSection('CONFERENCE VENUE', data.generalInfo?.venueDetails);
    addInfoSection('REGISTRATION DESK OPENING TIME', data.generalInfo?.registrationHours);
    addInfoSection('FUNCTION ROOMS', data.generalInfo?.roomAssignments);
    addInfoSection('REFRESHMENTS & INTERNET ACCESS', data.generalInfo?.coffeeInternetInfo);
    addInfoSection('GALA DINNER', data.generalInfo?.galaDinner);

    if (data.generalInfo?.floorPlan) {
        fit(Math.round(240 * scY));
        const layoutTitle = data.cover?.conferenceName ? `${data.cover.conferenceName.toUpperCase()} LAYOUT` : 'VENUE LAYOUT';
        const layoutFontSize = Math.max(14, Math.min(24, Math.floor(475 / (layoutTitle.length * 0.6))));

        curY += Math.round(16 * scY);
        addT(layoutTitle, ML, CW, Math.round(32 * scY), { fontSize: Math.round(layoutFontSize * scY), bold: true, color: '#2a4365', align: 'center' });
        curY += Math.round(12 * scY);
        addImg(data.generalInfo.floorPlan, ML, CW, Math.round(200 * scY));
    }
    flushPage();

    // ── PROGRAM AT A GLANCE ───────────────────────────────────────────────────
    addSecHeader('PROGRAM AT A GLANCE');
    const byDate: Record<string, any[]> = {};
    (data.summarySchedule || []).forEach((s: any) => {
        const k = s.date || 'Unscheduled'; if (!byDate[k]) byDate[k] = []; byDate[k].push(s);
    });
    if (Object.keys(byDate).length === 0) {
        addT('No schedule data loaded.', ML, CW, Math.round(18 * scY), { color: '#718096', italic: true });
    } else {
        Object.entries(byDate).forEach(([dateStr, items]) => {
            const parts = dateStr.split(' - ');
            const dayLabel = (parts[0] || '').toUpperCase();
            const dateLabel = parts.slice(1).join(' - ');

            const timeGroups: { time: string; sessions: any[] }[] = [];
            (items as any[]).forEach(s => {
                const ex = timeGroups.find(g => g.time === s.time);
                if (ex) ex.sessions.push(s); else timeGroups.push({ time: s.time || '', sessions: [s] });
            });

            // Calculate total rows: header (Day), plus session rows
            const totalRows = 1 + timeGroups.reduce((acc, g) => acc + g.sessions.length, 0);

            // Calculate required height (~22px per row, slightly more for header)
            const rowH = Math.round(22 * scY);
            const totalHs = (totalRows + 1) * rowH; // extra space buffer
            fit(totalHs);

            const cells: any[][] = [];
            // Row 0: Day Header (top outer borders, inner bottom border as separator)
            const hr: any[] = [];
            hr.push({ id: uuidv4(), text: dayLabel, align: 'left', colSpan: 1, rowSpan: 1, hidden: false, bgColor: '#2a4365', fontColor: '#ffffff', bold: true, fontSize: Math.round(12 * scY), borderBottom: true, borderRight: false, borderTop: true, borderLeft: true, fontFamily: 'Inter' });
            hr.push({ id: uuidv4(), text: dateLabel, align: 'right', colSpan: 2, rowSpan: 1, hidden: false, bgColor: '#2a4365', fontColor: '#ffffff', bold: true, fontSize: Math.round(12 * scY), borderBottom: true, borderLeft: false, borderTop: true, borderRight: true, fontFamily: 'Inter' });
            hr.push({ id: uuidv4(), text: '', align: 'right', colSpan: 1, rowSpan: 1, hidden: true }); // covered by colSpan 2
            cells.push(hr);

            // Session Rows (inner borders removed, outer borders preserved)
            timeGroups.forEach((group, gi) => {
                const sLen = group.sessions.length;
                group.sessions.forEach((s, si) => {
                    const r: any[] = [];
                    const isLastRow = (gi === timeGroups.length - 1) && (si === sLen - 1);

                    // Time cell (merged if first of group, hidden otherwise)
                    if (si === 0) {
                        r.push({ id: uuidv4(), text: group.time, align: 'left', colSpan: 1, rowSpan: sLen, hidden: false, fontColor: '#1a3a6b', bold: true, fontSize: Math.round(9 * scY), borderTop: false, borderRight: false, borderBottom: (gi === timeGroups.length - 1), borderLeft: true, fontFamily: 'Inter' });
                    } else {
                        r.push({ id: uuidv4(), text: '', align: 'left', colSpan: 1, rowSpan: 1, hidden: true });
                    }

                    // Topic
                    r.push({ id: uuidv4(), text: s.topic || '', align: 'left', colSpan: 1, rowSpan: 1, hidden: false, fontColor: '#4a5568', fontSize: Math.round(9 * scY), borderTop: false, borderRight: false, borderLeft: false, borderBottom: isLastRow, fontFamily: 'Inter' });

                    // Location
                    r.push({ id: uuidv4(), text: s.location || '', align: 'right', colSpan: 1, rowSpan: 1, hidden: false, fontColor: '#a0aec0', fontSize: Math.round(9 * scY), borderTop: false, borderLeft: false, borderRight: true, borderBottom: isLastRow, fontFamily: 'Inter' });

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
                colWidths: [CW * 0.25, CW * 0.55, CW * 0.20],
                rowHeights: rHeights,
                borderOn: true,
                borderThickness: 1,
                cellPadding: 6,
                headerHighlight: false, // We did manual headers
                headerBgColor: '#2a4365',
                borderColor: '#e2e8f0'
            };

            const tH = rHeights.reduce((s, h) => s + h, 0);
            els.push({
                id: uuidv4(),
                type: 'table',
                x: ML, y: curY, w: CW, h: tH,
                tableData: tableData as any,
                zIndex: nzTxt()
            });

            curY += tH + Math.round(18 * scY);
        });
    }
    flushPage();

    // ── KEYNOTE SPEAKERS ──────────────────────────────────────────────────────
    if (data.keynotes?.length > 0) {
        addSecHeader('KEYNOTE SPEAKERS');
        (data.keynotes as KeynoteSpeaker[]).forEach(k => {
            const photoW = Math.round(72 * scX), photoH = Math.round(72 * scY);
            const tLines = Math.ceil((k.presentationTitle || 'Untitled').length / 40) + 1;
            const tH = Math.round(tLines * 14 * scY);
            const abH = k.abstract ? Math.round((Math.ceil(k.abstract.length / 90) + 1) * 14 * scY + 28) : 0;
            const bioH = k.bio ? Math.round((Math.ceil(k.bio.length / 95) + 1) * 14 * scY + 10) : 0;
            fit(photoH + abH + bioH + Math.round(40 * scY));
            const blockY = curY;
            if (k.photo) els.push({ id: uuidv4(), type: 'image', x: ML, y: blockY, w: photoW, h: photoH, src: k.photo, zIndex: nzImg() });
            const infoX = k.photo ? ML + photoW + Math.round(12 * scX) : ML;
            const infoW = k.photo ? CW - photoW - Math.round(12 * scX) : CW;
            els.push({ id: uuidv4(), type: 'text', x: infoX, y: blockY, w: infoW, h: tH, text: k.presentationTitle || 'Untitled Keynote', fontSize: Math.round(12 * scY), bold: true, italic: false, color: '#1a3a6b', align: 'left', zIndex: nzTxt() });
            els.push({ id: uuidv4(), type: 'text', x: infoX, y: blockY + tH + 4, w: infoW, h: Math.round(18 * scY), text: k.name || '', fontSize: Math.round(10 * scY), bold: false, italic: true, color: '#4a5568', align: 'left', zIndex: nzTxt() });
            curY += Math.max(photoH, tH + 24) + Math.round(12 * scY);
            if (k.abstract) {
                addT('ABSTRACT', ML, CW, Math.round(12 * scY), { fontSize: Math.round(8 * scY), bold: true, color: '#718096' });
                curY += Math.round(4 * scY);
                addT(k.abstract, ML, CW, Math.round((Math.ceil(k.abstract.length / 90) + 1) * 14 * scY), { fontSize: Math.round(9 * scY), color: '#2d3748' });
                curY += Math.round(6 * scY);
            }
            if (k.bio) {
                addT(k.bio, ML, CW, Math.round((Math.ceil(k.bio.length / 95) + 1) * 14 * scY), { fontSize: Math.round(9 * scY), italic: true, color: '#4a5568' });
                curY += Math.round(8 * scY);
            }
            addRectFlat('#e2e8f0', ML, curY, CW, 1); curY += Math.round(24 * scY);
        });
        flushPage();
    }

    // ── DETAILED PROGRAM WITH ABSTRACTS ───────────────────────────────────────
    addSecHeader('DETAILED PROGRAM WITH ABSTRACTS');
    const schedule: any[] = data.detailedSchedule || [];
    if (schedule.length === 0) {
        addT('No accepted papers found for this conference.', ML, CW, Math.round(18 * scY), { color: '#718096', italic: true });
    } else {
        const sorted = [...schedule].sort((a, b) => {
            if (a.sessionDayOrder !== b.sessionDayOrder) return (a.sessionDayOrder || 0) - (b.sessionDayOrder || 0);
            return (a.timeSlot || '').localeCompare(b.timeSlot || '');
        });
        const days: { label: string; papers: any[] }[] = [];
        sorted.forEach(p => {
            const label = p.sessionDayLabel || 'Unscheduled';
            const ex = days.find(d => d.label === label);
            if (ex) ex.papers.push(p); else days.push({ label, papers: [p] });
        });
        days.forEach(day => {
            const dayH = Math.round(26 * scY);
            fit(dayH + Math.round(50 * scY));
            const dayBgY = addRect('#1a3a6b', ML, CW, dayH);
            addTAt(day.label, ML + Math.round(10 * scX), dayBgY + Math.round(6 * scY), CW - Math.round(20 * scX), dayH - Math.round(10 * scY), { fontSize: Math.round(11 * scY), bold: true, color: '#ffffff' });
            curY += Math.round(14 * scY);
            day.papers.forEach(p => {
                const authH = Math.round(16 * scY);
                const tLines = Math.ceil((p.paperTitle || '').length / 65) + 1;
                const tH = Math.round(Math.max(tLines * 13 * scY, 14));
                const abText = p.abstract ? 'ABSTRACT. ' + p.abstract.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim() : '';
                const abH = abText ? Math.round((Math.ceil(abText.length / 85) + 1) * 13 * scY) : 0;
                const totalH = authH + tH + abH + Math.round(34 * scY);
                fit(totalH);
                const pML = ML + Math.round(15 * scX), pCW = CW - Math.round(13 * scX);
                const timeW = p.timeSlot ? Math.round(50 * scX) : 0;
                const blockStartY = curY;
                els.push({ id: uuidv4(), type: 'image', x: ML, y: blockStartY, w: Math.round(3 * scX), h: totalH - Math.round(10 * scY), src: solidColorImg('#93c5fd', Math.round(3 * scX), totalH - Math.round(10 * scY)), zIndex: nzImg() });
                if (p.timeSlot) addTAt(p.timeSlot, pML, curY, Math.round(40 * scX), authH, { fontSize: Math.round(9 * scY), bold: true, color: '#1a3a6b' });
                addTAt(p.authors || '', pML + timeW + 8, curY, pCW - timeW - 8, authH, { fontSize: Math.round(9 * scY), italic: true, color: '#4a5568' });
                curY += authH + Math.round(3 * scY);
                addTAt(p.paperTitle || '', pML + timeW, curY, pCW - timeW, tH, { fontSize: Math.round(10 * scY), bold: true, color: '#1a202c' });
                curY += tH + Math.round(4 * scY);
                if (abText) { addTAt(abText, pML + timeW, curY, pCW - timeW, abH, { fontSize: Math.round(9 * scY), color: '#2d3748' }); curY += abH + Math.round(6 * scY); }
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
    const scX = CANVAS_W / 595, scY = CANVAS_H / 842;
    const ML = Math.round(55 * scX), MT = Math.round(50 * scY);
    const CW = CANVAS_W - ML * 2;
    const entries: { label: string; pageNum: number }[] = [];
    pages.forEach((pg, idx) => {
        if (idx <= 1) return;
        pg.els.forEach(el => { if (el.isTocEntry && el.text) entries.push({ label: el.tocLabel || el.text, pageNum: idx + 1 }); });
    });
    const tocEls: EditorEl[] = [];
    let txtZ = 100;
    const nzTxt = () => ++txtZ;

    // Extract conference name from cover page
    const confNameEl = pages[0]?.els.find(e => e.type === 'text' && e.color === '#bfdbfe');
    const confName = confNameEl?.text || 'CONFERENCE';

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
        id: uuidv4(), type: 'text',
        x: vertX, y: vertY,
        w: vertW, h: vertH,
        text: confName,
        fontSize: vertFontSize,
        bold: true, italic: false,
        color: '#3b6cb5', align: 'center',
        fontFamily: 'Inter',
        zIndex: nzTxt(),
        rotation: -90,
    });

    // Title centered
    const titleH = Math.round(32 * scY);
    tocEls.push({
        id: uuidv4(), type: 'text',
        x: ML, y: MT, w: CW, h: titleH,
        text: 'TABLE OF CONTENT',
        fontSize: Math.round(20 * scY),
        bold: true, italic: false,
        color: '#2b5797', align: 'center',
        fontFamily: 'Inter',
        zIndex: nzTxt(),
    });

    // Entries: large page number + label
    let y = MT + titleH + Math.round(30 * scY);
    const entryML = ML + Math.round(120 * scX);
    const numW = Math.round(48 * scX);
    entries.forEach(entry => {
        const rowH = Math.round(35 * scY);
        // Large page number
        tocEls.push({
            id: uuidv4(), type: 'text',
            x: entryML, y, w: numW, h: rowH,
            text: String(entry.pageNum),
            fontSize: Math.round(18 * scY),
            bold: true, italic: false,
            color: '#3b6cb5', align: 'left',
            fontFamily: 'Inter',
            zIndex: nzTxt(),
        });
        // Label
        tocEls.push({
            id: uuidv4(), type: 'text',
            x: entryML + numW + Math.round(10 * scX), y: y + Math.round(6 * scY),
            w: CW - numW - Math.round(75 * scX), h: rowH - Math.round(6 * scY),
            text: entry.label,
            fontSize: Math.round(10 * scY),
            bold: false, italic: false,
            color: '#3b6cb5', align: 'left',
            fontFamily: 'Inter',
            zIndex: nzTxt(),
        });
        y += rowH;
    });
    return pages.map((pg, idx) => idx === 1 ? { ...pg, els: tocEls } : pg);
};

// ─── Render page elements to a thumbnail JPEG ────────────────────────────────
const renderThumbnail = (page: EditorPage): Promise<string> => {
    const scale = THUMB_W / CANVAS_W;
    return new Promise(resolve => {
        const c = document.createElement('canvas');
        c.width = THUMB_W; c.height = THUMB_H;
        const ctx = c.getContext('2d')!;
        ctx.fillStyle = page.bgColor || '#ffffff';
        ctx.fillRect(0, 0, THUMB_W, THUMB_H);
        const sorted = [...page.els].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
        const drawNext = (i: number) => {
            if (i >= sorted.length) { resolve(c.toDataURL('image/jpeg', 0.82)); return; }
            const el = sorted[i];
            const x = el.x * scale, y = el.y * scale;
            const w = Math.max(1, el.w * scale), h = Math.max(1, el.h * scale);
            const hasRotation = el.rotation && el.rotation !== 0;
            if (hasRotation) {
                const cx = x + w / 2, cy = y + h / 2;
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate((el.rotation! * Math.PI) / 180);
                ctx.translate(-cx, -cy);
            }
            if (el.type === 'table' && el.tableData) {
                renderTableToCanvas(ctx, el.tableData, x, y, w, h, scale);
                if (hasRotation) ctx.restore();
                drawNext(i + 1);
            } else if (el.type === 'image' && el.src) {
                const img = new window.Image();
                img.onload = () => { ctx.drawImage(img, x, y, w, h); if (hasRotation) ctx.restore(); drawNext(i + 1); };
                img.onerror = () => { if (hasRotation) ctx.restore(); drawNext(i + 1); };
                img.src = el.src;
            } else if (el.type === 'text' && el.text) {
                ctx.fillStyle = el.color || '#1a202c';
                const fs = Math.max(1.5, (el.fontSize || 10) * scale);
                ctx.font = `${el.italic ? 'italic ' : ''}${el.bold ? 'bold ' : ''}${fs}px Helvetica, Arial, sans-serif`;
                ctx.textBaseline = 'top';
                const lineH = fs * 1.35;
                el.text.split('\n').forEach((line, li) => {
                    const ly = y + li * lineH;
                    if (ly > THUMB_H || !line.trim()) return;
                    if (el.align === 'center') { const tw = ctx.measureText(line).width; ctx.fillText(line, x + (w - tw) / 2, ly, w); }
                    else if (el.align === 'right') { const tw = ctx.measureText(line).width; ctx.fillText(line, x + w - tw, ly, w); }
                    else ctx.fillText(line, x, ly, w);
                });
                if (hasRotation) ctx.restore();
                drawNext(i + 1);
            } else { if (hasRotation) ctx.restore(); drawNext(i + 1); }
        };
        drawNext(0);
    });
};

// ─── Tab definitions ──────────────────────────────────────────────────────────
const TABS = [
    { key: 'cover', label: 'Cover', icon: ImageLucide },
    { key: 'foreword', label: 'Foreword', icon: FileText },
    { key: 'committee', label: 'Committee', icon: Users },
    { key: 'generalInfo', label: 'Venue & Info', icon: Info },
    { key: 'schedule', label: 'At a Glance', icon: CalendarDays },
    { key: 'keynotes', label: 'Keynotes', icon: Mic },
    { key: 'papers', label: 'Papers', icon: List },
    { key: 'editor', label: 'PDF Editor', icon: PenLine },
    { key: 'preview', label: 'PDF Preview', icon: Eye },
];

// ─── Main Component ───────────────────────────────────────────────────────────
const ProceedingsManagement: React.FC<ProceedingsManagementProps> = ({ userRoleId, onNavigateBack }) => {
    const [conferences, setConferences] = useState<any[]>([]);
    const [selectedConfId, setSelectedConfId] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('cover');

    // ── Autocomplete states ───────────────────────────────────────────────────
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
    const [isSearchingUsers, setIsSearchingUsers] = useState(false);
    const [activeKeynoteId, setActiveKeynoteId] = useState<string | null>(null);

    const [paperSearchQuery, setPaperSearchQuery] = useState('');
    const [paperSearchResults, setPaperSearchResults] = useState<any[]>([]);
    const [isSearchingPapers, setIsSearchingPapers] = useState(false);
    const [activePaperKeynoteId, setActivePaperKeynoteId] = useState<string | null>(null);

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
        setHistory(prev => [JSON.parse(JSON.stringify(edPages)), ...prev].slice(0, 20)); // Lưu tối đa 20 bước
    };

    // Hàm để cuộn đến trang cụ thể khi click thumbnail
    const jumpToPage = (idx: number) => {
        setSelPage(idx);
        const el = document.getElementById(`editor-page-${idx}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    const [selElId, setSelElId] = useState<string | null>(null);
    const [editingTxtId, setEditingTxtId] = useState<string | null>(null);
    const [hf, setHF] = useState<HFConfig>({
        headerText: '', footerText: '', showPageNum: true, pageNumPos: 'right', startFrom: 1,
    });
    const [showHFPanel, setShowHFPanel] = useState(false);
    const [showPagesSidebar, setShowPagesSidebar] = useState(true);
    const [cropState, setCropState] = useState<{
        elId: string; src: string; natW: number; natH: number;
        cx: number; cy: number; cw: number; ch: number;
    } | null>(null);
    const [abstractModal, setAbstractModal] = useState<{ title: string; authors: string; abstract: string } | null>(null);
    const [showInsertTable, setShowInsertTable] = useState(false);
    const [tableSelectedCells, setTableSelectedCells] = useState<CellCoord[]>([]);
    const [dragFromIdx, setDragFromIdx] = useState<number | null>(null);
    const [debouncedEdPages, setDebouncedEdPages] = useState<EditorPage[]>([]);
    const dragRef = useRef<{
        type: 'move' | 'resize'; elId: string; dir: string;
        sx: number; sy: number; orig: EditorEl;
    } | null>(null);
    const cropDragRef = useRef<{
        active: boolean; mode: string; sx: number; sy: number;
        origCx: number; origCy: number; origCw: number; origCh: number;
    }>({ active: false, mode: '', sx: 0, sy: 0, origCx: 0, origCy: 0, origCw: 0, origCh: 0 });

    const [procData, setProcData] = useState({
        cover: {
            title: '',
            conferenceName: '',
            date: '',
            location: '',
            sponsorLogos: [] as string[],
        },
        foreword: '',
        committee: [] as any[],
        generalInfo: {
            venueDetails: '',
            registrationHours: '',
            roomAssignments: '',
            coffeeInternetInfo: '',
            galaDinner: '',
            floorPlan: '',
        },
        summarySchedule: [] as any[],
        keynotes: [] as KeynoteSpeaker[],
        detailedSchedule: [] as any[],
    });

    useEffect(() => {
        supabase
            .from('conferences')
            .select('*')
            .order('start_date', { ascending: false })
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
                        const index = parseInt(entry.target.getAttribute('data-page-index') || '0');
                        setSelPage(index); // Cập nhật sidebar khi cuộn
                    }
                });
            },
            { threshold: 0.5, root: scrollAreaRef.current } // Kích hoạt khi thấy 50% trang
        );

        const pageElements = document.querySelectorAll('.editor-page-container');
        pageElements.forEach((el) => observer.observe(el));

        return () => observer.disconnect();
    }, [edReady, edPages.length]);

    const loadFullConferenceData = async (confId: number) => {
        setLoading(true);
        setError(null);
        try {
            const conf = conferences.find(c => c.conf_id === confId);

            const [{ data: config }, { data: papers }, { data: sessions }, { data: sessionPapers }] = await Promise.all([
                supabase.from('proceedings_configs').select('*').eq('conf_id', confId).maybeSingle(),
                supabase.from('papers')
                    .select('*, author:users!primary_author_id(full_name, organization)')
                    .eq('submitted_conf', confId)
                    .eq('status', 'ACCEPTED'),
                supabase.from('sessions')
                    .select('*, chair:users!chair_person_id(full_name, organization)')
                    .eq('conf_id', confId)
                    .order('start_time', { ascending: true }),
                supabase.from('session_papers')
                    .select('session_id, paper_id, start_time, end_time')
            ]);
            const confStart = new Date(conf.start_date);

            // Filter session_papers to only those belonging to this conference's sessions
            const confSessionIds = new Set((sessions || []).map(s => s.session_id));
            const confSessionPapers = (sessionPapers || []).filter(sp => confSessionIds.has(sp.session_id));

            const { data: reviewers } = await supabase
                .from('reviewer_assignments')
                .select('paper_id, reviewer:users!reviewer_id(full_name, organization)')
                .in('paper_id', papers?.map(p => p.paper_id) || []);

            // Build committee from chairs + reviewers
            const getObj = (o: any) => Array.isArray(o) ? o[0] : o;
            const chairSet = new Map<string, any>();
            sessions?.forEach(s => {
                const c = getObj(s.chair);
                if (c?.full_name && !chairSet.has(c.full_name))
                    chairSet.set(c.full_name, { id: uuidv4(), name: c.full_name, role: 'Session Chair', affiliation: c.organization || '' });
            });
            const reviewerSet = new Map<string, any>();
            reviewers?.forEach(r => {
                const rv = getObj(r.reviewer);
                if (rv?.full_name && !reviewerSet.has(rv.full_name))
                    reviewerSet.set(rv.full_name, { id: uuidv4(), name: rv.full_name, role: 'Program Committee', affiliation: rv.organization || '' });
            });

            // Restore keynotes from config if saved
            let savedKeynotes: KeynoteSpeaker[] = [];
            try { savedKeynotes = JSON.parse(config?.keynotes_json || '[]'); } catch { /* ignore */ }

            setProcData({
                cover: {
                    title: config?.proceedings_title || `PROCEEDINGS OF ${conf.conf_name.toUpperCase()}`,
                    conferenceName: conf.conf_name,
                    date: `${new Date(conf.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} – ${new Date(conf.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`,
                    location: conf.location,
                    sponsorLogos: [], // Sẽ được convert từ URL sang base64 bên dưới
                },
                foreword: config?.foreword || '',
                summarySchedule: (sessions || []).map(s => {
                    // Tính toán Day 1, Day 2... dựa trên start_date của conference 
                    const currentSlot = new Date(s.start_time);
                    const dayDiff = Math.floor((currentSlot.getTime() - confStart.getTime()) / (1000 * 3600 * 24)) + 1;
                    return {
                        id: uuidv4(),
                        date: `Day ${dayDiff} - ${currentSlot.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}`,
                        time: `${currentSlot.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${new Date(s.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                        location: s.room_location,
                        topic: s.session_name,
                    };
                }),
                committee: [...chairSet.values(), ...reviewerSet.values()],
                generalInfo: {
                    venueDetails: config?.venue_details || conf.location,
                    registrationHours: config?.registration_hours || '',
                    roomAssignments: config?.room_assignments || '',
                    coffeeInternetInfo: config?.coffee_internet || '',
                    galaDinner: config?.gala_info || '',
                    floorPlan: '',
                },
                keynotes: savedKeynotes,
                detailedSchedule: (papers || []).map(p => {
                    const a = getObj(p.author);
                    const sp = confSessionPapers.find(item => item.paper_id === p.paper_id);

                    // Time-only string (HH:MM) to show next to title
                    const timeStr = sp?.start_time
                        ? new Date(sp.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
                        : '';

                    // Day label for grouping, e.g. "DAY 1 - FRIDAY, 12 DECEMBER 2025"
                    let sessionDayLabel = '';
                    let sessionDayOrder = 0;
                    if (sp?.start_time) {
                        const spDate = new Date(sp.start_time);
                        const dayDiff = Math.floor((spDate.getTime() - confStart.getTime()) / (1000 * 3600 * 24)) + 1;
                        const dayName = spDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
                        sessionDayLabel = `DAY ${dayDiff} - ${dayName}`;
                        sessionDayOrder = spDate.getTime();
                    }

                    return {
                        id: uuidv4(),
                        paperTitle: p.title,
                        authors: a?.full_name || '',
                        abstract: p.abstract || '',
                        timeSlot: timeStr,
                        sessionDayLabel,
                        sessionDayOrder,
                        paper_id: p.paper_id,
                    };
                }),
            });

            if (new Date(conf.end_date) > new Date()) {
                setError(`Note: Conference is still ongoing (ends ${new Date(conf.end_date).toLocaleDateString()}). You may finalize proceedings after it concludes.`);
            }

            // Convert sponsor logo URLs thành base64 (tránh lỗi CORS trong react-pdf)
            const bannerUrls: string[] = Array.isArray(conf.banner_urls) ? conf.banner_urls : [];
            if (bannerUrls.length > 0) {
                const base64Logos = await Promise.all(bannerUrls.map(url => urlToBase64(url)));
                setProcData(d => ({ ...d, cover: { ...d.cover, sponsorLogos: base64Logos } }));
            }
        } catch (err) {
            console.error(err);
            setError('Failed to load conference data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveConfig = async () => {
        if (!selectedConfId) return;
        setSaving(true);
        const { error } = await supabase.from('proceedings_configs').upsert({
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
            setError('Save failed: ' + error.message);
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
                pages.map(async pg => ({ ...pg, bg: pg.bg || await renderThumbnail(pg) }))
            );
            setEdPages(pagesWithThumbs); setSelPage(0); setEdReady(true);
        } catch (e) { console.error('Editor init failed', e); }
        finally { setEdLoading(false); }
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
        setEdPages(synced.map((pg, i) => i === 1 ? { ...pg, bg: tocThumb } : pg));
    };

    /** Patch the currently selected page */
    const patchPage = (fn: (p: EditorPage) => EditorPage) =>
        setEdPages(ps => ps.map((p, i) => i === selPage ? fn(p) : p));

    /** Patch a specific element on the current page */
    const patchEl = (id: string, fn: (e: EditorEl) => EditorEl) =>
        patchPage(p => ({ ...p, els: p.els.map(e => e.id === id ? fn(e) : e) }));

    const curPg = edPages[selPage];
    const selEl = curPg?.els.find(e => e.id === selElId) ?? null;

    // Logic Ctrl C + Ctrl V
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Phớt lờ nếu đang gõ trong textarea
            if (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT') return;

            // Ctrl + C (Copy)
            if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selEl) {
                e.preventDefault();
                setClipboard({ ...selEl });
            }

            // Ctrl + V (Paste)
            if ((e.ctrlKey || e.metaKey) && e.key === 'v' && clipboard) {
                e.preventDefault();
                const newId = uuidv4();
                const pastedEl = {
                    ...clipboard,
                    id: newId,
                    x: clipboard.x + 20, // Lệch một chút để thấy
                    y: clipboard.y + 20,
                    zIndex: clipboard.type === 'image' ? 90 : 190 // Lên trên cùng theo loại
                };
                patchPage(p => ({ ...p, els: [...p.els, pastedEl] }));
                setSelElId(newId);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selEl, clipboard, selPage]);

    // Debounce edPages for PDF Export to prevent lag during rapid updates
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedEdPages(edPages);
        }, 1500); // 1.5s delay after user stops typing/dragging
        return () => clearTimeout(timer);
    }, [edPages]);

    const editorPdfDoc = useMemo(() => {
        const pagesToRender = debouncedEdPages.length > 0 ? debouncedEdPages : edPages;
        // Avoid crashing if no pages exist yet
        if (pagesToRender.length === 0) {
            return (
                <Document>
                    <Page size="A4"><View style={{ padding: 40 }}><Text>No pages generated yet.</Text></View></Page>
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
            if (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT') return;

            // 1. Phím Delete để xóa element
            if (e.key === 'Delete' && selElId) {
                e.preventDefault();
                saveHistory();
                deleteEl(selElId);
            }

            // 2. Ctrl + Z để Undo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                if (history.length > 0) {
                    const prev = history[0];
                    setEdPages(prev);
                    setHistory(history.slice(1));
                    setSelElId(null);
                }
            }

            // Ctrl + C / Ctrl + V giữ nguyên nhưng thêm saveHistory() vào trước khi Paste
            if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selEl) {
                e.preventDefault();
                setClipboard({ ...selEl });
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'v' && clipboard) {
                e.preventDefault();
                saveHistory(); // Lưu lịch sử trước khi dán
                const newId = uuidv4();
                const pastedEl = { ...clipboard, id: newId, x: clipboard.x + 20, y: clipboard.y + 20, zIndex: clipboard.type === 'image' ? 90 : 190 };
                patchPage(p => ({ ...p, els: [...p.els, pastedEl] }));
                setSelElId(newId);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selEl, clipboard, edPages, history, selPage, selElId]);

    const addText = () => {
        const id = uuidv4();
        const maxTxtZ = curPg.els.filter(e => e.type === 'text').reduce((m, e) => Math.max(m, e.zIndex ?? 100), 100);
        patchPage(p => ({
            ...p, els: [...p.els, {
                id, type: 'text', x: 60, y: 80, w: 320, h: 44,
                text: 'New Text', fontSize: 14, bold: false, italic: false,
                color: '#000000', align: 'left', zIndex: maxTxtZ + 1,
            }],
        }));
        setSelElId(id); setEditingTxtId(id);
    };

    const addImage = (src: string) => {
        const img = new window.Image();
        img.onload = () => {
            const id = uuidv4();
            const aspect = img.naturalHeight / img.naturalWidth;
            const w = 200;
            const maxImgZ = curPg.els.filter(e => e.type === 'image').reduce((m, e) => Math.max(m, e.zIndex ?? 10), 10);
            patchPage(p => ({
                ...p, els: [...p.els, {
                    id, type: 'image', x: 60, y: 80, w, h: Math.round(w * aspect), src, zIndex: maxImgZ + 1,
                }],
            }));
            setSelElId(id);
        };
        img.src = src;
    };

    const addTable = (rows: number, cols: number) => {
        const id = uuidv4();
        const tW = 500, tH = rows * 32 + 10;
        const tblData = createEmptyTable(rows, cols, tW, tH);
        const maxZ = curPg.els.reduce((m, e) => Math.max(m, e.zIndex ?? 10), 10);
        patchPage(p => ({
            ...p, els: [...p.els, {
                id, type: 'table' as const, x: 60, y: 80, w: tW, h: tH,
                zIndex: maxZ + 1, tableData: tblData,
            }],
        }));
        setSelElId(id);
    };

    const deleteEl = (id: string) => {
        patchPage(p => ({ ...p, els: p.els.filter(e => e.id !== id) }));
        if (selElId === id) { setSelElId(null); setTableSelectedCells([]); }
    };

    /** Pointer move/resize on canvas */
    const onCanvasPointerMove = (e: React.PointerEvent) => {
        const d = dragRef.current; if (!d) return;
        const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
        patchEl(d.elId, el => {
            if (d.type === 'move')
                return { ...el, x: d.orig.x + dx, y: d.orig.y + dy };
            let { x, y, w, h } = d.orig;
            if (d.dir.includes('e')) w = Math.max(30, d.orig.w + dx);
            if (d.dir.includes('s')) h = Math.max(20, d.orig.h + dy);
            if (d.dir.includes('w')) { x = d.orig.x + dx; w = Math.max(30, d.orig.w - dx); }
            if (d.dir.includes('n')) { y = d.orig.y + dy; h = Math.max(20, d.orig.h - dy); }
            return { ...el, x, y, w, h };
        });
    };

    const onElPointerDown = (
        e: React.PointerEvent, el: EditorEl, type: 'move' | 'resize', dir = '',
    ) => {
        e.stopPropagation();
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
        dragRef.current = { type, elId: el.id, dir, sx: e.clientX, sy: e.clientY, orig: { ...el } };
        setSelElId(el.id); setEditingTxtId(null);
    };

    /** Page reorder by drag */
    const reorderPage = (from: number, to: number) => {
        if (from === to) return;
        setEdPages(ps => {
            const a = [...ps]; const [item] = a.splice(from, 1); a.splice(to, 0, item);
            return regenerateToc(a);
        });
        setSelPage(to);
    };

    /** Insert a blank page after afterIdx */
    const insertPage = (afterIdx: number) => {
        const blank: EditorPage = { id: uuidv4(), bg: '', bgColor: '#ffffff', els: [] };
        setEdPages(ps => {
            const a = [...ps]; a.splice(afterIdx + 1, 0, blank); return regenerateToc(a);
        });
        setSelPage(afterIdx + 1);
    };

    /** Open crop modal for an image element */
    const openCrop = (el: EditorEl) => {
        if (!el.src) return;
        const img = new window.Image();
        img.onload = () => setCropState({
            elId: el.id, src: el.src!,
            natW: img.naturalWidth, natH: img.naturalHeight,
            cx: 0, cy: 0, cw: img.naturalWidth, ch: img.naturalHeight,
        });
        img.src = el.src;
    };

    /** Apply crop: draw sub-rect onto canvas then swap src */
    const applyCrop = () => {
        if (!cropState) return;
        const { elId, src, cx, cy, cw, ch } = cropState;
        const cnv = document.createElement('canvas');
        cnv.width = cw; cnv.height = ch;
        const ctx = cnv.getContext('2d')!;
        const img = new window.Image();
        img.onload = () => {
            ctx.drawImage(img, cx, cy, cw, ch, 0, 0, cw, ch);
            const cropped = cnv.toDataURL('image/png');
            patchEl(elId, el => ({
                ...el, src: cropped,
                h: Math.round(el.h * (ch / (cropState.natH || 1))),
                w: Math.round(el.w * (cw / (cropState.natW || 1))),
            }));
            setCropState(null);
        };
        img.src = src;
    };

    if (userRoleId !== 1 && userRoleId !== 2)
        return <div className="p-20 text-center font-bold text-slate-500">Access Denied. Chairs only.</div>;

    // ── helpers ──
    const updateCover = (patch: any) => setProcData(d => ({ ...d, cover: { ...d.cover, ...patch } }));
    const updateGeneralInfo = (patch: any) => setProcData(d => ({ ...d, generalInfo: { ...d.generalInfo, ...patch } }));
    const updateCommittee = (list: any[]) => setProcData(d => ({ ...d, committee: list }));
    const updateKeynotes = (list: KeynoteSpeaker[]) => setProcData(d => ({ ...d, keynotes: list }));

    const addKeynote = () => updateKeynotes([
        ...procData.keynotes,
        { id: uuidv4(), name: '', photo: '', presentationTitle: '', abstract: '', bio: '' }
    ]);
    const removeKeynote = (id: string) => updateKeynotes(procData.keynotes.filter(k => k.id !== id));
    const patchKeynote = (id: string, patch: Partial<KeynoteSpeaker>) =>
        updateKeynotes(procData.keynotes.map(k => k.id === id ? { ...k, ...patch } : k));

    const handleUserSearch = async (query: string) => {
        setUserSearchQuery(query);
        if (!query.trim()) {
            setUserSearchResults([]);
            return;
        }
        setIsSearchingUsers(true);
        try {
            const { data } = await supabase
                .from('users')
                .select('user_id, full_name, email, avatar_url, description')
                .ilike('full_name', `%${query}%`)
                .limit(10);
            setUserSearchResults(data || []);
        } catch (err) {
            console.error('Failed to search users:', err);
        } finally {
            setIsSearchingUsers(false);
        }
    };

    const handleUserSelect = async (kId: string, user: any) => {
        let photoDataUrl = '';
        if (user.avatar_url) {
            try {
                // Sử dụng hàm proxy có sẵn của tác giả để vượt qua CORS
                photoDataUrl = await urlToBase64(user.avatar_url);
            } catch (err) {
                console.warn('Failed to fetch avatar for PDF. Clearing photo to prevent crash.', err);
                photoDataUrl = '';
            }
        }

        patchKeynote(kId, {
            name: user.full_name || '',
            photo: photoDataUrl,
            bio: user.description || ''
        });
        setUserSearchQuery('');
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

        const results = procData.detailedSchedule.filter(p =>
            (p.paperTitle || '').toLowerCase().includes(query.toLowerCase())
        ).slice(0, 10);

        setPaperSearchResults(results);
        setIsSearchingPapers(false);
    };

    const handlePaperSelect = (kId: string, paper: any) => {
        patchKeynote(kId, {
            presentationTitle: paper.paperTitle || '',
            abstract: paper.abstract || ''
        });
        setPaperSearchQuery('');
        setPaperSearchResults([]);
        setActivePaperKeynoteId(null);
    };

    // Committee helpers
    const addCommitteeMember = () => updateCommittee([
        ...procData.committee,
        { id: uuidv4(), role: 'Program Committee', name: '', affiliation: '' }
    ]);
    const removeCommitteeMember = (id: string) => updateCommittee(procData.committee.filter(m => m.id !== id));
    const patchCommitteeMember = (id: string, patch: any) =>
        updateCommittee(procData.committee.map(m => m.id === id ? { ...m, ...patch } : m));

    // Committee role groups for display
    const committeeByRole: Record<string, any[]> = {};
    procData.committee.forEach(m => {
        if (!committeeByRole[m.role]) committeeByRole[m.role] = [];
        committeeByRole[m.role].push(m);
    });

    const fieldCls = "w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 transition-all";
    const labelCls = "block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5";

    return (
        <div className="min-h-screen bg-slate-50">
            {/* ── Top bar ── */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="max-w-screen-xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button onClick={onNavigateBack} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors">
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <div className="w-px h-5 bg-slate-200" />
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                                <Book className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <h1 className="text-base font-semibold text-slate-900 leading-none">Proceedings Publisher</h1>
                                <p className="text-xs text-slate-400 mt-0.5">Build your conference program book</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <select
                            className="text-sm bg-slate-50 border border-slate-200 text-slate-700 px-3 py-2 rounded-lg outline-none cursor-pointer focus:ring-2 focus:ring-indigo-500"
                            onChange={e => setSelectedConfId(Number(e.target.value))}
                            value={selectedConfId || ''}
                        >
                            <option value="">— Select Conference —</option>
                            {conferences.map(c => <option key={c.conf_id} value={c.conf_id}>{c.conf_name}</option>)}
                        </select>
                        <Button variant="outline" onClick={handleSaveConfig} icon={Save} disabled={!selectedConfId || saving} className="rounded-lg text-sm">
                            {saving ? 'Saving…' : 'Save'}
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
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Sections</p>
                        </div>
                        <nav className="p-2 space-y-0.5">
                            {TABS.map(tab => {
                                const Icon = tab.icon;
                                const active = activeTab === tab.key;
                                return (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveTab(tab.key)}
                                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active
                                            ? 'bg-indigo-50 text-indigo-700'
                                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                            }`}
                                    >
                                        <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Stats card */}
                    {selectedConfId && (
                        <div className="mt-3 bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Summary</p>
                            {[
                                { label: 'Papers', count: procData.detailedSchedule.length },
                                { label: 'Sessions', count: procData.summarySchedule.length },
                                { label: 'Committee', count: procData.committee.length },
                                { label: 'Keynotes', count: procData.keynotes.length },
                            ].map(({ label, count }) => (
                                <div key={label} className="flex justify-between items-center">
                                    <span className="text-xs text-slate-500">{label}</span>
                                    <span className="text-sm font-semibold text-slate-800">{count}</span>
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
                            <p className="text-sm font-medium">Select a conference to begin</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-slate-200">
                            <div className="px-7 py-5 border-b border-slate-100">
                                <h2 className="text-base font-semibold text-slate-900">
                                    {TABS.find(t => t.key === activeTab)?.label}
                                </h2>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {activeTab === 'cover' && 'Title, date, location and sponsor logos for the cover page.'}
                                    {activeTab === 'foreword' && 'Welcome message from the program chairs.'}
                                    {activeTab === 'committee' && 'Organizing and program committee members. Grouped by role in the PDF.'}
                                    {activeTab === 'generalInfo' && 'Venue address, registration hours, room assignments, Wi-Fi and gala dinner details.'}
                                    {activeTab === 'schedule' && 'High-level session schedule shown in "Program at a Glance" table.'}
                                    {activeTab === 'keynotes' && 'Invited keynote speakers with abstract and biography.'}
                                    {activeTab === 'papers' && 'Accepted papers auto-loaded from the database. Click the abstract icon to read.'}
                                    {activeTab === 'preview' && 'Live PDF preview. Use "Export PDF" button to download.'}
                                    {activeTab === 'editor' && 'Visual editor: add text & images, move/resize/crop, reorder pages, set header & footer, then export.'}
                                </p>
                            </div>

                            <div className="p-7">

                                {/* ─── COVER ─── */}
                                {activeTab === 'cover' && (
                                    <div className="space-y-5 max-w-2xl">
                                        <div>
                                            <label className={labelCls}>Publication Title</label>
                                            <input className={fieldCls} value={procData.cover.title}
                                                onChange={e => updateCover({ title: e.target.value })}
                                                placeholder="e.g. Proceedings of the 14th International Symposium…" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-5">
                                            <div>
                                                <label className={labelCls}>Event Dates</label>
                                                <input className={fieldCls} value={procData.cover.date}
                                                    onChange={e => updateCover({ date: e.target.value })} />
                                            </div>
                                            <div>
                                                <label className={labelCls}>Location</label>
                                                <input className={fieldCls} value={procData.cover.location}
                                                    onChange={e => updateCover({ location: e.target.value })} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className={labelCls}>Sponsor / Partner Logos</label>
                                            <input type="file" multiple accept="image/*"
                                                onChange={e => {
                                                    if (e.target.files) {
                                                        const files = Array.from(e.target.files as FileList);
                                                        // Sử dụng mảng tạm để thu thập toàn bộ Base64 trước khi cập nhật State 1 lần duy nhất
                                                        const loadedBase64: string[] = [];
                                                        let count = 0;

                                                        files.forEach(file => {
                                                            const reader = new FileReader();
                                                            reader.onload = (ev) => {
                                                                loadedBase64.push(ev.target?.result as string);
                                                                count++;
                                                                // Khi đã đọc xong tất cả các file
                                                                if (count === files.length) {
                                                                    setProcData(d => ({
                                                                        ...d,
                                                                        cover: {
                                                                            ...d.cover,
                                                                            sponsorLogos: [...d.cover.sponsorLogos, ...loadedBase64]
                                                                        }
                                                                    }));
                                                                }
                                                            };
                                                            reader.readAsDataURL(file);
                                                        });
                                                    }
                                                }}
                                                className="block w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                                            {procData.cover.sponsorLogos.length > 0 && (
                                                <div className="mt-4 flex flex-wrap gap-3">
                                                    {procData.cover.sponsorLogos.map((logo, idx) => (
                                                        <div key={idx} className="relative w-20 h-16 border border-slate-200 rounded-lg bg-slate-50 flex items-center justify-center">
                                                            <img src={logo} alt="" className="max-w-full max-h-full object-contain p-1" />
                                                            <button onClick={() => updateCover({ sponsorLogos: procData.cover.sponsorLogos.filter((_, i) => i !== idx) })}
                                                                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs flex items-center justify-center">×</button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* ─── FOREWORD ─── */}
                                {activeTab === 'foreword' && (
                                    <div className="max-w-2xl">
                                        <textarea rows={18} className={`${fieldCls} resize-none font-serif leading-relaxed`}
                                            value={procData.foreword}
                                            onChange={e => setProcData(d => ({ ...d, foreword: e.target.value }))}
                                            placeholder="Write the foreword here. Each paragraph separated by a blank line will be rendered as a separate paragraph in the PDF." />
                                        <p className="text-xs text-slate-400 mt-2">{procData.foreword.split('\n').filter(l => l.trim()).length} paragraph(s)</p>
                                    </div>
                                )}

                                {/* ─── COMMITTEE ─── */}
                                {activeTab === 'committee' && (
                                    <div className="space-y-6">
                                        {/* Role-grouped preview */}
                                        {Object.keys(committeeByRole).length > 0 && (
                                            <div className="grid grid-cols-2 gap-3">
                                                {Object.entries(committeeByRole).map(([role, members]) => (
                                                    <div key={role} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                                        <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">{role}</span>
                                                        <p className="text-xs text-slate-500 mt-1">{members.length} member{members.length !== 1 ? 's' : ''}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Editable list */}
                                        <div className="space-y-2.5">
                                            {procData.committee.map(m => (
                                                <div key={m.id} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                                                    <select value={m.role} onChange={e => patchCommitteeMember(m.id, { role: e.target.value })}
                                                        className="text-xs border border-slate-200 rounded-md px-2 py-1.5 bg-white outline-none focus:ring-2 focus:ring-indigo-400 w-44 shrink-0">
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
                                                    <input className="flex-1 min-w-0 text-sm border border-slate-200 rounded-md px-2.5 py-1.5 bg-white outline-none focus:ring-2 focus:ring-indigo-400"
                                                        placeholder="Full name" value={m.name} onChange={e => patchCommitteeMember(m.id, { name: e.target.value })} />
                                                    <input className="flex-1 min-w-0 text-sm border border-slate-200 rounded-md px-2.5 py-1.5 bg-white outline-none focus:ring-2 focus:ring-indigo-400"
                                                        placeholder="Affiliation / Institution" value={m.affiliation} onChange={e => patchCommitteeMember(m.id, { affiliation: e.target.value })} />
                                                    <button onClick={() => removeCommitteeMember(m.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <button onClick={addCommitteeMember}
                                            className="w-full py-3 border-2 border-dashed border-slate-200 rounded-lg text-sm text-slate-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all flex items-center justify-center gap-2">
                                            <Plus className="w-4 h-4" /> Add Member
                                        </button>
                                    </div>
                                )}

                                {/* ─── GENERAL INFO ─── */}
                                {activeTab === 'generalInfo' && (
                                    <div className="space-y-5 max-w-2xl">
                                        {[
                                            { key: 'venueDetails', label: 'Conference Venue', rows: 3, placeholder: 'Hotel name, address, city, country…' },
                                            { key: 'registrationHours', label: 'Registration Desk Hours', rows: 2, placeholder: 'e.g. Friday 12 Dec 2025 | 07:30 – 18:00' },
                                            { key: 'roomAssignments', label: 'Function Rooms / Layout', rows: 2, placeholder: 'e.g. Level 2: Grand Ballroom A, B – Yersin Ballroom A, B' },
                                            { key: 'coffeeInternetInfo', label: 'Refreshments & Internet', rows: 2, placeholder: 'Tea break location, Wi-Fi network name and password…' },
                                            { key: 'galaDinner', label: 'Gala Dinner', rows: 2, placeholder: 'Venue name, address, date, time, bus pickup…' },
                                        ].map(({ key, label, rows, placeholder }) => (
                                            <div key={key}>
                                                <label className={labelCls}>{label}</label>
                                                <textarea rows={rows} className={`${fieldCls} resize-none`}
                                                    placeholder={placeholder}
                                                    value={(procData.generalInfo as any)[key]}
                                                    onChange={e => updateGeneralInfo({ [key]: e.target.value })} />
                                            </div>
                                        ))}
                                        <div>
                                            <label className={labelCls}>Venue Floor Plan (image)</label>
                                            <input type="file" accept="image/*"
                                                onChange={e => {
                                                    if (e.target.files?.[0]) updateGeneralInfo({ floorPlan: URL.createObjectURL(e.target.files[0]) });
                                                }}
                                                className="block w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                                            {procData.generalInfo.floorPlan && (
                                                <div className="mt-3 relative inline-block">
                                                    <img src={procData.generalInfo.floorPlan} alt="Floor plan" className="max-h-48 rounded-lg border border-slate-200" />
                                                    <button onClick={() => updateGeneralInfo({ floorPlan: '' })}
                                                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600">×</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* ─── SCHEDULE AT A GLANCE ─── */}
                                {activeTab === 'schedule' && (
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
                                                    {procData.summarySchedule.length === 0
                                                        ? <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400 italic text-sm">No sessions found for this conference.</td></tr>
                                                        : procData.summarySchedule.map((s, i) => (
                                                            <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                                                                <td className="px-4 py-3 text-slate-600 text-xs">{s.date}</td>
                                                                <td className="px-4 py-3 font-semibold text-slate-800 text-xs">{s.time}</td>
                                                                <td className="px-4 py-3 text-slate-700">{s.topic}</td>
                                                                <td className="px-4 py-3 text-slate-500 text-xs">{s.location}</td>
                                                            </tr>
                                                        ))
                                                    }
                                                </tbody>
                                            </table>
                                        </div>
                                        <p className="text-xs text-slate-400">Session schedule is auto-loaded from the database. Edit sessions via the Sessions management screen.</p>
                                    </div>
                                )}

                                {/* ─── KEYNOTES ─── */}
                                {activeTab === 'keynotes' && (
                                    <div className="space-y-5">
                                        {procData.keynotes.length === 0 && (
                                            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-8 text-center">
                                                <Mic className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                                                <p className="text-sm text-slate-500">No keynote speakers added yet.</p>
                                                <p className="text-xs text-slate-400 mt-1">Keynote speakers will appear in the PDF after the schedule section.</p>
                                            </div>
                                        )}
                                        {procData.keynotes.map((k, idx) => (
                                            <div key={k.id} className="border border-slate-200 rounded-xl overflow-hidden">
                                                <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b border-slate-200">
                                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Keynote {idx + 1}</span>
                                                    <button onClick={() => removeKeynote(k.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="p-5 grid grid-cols-3 gap-5">
                                                    {/* Photo */}
                                                    <div className="col-span-1 flex flex-col items-center gap-3">
                                                        <div className="w-28 h-28 rounded-full border-2 border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center">
                                                            {k.photo
                                                                ? <img src={k.photo} alt={k.name} className="w-full h-full object-cover" />
                                                                : <Users className="w-10 h-10 text-slate-300" />}
                                                        </div>
                                                        <input type="file" accept="image/*"
                                                            onChange={e => { if (e.target.files?.[0]) patchKeynote(k.id, { photo: URL.createObjectURL(e.target.files[0]) }); }}
                                                            className="block w-full text-[11px] text-slate-500 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:font-medium file:bg-indigo-50 file:text-indigo-600" />
                                                    </div>
                                                    <div className="col-span-2 space-y-3">
                                                        <div className="relative">
                                                            <label className={labelCls}>Speaker Name</label>
                                                            <input
                                                                className={fieldCls}
                                                                value={activeKeynoteId === k.id ? userSearchQuery : k.name}
                                                                placeholder="e.g. Prof. Vincent Wong"
                                                                onChange={e => {
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
                                                            {activeKeynoteId === k.id && (userSearchResults.length > 0 || isSearchingUsers) && (
                                                                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                                                                    {isSearchingUsers ? (
                                                                        <div className="px-4 py-3 text-xs text-slate-500 flex items-center gap-2">
                                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching users...
                                                                        </div>
                                                                    ) : (
                                                                        <ul className="py-1">
                                                                            {userSearchResults.map(user => (
                                                                                <li
                                                                                    key={user.user_id}
                                                                                    className="px-4 py-2 hover:bg-indigo-50 cursor-pointer transition-colors"
                                                                                    onClick={() => handleUserSelect(k.id, user)}
                                                                                >
                                                                                    <div className="flex items-center gap-2.5">
                                                                                        <div className="w-6 h-6 rounded-full bg-slate-100 overflow-hidden shrink-0">
                                                                                            {user.avatar_url ? (
                                                                                                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                                                                                            ) : (
                                                                                                <Users className="w-3 h-3 m-auto text-slate-400 mt-1.5" />
                                                                                            )}
                                                                                        </div>
                                                                                        <div className="min-w-0">
                                                                                            <p className="text-sm font-medium text-slate-900 truncate">{user.full_name}</p>
                                                                                            <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
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
                                                            <label className={labelCls}>Presentation Title</label>
                                                            <input
                                                                className={fieldCls}
                                                                value={activePaperKeynoteId === k.id ? paperSearchQuery : k.presentationTitle}
                                                                placeholder="e.g. Machine Learning for Integrated Sensing and Communication"
                                                                onChange={e => {
                                                                    if (activePaperKeynoteId !== k.id) {
                                                                        setActivePaperKeynoteId(k.id);
                                                                    }
                                                                    handlePaperSearch(e.target.value);
                                                                    patchKeynote(k.id, { presentationTitle: e.target.value });
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
                                                            {activePaperKeynoteId === k.id && paperSearchResults.length > 0 && (
                                                                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                                                                    <ul className="py-1">
                                                                        {paperSearchResults.map(paper => (
                                                                            <li
                                                                                key={paper.paper_id}
                                                                                className="px-4 py-2.5 hover:bg-indigo-50 cursor-pointer transition-colors"
                                                                                onClick={() => handlePaperSelect(k.id, paper)}
                                                                            >
                                                                                <div className="min-w-0">
                                                                                    <p className="text-sm border-slate-900 font-medium line-clamp-2 leading-tight mb-1">{paper.paperTitle}</p>
                                                                                    <p className="text-[10px] text-slate-500 truncate italic">{paper.authors}</p>
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
                                                        <textarea rows={4} className={`${fieldCls} resize-none`} value={k.abstract} placeholder="Keynote abstract…"
                                                            onChange={e => patchKeynote(k.id, { abstract: e.target.value })} />
                                                    </div>
                                                    <div className="col-span-3">
                                                        <label className={labelCls}>Biography</label>
                                                        <textarea rows={3} className={`${fieldCls} resize-none`} value={k.bio} placeholder="Speaker's biography…"
                                                            onChange={e => patchKeynote(k.id, { bio: e.target.value })} />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <button onClick={addKeynote}
                                            className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all flex items-center justify-center gap-2">
                                            <Plus className="w-4 h-4" /> Add Keynote Speaker
                                        </button>
                                    </div>
                                )}

                                {/* ─── PAPERS ─── */}
                                {activeTab === 'papers' && (
                                    <div className="space-y-4">
                                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 border-b border-slate-200">
                                                    <tr>
                                                        <th className="px-5 py-3">#</th>
                                                        <th className="px-5 py-3">Title & Authors</th>
                                                        <th className="px-5 py-3 w-24 text-center">Abstract</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {procData.detailedSchedule.length === 0
                                                        ? <tr><td colSpan={3} className="px-5 py-8 text-center text-slate-400 italic">No accepted papers found for this conference.</td></tr>
                                                        : procData.detailedSchedule.map((p, i) => (
                                                            <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                                                                <td className="px-5 py-3 text-slate-400 text-xs">{i + 1}</td>
                                                                <td className="px-5 py-3">
                                                                    <p className="font-semibold text-slate-900 leading-snug text-sm">{p.paperTitle}</p>
                                                                    <p className="text-xs text-slate-500 mt-0.5 italic">{p.authors}</p>
                                                                </td>
                                                                <td className="px-5 py-3 text-center">
                                                                    {p.abstract
                                                                        ? <button
                                                                            onClick={() => setAbstractModal({ title: p.paperTitle, authors: p.authors, abstract: p.abstract })}
                                                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-medium transition-all"
                                                                            title="View abstract"
                                                                        >
                                                                            <Eye className="w-3.5 h-3.5" /> Read
                                                                        </button>
                                                                        : <span className="text-slate-300 text-xs">—</span>}
                                                                </td>
                                                            </tr>
                                                        ))
                                                    }
                                                </tbody>
                                            </table>
                                        </div>
                                        <p className="text-xs text-slate-400">Papers are auto-loaded from the database (status = ACCEPTED).</p>

                                        {/* Abstract modal */}
                                        {abstractModal && (
                                            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6" style={{ zIndex: 9999 }}
                                                onClick={() => setAbstractModal(null)}>
                                                <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                                                    <div className="flex items-start justify-between p-6 pb-4 border-b border-slate-100">
                                                        <div className="flex-1 min-w-0 pr-4">
                                                            <h3 className="font-bold text-slate-900 text-base leading-snug">{abstractModal.title}</h3>
                                                            <p className="text-sm text-slate-500 mt-1 italic">{abstractModal.authors}</p>
                                                        </div>
                                                        <button onClick={() => setAbstractModal(null)} className="p-1.5 rounded-lg hover:bg-slate-100 shrink-0">
                                                            <X className="w-4 h-4 text-slate-500" />
                                                        </button>
                                                    </div>
                                                    <div className="p-6 overflow-y-auto">
                                                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Abstract</p>
                                                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{abstractModal.abstract}</p>
                                                    </div>
                                                    <div className="p-4 border-t border-slate-100 flex justify-end">
                                                        <button onClick={() => setAbstractModal(null)}
                                                            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-all">Close</button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ─── PREVIEW ─── */}
                                {activeTab === 'preview' && (
                                    <div className="space-y-4">
                                        {/* Thêm nút Export PDF ngay trong tab Preview */}
                                        <div className="flex justify-end">
                                            <PDFDownloadLink
                                                document={edReady ? editorPdfDoc : procPdfDoc}
                                                fileName="conference-proceedings.pdf"
                                            >
                                                {({ loading }) => (
                                                    <Button
                                                        variant="primary"
                                                        icon={Download}
                                                        disabled={loading}
                                                        className="shadow-md shadow-indigo-200"
                                                    >
                                                        {loading ? 'Preparing Document...' : 'Export PDF'}
                                                    </Button>
                                                )}
                                            </PDFDownloadLink>
                                        </div>

                                        <div className="h-[720px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                                            <PDFViewer width="100%" height="100%" className="border-none">
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
                                {activeTab === 'editor' && (
                                    <div className="-mx-7 -mb-7">

                                        {/* ── Init splash ── */}
                                        {!edReady && !edLoading && (
                                            <div className="flex flex-col items-center justify-center h-80 gap-4">
                                                <LayoutTemplate className="w-12 h-12 text-indigo-200" />
                                                <p className="text-sm font-medium text-slate-600">
                                                    Render the current PDF into the visual editor
                                                </p>
                                                <button onClick={() => initEditor()}
                                                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-indigo-200">
                                                    Open in Editor
                                                </button>
                                                <p className="text-xs text-slate-400 max-w-xs text-center">
                                                    All pages are rasterised from your current data. Finish filling in
                                                    the other tabs first, then come back here to make final tweaks.
                                                </p>
                                            </div>
                                        )}

                                        {/* ── Loading ── */}
                                        {edLoading && (
                                            <div className="flex flex-col items-center justify-center h-80 gap-3">
                                                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                                                <p className="text-sm text-slate-500">Rendering PDF pages…</p>
                                            </div>
                                        )}

                                        {/* ── Main editor layout ── */}
                                        {edReady && edPages.length > 0 && (() => {
                                            const btnCls = (on: boolean) =>
                                                `p-2 rounded-lg border transition-all text-sm ${on
                                                    ? 'bg-indigo-600 border-indigo-600 text-white'
                                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`;

                                            return (
                                                <div className="flex" style={{ height: 800 }}>

                                                    {/* ──── Left: page strip (collapsible) ──── */}
                                                    <div className="shrink-0 bg-slate-100 border-r border-slate-200 flex flex-col transition-all duration-200 overflow-hidden"
                                                        style={{ width: showPagesSidebar ? 136 : 0, minWidth: showPagesSidebar ? 136 : 0 }}>
                                                        <div className="px-3 py-2.5 border-b border-slate-200 bg-white flex items-center justify-between">
                                                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Pages</span>
                                                            <span className="text-[11px] text-slate-400">{edPages.length}</span>
                                                        </div>
                                                        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-2">
                                                            {edPages.map((pg, idx) => (
                                                                <div key={pg.id}
                                                                    draggable
                                                                    onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; setDragFromIdx(idx); }}
                                                                    onDragOver={e => e.preventDefault()}
                                                                    onDrop={() => { if (dragFromIdx !== null) { reorderPage(dragFromIdx, idx); setDragFromIdx(null); } }}
                                                                    onDragEnd={() => setDragFromIdx(null)}
                                                                    onClick={() => { jumpToPage(idx); setSelElId(null); setEditingTxtId(null); }}
                                                                    className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all select-none ${selPage === idx ? 'border-indigo-500 shadow-lg' : dragFromIdx === idx ? 'opacity-40 border-slate-300' : 'border-transparent hover:border-slate-300'}`}
                                                                    style={{ width: THUMB_W, height: THUMB_H }}
                                                                >
                                                                    {pg.bg
                                                                        ? <img src={pg.bg} alt="" className="w-full h-full object-cover pointer-events-none" />
                                                                        : <div className="w-full h-full bg-white flex items-center justify-center"><span className="text-[10px] text-slate-300">Blank</span></div>
                                                                    }
                                                                    <span className="absolute bottom-0 inset-x-0 text-center bg-black/40 text-white text-[9px] py-0.5">{idx + 1}</span>
                                                                    <GripVertical className="absolute top-1 left-1 w-3 h-3 text-white/60 pointer-events-none" />
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="p-2 border-t border-slate-200 bg-white">
                                                            <button onClick={() => insertPage(selPage)}
                                                                className="w-full py-1.5 border border-dashed border-slate-300 rounded-lg text-[11px] text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-1">
                                                                <FilePlus className="w-3 h-3" /> Insert after
                                                            </button>
                                                        </div>
                                                    </div>
                                                    {/* Toggle sidebar button */}
                                                    <button
                                                        onClick={() => setShowPagesSidebar(v => !v)}
                                                        className="shrink-0 w-5 bg-slate-200 hover:bg-slate-300 border-r border-slate-300 flex items-center justify-center transition-all"
                                                        title={showPagesSidebar ? 'Hide pages' : 'Show pages'}
                                                    >
                                                        <ChevronRight className={`w-3.5 h-3.5 text-slate-500 transition-transform ${showPagesSidebar ? 'rotate-180' : ''}`} />
                                                    </button>

                                                    {/* ──── Centre: canvas ──── */}
                                                    <div className="flex-1 flex flex-col min-w-0 bg-slate-200">

                                                        {/* toolbar */}
                                                        <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-2 shrink-0 flex-wrap">
                                                            {/* add text */}
                                                            <button title="Add text block" onClick={addText} className={btnCls(false)}>
                                                                <Type className="w-4 h-4" />
                                                            </button>
                                                            {/* add image */}
                                                            <button title="Add image" onClick={() => {
                                                                const inp = document.createElement('input');
                                                                inp.type = 'file'; inp.accept = 'image/*';
                                                                inp.onchange = () => {
                                                                    const f = inp.files?.[0]; if (!f) return;
                                                                    const r = new FileReader();
                                                                    r.onload = ev => addImage(ev.target!.result as string);
                                                                    r.readAsDataURL(f);
                                                                };
                                                                inp.click();
                                                            }} className={btnCls(false)}><ImagePlus className="w-4 h-4" /></button>
                                                            {/* add table */}
                                                            <button title="Insert table" onClick={() => setShowInsertTable(true)} className={btnCls(false)}>
                                                                <Grid3X3 className="w-4 h-4" />
                                                            </button>

                                                            <div className="w-px h-5 bg-slate-200 mx-0.5" />

                                                            {/* delete selected */}
                                                            {selElId && (
                                                                <button title="Delete element" onClick={() => deleteEl(selElId)}
                                                                    className="p-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-all">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            )}

                                                            {/* H/F toggle */}
                                                            <button onClick={() => setShowHFPanel(v => !v)}
                                                                className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${showHFPanel ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                                                <Settings2 className="w-3.5 h-3.5" /> Header / Footer
                                                            </button>

                                                            {/* re-render */}
                                                            <button onClick={() => { setEdReady(false); setEdPages([]); setTimeout(initEditor, 50); }}
                                                                title="Re-render from current data"
                                                                className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all">
                                                                <RefreshCw className="w-4 h-4" />
                                                            </button>

                                                            {/* Sync TOC */}
                                                            <button onClick={syncToc}
                                                                title="Sync Table of Contents from TOC-entry elements"
                                                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 text-xs font-medium transition-all">
                                                                <List className="w-3.5 h-3.5" /> Sync TOC
                                                            </button>

                                                            {/* Export */}
                                                            <PDFDownloadLink
                                                                document={editorPdfDoc}
                                                                fileName="proceedings-edited.pdf"
                                                            >
                                                                {({ loading: dl }) => (
                                                                    <button disabled={dl}
                                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg transition-all">
                                                                        <Download className="w-3.5 h-3.5" />
                                                                        {dl ? 'Generating…' : 'Export PDF'}
                                                                    </button>
                                                                )}
                                                            </PDFDownloadLink>
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
                                                                        onChange={e => setHF(h => ({ ...h, headerText: e.target.value }))}
                                                                        placeholder="e.g. SOICT 2025 Program Book" />
                                                                </div>
                                                                <div>
                                                                    <label className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider block mb-1">
                                                                        Footer text
                                                                    </label>
                                                                    <input
                                                                        className="w-full px-2.5 py-1.5 text-xs border border-indigo-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-400"
                                                                        value={hf.footerText}
                                                                        onChange={e => setHF(h => ({ ...h, footerText: e.target.value }))}
                                                                        placeholder="e.g. https://soict.org" />
                                                                </div>
                                                                <div className="space-y-1.5">
                                                                    <label className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider block">
                                                                        Page numbers
                                                                    </label>
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <label className="flex items-center gap-1 text-xs text-slate-600 cursor-pointer">
                                                                            <input type="checkbox" checked={hf.showPageNum}
                                                                                onChange={e => setHF(h => ({ ...h, showPageNum: e.target.checked }))}
                                                                                className="accent-indigo-600" />
                                                                            Show
                                                                        </label>
                                                                        <select value={hf.pageNumPos}
                                                                            onChange={e => setHF(h => ({ ...h, pageNumPos: e.target.value as any }))}
                                                                            className="text-xs border border-indigo-200 rounded px-1.5 py-1 bg-white outline-none">
                                                                            <option value="left">Left</option>
                                                                            <option value="center">Center</option>
                                                                            <option value="right">Right</option>
                                                                        </select>
                                                                        <span className="text-xs text-slate-500">Start:</span>
                                                                        <input type="number" min={1} value={hf.startFrom}
                                                                            onChange={e => setHF(h => ({ ...h, startFrom: Number(e.target.value) }))}
                                                                            className="w-12 text-xs border border-indigo-200 rounded px-1.5 py-1 bg-white outline-none" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* canvas scroll area */}
                                                        {/* Vùng cuộn chính của Editor */}
                                                        <div
                                                            ref={scrollAreaRef}
                                                            className="flex-1 overflow-auto flex flex-col items-center pt-6 pb-10 gap-10 bg-slate-300 transition-all"
                                                            onClick={() => { setSelElId(null); setEditingTxtId(null); setTableSelectedCells([]); }}
                                                        >
                                                            {edPages.map((pg, idx) => (
                                                                <div
                                                                    key={pg.id}
                                                                    id={`editor-page-${idx}`} // ID để scroll Area tìm đến khi click thumbnail
                                                                    data-page-index={idx}     // Thuộc tính để IntersectionObserver nhận diện trang hiện tại
                                                                    className={`editor-page-container relative shadow-2xl flex-shrink-0`}
                                                                    style={{ width: CANVAS_W, height: CANVAS_H, backgroundColor: pg.bgColor || '#ffffff' }}
                                                                    onPointerMove={onCanvasPointerMove}
                                                                    onPointerUp={() => { dragRef.current = null; }}
                                                                >
                                                                    {/* 1. Page Background */}
                                                                    <div className="absolute inset-0" style={{ zIndex: 0, backgroundColor: pg.bgColor || '#ffffff' }} />

                                                                    {/* 2. Header Preview (Dùng dữ liệu của từng trang pg) */}
                                                                    {hf.headerText.trim() && idx > 1 && (
                                                                        <div className="absolute top-3 left-12 right-12 text-center text-[9px] text-slate-400 border-b border-slate-200 pb-0.5 pointer-events-none" style={{ zIndex: 10 }}>
                                                                            {hf.headerText}
                                                                        </div>
                                                                    )}

                                                                    {/* 3. Footer Preview (Số trang tính theo index idx của vòng lặp) */}
                                                                    {(hf.footerText.trim() || hf.showPageNum) && idx > 1 && (
                                                                        <div
                                                                            className={`absolute bottom-3 left-12 right-12 flex items-center text-[9px] text-slate-400 border-t border-slate-200 pt-0.5 pointer-events-none ${hf.pageNumPos === 'right' ? 'justify-between' : hf.pageNumPos === 'center' ? 'justify-center gap-4' : 'justify-start gap-4'}`}
                                                                            style={{ zIndex: 10 }}
                                                                        >
                                                                            {hf.footerText.trim() && <span>{hf.footerText}</span>}
                                                                            {hf.showPageNum && <span>{hf.startFrom + idx}</span>}
                                                                        </div>
                                                                    )}

                                                                    {/* 4. Overlay Elements (Các phần tử text/image trên trang pg) */}
                                                                    {[...pg.els]
                                                                        .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
                                                                        .map(el => {
                                                                            const isSel = selElId === el.id;
                                                                            return (
                                                                                <div key={el.id}
                                                                                    className={`absolute group ${isSel ? 'ring-2 ring-indigo-500' : 'hover:ring-1 hover:ring-indigo-300'}`}
                                                                                    style={{
                                                                                        left: el.x - (isSel && el.type === 'table' ? 22 : 0),
                                                                                        top: el.y - (isSel && el.type === 'table' ? 16 : 0),
                                                                                        width: el.w + (isSel && el.type === 'table' ? 22 : 0),
                                                                                        height: el.h + (isSel && el.type === 'table' ? 16 : 0),
                                                                                        cursor: el.type === 'table' ? (isSel ? 'default' : 'pointer') : 'move',
                                                                                        userSelect: 'none',
                                                                                        zIndex: el.zIndex ?? 10,
                                                                                        transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                                                                                        transformOrigin: 'center center',
                                                                                        overflow: el.type === 'table' ? 'visible' : undefined,
                                                                                    }}
                                                                                    onPointerDown={e => { setSelPage(idx); onElPointerDown(e, el, 'move'); }}
                                                                                    onClick={e => { e.stopPropagation(); setSelPage(idx); setSelElId(el.id); }}
                                                                                    onDoubleClick={e => { e.stopPropagation(); if (el.type === 'text') setEditingTxtId(el.id); }}
                                                                                >
                                                                                    {el.type === 'text' && (
                                                                                        editingTxtId === el.id
                                                                                            ? <textarea autoFocus
                                                                                                className="w-full h-full bg-transparent outline-none resize-none p-0 border-none"
                                                                                                style={{ fontSize: el.fontSize, fontWeight: el.bold ? 'bold' : 'normal', fontStyle: el.italic ? 'italic' : 'normal', color: el.color, textAlign: el.align as any, lineHeight: 1.4, fontFamily: el.fontFamily ? cssFontFamily(el.fontFamily) : 'inherit' }}
                                                                                                value={el.text ?? ''}
                                                                                                onChange={ev => patchEl(el.id, e2 => ({ ...e2, text: ev.target.value }))}
                                                                                                onBlur={() => setEditingTxtId(null)}
                                                                                                onKeyDown={ev => ev.key === 'Escape' && setEditingTxtId(null)}
                                                                                                onClick={ev => ev.stopPropagation()}
                                                                                                onPointerDown={ev => ev.stopPropagation()}
                                                                                            />
                                                                                            : <div className="w-full h-full overflow-hidden pointer-events-none"
                                                                                                style={{ fontSize: el.fontSize, fontWeight: el.bold ? 'bold' : 'normal', fontStyle: el.italic ? 'italic' : 'normal', color: el.color, textAlign: el.align as any, lineHeight: 1.4, whiteSpace: 'pre-wrap', fontFamily: el.fontFamily ? cssFontFamily(el.fontFamily) : 'inherit' }}>
                                                                                                {el.text}
                                                                                            </div>
                                                                                    )}
                                                                                    {el.type === 'image' && el.src && (
                                                                                        <img src={el.src} alt="" draggable={false}
                                                                                            className="w-full h-full object-contain pointer-events-none select-none" />
                                                                                    )}
                                                                                    {/* Move handles for table */}
                                                                                    {isSel && el.type === 'table' && (
                                                                                        <>
                                                                                            <div className="absolute top-[-6px] left-[-6px] right-[-6px] h-[12px] cursor-move z-10" onPointerDown={e => onElPointerDown(e, el, 'move')} />
                                                                                            <div className="absolute bottom-[-6px] left-[-6px] right-[-6px] h-[12px] cursor-move z-10" onPointerDown={e => onElPointerDown(e, el, 'move')} />
                                                                                            <div className="absolute left-[-6px] top-[-6px] bottom-[-6px] w-[12px] cursor-move z-10" onPointerDown={e => onElPointerDown(e, el, 'move')} />
                                                                                            <div className="absolute right-[-6px] top-[-6px] bottom-[-6px] w-[12px] cursor-move z-10" onPointerDown={e => onElPointerDown(e, el, 'move')} />
                                                                                        </>
                                                                                    )}
                                                                                    {el.type === 'table' && el.tableData && (
                                                                                        <TableEditorCanvas
                                                                                            tableData={el.tableData}
                                                                                            elW={el.w}
                                                                                            elH={el.h}
                                                                                            isSelected={selElId === el.id}
                                                                                            selectedCells={selElId === el.id ? tableSelectedCells : []}
                                                                                            onSelectCells={cells => { setSelElId(el.id); setTableSelectedCells(cells); }}
                                                                                            onPatchTable={(td) => patchEl(el.id, e2 => ({ ...e2, tableData: td, h: td.rowHeights.reduce((s, v) => s + v, 0) }))}
                                                                                        />
                                                                                    )}
                                                                                    {isSel && DIRS.map(dir => (
                                                                                        <div key={dir} style={handlePos(dir)}
                                                                                            onPointerDown={e => onElPointerDown(e, el, 'resize', dir)} />
                                                                                    ))}
                                                                                </div>
                                                                            );
                                                                        })
                                                                    }
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* ──── Right: properties panel ──── */}
                                                    <div className="w-[220px] shrink-0 bg-white border-l border-slate-200 overflow-y-auto flex flex-col">
                                                        <div className="px-4 py-3 border-b border-slate-100 shrink-0">
                                                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Properties</p>
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
                                                                    <p className="text-xs text-slate-400">{curPg.els.length} element{curPg.els.length !== 1 ? 's' : ''} on this page</p>
                                                                    <button onClick={() => insertPage(selPage)}
                                                                        className="w-full py-2 text-xs border border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center gap-1.5 transition-all">
                                                                        <FilePlus className="w-3.5 h-3.5" /> Insert page after
                                                                    </button>
                                                                    {edPages.length > 1 && (
                                                                        <button onClick={() => {
                                                                            setEdPages(ps => ps.filter((_, i) => i !== selPage));
                                                                            setSelPage(Math.max(0, selPage - 1));
                                                                            setSelElId(null);
                                                                        }}
                                                                            className="w-full py-2 text-xs border border-dashed border-red-200 rounded-lg text-red-400 hover:bg-red-50 flex items-center justify-center gap-1.5 transition-all">
                                                                            <Trash2 className="w-3.5 h-3.5" /> Delete this page
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* element selected */}
                                                        {selEl && (
                                                            <div className="p-4 space-y-4 flex-1">

                                                                {/* ── Text props ── */}
                                                                {selEl.type === 'text' && (<>
                                                                    <div>
                                                                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Font Family & Size</label>
                                                                        <FontSelector
                                                                            value={selEl.fontFamily ?? ''}
                                                                            onChange={f => patchEl(selEl.id, el => ({ ...el, fontFamily: f }))}
                                                                            className="mb-1.5"
                                                                        />
                                                                        <input type="number" min={6} max={96} value={selEl.fontSize ?? 14}
                                                                            onChange={e => patchEl(selEl.id, el => ({ ...el, fontSize: Number(e.target.value) }))}
                                                                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Style</label>
                                                                        <div className="flex gap-1.5">
                                                                            <button onClick={() => patchEl(selEl.id, el => ({ ...el, bold: !el.bold }))}
                                                                                className={`flex-1 py-1.5 rounded-lg border text-sm font-bold transition-all ${selEl.bold ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>B</button>
                                                                            <button onClick={() => patchEl(selEl.id, el => ({ ...el, italic: !el.italic }))}
                                                                                className={`flex-1 py-1.5 rounded-lg border text-sm italic transition-all ${selEl.italic ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>I</button>
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Alignment</label>
                                                                        <div className="flex gap-1.5">
                                                                            {(['left', 'center', 'right'] as const).map(a => (
                                                                                <button key={a}
                                                                                    onClick={() => patchEl(selEl.id, el => ({ ...el, align: a }))}
                                                                                    className={`flex-1 py-1.5 rounded-lg border flex items-center justify-center transition-all ${selEl.align === a ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                                                                    {a === 'left' ? <AlignLeft className="w-3.5 h-3.5" /> : a === 'center' ? <AlignCenter className="w-3.5 h-3.5" /> : <AlignRight className="w-3.5 h-3.5" />}
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Color</label>
                                                                        <div className="flex items-center gap-2">
                                                                            <input type="color" value={selEl.color ?? '#000000'}
                                                                                onChange={e => patchEl(selEl.id, el => ({ ...el, color: e.target.value }))}
                                                                                className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent" />
                                                                            <input value={selEl.color ?? '#000000'}
                                                                                onChange={e => patchEl(selEl.id, el => ({ ...el, color: e.target.value }))}
                                                                                className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-400" />
                                                                        </div>
                                                                    </div>
                                                                    <button onClick={() => setEditingTxtId(selEl.id)}
                                                                        className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all">
                                                                        <Type className="w-3.5 h-3.5" /> Edit text content
                                                                    </button>
                                                                </>)}

                                                                {/* ── Image props ── */}
                                                                {selEl.type === 'image' && (<>
                                                                    <div>
                                                                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Preview</label>
                                                                        <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center" style={{ height: 72 }}>
                                                                            {selEl.src && <img src={selEl.src} alt="" className="max-h-full max-w-full object-contain" />}
                                                                        </div>
                                                                    </div>
                                                                    <button onClick={() => openCrop(selEl)}
                                                                        className="w-full py-2 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all">
                                                                        <Crop className="w-3.5 h-3.5" /> Crop image
                                                                    </button>
                                                                    <button onClick={() => {
                                                                        const inp = document.createElement('input');
                                                                        inp.type = 'file'; inp.accept = 'image/*';
                                                                        inp.onchange = () => {
                                                                            const f = inp.files?.[0]; if (!f) return;
                                                                            const r = new FileReader();
                                                                            r.onload = ev => patchEl(selEl.id, el => ({ ...el, src: ev.target!.result as string }));
                                                                            r.readAsDataURL(f);
                                                                        };
                                                                        inp.click();
                                                                    }} className="w-full py-2 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all">
                                                                        <ImagePlus className="w-3.5 h-3.5" /> Replace image
                                                                    </button>
                                                                </>)}

                                                                {/* ── Table props ── */}
                                                                {selEl.type === 'table' && selEl.tableData && (
                                                                    <TablePropertiesPanel
                                                                        tableData={selEl.tableData}
                                                                        selectedCells={tableSelectedCells}
                                                                        onPatchTable={(td) => patchEl(selEl.id, el => ({ ...el, tableData: td, h: td.rowHeights.reduce((s, v) => s + v, 0) }))}
                                                                        elementW={selEl.w}
                                                                    />
                                                                )}

                                                                {/* ── Position & size (shared) ── */}
                                                                <div className="border-t border-slate-100 pt-4">
                                                                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">Position & size</label>
                                                                    <div className="grid grid-cols-2 gap-2">
                                                                        {(['x', 'y', 'w', 'h'] as const).map(k => (
                                                                            <div key={k}>
                                                                                <label className="text-[10px] text-slate-400 block mb-0.5">{k.toUpperCase()}</label>
                                                                                <input type="number" value={Math.round((selEl as any)[k])}
                                                                                    onChange={e => patchEl(selEl.id, el => ({ ...el, [k]: Number(e.target.value) }))}
                                                                                    className="w-full px-2 py-1 border border-slate-200 rounded text-xs outline-none focus:ring-1 focus:ring-indigo-400" />
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                {/* ── Rotation (shared) ── */}
                                                                <div className="border-t border-slate-100 pt-4">
                                                                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                                                                        <RotateCw className="w-3 h-3 inline mr-1" />Rotation
                                                                    </label>
                                                                    <div className="flex items-center gap-2">
                                                                        <input type="range" min={-180} max={360} value={selEl.rotation ?? 0}
                                                                            onChange={e => patchEl(selEl.id, el => ({ ...el, rotation: Number(e.target.value) }))}
                                                                            className="flex-1 accent-indigo-600" />
                                                                        <input type="number" min={-360} max={360} value={selEl.rotation ?? 0}
                                                                            onChange={e => patchEl(selEl.id, el => ({ ...el, rotation: Number(e.target.value) }))}
                                                                            className="w-14 px-2 py-1 border border-slate-200 rounded text-xs outline-none focus:ring-1 focus:ring-indigo-400 text-center" />
                                                                    </div>
                                                                    <div className="flex gap-1.5 mt-2">
                                                                        {[0, 90, 180, 270].map(deg => (
                                                                            <button key={deg} onClick={() => patchEl(selEl.id, el => ({ ...el, rotation: deg }))}
                                                                                className={`flex-1 py-1 text-[10px] rounded border transition-all ${(selEl.rotation ?? 0) === deg
                                                                                    ? 'bg-indigo-600 border-indigo-600 text-white'
                                                                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                                                                    }`}>{deg}°</button>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                <button onClick={() => deleteEl(selEl.id)}
                                                                    className="w-full py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all">
                                                                    <Trash2 className="w-3.5 h-3.5" /> Delete element
                                                                </button>
                                                                <div className="border-t border-slate-100 pt-3">
                                                                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">Layer</label>
                                                                    <div className="flex gap-2">
                                                                        <button onClick={() => patchEl(selEl.id, e => ({ ...e, zIndex: (e.zIndex ?? 10) + 1 }))}
                                                                            className="flex-1 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50">
                                                                            ↑ Forward
                                                                        </button>
                                                                        <button onClick={() => patchEl(selEl.id, e => ({ ...e, zIndex: Math.max(1, (e.zIndex ?? 10) - 1) }))}
                                                                            className="flex-1 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50">
                                                                            ↓ Backward
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                {/* ── TOC Entry ── */}
                                                                {selEl.type === 'text' && (
                                                                    <div className="border-t border-slate-100 pt-3">
                                                                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">Table of Contents</label>
                                                                        <label className="flex items-center gap-2 cursor-pointer select-none mb-2">
                                                                            <input type="checkbox"
                                                                                checked={selEl.isTocEntry ?? false}
                                                                                onChange={e => {
                                                                                    const checked = e.target.checked;
                                                                                    const elId = selEl.id;
                                                                                    const scX = CANVAS_W / 595;
                                                                                    const scY = CANVAS_H / 842;
                                                                                    const ML = Math.round(55 * scX);
                                                                                    const CW = CANVAS_W - ML * 2;

                                                                                    saveHistory(); // Lưu lại để có thể Ctrl Z nếu bấm nhầm

                                                                                    setEdPages(prev => prev.map((pg, pi) => {
                                                                                        if (pi !== selPage) return pg;

                                                                                        let newEls = pg.els.map(el => {
                                                                                            if (el.id === elId) {
                                                                                                return {
                                                                                                    ...el,
                                                                                                    isTocEntry: checked,
                                                                                                    // Tự động format text chuẩn Header (Ảnh 2)
                                                                                                    fontSize: checked ? Math.round(13 * scY) : el.fontSize,
                                                                                                    bold: checked ? true : el.bold,
                                                                                                    color: checked ? '#1a3a6b' : el.color,
                                                                                                    text: checked ? el.text?.toUpperCase() : el.text,
                                                                                                    tocLabel: checked ? el.text : ''
                                                                                                };
                                                                                            }
                                                                                            return el;
                                                                                        });

                                                                                        // NẾU TÍCH CHỌN: Thêm element thanh ngang ngay bên dưới
                                                                                        if (checked) {
                                                                                            const lineY = selEl.y + selEl.h + 4;
                                                                                            const lineId = uuidv4();
                                                                                            newEls.push({
                                                                                                id: lineId,
                                                                                                type: 'image',
                                                                                                x: ML, // Căn lề trái theo nội dung
                                                                                                y: lineY,
                                                                                                w: CW, // Kéo dài hết chiều ngang nội dung
                                                                                                h: Math.round(2 * scY),
                                                                                                src: solidColorImg('#1a3a6b', CW, 2),
                                                                                                zIndex: selEl.zIndex
                                                                                            });
                                                                                        }

                                                                                        return { ...pg, els: newEls };
                                                                                    }));
                                                                                }}
                                                                                className="accent-indigo-600 w-3.5 h-3.5" />
                                                                            <span className="text-xs text-slate-700">Add to TOC</span>
                                                                        </label>
                                                                        {selEl.isTocEntry && (
                                                                            <input type="text"
                                                                                placeholder="TOC label (default: element text)"
                                                                                value={selEl.tocLabel || ''}
                                                                                onChange={e => {
                                                                                    const val = e.target.value;
                                                                                    const elId = selEl.id;
                                                                                    setEdPages(prev => {
                                                                                        const patched = prev.map((pg, pi) =>
                                                                                            pi !== selPage ? pg : { ...pg, els: pg.els.map(el => el.id === elId ? { ...el, tocLabel: val } : el) }
                                                                                        );
                                                                                        return regenerateToc(patched);
                                                                                    });
                                                                                }}
                                                                                className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400"
                                                                            />
                                                                        )}
                                                                        {selEl.isTocEntry && (
                                                                            <p className="text-[10px] text-indigo-500 mt-1.5 flex items-center gap-1">
                                                                                <List className="w-3 h-3" /> Click "Sync TOC" to update thumbnail
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
                                        {cropState && (() => {
                                            const DISP = 460;
                                            const scale = Math.min(1, DISP / cropState.natW, DISP / cropState.natH);
                                            const dw = cropState.natW * scale, dh = cropState.natH * scale;
                                            return (
                                                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4"
                                                    style={{ zIndex: 9999 }}
                                                    onClick={e => e.stopPropagation()}
                                                    onPointerDown={e => e.stopPropagation()}
                                                >
                                                    <div className="bg-white rounded-2xl shadow-2xl p-6 flex flex-col gap-4" style={{ maxWidth: 560, width: '100%' }}>
                                                        <div className="flex items-center justify-between">
                                                            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                                                                <Crop className="w-4 h-4 text-indigo-600" /> Crop Image
                                                            </h3>
                                                            <button onClick={() => setCropState(null)} className="p-1.5 rounded-lg hover:bg-slate-100">
                                                                <X className="w-4 h-4 text-slate-500" />
                                                            </button>
                                                        </div>
                                                        {/* crop canvas */}
                                                        <div className="relative overflow-hidden rounded-xl bg-slate-100 mx-auto"
                                                            style={{ width: dw, height: dh }}>
                                                            <img src={cropState.src} alt="" style={{ width: dw, height: dh }} draggable={false} />
                                                            {/* dark vignette outside crop */}
                                                            <div className="absolute inset-0 pointer-events-none" style={{ background: 'rgba(0,0,0,0.45)' }} />
                                                            {/* crop box */}
                                                            <div
                                                                className="absolute border-2 border-indigo-500"
                                                                style={{
                                                                    left: cropState.cx * scale,
                                                                    top: cropState.cy * scale,
                                                                    width: cropState.cw * scale,
                                                                    height: cropState.ch * scale,
                                                                    background: 'transparent',
                                                                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
                                                                    cursor: 'move',
                                                                }}
                                                                onPointerDown={e => {
                                                                    e.stopPropagation();
                                                                    (e.currentTarget as Element).setPointerCapture(e.pointerId);
                                                                    cropDragRef.current = { active: true, mode: 'move', sx: e.clientX, sy: e.clientY, origCx: cropState.cx, origCy: cropState.cy, origCw: cropState.cw, origCh: cropState.ch };
                                                                }}
                                                                onPointerMove={e => {
                                                                    const d = cropDragRef.current; if (!d.active) return;
                                                                    const dx = (e.clientX - d.sx) / scale, dy = (e.clientY - d.sy) / scale;
                                                                    if (d.mode === 'move') {
                                                                        setCropState(c => c ? {
                                                                            ...c,
                                                                            cx: Math.max(0, Math.min(c.natW - c.cw, d.origCx + dx)),
                                                                            cy: Math.max(0, Math.min(c.natH - c.ch, d.origCy + dy)),
                                                                        } : c);
                                                                    } else {
                                                                        setCropState(c => {
                                                                            if (!c) return c;
                                                                            let { cx, cy, cw, ch } = { cx: d.origCx, cy: d.origCy, cw: d.origCw, ch: d.origCh };
                                                                            if (d.mode.includes('e')) cw = Math.max(20, d.origCw + dx);
                                                                            if (d.mode.includes('s')) ch = Math.max(20, d.origCh + dy);
                                                                            if (d.mode.includes('w')) { cx = d.origCx + dx; cw = Math.max(20, d.origCw - dx); }
                                                                            if (d.mode.includes('n')) { cy = d.origCy + dy; ch = Math.max(20, d.origCh - dy); }
                                                                            return { ...c, cx, cy, cw, ch };
                                                                        });
                                                                    }
                                                                }}
                                                                onPointerUp={() => { cropDragRef.current.active = false; }}
                                                            >
                                                                {/* rule-of-thirds grid */}
                                                                <div className="absolute inset-0 pointer-events-none" style={{
                                                                    backgroundImage: 'linear-gradient(rgba(255,255,255,.25) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.25) 1px, transparent 1px)',
                                                                    backgroundSize: '33.33% 33.33%',
                                                                }} />
                                                                {/* resize handles on crop box */}
                                                                {DIRS.map(dir => (
                                                                    <div key={dir}
                                                                        style={{
                                                                            ...handlePos(dir),
                                                                            background: 'white', border: '2px solid #4f46e5', cursor: DIR_CURSOR[dir],
                                                                        }}
                                                                        onPointerDown={e => {
                                                                            e.stopPropagation();
                                                                            (e.currentTarget as Element).setPointerCapture(e.pointerId);
                                                                            cropDragRef.current = { active: true, mode: dir, sx: e.clientX, sy: e.clientY, origCx: cropState.cx, origCy: cropState.cy, origCw: cropState.cw, origCh: cropState.ch };
                                                                        }}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <p className="text-xs text-slate-400 text-center">
                                                            Drag box to move · Drag corner/edge handles to resize &nbsp;·&nbsp;
                                                            {Math.round(cropState.cw)} × {Math.round(cropState.ch)} px
                                                        </p>
                                                        <div className="flex gap-3">
                                                            <button onClick={() => setCropState(null)}
                                                                className="flex-1 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-all">Cancel</button>
                                                            <button onClick={applyCrop}
                                                                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all">
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
    );
};

export default ProceedingsManagement;