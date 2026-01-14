import React from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertCircle,
  Loader,
} from "lucide-react";
import Button from "../../ui/Button";
import { useFinancial } from "../../hooks/oc/useFinancial";

/* ===== STAT CARD ===== */
const StatCard = ({ icon: Icon, label, value, change, trend, color }) => (
  <div className="bg-white border border-[#e2e8f0] rounded-xl p-6 hover:shadow-md transition-all duration-200">
    <div className="flex justify-between items-start mb-4">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: `${color}15` }}
      >
        <Icon size={24} color={color} />
      </div>

      {change && (
        <div
          className={`flex items-center gap-1 text-[13px] font-semibold ${
            trend === "up" ? "text-[#10b981]" : "text-[#ef4444]"
          }`}
        >
          {trend === "up" ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          {change}
        </div>
      )}
    </div>

    <div className="text-[13px] text-[#64748b] mb-1.5 uppercase tracking-wide font-medium">
      {label}
    </div>
    <div className="text-[28px] font-bold text-[#1e293b]" style={{ color }}>
      ${value?.toLocaleString() || 0}
    </div>
  </div>
);

/* ===== LOADING STATE ===== */
const LoadingState = () => (
  <div className="flex flex-col items-center justify-center h-64">
    <Loader className="animate-spin text-[#2563eb]" size={40} />
    <div className="text-[14px] text-[#64748b] mt-4">Loading financial data...</div>
  </div>
);

/* ===== ERROR STATE ===== */
const ErrorState = ({ error, onRetry }) => (
  <div className="bg-[#fee2e2] border border-[#fca5a5] rounded-xl p-6">
    <div className="flex items-center gap-2 text-[#991b1b] mb-2">
      <AlertCircle size={20} />
      <strong className="text-[16px] font-semibold">Error loading financial data</strong>
    </div>
    <p className="text-[14px] text-[#dc2626] mb-4">{error}</p>
    <Button variant="secondary" onClick={onRetry} icon={RefreshCw}>
      Try Again
    </Button>
  </div>
);

/* ===== PROGRESS BAR ===== */
const ProgressBar = ({ percentage, label, current, total }) => (
  <div className="bg-white border border-[#e2e8f0] rounded-xl p-6">
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-[18px] font-semibold text-[#1e293b]">{label}</h3>
      <span className="text-[14px] text-[#64748b] font-medium">
        ${current?.toLocaleString() || 0} / ${total?.toLocaleString() || 0}
      </span>
    </div>

    <div className="h-3 bg-[#f1f5f9] rounded-full overflow-hidden mb-2">
      <div
        className={`h-full rounded-full transition-all duration-300 ${
          percentage > 90 ? "bg-[#f59e0b]" : percentage > 75 ? "bg-[#3b82f6]" : "bg-[#10b981]"
        }`}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>

    <div className="flex justify-between items-center">
      <span className="text-[13px] text-[#64748b]">
        {percentage?.toFixed(1)}% of budget used
      </span>
      {percentage > 90 && (
        <span className="text-[12px] text-[#f59e0b] font-semibold bg-[#fef3c7] px-2 py-0.5 rounded">
          ⚠️ Near Limit
        </span>
      )}
    </div>
  </div>
);

/* ===== CHART CARD ===== */
const ChartCard = ({ title, data, type = "revenue" }) => (
  <div className="bg-white border border-[#e2e8f0] rounded-xl p-6">
    <h3 className="text-[18px] font-semibold text-[#1e293b] mb-5">{title}</h3>

    <div className="space-y-4">
      {data?.map((item) => (
        <div key={item.id}>
          <div className="flex justify-between mb-2 text-[14px]">
            <span className="text-[#64748b] font-medium">
              {type === "revenue" ? item.source : item.category}
            </span>
            <strong className="text-[#1e293b] font-semibold">
              ${item.amount?.toLocaleString() || 0}
            </strong>
          </div>

          <div className="h-2.5 bg-[#f1f5f9] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${item.percentage}%`,
                backgroundColor: item.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  </div>
);

/* ===== MAIN DASHBOARD ===== */
const FinancialDashboard = () => {
  const conferenceId = 1;
  const { summary, revenue, expenses, loading, error, refetch } = useFinancial(conferenceId);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  if (!summary || !revenue || !expenses) {
    return (
      <div className="text-center py-12">
        <div className="text-[#94a3b8] text-[16px]">No financial data available</div>
      </div>
    );
  }

  const budgetPercentage = (summary.totalExpense / summary.budgetLimit) * 100;

  return (
    <div>
      {/* HEADER */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-[28px] font-semibold text-[#1e293b] leading-tight mb-2">
            Financial Dashboard 💸
          </h1>
          <p className="text-[14px] text-[#64748b] leading-relaxed">
            Real-time financial overview and budget analysis
          </p>
        </div>

        <Button icon={RefreshCw} variant="secondary" onClick={refetch}>
          Refresh
        </Button>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <StatCard
          icon={DollarSign}
          label="Total Revenue"
          value={summary.totalRevenue}
          change={summary.revenueChange}
          trend="up"
          color="#10b981"
        />

        <StatCard
          icon={TrendingDown}
          label="Total Expense"
          value={summary.totalExpense}
          change={summary.expenseChange}
          trend="up"
          color="#ef4444"
        />

        <StatCard
          icon={TrendingUp}
          label="Net Profit"
          value={summary.netProfit}
          change={summary.profitChange}
          trend="up"
          color="#2563eb"
        />
      </div>

      {/* BUDGET PROGRESS */}
      <div className="mb-6">
        <ProgressBar
          label="Budget vs Actual"
          percentage={budgetPercentage}
          current={summary.totalExpense}
          total={summary.budgetLimit}
        />
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ChartCard title="Revenue by Source" data={revenue} type="revenue" />
        <ChartCard title="Expense by Category" data={expenses} type="expense" />
      </div>
    </div>
  );
};

export default FinancialDashboard;
