import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Upload, FileText, CheckCircle, AlertCircle,
  Search, User, Loader2, ChevronRight, BookOpen, Layers, Calendar, MapPin
} from 'lucide-react';
import Button from '../components/ui/Button';
import { supabase } from '../lib/supabase';

interface SubmitPaperProps {
  userEmail: string;
  userRoleId: number;
  onNavigateBack: () => void;
}

const BASE_API_URL = "http://localhost:8080";

const SubmitPaper: React.FC<SubmitPaperProps> = ({ userEmail, userRoleId, onNavigateBack }) => {
  // --- Access Control ---
  const isAuthorized = [1, 2, 3].includes(userRoleId);

  // --- State ---
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Data Lists
  const [conferences, setConferences] = useState<any[]>([]);
  const [authors, setAuthors] = useState<any[]>([]);
  const [existingPapers, setExistingPapers] = useState<any[]>([]);

  // Search States
  const [confSearch, setConfSearch] = useState(''); // <--- MỚI: State tìm kiếm hội nghị
  const [authorSearch, setAuthorSearch] = useState('');
  const [paperSearch, setPaperSearch] = useState('');

  // Selections & Inputs
  const [selectedConfId, setSelectedConfId] = useState<number | null>(null);
  const [submissionType, setSubmissionType] = useState<'NEW' | 'VERSION'>('NEW');

  // Step 2: New Paper Form
  const [paperTitle, setPaperTitle] = useState('');
  const [paperAbstract, setPaperAbstract] = useState('');
  const [selectedAuthorId, setSelectedAuthorId] = useState<number | null>(null);
  const [coAuthorSearch, setCoAuthorSearch] = useState('');
  const [selectedCoAuthors, setSelectedCoAuthors] = useState<any[]>([]);

  // Step 2: Existing Paper Selection
  const [selectedPaperId, setSelectedPaperId] = useState<number | null>(null);

  // Step 3: File Upload
  const [file, setFile] = useState<File | null>(null);
  const [displayVersion, setDisplayVersion] = useState(true);

  // --- Initialization ---
  useEffect(() => {
    if (isAuthorized && userEmail) {
      fetchCurrentUser();
      fetchOpenConferences();
      fetchAuthors();
    }
  }, [userEmail, userRoleId]);

  useEffect(() => {
    if (selectedConfId && submissionType === 'VERSION') {
      fetchExistingPapers(selectedConfId);
    }
  }, [selectedConfId, submissionType]);

  // --- Data Fetching ---
  const fetchCurrentUser = async () => {
    try {
      const { data } = await supabase.from('users').select('user_id').eq('email', userEmail).single();
      if (data) setCurrentUserId(data.user_id);
    } catch (e) { console.error(e); }
  };

  const fetchOpenConferences = async () => {
    try {
      const { data } = await supabase
        .from('conferences')
        .select('conf_id, conf_name, start_date, location')
        .eq('open_for_papers', true)
        .order('create_time', { ascending: false });
      if (data) setConferences(data);
    } catch (e) { console.error(e); }
  };

  const fetchAuthors = async () => {
    try {
      const { data } = await supabase.from('users').select('user_id, full_name, email, organization').order('full_name');
      if (data) setAuthors(data);
    } catch (e) { console.error(e); }
  };

  const fetchExistingPapers = async (confId: number) => {
    try {
      const { data } = await supabase
        .from('papers')
        .select('paper_id, title, author:users!primary_author_id(full_name)')
        .eq('submitted_conf', confId);
      if (data) setExistingPapers(data);
    } catch (e) { console.error(e); }
  };

  // --- Logic Handlers ---
  const handleCreatePaper = async () => {
    if (!paperTitle || !paperAbstract || !selectedAuthorId || !selectedConfId) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true); setError('');
    try {
      const { data, error } = await supabase
        .from('papers')
        .insert([{
          title: paperTitle,
          abstract: paperAbstract,
          primary_author_id: selectedAuthorId,
          status: 'UNDER_REVIEW',
          submitted_conf: selectedConfId,
          created_at: new Date().toISOString()
        }])
        .select().single();
      if (error) throw error;

      if (selectedCoAuthors.length > 0) {
        const coAuthorInserts = selectedCoAuthors.map((ca, index) => ({
          paper_id: data.paper_id,
          user_id: ca.user_id,
          author_order: index + 2
        }));
        const { error: coError } = await supabase.from('paper_coauthors').insert(coAuthorInserts);
        if (coError) throw coError;
      }

      setSelectedPaperId(data.paper_id);
      setStep(3);
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const handleUploadVersion = async () => {
    if (!file || !selectedPaperId || !currentUserId) { setError("Please select a file."); return; }
    setLoading(true); setError('');
    try {
      const { count } = await supabase.from('paper_versions').select('*', { count: 'exact', head: true }).eq('paper_id', selectedPaperId);
      const newVersionNum = (count || 0) + 1;

      const { data: versionData, error: dbError } = await supabase
        .from('paper_versions')
        .insert([{
          paper_id: selectedPaperId, version_number: newVersionNum, upload_by: currentUserId,
          upload_date: new Date().toISOString(), display: displayVersion, is_final: false, format_ok: false, file_path: 'pending_upload'
        }]).select().single();
      if (dbError) throw dbError;

      const formData = new FormData(); formData.append('file', file);
      const response = await fetch(`${BASE_API_URL}/papers/${selectedPaperId}/${versionData.version_id}/upload`, { method: 'POST', body: formData });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Upload failed.");

      if (result.url) {
        await supabase.from('paper_versions').update({ file_path: result.url }).eq('version_id', versionData.version_id);
      }
      setSuccess(true);
      setTimeout(() => onNavigateBack(), 2000);
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const handleSkipUpload = () => {
    setSuccess(true);
    setTimeout(() => onNavigateBack(), 2000);
  };

  // --- Helpers ---
  // Lọc hội nghị theo search
  const filteredConferences = conferences.filter(c =>
    c.conf_name.toLowerCase().includes(confSearch.toLowerCase()) ||
    (c.location && c.location.toLowerCase().includes(confSearch.toLowerCase()))
  );

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-slate-200">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900">Access Denied</h2>
          <Button onClick={onNavigateBack} className="mt-6">Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Submit Paper</h1>
            <p className="text-slate-500 mt-1">
              {step === 1 && "Select a conference to begin."}
              {step === 2 && "Enter paper details."}
              {step === 3 && "Upload paper file."}
            </p>
          </div>
          <Button variant="ghost" onClick={onNavigateBack}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Cancel
          </Button>
        </div>

        {/* Progress Bar */}
        {!success && (
          <div className="mb-8">
            <div className="flex items-center justify-between relative">
              <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-slate-200 -z-0"></div>
              {[1, 2, 3].map((s) => (
                <div key={s} className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${step >= s ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}>
                  {s}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Success / Error Messages */}
        {success && (
          <div className="bg-white rounded-xl shadow-sm border border-green-100 p-12 text-center animate-in fade-in zoom-in-95">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Submission Successful!</h2>
            <p className="text-slate-500">Redirecting...</p>
          </div>
        )}
        {!success && error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-3 text-sm border border-red-100 animate-in fade-in">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" /> <span>{error}</span>
          </div>
        )}

        {/* --- STEP 1: SELECT CONFERENCE --- */}
        {!success && step === 1 && (
          <div className="space-y-4 animate-in slide-in-from-right-4">

            {/* THANH TÌM KIẾM HỘI NGHỊ (MỚI) */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                value={confSearch}
                onChange={(e) => setConfSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 shadow-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-slate-700"
                placeholder="Search conferences by name or location..."
              />
            </div>

            {/* Danh sách Hội nghị */}
            <div className="space-y-3">
              {conferences.length === 0 ? (
                <div className="p-8 bg-white rounded-xl text-center border border-dashed border-slate-300">
                  <p className="text-slate-500">No conferences are currently accepting submissions.</p>
                </div>
              ) : filteredConferences.length === 0 ? (
                /* Hiển thị khi tìm kiếm không thấy kết quả */
                <div className="p-8 text-center text-slate-500">
                  <Search className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p>No conferences found matching "{confSearch}"</p>
                </div>
              ) : (
                filteredConferences.map(conf => (
                  <div
                    key={conf.conf_id}
                    onClick={() => { setSelectedConfId(conf.conf_id); setStep(2); }}
                    className="group bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-brand-400 hover:shadow-md cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-brand-700">{conf.conf_name}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                        <span className="flex items-center"><Calendar className="w-3.5 h-3.5 mr-1" /> {new Date(conf.start_date).toLocaleDateString()}</span>
                        {conf.location && (
                          <span className="flex items-center"><MapPin className="w-3.5 h-3.5 mr-1" /> {conf.location}</span>
                        )}
                        <span className="flex items-center text-green-600 bg-green-50 px-2 py-0.5 rounded-full text-xs font-medium border border-green-100">
                          Open
                        </span>
                      </div>
                    </div>
                    <div className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 group-hover:bg-brand-50 transition-colors">
                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-brand-600" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* --- STEP 2: DETAILS --- */}
        {!success && step === 2 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8 animate-in slide-in-from-right-4">
            {/* Toggle Type */}
            <div className="flex p-1 bg-slate-100 rounded-lg mb-8">
              <button onClick={() => setSubmissionType('NEW')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${submissionType === 'NEW' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <span className="flex items-center justify-center gap-2"><FileText className="w-4 h-4" /> New Paper</span>
              </button>
              <button onClick={() => setSubmissionType('VERSION')} className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${submissionType === 'VERSION' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <span className="flex items-center justify-center gap-2"><Layers className="w-4 h-4" /> New Version</span>
              </button>
            </div>

            {/* Form A: New Paper */}
            {submissionType === 'NEW' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Paper Title</label>
                  <input type="text" value={paperTitle} onChange={e => setPaperTitle(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none" placeholder="Enter the full title" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Abstract</label>
                  <textarea rows={5} value={paperAbstract} onChange={e => setPaperAbstract(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none resize-none" placeholder="Enter paper abstract..." />
                </div>

                {/* Author Search */}
                <div className="relative">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Primary Author</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input type="text" value={authorSearch} onChange={e => { setAuthorSearch(e.target.value); setSelectedAuthorId(null); }} className={`w-full pl-10 pr-4 py-2.5 rounded-lg border outline-none ${selectedAuthorId ? 'border-green-500 bg-green-50' : 'border-slate-300 focus:ring-2 focus:ring-brand-500'}`} placeholder="Search author by name..." />
                    {selectedAuthorId && <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 w-5 h-5" />}
                  </div>
                  {authorSearch && !selectedAuthorId && (
                    <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                      {authors.filter(a => a.full_name.toLowerCase().includes(authorSearch.toLowerCase())).map(author => (
                        <div key={author.user_id} onClick={() => { setSelectedAuthorId(author.user_id); setAuthorSearch(author.full_name); }} className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm text-slate-700 border-b border-slate-50 last:border-0">
                          <div className="font-medium">{author.full_name}</div>
                          <div className="text-xs text-slate-400">{author.email}</div>
                        </div>
                      ))}
                      {authors.filter(a => a.full_name.toLowerCase().includes(authorSearch.toLowerCase())).length === 0 && <div className="px-4 py-3 text-sm text-slate-500 italic">No authors found.</div>}
                    </div>
                  )}
                </div>

                {/* Co-Authors Search */}
                <div className="relative mt-4">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Co-Authors (Optional)</label>

                  {selectedCoAuthors.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {selectedCoAuthors.map(ca => (
                        <span key={ca.user_id} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-brand-50 text-brand-700 border border-brand-200">
                          {ca.full_name}
                          <button onClick={() => setSelectedCoAuthors(prev => prev.filter(c => c.user_id !== ca.user_id))} className="ml-1.5 text-brand-500 hover:text-brand-800">&times;</button>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input type="text" value={coAuthorSearch} onChange={e => setCoAuthorSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 outline-none" placeholder="Search co-author by name..." />
                  </div>
                  {coAuthorSearch && (
                    <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                      {authors.filter(a =>
                        a.full_name.toLowerCase().includes(coAuthorSearch.toLowerCase()) &&
                        a.user_id !== selectedAuthorId &&
                        !selectedCoAuthors.find(c => c.user_id === a.user_id)
                      ).map(author => (
                        <div key={author.user_id} onClick={() => { setSelectedCoAuthors(prev => [...prev, author]); setCoAuthorSearch(''); }} className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm text-slate-700 border-b border-slate-50 last:border-0">
                          <div className="font-medium">{author.full_name}</div>
                          <div className="text-xs text-slate-400">{author.email}</div>
                        </div>
                      ))}
                      {authors.filter(a => a.full_name.toLowerCase().includes(coAuthorSearch.toLowerCase()) && a.user_id !== selectedAuthorId && !selectedCoAuthors.find(c => c.user_id === a.user_id)).length === 0 && <div className="px-4 py-3 text-sm text-slate-500 italic">No available authors found.</div>}
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={handleCreatePaper} disabled={loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Next Step"}</Button>
                </div>
              </div>
            )}

            {/* Form B: Version */}
            {submissionType === 'VERSION' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Select Existing Paper</label>
                  <div className="relative">
                    <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input type="text" value={paperSearch} onChange={e => { setPaperSearch(e.target.value); setSelectedPaperId(null); }} className={`w-full pl-10 pr-4 py-2.5 rounded-lg border outline-none ${selectedPaperId ? 'border-green-500 bg-green-50' : 'border-slate-300 focus:ring-2 focus:ring-brand-500'}`} placeholder="Search paper title..." />
                    {selectedPaperId && <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 w-5 h-5" />}
                  </div>
                  {paperSearch && !selectedPaperId && (
                    <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                      {existingPapers.filter(p => p.title.toLowerCase().includes(paperSearch.toLowerCase())).map(paper => (
                        <div key={paper.paper_id} onClick={() => { setSelectedPaperId(paper.paper_id); setPaperSearch(paper.title); }} className="px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm text-slate-700 border-b border-slate-50 last:border-0">
                          <div className="font-medium line-clamp-1">{paper.title}</div>
                          <div className="text-xs text-slate-400">Author: {paper.author?.full_name}</div>
                        </div>
                      ))}
                      {existingPapers.filter(p => p.title.toLowerCase().includes(paperSearch.toLowerCase())).length === 0 && <div className="px-4 py-3 text-sm text-slate-500 italic">No papers found.</div>}
                    </div>
                  )}
                </div>
                <div className="flex justify-end pt-4">
                  <Button onClick={() => selectedPaperId && setStep(3)} disabled={!selectedPaperId}>Next Step</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- STEP 3: UPLOAD --- */}
        {!success && step === 3 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8 animate-in slide-in-from-right-4">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-brand-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Upload PDF</h2>
            </div>

            <div className="space-y-6 max-w-md mx-auto">
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-8 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative">
                <input type="file" accept="application/pdf" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                {file ? (
                  <div className="text-center">
                    <FileText className="w-10 h-10 text-brand-600 mx-auto mb-2" />
                    <p className="font-bold text-slate-900">{file.name}</p>
                    <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="font-medium text-slate-700">Click to Browse</p>
                    <p className="text-xs text-slate-400 mt-1">PDF Only (Max 10MB)</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center">
                <label className="flex items-center cursor-pointer">
                  <input type="checkbox" checked={displayVersion} onChange={e => setDisplayVersion(e.target.checked)} className="rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                  <span className="ml-2 text-sm text-slate-700">Display this version in archive?</span>
                </label>
              </div>

              <div className="flex gap-4">
                <Button onClick={handleSkipUpload} variant="outline" className="flex-1" size="lg" disabled={loading}>Skip Upload</Button>
                <Button onClick={handleUploadVersion} className="flex-1" size="lg" disabled={loading || !file}>{loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : "Submit Paper"}</Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default SubmitPaper;