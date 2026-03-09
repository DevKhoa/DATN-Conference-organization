import React, { useState, useEffect, useRef } from 'react';
import { 
  User, Mail, Building, FileText, Calendar, Edit2, Save, X, 
  Loader2, ArrowLeft, CheckCircle, AlertCircle, Shield, Camera, 
  Upload, Link as LinkIcon, PenTool, BookOpen, RefreshCw,
  ChevronDown, ChevronUp
} from 'lucide-react';
import Button from '../components/ui/Button'; 
import { supabase } from '../lib/supabase'; 

// --- INTERFACES ---
interface ProfileProps {
  userEmail: string;
  onNavigateHome: () => void;
  onNavigateMyPapers?: () => void;
}

interface UserProfile {
  user_id: number;
  full_name: string;
  email: string;
  organization: string | null;
  description: string | null;
  description_reformat: string | null;
  created_at: string;
  role_name?: string; 
  role_id?: number;
  avatar_url: string | null;
}

const BASE_API_URL = "http://localhost:8080";

// ─── Bio Renderer: parses **Section** markers into structured blocks ───────────
const BioRenderer: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return <p className="text-slate-400 italic text-sm">No professional summary available yet.</p>;

  // Split on double-newline to get blocks
  const blocks = text.split(/\n\n+/);

  return (
    <div className="space-y-3">
      {blocks.map((block, i) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        // Detect **Section Header**
        const sectionMatch = trimmed.match(/^\*\*(.+?)\*\*\s*$/);
        if (sectionMatch) {
          return (
            <div key={i} className="flex items-center gap-2 pt-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-brand-600 bg-brand-50 px-2 py-0.5 rounded">
                {sectionMatch[1]}
              </span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>
          );
        }

        // Detect lines starting with • or ◦
        const lines = trimmed.split('\n');
        const isBulletBlock = lines.some(l => l.trimStart().startsWith('•') || l.trimStart().startsWith('◦'));

        if (isBulletBlock) {
          return (
            <ul key={i} className="space-y-1 pl-1">
              {lines.map((line, j) => {
                const l = line.trim();
                if (!l) return null;
                const isSub = l.startsWith('◦');
                const content = l.replace(/^[•◦]\s*/, '');
                return (
                  <li key={j} className={`flex items-start gap-2 ${isSub ? 'pl-4' : ''}`}>
                    <span className={`mt-1.5 shrink-0 rounded-full ${isSub ? 'w-1 h-1 bg-slate-300' : 'w-1.5 h-1.5 bg-brand-400'}`} />
                    <span className="text-sm text-slate-600 leading-relaxed">{content}</span>
                  </li>
                );
              })}
            </ul>
          );
        }

        // Plain text paragraph
        return (
          <p key={i} className="text-sm text-slate-600 leading-relaxed">{trimmed}</p>
        );
      })}
    </div>
  );
};

// ─── Collapsible Bio Panel ─────────────────────────────────────────────────────
const COLLAPSED_HEIGHT = 220;

const BioPanelView: React.FC<{
  profile: UserProfile | null;
  bioSaving: boolean;
  onEditText: () => void;
  onUploadCV: () => void;
  onImportScholar: () => void;
  onRefresh: () => void;
}> = ({ profile, bioSaving, onEditText, onUploadCV, onImportScholar, onRefresh }) => {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      setOverflows(contentRef.current.scrollHeight > COLLAPSED_HEIGHT);
    }
  }, [profile?.description_reformat, profile?.description]);

  const bioText = profile?.description_reformat || profile?.description || '';

  return (
    <div className="space-y-0">
      {/* Bio display area */}
      <div
        className="relative overflow-hidden transition-all duration-500 ease-in-out"
        style={{ maxHeight: expanded ? '9999px' : `${COLLAPSED_HEIGHT}px` }}
      >
        <div ref={contentRef} className="px-6 pt-4 pb-2">
          <BioRenderer text={bioText} />
        </div>

        {/* Fade-out gradient when collapsed */}
        {!expanded && overflows && (
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none" />
        )}
      </div>

      {/* Expand / Collapse toggle */}
      {overflows && (
        <div className="flex justify-center pb-3 pt-1">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-800 transition-colors group"
          >
            {expanded ? (
              <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
            ) : (
              <><ChevronDown className="w-3.5 h-3.5" /> Show full profile</>
            )}
          </button>
        </div>
      )}

      {/* Action buttons */}
      <div className="px-6 pb-5 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
        <button
          onClick={onEditText}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
        >
          <PenTool className="w-3.5 h-3.5" /> Edit Text
        </button>
        <button
          onClick={onUploadCV}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
        >
          <Upload className="w-3.5 h-3.5" /> Upload CV (PDF)
        </button>
        <button
          onClick={onImportScholar}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
        >
          <LinkIcon className="w-3.5 h-3.5" /> Import Scholar
        </button>
        {profile?.description && (
          <button
            onClick={onRefresh}
            disabled={bioSaving}
            title="Reformat bio"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-md transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${bioSaving ? 'animate-spin' : ''}`} />
            Reformat
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const Profile: React.FC<ProfileProps> = ({ userEmail, onNavigateHome, onNavigateMyPapers }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [basicEditMode, setBasicEditMode] = useState(false);
  const [basicSaving, setBasicSaving] = useState(false);
  const [basicData, setBasicData] = useState({ full_name: '', organization: '' });

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  const [bioMode, setBioMode] = useState<'VIEW' | 'MANUAL' | 'CV' | 'SCHOLAR'>('VIEW');
  const [bioSaving, setBioSaving] = useState(false);
  const [manualBio, setManualBio] = useState('');
  const [scholarUrl, setScholarUrl] = useState('');
  const [cvFile, setCvFile] = useState<File | null>(null);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const cvInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (userEmail) fetchProfile();
    else setLoading(false);
  }, [userEmail]);

  // ── Regex logic (untouched) ──────────────────────────────────────────────────
  const formatBioDirectly = (text: string): string => {
    if (!text) return "";
    let formatted = text;
    formatted = formatted.replace(/\r/g, "").replace(/\t+/g, " ").replace(/ {2,}/g, " ").trim();
    formatted = formatted.replace(/•/g, "\n• ").replace(/◦/g, "\n  ◦ ");
    const sections = ["Objective","Education","Experience","Projects","Research","Skills"];
    sections.forEach(section => {
      const regex = new RegExp(`\\b(${section})\\b`, "gi");
      formatted = formatted.replace(regex, `\n\n**$1**\n`);
    });
    formatted = formatted.replace(/:\s*(?=[A-Z])/g, ":\n");
    formatted = formatted.replace(/(.{80,}?[.!?])\s+(?=[A-Z])/g, "$1\n");
    formatted = formatted.replace(/\n{3,}/g, "\n\n").replace(/[ \t]+\n/g, "\n");
    return formatted.trim();
  };

  const handleRefreshBio = async () => {
    if (!profile || !profile.description) return;
    setBioSaving(true);
    try {
      const newFormattedBio = formatBioDirectly(profile.description);
      const { error: updateError } = await supabase
        .from('users')
        .update({ description_reformat: newFormattedBio })
        .eq('user_id', profile.user_id);
      if (updateError) throw updateError;
      setProfile({ ...profile, description_reformat: newFormattedBio });
      setSuccessMsg('Profile reformatted successfully!');
    } catch {
      setError('Failed to reformat bio.');
    } finally {
      setBioSaving(false);
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  // ── Data Fetching ────────────────────────────────────────────────────────────
  const fetchProfile = async () => {
    setLoading(true); setError('');
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`user_id, full_name, email, organization, description, description_reformat, created_at, avatar_url, user_roles ( role_id, roles ( role_name ) )`)
        .eq('email', userEmail).single();
      if (error) throw error;
      if (data) {
        let roleName = 'Participant', roleId = 5;
        const rawRoles = data.user_roles as any[];
        if (rawRoles && rawRoles.length > 0) {
          const first = rawRoles[0];
          roleId = first.role_id;
          if (first.roles) {
            const r = first.roles;
            roleName = Array.isArray(r) ? r[0]?.role_name || 'Participant' : (r as any).role_name || 'Participant';
          }
        }
        const userProfile: UserProfile = {
          user_id: data.user_id, full_name: data.full_name, email: data.email,
          organization: data.organization, description: data.description,
          description_reformat: data.description_reformat, created_at: data.created_at,
          role_name: roleName, role_id: roleId, avatar_url: data.avatar_url
        };
        setProfile(userProfile);
        setBasicData({ full_name: userProfile.full_name || '', organization: userProfile.organization || '' });
        setManualBio(userProfile.description || '');
      }
    } catch {
      setError('Failed to load profile data.');
    } finally {
      setLoading(false);
    }
  };

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleSaveBasicInfo = async () => {
    if (!profile) return;
    setBasicSaving(true); setError(''); setSuccessMsg('');
    try {
      const { error } = await supabase.from('users')
        .update({ full_name: basicData.full_name, organization: basicData.organization })
        .eq('user_id', profile.user_id);
      if (error) throw error;
      setProfile({ ...profile, full_name: basicData.full_name, organization: basicData.organization });
      setSuccessMsg('Basic information updated.');
      setBasicEditMode(false);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch { setError('Failed to update basic info.'); }
    finally { setBasicSaving(false); }
  };

  const handleCancelBasic = () => {
    if (profile) setBasicData({ full_name: profile.full_name || '', organization: profile.organization || '' });
    setBasicEditMode(false);
  };

  const handleAvatarFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;
    setUploadingAvatar(true); setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`${BASE_API_URL}/users/${profile.user_id}/upload-avatar`, { method: 'POST', body: formData });
      const result = await response.json();
      if (response.ok && result.avatar_url) {
        setProfile({ ...profile, avatar_url: result.avatar_url });
        setSuccessMsg('Avatar updated.');
      } else throw new Error(result.message || 'Upload failed');
    } catch { setError('Failed to upload avatar.'); }
    finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  const handleSaveManualBio = async () => {
    if (!profile) return;
    setBioSaving(true); setError('');
    try {
      const response = await fetch(`${BASE_API_URL}/users/${profile.user_id}/description`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: manualBio })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Update failed');
      setProfile({ ...profile, description: manualBio });
      setSuccessMsg('Bio updated successfully.');
      setBioMode('VIEW');
    } catch (err: any) { setError(err.message || 'Failed to update bio.'); }
    finally { setBioSaving(false); setTimeout(() => setSuccessMsg(''), 3000); }
  };

  const handleUploadCV = async () => {
    if (!profile || !cvFile) { setError('Please select a PDF file.'); return; }
    setBioSaving(true); setError('');
    try {
      const formData = new FormData();
      formData.append('file', cvFile);
      const response = await fetch(`${BASE_API_URL}/users/${profile.user_id}/upload-cv`, { method: 'POST', body: formData });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Upload failed');
      setSuccessMsg('CV uploaded & bio extracted successfully.');
      await fetchProfile();
      setBioMode('VIEW'); setCvFile(null);
    } catch (err: any) { setError(err.message || 'Failed to upload CV.'); }
    finally { setBioSaving(false); setTimeout(() => setSuccessMsg(''), 3000); }
  };

  const handleImportScholar = async () => {
    if (!profile || !scholarUrl) { setError('Please enter a Google Scholar URL.'); return; }
    if (!scholarUrl.includes('scholar.google.com')) { setError('Invalid Google Scholar URL.'); return; }
    setBioSaving(true); setError('');
    try {
      const response = await fetch(`${BASE_API_URL}/users/${profile.user_id}/import-scholar`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scholar_url: scholarUrl })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Import failed');
      setSuccessMsg('Scholar profile imported successfully.');
      await fetchProfile();
      setBioMode('VIEW'); setScholarUrl('');
    } catch (err: any) { setError(err.message || 'Failed to import Scholar profile.'); }
    finally { setBioSaving(false); setTimeout(() => setSuccessMsg(''), 3000); }
  };

  const formatDate = (dateString: string) => {
    try { return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch { return dateString; }
  };

  const getInitials = (name: string) =>
    name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';

  const isAuthor = profile?.role_id === 3 || profile?.role_name === 'Author';

  // ── Role badge color ──────────────────────────────────────────────────────────
  const roleBadgeClass: Record<string, string> = {
    Admin: 'bg-red-50 text-red-700 border-red-200',
    Secretary: 'bg-amber-50 text-amber-700 border-amber-200',
    Author: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    Reviewer: 'bg-teal-50 text-teal-700 border-teal-200',
  };
  const badgeClass = roleBadgeClass[profile?.role_name || ''] || 'bg-slate-100 text-slate-600 border-slate-200';

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-2">
          <Loader2 className="w-8 h-8 text-brand-600 animate-spin mx-auto" />
          <p className="text-slate-400 text-sm">Loading profile…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F6FA] pt-16 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">

        {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Profile</h1>
            <p className="text-slate-500 text-sm mt-0.5">Manage your identity and professional information.</p>
          </div>
          <button
            onClick={onNavigateHome}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-brand-700 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </button>
        </div>

        {/* ── Alert Messages ───────────────────────────────────────────────────── */}
        {(error || successMsg) && (
          <div className={`mb-4 px-4 py-3 rounded-lg flex items-center gap-3 text-sm border ${
            error ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'
          }`}>
            {error
              ? <AlertCircle className="w-4 h-4 shrink-0" />
              : <CheckCircle className="w-4 h-4 shrink-0" />
            }
            {error || successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* ── LEFT COLUMN ───────────────────────────────────────────────────── */}
          <div className="lg:col-span-4 space-y-4">

            {/* Identity card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Top accent bar */}
              <div className="h-1.5 bg-gradient-to-r from-brand-600 to-brand-400" />

              <div className="p-6 text-center">
                {/* Avatar */}
                <div className="relative mx-auto mb-4 w-24 h-24 group">
                  <div
                    onClick={() => avatarInputRef.current?.click()}
                    className="w-full h-full rounded-full border-4 border-white ring-2 ring-slate-200 shadow-md overflow-hidden cursor-pointer bg-brand-100 flex items-center justify-center relative"
                    title="Change avatar"
                  >
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl font-bold text-brand-600">{getInitials(profile?.full_name || '')}</span>
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                    {uploadingAvatar && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                        <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
                      </div>
                    )}
                  </div>
                  <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarFileChange} />
                </div>

                <h2 className="text-lg font-bold text-slate-900 leading-tight">{profile?.full_name}</h2>
                {profile?.organization && (
                  <p className="text-sm text-slate-500 mt-0.5">{profile.organization}</p>
                )}
                <p className="text-xs text-slate-400 mt-0.5">{profile?.email}</p>

                <div className="mt-3">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badgeClass}`}>
                    <Shield className="w-3 h-3" />
                    {profile?.role_name || 'User'}
                  </span>
                </div>
              </div>

              {/* Meta info */}
              <div className="px-5 pb-5 space-y-2">
                <div className="h-px bg-slate-100 mb-3" />
                <div className="flex items-center gap-2.5 text-xs text-slate-500">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  Joined {profile?.created_at ? formatDate(profile.created_at) : 'N/A'}
                </div>
                <div className="flex items-center gap-2.5 text-xs text-slate-500">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  Account Verified
                </div>
              </div>
            </div>

            {/* Author action */}
            {isAuthor && onNavigateMyPapers && (
              <button
                onClick={onNavigateMyPapers}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                My Papers Dashboard
              </button>
            )}
          </div>

          {/* ── RIGHT COLUMN ──────────────────────────────────────────────────── */}
          <div className="lg:col-span-8 space-y-5">

            {/* ── Basic Information ─────────────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 flex justify-between items-center bg-slate-50/60">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-brand-500" />
                  <h3 className="text-sm font-semibold text-slate-800">Basic Information</h3>
                </div>
                {!basicEditMode && (
                  <button
                    onClick={() => setBasicEditMode(true)}
                    className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-brand-700 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                )}
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                      <input
                        type="text"
                        disabled={!basicEditMode}
                        value={basicData.full_name}
                        onChange={(e) => setBasicData({ ...basicData, full_name: e.target.value })}
                        className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border outline-none transition-all ${
                          basicEditMode
                            ? 'border-slate-300 focus:ring-2 focus:ring-brand-500 bg-white'
                            : 'border-slate-100 bg-slate-50 text-slate-600'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Organization */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">Organization</label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                      <input
                        type="text"
                        disabled={!basicEditMode}
                        value={basicData.organization}
                        onChange={(e) => setBasicData({ ...basicData, organization: e.target.value })}
                        placeholder="University / Institute"
                        className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border outline-none transition-all ${
                          basicEditMode
                            ? 'border-slate-300 focus:ring-2 focus:ring-brand-500 bg-white'
                            : 'border-slate-100 bg-slate-50 text-slate-600'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Email (read-only) */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                    Email Address <span className="normal-case text-slate-400 font-normal">(cannot be changed)</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                    <input
                      type="email" disabled value={profile?.email || ''}
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed"
                    />
                  </div>
                </div>

                {basicEditMode && (
                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={handleCancelBasic} disabled={basicSaving}
                      className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors"
                    >Cancel</button>
                    <button
                      onClick={handleSaveBasicInfo} disabled={basicSaving}
                      className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium bg-brand-700 hover:bg-brand-800 text-white rounded-lg transition-colors"
                    >
                      {basicSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Save
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ── Professional Profile ──────────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand-500" />
                <h3 className="text-sm font-semibold text-slate-800">Professional Profile</h3>
              </div>

              {/* ── VIEW mode ─────────────────────────────────────────────── */}
              {bioMode === 'VIEW' && (
                <BioPanelView
                  profile={profile}
                  bioSaving={bioSaving}
                  onEditText={() => setBioMode('MANUAL')}
                  onUploadCV={() => setBioMode('CV')}
                  onImportScholar={() => setBioMode('SCHOLAR')}
                  onRefresh={handleRefreshBio}
                />
              )}

              {/* ── MANUAL mode ───────────────────────────────────────────── */}
              {bioMode === 'MANUAL' && (
                <div className="p-5 space-y-4">
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Edit Bio</label>
                  <textarea
                    rows={8}
                    value={manualBio}
                    onChange={(e) => setManualBio(e.target.value)}
                    className="w-full p-3 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none resize-y font-mono leading-relaxed"
                    placeholder="Write a short professional biography…"
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setBioMode('VIEW')} disabled={bioSaving}
                      className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors"
                    >Cancel</button>
                    <button onClick={handleSaveManualBio} disabled={bioSaving}
                      className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium bg-brand-700 hover:bg-brand-800 text-white rounded-lg transition-colors"
                    >
                      {bioSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Update Bio'}
                    </button>
                  </div>
                </div>
              )}

              {/* ── CV mode ───────────────────────────────────────────────── */}
              {bioMode === 'CV' && (
                <div className="p-5">
                  <div
                    onClick={() => cvInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 rounded-xl p-8 hover:bg-slate-50 cursor-pointer transition-colors text-center"
                  >
                    <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-700">
                      {cvFile ? cvFile.name : 'Click to upload your CV'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">PDF format only — bio will be extracted automatically.</p>
                    <input type="file" ref={cvInputRef} accept="application/pdf" className="hidden"
                      onChange={(e) => setCvFile(e.target.files?.[0] || null)} />
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <button onClick={() => { setBioMode('VIEW'); setCvFile(null); }} disabled={bioSaving}
                      className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors"
                    >Cancel</button>
                    <button onClick={handleUploadCV} disabled={bioSaving || !cvFile}
                      className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium bg-brand-700 hover:bg-brand-800 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      {bioSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Process & Save'}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Scholar mode ──────────────────────────────────────────── */}
              {bioMode === 'SCHOLAR' && (
                <div className="p-5 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                      Google Scholar Profile URL
                    </label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                      <input
                        type="text" value={scholarUrl}
                        onChange={(e) => setScholarUrl(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                        placeholder="https://scholar.google.com/citations?user=…"
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5">We will analyze your profile to generate a professional summary.</p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => { setBioMode('VIEW'); setScholarUrl(''); }} disabled={bioSaving}
                      className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors"
                    >Cancel</button>
                    <button onClick={handleImportScholar} disabled={bioSaving || !scholarUrl}
                      className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium bg-brand-700 hover:bg-brand-800 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      {bioSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Import'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Profile;