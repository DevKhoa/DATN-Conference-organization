import React, { useState, useEffect } from "react";
import { Eye, Download, Filter, RefreshCw, Save, Edit, X, Loader, AlertCircle, FileText } from "lucide-react";
import Button from "../../../../ui/Button";
import { usePapers } from "../../../../hooks/secretariat/usePapers";

const TypeBadge = ({ type }) => {
  const config = {
    Oral: { bg: "bg-green-50", text: "text-green-700" },
    Poster: { bg: "bg-amber-50", text: "text-amber-700" },
  };
  const style = config[type] || config.Oral;
  return <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${style.bg} ${style.text}`}>{type}</span>;
};

const StatusBadge = ({ status }) => {
  const config = {
    Accepted: { bg: "bg-green-50", text: "text-green-700" },
    Conditional: { bg: "bg-amber-50", text: "text-amber-700" },
    Rejected: { bg: "bg-red-50", text: "text-red-700" },
  };
  const style = config[status] || config.Accepted;
  return <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${style.bg} ${style.text}`}>{status}</span>;
};

const TrackBadge = ({ track }) => (
  <span className="px-2.5 py-1 text-xs rounded-md bg-blue-50 text-blue-700 font-medium">{track}</span>
);

const LoadingState = () => (
  <div className="flex flex-col items-center justify-center h-64">
    <Loader className="animate-spin text-blue-600" size={40} />
    <div className="text-sm text-slate-600 mt-4">Loading papers...</div>
  </div>
);

const ErrorState = ({ error, onRetry }) => (
  <div className="bg-red-50 border border-red-200 rounded-xl p-6">
    <div className="flex items-center gap-2 text-red-900 mb-2">
      <AlertCircle size={20} />
      <strong className="text-base font-semibold">Error loading papers</strong>
    </div>
    <p className="text-sm text-red-700 mb-4">{error}</p>
    <Button variant="secondary" onClick={onRetry}>Try Again</Button>
  </div>
);

const EmptyState = () => (
  <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
    <FileText size={48} className="text-slate-300 mx-auto mb-4" />
    <h3 className="text-base font-semibold text-slate-700 mb-2">No accepted papers yet</h3>
    <p className="text-sm text-slate-500">Accepted papers will appear here</p>
  </div>
);

const StatCard = ({ label, value, color }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
    <div className="text-xs text-slate-600 mb-1 uppercase tracking-wide font-medium">{label}</div>
    <div className="text-2xl font-bold" style={{ color }}>{value}</div>
  </div>
);

const SidePanel = ({ paper, onClose }) => (
  <div className="fixed top-0 right-0 w-[400px] h-screen bg-white border-l border-slate-200 shadow-lg z-50 flex flex-col">
    <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200">
      <h3 className="text-base font-semibold text-slate-900">Paper Details</h3>
      <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-lg transition-colors">
        <X size={18} className="text-slate-600" />
      </button>
    </div>
    <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm">
      <div>
        <label className="text-xs font-medium text-slate-600">ID</label>
        <p className="text-slate-900 font-semibold">{paper.id}</p>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600">Title</label>
        <p className="text-slate-900">{paper.title}</p>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600">Authors</label>
        <p className="text-slate-900">{paper.authors}</p>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600">Keywords</label>
        <p className="text-slate-900">{paper.keywords}</p>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600">Track</label>
        <div className="mt-1"><TrackBadge track={paper.track} /></div>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600">Type</label>
        <div className="mt-1"><TypeBadge type={paper.type} /></div>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600">Status</label>
        <div className="mt-1"><StatusBadge status={paper.status} /></div>
      </div>
    </div>
    <div className="p-6 border-t border-slate-200 flex gap-2">
      <Button icon={Download} variant="secondary" className="flex-1">Download</Button>
      <Button icon={Edit} variant="secondary" className="flex-1">Add Notes</Button>
    </div>
  </div>
);

const PapersList = () => {
  const { papers, stats, loading, error, fetchPapers, fetchStats, downloadPaper, exportPapers } = usePapers();
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [filters, setFilters] = useState({ search: "", track: "", status: "" });

  useEffect(() => {
    fetchPapers(filters);
    fetchStats();
  }, [fetchPapers, fetchStats, filters]);

  const handleViewDetails = (paper) => {
    setSelectedPaper(paper);
    setShowDetailPanel(true);
  };

  const handleDownload = async (id) => {
    const result = await downloadPaper(id);
    if (result.success) {
      window.open(result.data.url, '_blank');
    }
  };

  const handleExport = async () => {
    const result = await exportPapers('xlsx');
    if (result.success) {
      alert('✅ Export completed!');
      window.open(result.data.url, '_blank');
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={() => fetchPapers(filters)} />;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">Accepted Papers 📄</h1>
          <p className="text-sm text-slate-600">Manage and organize all accepted papers</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={RefreshCw} onClick={() => fetchPapers(filters)}>Reload</Button>
          <Button variant="secondary" icon={Download} onClick={handleExport}>Export</Button>
          <Button icon={Save}>Save</Button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Total" value={stats.total} color="#64748b" />
          <StatCard label="Oral" value={stats.oral} color="#10b981" />
          <StatCard label="Poster" value={stats.poster} color="#f59e0b" />
          <StatCard label="Accepted" value={stats.accepted} color="#2563eb" />
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-slate-600" />
          <span className="text-sm font-semibold text-slate-900">Filters</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            placeholder="Search by author..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filters.track}
            onChange={(e) => setFilters({ ...filters, track: e.target.value })}
            className="px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Tracks</option>
            <option value="AI & ML">AI & ML</option>
            <option value="Blockchain">Blockchain</option>
            <option value="Quantum Computing">Quantum Computing</option>
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="Accepted">Accepted</option>
            <option value="Conditional">Conditional</option>
          </select>
        </div>
      </div>

      {!papers || papers.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {["ID", "Title", "Authors", "Track", "Type", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {papers.map((p, i) => (
                <tr key={p.id} className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${i === papers.length - 1 ? "border-b-0" : ""}`}>
                  <td className="px-4 py-3 text-sm font-semibold text-blue-600">{p.id}</td>
                  <td className="px-4 py-3 text-sm text-slate-900 max-w-xs">{p.title}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{p.authors}</td>
                  <td className="px-4 py-3"><TrackBadge track={p.track} /></td>
                  <td className="px-4 py-3"><TypeBadge type={p.type} /></td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors" onClick={() => handleViewDetails(p)}>
                        <Eye size={16} className="text-slate-600" />
                      </button>
                      <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors" onClick={() => handleDownload(p.id)}>
                        <Download size={16} className="text-slate-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showDetailPanel && selectedPaper && (
        <SidePanel paper={selectedPaper} onClose={() => setShowDetailPanel(false)} />
      )}
    </div>
  );
};

export default PapersList;