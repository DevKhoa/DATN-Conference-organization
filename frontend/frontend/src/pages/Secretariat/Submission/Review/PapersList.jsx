import React, { useState } from "react";
import {
  Eye,
  Download,
  Filter,
  RefreshCw,
  Save,
  Edit,
  X,
  Loader,
  AlertCircle,
  FileText,
} from "lucide-react";
import Button from "../../../../ui/Button";

/* ===== TYPE BADGE ===== */
const TypeBadge = ({ type }) => {
  const config = {
    Oral: { bg: "bg-[#d1fae5]", text: "text-[#059669]" },
    Poster: { bg: "bg-[#fef3c7]", text: "text-[#d97706]" },
  };

  const style = config[type] || config.Oral;

  return (
    <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${style.bg} ${style.text}`}>
      {type}
    </span>
  );
};

/* ===== STATUS BADGE ===== */
const StatusBadge = ({ status }) => {
  const config = {
    Accepted: { bg: "bg-[#d1fae5]", text: "text-[#059669]" },
    Conditional: { bg: "bg-[#fef3c7]", text: "text-[#d97706]" },
    Rejected: { bg: "bg-[#fee2e2]", text: "text-[#dc2626]" },
  };

  const style = config[status] || config.Accepted;

  return (
    <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${style.bg} ${style.text}`}>
      {status}
    </span>
  );
};

/* ===== TRACK BADGE ===== */
const TrackBadge = ({ track }) => (
  <span className="px-2.5 py-1 text-xs rounded-md bg-[#dbeafe] text-[#1e40af] font-medium">
    {track}
  </span>
);

/* ===== LOADING STATE ===== */
const LoadingState = () => (
  <div className="flex flex-col items-center justify-center h-64">
    <Loader className="animate-spin text-[#2563eb]" size={40} />
    <div className="text-[14px] text-[#64748b] mt-4">Loading papers...</div>
  </div>
);

/* ===== ERROR STATE ===== */
const ErrorState = ({ error, onRetry }) => (
  <div className="bg-[#fee2e2] border border-[#fca5a5] rounded-xl p-6">
    <div className="flex items-center gap-2 text-[#991b1b] mb-2">
      <AlertCircle size={20} />
      <strong className="text-[16px] font-semibold">Error loading papers</strong>
    </div>
    <p className="text-[14px] text-[#dc2626] mb-4">{error}</p>
    <Button variant="secondary" onClick={onRetry}>
      Try Again
    </Button>
  </div>
);

/* ===== EMPTY STATE ===== */
const EmptyState = () => (
  <div className="bg-white border border-[#e2e8f0] rounded-xl p-12 text-center">
    <FileText size={48} className="text-[#cbd5e1] mx-auto mb-4" />
    <h3 className="text-[16px] font-semibold text-[#475569] mb-2">No accepted papers yet</h3>
    <p className="text-[14px] text-[#94a3b8]">Accepted papers will appear here</p>
  </div>
);

/* ===== STAT CARD ===== */
const StatCard = ({ label, value, color }) => (
  <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 text-center">
    <div className="text-[13px] text-[#64748b] mb-1 uppercase tracking-wide font-medium">
      {label}
    </div>
    <div className="text-[24px] font-bold" style={{ color }}>
      {value}
    </div>
  </div>
);

/* ===== SIDE PANEL ===== */
const SidePanel = ({ paper, onClose }) => (
  <div className="fixed top-0 right-0 w-[400px] h-screen bg-white border-l border-[#e2e8f0] shadow-lg z-50 flex flex-col">
    <div className="flex justify-between items-center px-6 py-4 border-b border-[#e2e8f0]">
      <h3 className="text-[16px] font-semibold text-[#1e293b]">Paper Details</h3>
      <button
        onClick={onClose}
        className="p-2 hover:bg-[#f8fafc] rounded-lg transition-colors"
      >
        <X size={18} className="text-[#64748b]" />
      </button>
    </div>

    <div className="flex-1 overflow-y-auto p-6 space-y-4 text-[14px]">
      <div>
        <label className="text-[13px] font-medium text-[#64748b]">ID</label>
        <p className="text-[#1e293b] font-semibold">{paper.id}</p>
      </div>

      <div>
        <label className="text-[13px] font-medium text-[#64748b]">Title</label>
        <p className="text-[#1e293b]">{paper.title}</p>
      </div>

      <div>
        <label className="text-[13px] font-medium text-[#64748b]">Authors</label>
        <p className="text-[#1e293b]">{paper.authors}</p>
      </div>

      <div>
        <label className="text-[13px] font-medium text-[#64748b]">Keywords</label>
        <p className="text-[#1e293b]">{paper.keywords}</p>
      </div>

      <div>
        <label className="text-[13px] font-medium text-[#64748b]">Track</label>
        <div className="mt-1">
          <TrackBadge track={paper.track} />
        </div>
      </div>

      <div>
        <label className="text-[13px] font-medium text-[#64748b]">Type</label>
        <div className="mt-1">
          <TypeBadge type={paper.type} />
        </div>
      </div>

      <div>
        <label className="text-[13px] font-medium text-[#64748b]">Status</label>
        <div className="mt-1">
          <StatusBadge status={paper.status} />
        </div>
      </div>
    </div>

    <div className="p-6 border-t border-[#e2e8f0] flex gap-2">
      <Button icon={Download} variant="secondary" className="flex-1">
        Download
      </Button>
      <Button icon={Edit} variant="secondary" className="flex-1">
        Add Notes
      </Button>
    </div>
  </div>
);

/* ===== MAIN COMPONENT ===== */
const PapersListView = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState(null);

  const papers = [
    {
      id: "P001",
      title: "Deep Learning Approaches for Medical Image Analysis",
      authors: "Smith J., Lee K., Zhang M.",
      track: "AI & ML",
      keywords: "deep learning, medical imaging, CNN",
      type: "Oral",
      status: "Accepted",
    },
    {
      id: "P002",
      title: "Blockchain-based Supply Chain Transparency",
      authors: "Park S., Anderson M.",
      track: "Blockchain",
      keywords: "blockchain, supply chain",
      type: "Oral",
      status: "Accepted",
    },
    {
      id: "P003",
      title: "Quantum Computing for Optimization Problems",
      authors: "Chen W., Liu Y.",
      track: "Quantum Computing",
      keywords: "quantum, optimization",
      type: "Poster",
      status: "Conditional",
    },
  ];

  const stats = {
    total: papers.length,
    oral: papers.filter((p) => p.type === "Oral").length,
    poster: papers.filter((p) => p.type === "Poster").length,
    accepted: papers.filter((p) => p.status === "Accepted").length,
  };

  const handleViewDetails = (paper) => {
    setSelectedPaper(paper);
    setShowDetailPanel(true);
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={() => setError(null)} />;

  return (
    <div>
      {/* HEADER */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-[28px] font-semibold text-[#1e293b] leading-tight mb-2">
            Accepted Papers 📄
          </h1>
          <p className="text-[14px] text-[#64748b] leading-relaxed">
            Manage and organize all accepted papers
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" icon={RefreshCw}>
            Reload
          </Button>
          <Button variant="secondary" icon={Download}>
            Export
          </Button>
          <Button icon={Save}>Save</Button>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Total" value={stats.total} color="#64748b" />
        <StatCard label="Oral" value={stats.oral} color="#10b981" />
        <StatCard label="Poster" value={stats.poster} color="#f59e0b" />
        <StatCard label="Accepted" value={stats.accepted} color="#2563eb" />
      </div>

      {/* FILTERS */}
      <div className="bg-white border border-[#e2e8f0] rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={18} className="text-[#64748b]" />
          <span className="text-[14px] font-semibold text-[#1e293b]">Filters</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            placeholder="Search by author..."
            className="px-4 py-2.5 border border-[#e2e8f0] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
          />
          <select className="px-4 py-2.5 border border-[#e2e8f0] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2563eb]">
            <option>All Tracks</option>
            <option>AI & ML</option>
            <option>Blockchain</option>
          </select>
          <select className="px-4 py-2.5 border border-[#e2e8f0] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2563eb]">
            <option>All Status</option>
            <option>Accepted</option>
            <option>Conditional</option>
          </select>
        </div>
      </div>

      {/* TABLE OR EMPTY */}
      {papers.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                {["ID", "Title", "Authors", "Track", "Type", "Status", "Actions"].map((h) => (
                  <th
                    key={h}
                    className="p-4 text-left text-[13px] font-semibold text-[#64748b] uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {papers.map((p, i) => (
                <tr
                  key={p.id}
                  className={`border-b border-[#e2e8f0] hover:bg-[#f8fafc] transition-colors ${
                    i === papers.length - 1 ? "border-b-0" : ""
                  }`}
                >
                  <td className="p-4 text-[14px] font-semibold text-[#2563eb]">{p.id}</td>
                  <td className="p-4 text-[14px] text-[#334155] max-w-xs">{p.title}</td>
                  <td className="p-4 text-[14px] text-[#64748b]">{p.authors}</td>
                  <td className="p-4">
                    <TrackBadge track={p.track} />
                  </td>
                  <td className="p-4">
                    <TypeBadge type={p.type} />
                  </td>
                  <td className="p-4">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button
                        className="p-2 border border-[#e2e8f0] rounded-lg hover:bg-[#f8fafc] transition-colors"
                        onClick={() => handleViewDetails(p)}
                      >
                        <Eye size={16} className="text-[#64748b]" />
                      </button>
                      <button className="p-2 border border-[#e2e8f0] rounded-lg hover:bg-[#f8fafc] transition-colors">
                        <Download size={16} className="text-[#64748b]" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SIDE PANEL */}
      {showDetailPanel && selectedPaper && (
        <SidePanel
          paper={selectedPaper}
          onClose={() => setShowDetailPanel(false)}
        />
      )}
    </div>
  );
};

export default PapersListView;
