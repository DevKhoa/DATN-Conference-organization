import React, { useState } from "react";
import Button from "../../../../ui/Button";
import { Upload, Eye, CheckCircle, XCircle, Loader, AlertCircle, Download } from "lucide-react";

/* ===== STATUS BADGE ===== */
const StatusBadge = ({ status }) => {
  const config = {
    Pending: { bg: "bg-[#fef3c7]", text: "text-[#d97706]", icon: Loader },
    Approved: { bg: "bg-[#d1fae5]", text: "text-[#059669]", icon: CheckCircle },
    Rejected: { bg: "bg-[#fee2e2]", text: "text-[#dc2626]", icon: XCircle },
  };

  const style = config[status] || config.Pending;
  const Icon = style.icon;

  return (
    <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${style.bg} ${style.text} inline-flex items-center gap-1`}>
      <Icon size={12} />
      {status}
    </span>
  );
};

/* ===== LOADING STATE ===== */
const LoadingState = () => (
  <div className="flex flex-col items-center justify-center h-64">
    <Loader className="animate-spin text-[#2563eb]" size={40} />
    <div className="text-[14px] text-[#64748b] mt-4">Loading submissions...</div>
  </div>
);

/* ===== ERROR STATE ===== */
const ErrorState = ({ error, onRetry }) => (
  <div className="bg-[#fee2e2] border border-[#fca5a5] rounded-xl p-6">
    <div className="flex items-center gap-2 text-[#991b1b] mb-2">
      <AlertCircle size={20} />
      <strong className="text-[16px] font-semibold">Error loading submissions</strong>
    </div>
    <p className="text-[14px] text-[#dc2626] mb-4">{error}</p>
    <Button variant="secondary" onClick={onRetry}>Try Again</Button>
  </div>
);

/* ===== EMPTY STATE ===== */
const EmptyState = () => (
  <div className="bg-white border border-[#e2e8f0] rounded-xl p-12 text-center">
    <Upload size={48} className="text-[#cbd5e1] mx-auto mb-4" />
    <h3 className="text-[16px] font-semibold text-[#475569] mb-2">No submissions yet</h3>
    <p className="text-[14px] text-[#94a3b8]">Final submissions will appear here once uploaded</p>
  </div>
);

/* ===== STAT CARD ===== */
const StatCard = ({ label, value, color }) => (
  <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 text-center">
    <div className="text-[13px] text-[#64748b] mb-1 uppercase tracking-wide font-medium">{label}</div>
    <div className="text-[24px] font-bold" style={{ color }}>{value}</div>
  </div>
);

/* ===== PREVIEW MODAL ===== */
const PreviewModal = ({ submission, onClose, onApprove, onReject }) => {
  if (!submission) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 max-w-lg w-full m-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-[18px] font-semibold text-[#1e293b] mb-4">
          Final Submission Preview
        </h3>

        <div className="space-y-3 text-[14px]">
          <div>
            <label className="text-[13px] font-medium text-[#64748b]">Paper ID</label>
            <p className="text-[#1e293b] font-semibold">{submission.id}</p>
          </div>

          <div>
            <label className="text-[13px] font-medium text-[#64748b]">Title</label>
            <p className="text-[#1e293b]">{submission.title}</p>
          </div>

          <div>
            <label className="text-[13px] font-medium text-[#64748b]">Author</label>
            <p className="text-[#1e293b]">{submission.author}</p>
          </div>

          <div>
            <label className="text-[13px] font-medium text-[#64748b]">File</label>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-[#1e293b]">{submission.file}</p>
              <button className="text-[#2563eb] hover:text-[#1e40af]">
                <Download size={14} />
              </button>
            </div>
          </div>

          <div>
            <label className="text-[13px] font-medium text-[#64748b]">Current Status</label>
            <div className="mt-1">
              <StatusBadge status={submission.status} />
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <Button icon={CheckCircle} variant="success" onClick={onApprove} className="flex-1">
            Approve
          </Button>
          <Button icon={XCircle} variant="danger" onClick={onReject} className="flex-1">
            Reject
          </Button>
        </div>
      </div>
    </div>
  );
};

/* ===== MAIN COMPONENT ===== */
const FinalSubmissionView = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const submissions = [
    { id: "P001", title: "Deep Learning for Imaging", author: "Smith J.", status: "Pending", file: "P001_final.pdf" },
    { id: "P002", title: "Blockchain Transparency", author: "Park S.", status: "Approved", file: "P002_final.pdf" },
    { id: "P003", title: "Quantum Optimization", author: "Chen W.", status: "Rejected", file: "P003_final.pdf" },
    { id: "P004", title: "Federated Learning", author: "Lee K.", status: "Approved", file: "P004_final.pdf" },
  ];

  const stats = {
    total: submissions.length,
    pending: submissions.filter(s => s.status === "Pending").length,
    approved: submissions.filter(s => s.status === "Approved").length,
    rejected: submissions.filter(s => s.status === "Rejected").length,
  };

  const handleView = (submission) => {
    setSelected(submission);
    setShowPreview(true);
  };

  const handleApprove = () => {
    alert(`✅ ${selected.id} approved!`);
    setShowPreview(false);
    setSelected(null);
  };

  const handleReject = () => {
    alert(`❌ ${selected.id} rejected!`);
    setShowPreview(false);
    setSelected(null);
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={() => setError(null)} />;

  return (
    <div>
      {/* HEADER */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-[28px] font-semibold text-[#1e293b] leading-tight mb-2">
            Final Submissions 📄
          </h1>
          <p className="text-[14px] text-[#64748b] leading-relaxed">
            Manage final uploaded papers
          </p>
        </div>

        <Button icon={Upload}>Upload Final Version</Button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Total" value={stats.total} color="#64748b" />
        <StatCard label="Pending" value={stats.pending} color="#f59e0b" />
        <StatCard label="Approved" value={stats.approved} color="#10b981" />
        <StatCard label="Rejected" value={stats.rejected} color="#ef4444" />
      </div>

      {/* TABLE OR EMPTY */}
      {submissions.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                {["ID", "Title", "Author", "File", "Status", "Actions"].map((h) => (
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
              {submissions.map((s, i) => (
                <tr
                  key={s.id}
                  className={`border-b border-[#e2e8f0] hover:bg-[#f8fafc] transition-colors ${
                    i === submissions.length - 1 ? "border-b-0" : ""
                  }`}
                >
                  <td className="p-4 text-[14px] font-semibold text-[#2563eb]">{s.id}</td>
                  <td className="p-4 text-[14px] text-[#334155]">{s.title}</td>
                  <td className="p-4 text-[14px] text-[#64748b]">{s.author}</td>
                  <td className="p-4 text-[13px] text-[#64748b]">{s.file}</td>
                  <td className="p-4">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="p-4">
                    <button
                      className="p-2 border border-[#e2e8f0] rounded-lg hover:bg-[#f8fafc] transition-colors"
                      onClick={() => handleView(s)}
                    >
                      <Eye size={16} className="text-[#64748b]" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* PREVIEW MODAL */}
      {showPreview && (
        <PreviewModal
          submission={selected}
          onClose={() => {
            setShowPreview(false);
            setSelected(null);
          }}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </div>
  );
};

export default FinalSubmissionView;