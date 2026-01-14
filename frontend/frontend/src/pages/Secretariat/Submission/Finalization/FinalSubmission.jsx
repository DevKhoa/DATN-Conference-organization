import React, { useState, useEffect } from "react";
import Button from "../../../../ui/Button";
import Modal from "../../../../ui/Modal";
import { Upload, Eye, CheckCircle, XCircle, Loader, AlertCircle, Download } from "lucide-react";
import { usePapers } from "../../../../hooks/secretariat/usePapers";

const StatusBadge = ({ status }) => {
  const config = {
    Pending: { bg: "bg-amber-50", text: "text-amber-700", icon: Loader },
    Approved: { bg: "bg-green-50", text: "text-green-700", icon: CheckCircle },
    Rejected: { bg: "bg-red-50", text: "text-red-700", icon: XCircle },
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

const LoadingState = () => (
  <div className="flex flex-col items-center justify-center h-64">
    <Loader className="animate-spin text-blue-600" size={40} />
    <div className="text-sm text-slate-600 mt-4">Loading submissions...</div>
  </div>
);

const ErrorState = ({ error, onRetry }) => (
  <div className="bg-red-50 border border-red-200 rounded-xl p-6">
    <div className="flex items-center gap-2 text-red-900 mb-2">
      <AlertCircle size={20} />
      <strong className="text-base font-semibold">Error loading submissions</strong>
    </div>
    <p className="text-sm text-red-700 mb-4">{error}</p>
    <Button variant="secondary" onClick={onRetry}>Try Again</Button>
  </div>
);

const EmptyState = () => (
  <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
    <Upload size={48} className="text-slate-300 mx-auto mb-4" />
    <h3 className="text-base font-semibold text-slate-700 mb-2">No submissions yet</h3>
    <p className="text-sm text-slate-500">Final submissions will appear here once uploaded</p>
  </div>
);

const StatCard = ({ label, value, color }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
    <div className="text-xs text-slate-600 mb-1 uppercase tracking-wide font-medium">{label}</div>
    <div className="text-2xl font-bold" style={{ color }}>{value}</div>
  </div>
);

const PreviewModal = ({ submission, onClose, onApprove, onReject }) => {
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  if (!submission) return null;

  const handleReject = () => {
    if (!rejectReason.trim()) {
      alert("⚠️ Please enter a rejection reason");
      return;
    }
    onReject(submission.id, rejectReason);
    onClose();
  };

  return (
    <Modal isOpen={!!submission} onClose={onClose} title="Final Submission Preview">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-slate-600">Paper ID</label>
          <p className="text-slate-900 font-semibold">{submission.id}</p>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600">Title</label>
          <p className="text-slate-900">{submission.title}</p>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600">Author</label>
          <p className="text-slate-900">{submission.author}</p>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600">File</label>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-slate-900 flex-1">{submission.file}</p>
            <button
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
              onClick={() => window.open(submission.fileUrl, '_blank')}
            >
              <Download size={14} />
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600">Submitted Date</label>
          <p className="text-slate-900">{submission.submittedAt}</p>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600">Current Status</label>
          <div className="mt-1">
            <StatusBadge status={submission.status} />
          </div>
        </div>

        {showRejectForm && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Rejection Reason
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Please provide a detailed reason for rejection..."
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 mt-6">
        {!showRejectForm ? (
          <>
            <Button
              icon={CheckCircle}
              variant="success"
              onClick={() => {
                onApprove(submission.id);
                onClose();
              }}
            >
              Approve
            </Button>
            <Button
              icon={XCircle}
              variant="danger"
              onClick={() => setShowRejectForm(true)}
            >
              Reject
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={() => setShowRejectForm(false)}>
              Cancel
            </Button>
            <Button icon={XCircle} variant="danger" onClick={handleReject}>
              Confirm Rejection
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
};

const FinalSubmission = () => {
  const {
    finalSubmissions,
    submissionStats,
    loading,
    error,
    fetchFinalSubmissions,
    fetchSubmissionStats,
    approveFinalSubmission,
    rejectFinalSubmission,
  } = usePapers();

  const [selected, setSelected] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchFinalSubmissions();
    fetchSubmissionStats();
  }, [fetchFinalSubmissions, fetchSubmissionStats]);

  const handleView = (submission) => {
    setSelected(submission);
    setShowPreview(true);
  };

  const handleApprove = async (id) => {
    const result = await approveFinalSubmission(id);
    if (result.success) {
      alert(`✅ ${result.message}`);
      fetchFinalSubmissions();
      fetchSubmissionStats();
    }
  };

  const handleReject = async (id, reason) => {
    const result = await rejectFinalSubmission(id, reason);
    if (result.success) {
      alert(`✅ ${result.message}`);
      fetchFinalSubmissions();
      fetchSubmissionStats();
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={fetchFinalSubmissions} />;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">
            Final Submissions 📄
          </h1>
          <p className="text-sm text-slate-600">
            Manage final uploaded papers
          </p>
        </div>
        <Button icon={Upload}>Upload Final Version</Button>
      </div>

      {submissionStats && (
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Total" value={submissionStats.total} color="#64748b" />
          <StatCard label="Pending" value={submissionStats.pending} color="#f59e0b" />
          <StatCard label="Approved" value={submissionStats.approved} color="#10b981" />
          <StatCard label="Rejected" value={submissionStats.rejected} color="#ef4444" />
        </div>
      )}

      {!finalSubmissions || finalSubmissions.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {["ID", "Title", "Author", "File", "Submitted", "Status", "Actions"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {finalSubmissions.map((s, i) => (
                <tr
                  key={s.id}
                  className={`border-b border-slate-200 hover:bg-slate-50 transition-colors ${
                    i === finalSubmissions.length - 1 ? "border-b-0" : ""
                  }`}
                >
                  <td className="px-4 py-3 text-sm font-semibold text-blue-600">{s.id}</td>
                  <td className="px-4 py-3 text-sm text-slate-900">{s.title}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{s.author}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{s.file}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{s.submittedAt}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                      onClick={() => handleView(s)}
                    >
                      <Eye size={16} className="text-slate-600" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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

export default FinalSubmission;