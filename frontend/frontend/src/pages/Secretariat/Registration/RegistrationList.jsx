import React, { useState, useEffect } from "react";
import { Calendar, CheckCircle, Loader, XCircle, Eye, Search } from "lucide-react";
import { useRegistration } from "../../../hooks/secretariat/useRegistration";

// Reusable Components
const LoadingState = () => (
  <div className="flex items-center justify-center h-64">
    <div className="flex flex-col items-center gap-3">
      <Loader className="w-8 h-8 animate-spin text-blue-600" />
      <p className="text-sm text-slate-600">Loading registrations...</p>
    </div>
  </div>
);

const ErrorState = ({ error, onRetry }) => (
  <div className="flex items-center justify-center h-64">
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
        <XCircle className="w-6 h-6 text-red-600" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">Error Loading Data</h3>
      <p className="text-sm text-slate-600 mb-4">{error}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
      >
        Try Again
      </button>
    </div>
  </div>
);

const EmptyState = () => (
  <div className="flex items-center justify-center h-64">
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-4">
        <Calendar className="w-6 h-6 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">No Registrations Found</h3>
      <p className="text-sm text-slate-600">No registrations match your current filters.</p>
    </div>
  </div>
);

const StatCard = ({ label, value, color = "blue" }) => {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    green: "bg-green-50 text-green-700",
    slate: "bg-slate-50 text-slate-700",
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="text-sm font-medium text-slate-600 mb-1">{label}</div>
      <div className={`text-2xl font-semibold ${colorClasses[color]}`}>{value}</div>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const statusConfig = {
    pending: { color: "bg-amber-100 text-amber-700", label: "Pending" },
    approved: { color: "bg-green-100 text-green-700", label: "Approved" },
    rejected: { color: "bg-red-100 text-red-700", label: "Rejected" },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
};

const PaymentBadge = ({ payment }) => {
  const config = payment === "paid"
    ? { color: "bg-green-100 text-green-700", label: "Paid" }
    : { color: "bg-red-100 text-red-700", label: "Unpaid" };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
};

const RegistrationList = () => {
  const {
    registrations,
    stats,
    loading,
    error,
    fetchRegistrations,
    fetchStats,
    approveRegistration,
    rejectRegistration,
  } = useRegistration();

  const [filters, setFilters] = useState({
    status: "",
    payment: "",
    search: "",
  });

  const [actionLoading, setActionLoading] = useState(null);

  // Fetch data on mount and when filters change
  useEffect(() => {
    fetchRegistrations(filters);
    fetchStats();
  }, [fetchRegistrations, fetchStats, filters]);

  const handleApprove = async (id) => {
    setActionLoading(id);
    const result = await approveRegistration(id);
    setActionLoading(null);
    
    if (result.success) {
      alert("Registration approved successfully!");
    } else {
      alert(`Failed to approve: ${result.error}`);
    }
  };

  const handleReject = async (id) => {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;

    setActionLoading(id);
    const result = await rejectRegistration(id, reason);
    setActionLoading(null);
    
    if (result.success) {
      alert("Registration rejected successfully!");
    } else {
      alert(`Failed to reject: ${result.error}`);
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <ErrorState error={error} onRetry={() => fetchRegistrations(filters)} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Registration Management</h1>
        <p className="text-sm text-slate-600 mt-1">Review and manage participant registrations</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="Total Registrations" value={stats.total} color="slate" />
          <StatCard label="Pending Review" value={stats.pending} color="amber" />
          <StatCard label="Approved" value={stats.approved} color="green" />
          <StatCard label="Paid" value={stats.paid} color="blue" />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            value={filters.payment}
            onChange={(e) => setFilters({ ...filters, payment: e.target.value })}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Payment</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
          <button
            onClick={() => setFilters({ status: "", payment: "", search: "" })}
            className="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {loading ? (
          <LoadingState />
        ) : registrations.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">ID</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">Name</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">Email</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">Ticket</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">Payment</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {registrations.map((reg) => (
                  <tr key={reg.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{reg.id}</td>
                    <td className="px-6 py-4 text-sm text-slate-900">{reg.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{reg.email}</td>
                    <td className="px-6 py-4 text-sm text-slate-900">{reg.ticket}</td>
                    <td className="px-6 py-4">
                      <PaymentBadge payment={reg.payment} />
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={reg.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {reg.status === "pending" && (
                          <>
                            <button
                              onClick={() => handleApprove(reg.id)}
                              disabled={actionLoading === reg.id}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {actionLoading === reg.id ? (
                                <Loader className="w-4 h-4 animate-spin" />
                              ) : (
                                <CheckCircle className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => handleReject(reg.id)}
                              disabled={actionLoading === reg.id}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegistrationList;