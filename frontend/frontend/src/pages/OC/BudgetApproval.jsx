import React, { useState } from "react";
import { AlertTriangle, Filter, Download, Check, X, Eye, Loader, AlertCircle } from "lucide-react";
import Button from "../../ui/Button";
import { useBudget } from "../../hooks/oc/useBudget";

/* ===== STAT BADGE ===== */
const StatBadge = ({ icon: Icon, label, value, color }) => (
  <div className="flex items-center gap-2">
    <Icon size={16} color={color} />
    <span className="text-[14px] font-medium" style={{ color }}>
      {label}: <strong>{value}</strong>
    </span>
  </div>
);

/* ===== LOADING STATE ===== */
const LoadingState = () => (
  <div className="flex flex-col items-center justify-center h-64">
    <Loader className="animate-spin text-[#2563eb]" size={40} />
    <div className="text-[14px] text-[#64748b] mt-4">Loading budget requests...</div>
  </div>
);

/* ===== ERROR STATE ===== */
const ErrorState = ({ error, onRetry }) => (
  <div className="bg-[#fee2e2] border border-[#fca5a5] rounded-xl p-6">
    <div className="flex items-center gap-2 text-[#991b1b] mb-2">
      <AlertCircle size={20} />
      <strong className="text-[16px] font-semibold">Error loading budget requests</strong>
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
    <AlertTriangle size={48} className="text-[#cbd5e1] mx-auto mb-4" />
    <h3 className="text-[16px] font-semibold text-[#475569] mb-2">No budget requests found</h3>
    <p className="text-[14px] text-[#94a3b8]">There are no pending or processed budget requests</p>
  </div>
);

/* ===== STATUS BADGE ===== */
const StatusBadge = ({ status }) => {
  const config = {
    PENDING: { bg: "bg-[#fef3c7]", text: "text-[#d97706]", label: "Pending" },
    APPROVED: { bg: "bg-[#d1fae5]", text: "text-[#059669]", label: "Approved" },
    REJECTED: { bg: "bg-[#fee2e2]", text: "text-[#dc2626]", label: "Rejected" },
  };

  const style = config[status] || config.PENDING;

  return (
    <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
};

/* ===== MAIN COMPONENT ===== */
const BudgetApproval = () => {
  const conferenceId = 1;
  const [filters, setFilters] = useState({});
  const { requests, stats, loading, error, approve, reject, refetch } = useBudget(
    conferenceId,
    filters
  );
  const [actionLoading, setActionLoading] = useState(null);

  const handleApprove = async (requestId) => {
    setActionLoading(requestId);
    const result = await approve(requestId, {
      approvedBy: "Admin User",
      notes: "Approved via dashboard",
    });

    if (result.success) {
      alert("✅ Request approved successfully!");
    } else {
      alert(`❌ Failed: ${result.error}`);
    }
    setActionLoading(null);
  };

  const handleReject = async (requestId) => {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;

    setActionLoading(requestId);
    const result = await reject(requestId, {
      rejectedBy: "Admin User",
      reason: reason,
    });

    if (result.success) {
      alert("✅ Request rejected!");
    } else {
      alert(`❌ Failed: ${result.error}`);
    }
    setActionLoading(null);
  };

  const handleFilter = () => {
    const status = prompt("Filter by status (PENDING, APPROVED, REJECTED):");
    if (status) setFilters({ ...filters, status: status.toUpperCase() });
  };

  const handleExport = () => {
    alert("Export functionality - Coming soon!");
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <div>
      {/* HEADER */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-[28px] font-semibold text-[#1e293b] leading-tight mb-2">
            Budget Approval ⚠️
          </h1>
          <p className="text-[14px] text-[#64748b] leading-relaxed mb-3">
            Review and approve budget overrun requests
          </p>
          
          {/* Stats Summary */}
          <div className="flex gap-4">
            <StatBadge icon={AlertTriangle} label="Pending" value={stats.pending} color="#f59e0b" />
            <StatBadge icon={Check} label="Approved" value={stats.approved} color="#10b981" />
            <StatBadge icon={X} label="Rejected" value={stats.rejected} color="#ef4444" />
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" icon={Filter} onClick={handleFilter}>
            Filter
          </Button>
          <Button variant="secondary" icon={Download} onClick={handleExport}>
            Export
          </Button>
        </div>
      </div>

      {/* TABLE OR EMPTY */}
      {requests.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                {["ID", "Category", "Amount", "Reason", "Date", "Status", "Actions"].map((h) => (
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
              {requests.map((r, i) => (
                <tr
                  key={r.id}
                  className={`border-b border-[#e2e8f0] hover:bg-[#f8fafc] transition-colors ${
                    i === requests.length - 1 ? "border-b-0" : ""
                  }`}
                >
                  <td className="p-4 text-[14px] font-semibold text-[#2563eb]">#{r.id}</td>
                  <td className="p-4 text-[14px] text-[#334155]">{r.category}</td>
                  <td className="p-4 text-[14px] font-semibold text-[#1e293b]">
                    ${r.amount.toLocaleString()}
                  </td>
                  <td className="p-4 text-[14px] text-[#64748b] max-w-xs truncate">
                    {r.reason}
                  </td>
                  <td className="p-4 text-[13px] text-[#64748b]">{r.date}</td>
                  <td className="p-4">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="p-4">
                    {r.status === "PENDING" ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="success"
                          icon={Check}
                          onClick={() => handleApprove(r.id)}
                          disabled={actionLoading === r.id}
                        >
                          {actionLoading === r.id ? "..." : "Approve"}
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          icon={X}
                          onClick={() => handleReject(r.id)}
                          disabled={actionLoading === r.id}
                        >
                          {actionLoading === r.id ? "..." : "Reject"}
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="secondary" icon={Eye}>
                        View
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default BudgetApproval;
