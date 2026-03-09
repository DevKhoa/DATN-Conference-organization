import React, { useState, useEffect } from 'react';
import {
    Book, FileText, Users, Clock, Map as MapIcon, Download, Globe, Plus,
    Trash2, Loader2, AlertCircle, ChevronRight, Image as ImageIcon,
    ArrowLeft, Save, Mic, Info, CalendarDays, Eye, List
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Button from '../components/ui/Button';
import { Document, Page, Text, View, StyleSheet, Image, PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';
import { v4 as uuidv4 } from 'uuid';


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
    page: { padding: '50pt 55pt', fontFamily: 'Helvetica', fontSize: 10, lineHeight: 1.5, color: '#1a202c' },
    coverPage: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', backgroundColor: '#1a3a6b', padding: 60 },
    coverTag: { fontSize: 11, color: '#93c5fd', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 20, fontFamily: 'Helvetica' },
    coverTitle: { fontSize: 30, fontFamily: 'Helvetica-Bold', color: '#ffffff', textAlign: 'center', lineHeight: 1.3, marginBottom: 16 },
    coverSubtitle: { fontSize: 13, color: '#bfdbfe', textAlign: 'center', marginBottom: 8 },
    coverDateLoc: { fontSize: 11, color: '#93c5fd', textAlign: 'center', marginBottom: 50 },
    coverDivider: { width: 60, height: 2, backgroundColor: '#60a5fa', marginBottom: 50 },
    coverSponsorLabel: { fontSize: 9, color: '#93c5fd', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 },
    coverLogos: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16 },

    // TOC
    tocRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0' },
    tocChapter: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#1a3a6b' },
    tocPage: { fontSize: 10, color: '#718096' },

    // Section headings
    sectionTitle: { fontSize: 15, fontFamily: 'Helvetica-Bold', marginTop: 0, marginBottom: 18, color: '#1a3a6b', textTransform: 'uppercase', letterSpacing: 1 },
    sectionDivider: { height: 2, backgroundColor: '#1a3a6b', marginBottom: 18 },
    dayHeader: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#1a3a6b', marginTop: 20, marginBottom: 10, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: '#93c5fd' },

    // Committee
    roleHeader: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#1a3a6b', textTransform: 'uppercase', letterSpacing: 1, marginTop: 14, marginBottom: 4 },
    memberLine: { fontSize: 9.5, color: '#2d3748', marginBottom: 3, paddingLeft: 8 },

    // Schedule table
    tableHeader: { flexDirection: 'row', backgroundColor: '#1a3a6b', paddingVertical: 6, paddingHorizontal: 8, marginBottom: 2 },
    tableHeaderText: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#ffffff', textTransform: 'uppercase' },
    tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0', paddingVertical: 7, paddingHorizontal: 4, alignItems: 'flex-start' },
    colTime: { width: '22%', fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1a3a6b' },
    colTopic: { width: '55%', fontSize: 9, color: '#2d3748' },
    colLocation: { width: '23%', fontSize: 9, color: '#718096', textAlign: 'right' },

    // Keynotes
    keynoteCard: { marginBottom: 30, padding: '16pt 0', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    keynoteTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#1a3a6b', marginBottom: 6 },
    keynoteHeader: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-start' },
    keynoteSpeaker: { fontSize: 11, fontFamily: 'Helvetica-Oblique', color: '#4a5568', marginBottom: 12 },
    keynotePhoto: { width: 90, height: 90, borderRadius: 45, marginRight: 15, objectFit: 'cover' },
    keynoteInfo: { flex: 1 },
    abstractLabel: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#718096', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
    abstractText: { marginTop: 4, width: '100%', fontSize: 9.5, color: '#2d3748', lineHeight: 1.65, textAlign: 'justify' },
    bioText: { fontSize: 9, color: '#4a5568', lineHeight: 1.6, textAlign: 'justify', marginTop: 8, fontFamily: 'Helvetica-Oblique' },

    // Detailed papers
    sessionHeader: { backgroundColor: '#eef2f7', padding: '8pt 10pt', marginBottom: 10, marginTop: 20 },
    sessionName: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#1a3a6b' },
    sessionMeta: { fontSize: 8.5, color: '#718096', marginTop: 2 },
    paperBlock: { marginBottom: 20, paddingLeft: 12, borderLeftWidth: 3, borderLeftColor: '#93c5fd', width: '100%' },
    paperTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#1a202c', marginBottom: 3 },
    paperAuthors: { fontSize: 9, fontFamily: 'Helvetica-Oblique', color: '#4a5568', marginBottom: 6 },
    paperDoi: { fontSize: 8, color: '#3182ce', marginBottom: 6 },

    // General info
    infoSection: { marginBottom: 16 },
    infoLabel: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: '#1a3a6b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
    infoText: { fontSize: 9.5, color: '#2d3748', lineHeight: 1.6 },

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
        fontFamily: 'Helvetica',
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

    const tocItems = [
        { label: 'Foreword', page: 3 },
        { label: 'Organizing Committee', page: 4 },
        { label: 'General Information', page: 5 },
        { label: 'Program at a Glance', page: 6 },
        ...(data.keynotes?.length > 0 ? [{ label: 'Keynote Speakers', page: 7 }] : []),
        { label: 'Detailed Program with Abstracts', page: data.keynotes?.length > 0 ? 8 : 7 },
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

                {data.cover.sponsorLogos?.length > 0 && (
                    <>
                        <Text style={pdfStyles.coverSponsorLabel}>Sponsors &amp; Partners</Text>
                        <View style={pdfStyles.coverLogos}>
                            {data.cover.sponsorLogos.map((logo: string, i: number) => (
                                <ImageIcon key={i} src={logo} style={{ width: 80, height: 60, objectFit: 'contain' }} />
                            ))}
                        </View>
                    </>
                )}
            </Page>

            {/* ── TABLE OF CONTENTS ── (no footer/page-number on this page) */}
            <Page size="A4" style={pdfStyles.page}>
                <Text style={pdfStyles.sectionTitle}>Table of Contents</Text>
                <View style={pdfStyles.sectionDivider} />
                {tocItems.map((item, i) => (
                    <View key={i} style={pdfStyles.tocRow}>
                        <Text style={pdfStyles.tocChapter}>{item.label}</Text>
                        <Text style={pdfStyles.tocPage}>{item.page}</Text>
                    </View>
                ))}
            </Page>

            {/* ── FOREWORD ── */}
            <Page size="A4" style={pdfStyles.page}>
                <Text style={pdfStyles.sectionTitle}>Foreword</Text>
                <View style={pdfStyles.sectionDivider} />
                {data.foreword
                    ? data.foreword.split('\n').filter((p: string) => p.trim()).map((p: string, i: number) => (
                        <Text key={i} style={{ marginBottom: 10, textAlign: 'justify', fontSize: 10, lineHeight: 1.7, color: '#2d3748' }}>{p.trim()}</Text>
                    ))
                    : <Text style={{ color: '#718096', fontFamily: 'Helvetica-Oblique' }}>No foreword provided.</Text>
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
                    ? <Text style={{ color: '#718096', fontFamily: 'Helvetica-Oblique' }}>No committee members added.</Text>
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

            {/* ── GENERAL INFORMATION ── */}
            <Page size="A4" style={pdfStyles.page}>
                <Text style={pdfStyles.sectionTitle}>Conference Information</Text>
                <View style={pdfStyles.sectionDivider} />

                {data.generalInfo?.venueDetails && (
                    <View style={pdfStyles.infoSection}>
                        <Text style={pdfStyles.infoLabel}>Conference Venue</Text>
                        <Text style={pdfStyles.infoText}>{data.generalInfo.venueDetails}</Text>
                    </View>
                )}
                {data.generalInfo?.registrationHours && (
                    <View style={pdfStyles.infoSection}>
                        <Text style={pdfStyles.infoLabel}>Registration Desk Hours</Text>
                        <Text style={pdfStyles.infoText}>{data.generalInfo.registrationHours}</Text>
                    </View>
                )}
                {data.generalInfo?.roomAssignments && (
                    <View style={pdfStyles.infoSection}>
                        <Text style={pdfStyles.infoLabel}>Function Rooms</Text>
                        <Text style={pdfStyles.infoText}>{data.generalInfo.roomAssignments}</Text>
                    </View>
                )}
                {data.generalInfo?.coffeeInternetInfo && (
                    <View style={pdfStyles.infoSection}>
                        <Text style={pdfStyles.infoLabel}>Refreshments &amp; Internet Access</Text>
                        <Text style={pdfStyles.infoText}>{data.generalInfo.coffeeInternetInfo}</Text>
                    </View>
                )}
                {data.generalInfo?.galaDinner && (
                    <View style={pdfStyles.infoSection}>
                        <Text style={pdfStyles.infoLabel}>Gala Dinner</Text>
                        <Text style={pdfStyles.infoText}>{data.generalInfo.galaDinner}</Text>
                    </View>
                )}
                {data.generalInfo?.floorPlan && (
                    <View style={{ marginTop: 10 }}>
                        <Text style={pdfStyles.infoLabel}>Venue Layout</Text>
                        <ImageIcon src={data.generalInfo.floorPlan} style={{ width: '100%', maxHeight: 220, objectFit: 'contain', marginTop: 6 }} />
                    </View>
                )}

                <View style={pdfStyles.footerContainer} fixed>
                    <Text style={pdfStyles.footerTitle}>{data.cover.conferenceName} </Text>
                    <Text style={pdfStyles.pageNumber} render={({ pageNumber }) => `${pageNumber}`} />
                </View>
            </Page>

            {/* ── PROGRAM AT A GLANCE ── */}
            <Page size="A4" style={pdfStyles.page}>
                <Text style={pdfStyles.sectionTitle}>Program at a Glance</Text>
                <View style={pdfStyles.sectionDivider} />

                {Object.keys(scheduleByDate).length === 0
                    ? <Text style={{ color: '#718096', fontFamily: 'Helvetica-Oblique' }}>No schedule data loaded.</Text>
                    : Object.entries(scheduleByDate).map(([date, items], di) => (
                        <View key={di}>
                            <Text style={pdfStyles.dayHeader}>{date}</Text>
                            <View style={pdfStyles.tableHeader}>
                                <Text style={[pdfStyles.tableHeaderText, { width: '22%' }]}>Time</Text>
                                <Text style={[pdfStyles.tableHeaderText, { width: '55%' }]}>Session / Event</Text>
                                <Text style={[pdfStyles.tableHeaderText, { width: '23%', textAlign: 'right' }]}>Location</Text>
                            </View>
                            {items.map((s: any, i: number) => (
                                <View key={i} style={pdfStyles.tableRow} >
                                    <Text style={pdfStyles.colTime}>{s.time}</Text>
                                    <Text style={pdfStyles.colTopic}>{s.topic}</Text>
                                    <Text style={pdfStyles.colLocation}>{s.location}</Text>
                                </View>
                            ))}
                        </View>
                    ))
                }

                <View style={pdfStyles.footerContainer} fixed>
                    <Text style={pdfStyles.footerTitle}>{data.cover.conferenceName} </Text>
                    <Text style={pdfStyles.pageNumber} render={({ pageNumber }) => `${pageNumber}`} />
                </View>
            </Page>

            {/* ── KEYNOTE SPEAKERS ── */}
            {data.keynotes?.length > 0 && (
                <Page size="A4" style={pdfStyles.page}>
                    <Text style={pdfStyles.sectionTitle}>Keynote Speakers</Text>
                    <View style={pdfStyles.sectionDivider} />
                    {data.keynotes.map((k: KeynoteSpeaker, i: number) => (
                        <View key={i} style={pdfStyles.keynoteCard} wrap={false}>
                            {/* THÊM KHỐI HEADER NÀY ĐỂ HIỆN ẢNH KẾ BÊN TÊN */}
                            <View style={pdfStyles.keynoteHeader}>
                                {k.photo && <Image src={k.photo} style={pdfStyles.keynotePhoto} />}
                                <View style={pdfStyles.keynoteInfo}>
                                    <Text style={pdfStyles.keynoteTitle}>{k.presentationTitle || 'Untitled Keynote'}</Text>
                                    <Text style={pdfStyles.keynoteSpeaker}>{k.name}</Text>
                                </View>
                            </View>

                            {k.abstract && (
                                <>
                                    <Text style={pdfStyles.abstractLabel}>Abstract</Text>
                                    <Text style={pdfStyles.abstractText}>{k.abstract}</Text>
                                </>
                            )}
                            {k.bio && (
                                <Text style={pdfStyles.bioText}>{k.bio}</Text>
                            )}
                        </View>
                    ))}
                    <View style={pdfStyles.footerContainer} fixed>
                        <Text style={pdfStyles.footerTitle}>{data.cover.conferenceName} </Text>
                        <Text style={pdfStyles.pageNumber} render={({ pageNumber }) => `${pageNumber}`} />
                    </View>
                </Page>
            )}

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

                                    {/* Row 3: DOI */}
                                    {p.doi ? (
                                        <Text style={[pdfStyles.paperDoi, { paddingLeft: p.timeSlot ? 42 : 0 }]}>
                                            DOI: {p.doi}
                                        </Text>
                                    ) : null}

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

// ─── Tab definitions ──────────────────────────────────────────────────────────
const TABS = [
    { key: 'cover', label: 'Cover', icon: ImageIcon },
    { key: 'foreword', label: 'Foreword', icon: FileText },
    { key: 'committee', label: 'Committee', icon: Users },
    { key: 'generalInfo', label: 'Venue & Info', icon: Info },
    { key: 'schedule', label: 'At a Glance', icon: CalendarDays },
    { key: 'keynotes', label: 'Keynotes', icon: Mic },
    { key: 'papers', label: 'Papers', icon: List },
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
                    sponsorLogos: Array.isArray(conf.banner_urls) ? conf.banner_urls : [],
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
                        doi: p.doi_code || '',
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
                        <PDFDownloadLink
                            document={<ProceedingsDocument data={procData} />}
                            fileName={`${procData.cover.conferenceName || 'proceedings'}.pdf`}
                        >
                            {({ loading: pdfLoading }) => (
                                <Button variant="primary" icon={Download} disabled={!selectedConfId || pdfLoading} className="rounded-lg text-sm">
                                    {pdfLoading ? 'Generating…' : 'Export PDF'}
                                </Button>
                            )}
                        </PDFDownloadLink>
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
                                    {activeTab === 'papers' && 'Accepted papers auto-loaded from the database. Edit DOI codes here.'}
                                    {activeTab === 'preview' && 'Live PDF preview. Use "Export PDF" in the top bar to download.'}
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
                                                        const urls = Array.from(e.target.files).map(f => URL.createObjectURL(f as File));
                                                        updateCover({ sponsorLogos: [...procData.cover.sponsorLogos, ...urls] });
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
                                                        <div>
                                                            <label className={labelCls}>Speaker Name</label>
                                                            <input className={fieldCls} value={k.name} placeholder="e.g. Prof. Vincent Wong"
                                                                onChange={e => patchKeynote(k.id, { name: e.target.value })} />
                                                        </div>
                                                        <div>
                                                            <label className={labelCls}>Presentation Title</label>
                                                            <input className={fieldCls} value={k.presentationTitle} placeholder="e.g. Machine Learning for Integrated Sensing and Communication"
                                                                onChange={e => patchKeynote(k.id, { presentationTitle: e.target.value })} />
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
                                                        <th className="px-5 py-3 w-52">DOI Code</th>
                                                        <th className="px-5 py-3 w-10 text-center">Abs.</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {procData.detailedSchedule.length === 0
                                                        ? <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-400 italic">No accepted papers found for this conference.</td></tr>
                                                        : procData.detailedSchedule.map((p, i) => (
                                                            <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                                                                <td className="px-5 py-3 text-slate-400 text-xs">{i + 1}</td>
                                                                <td className="px-5 py-3">
                                                                    <p className="font-semibold text-slate-900 leading-snug text-sm">{p.paperTitle}</p>
                                                                    <p className="text-xs text-slate-500 mt-0.5 italic">{p.authors}</p>
                                                                </td>
                                                                <td className="px-5 py-3">
                                                                    <input type="text"
                                                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-400"
                                                                        value={p.doi} placeholder="10.xxxx/xxxxx"
                                                                        onChange={e => {
                                                                            const n = [...procData.detailedSchedule];
                                                                            n[i] = { ...n[i], doi: e.target.value };
                                                                            setProcData(d => ({ ...d, detailedSchedule: n }));
                                                                        }} />
                                                                </td>
                                                                <td className="px-5 py-3 text-center">
                                                                    {p.abstract
                                                                        ? <span title={p.abstract}><FileText className="w-4 h-4 text-indigo-400 mx-auto cursor-help" /></span>
                                                                        : <span className="text-slate-300 text-xs">—</span>}
                                                                </td>
                                                            </tr>
                                                        ))
                                                    }
                                                </tbody>
                                            </table>
                                        </div>
                                        <p className="text-xs text-slate-400">Papers are auto-loaded from the database (status = ACCEPTED). Edit DOI codes here then hit Save.</p>
                                    </div>
                                )}

                                {/* ─── PREVIEW ─── */}
                                {activeTab === 'preview' && (
                                    <div className="h-[720px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                                        <PDFViewer width="100%" height="100%" className="border-none">
                                            <ProceedingsDocument data={procData} />
                                        </PDFViewer>
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