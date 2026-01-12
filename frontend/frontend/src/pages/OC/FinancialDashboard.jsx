import React from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  RefreshCw,
} from "lucide-react";
import Button from "../../ui/Button";

/* ===== STAT CARD ===== */
const StatCard = ({
  icon: Icon,
  label,
  value,
  change,
  trend,
  color,
}) => (
  <div className="bg-white rounded-xl shadow-sm p-6">
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
          {trend === "up" ? (
            <TrendingUp size={16} />
          ) : (
            <TrendingDown size={16} />
          )}
          {change}
        </div>
      )}
    </div>

    <div className="text-[13px] text-[#64748b] mb-1">
      {label}
    </div>

    <div className="text-[28px] font-bold text-[#1e293b]" style={{ color }}>
      ${value.toLocaleString()}
    </div>
  </div>
);

/* ===== MAIN DASHBOARD ===== */
const FinancialDashboard = () => {
  /* ===== MOCK DATA (SAU NÀY THAY API) ===== */
  const financialData = {
    totalRevenue: 125000,
    totalExpense: 89000,
    budgetLimit: 150000,
    profit: 36000,

    revenueBySource: [
      { name: "Registration", value: 85000, color: "#2563eb" },
      { name: "Sponsorship", value: 30000, color: "#10b981" },
      { name: "Exhibition", value: 10000, color: "#f59e0b" },
    ],

    expenseByCategory: [
      { name: "Venue", value: 35000, color: "#ef4444" },
      { name: "Catering", value: 28000, color: "#8b5cf6" },
      { name: "Marketing", value: 15000, color: "#ec4899" },
      { name: "Technology", value: 11000, color: "#06b6d4" },
    ],
  };

  const budgetPercentage =
    (financialData.totalExpense / financialData.budgetLimit) * 100;

  return (
    <div>
      {/* ===== HEADER ===== */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="m-0 mb-2 text-[28px] font-semibold text-[#1e293b]">
            Financial Dashboard 💸
          </h2>
          <p className="text-[#64748b] text-sm">
            Real-time financial overview and budget analysis.
          </p>
        </div>

        <Button
          icon={RefreshCw}
          variant="secondary"
        >
          Refresh Data
        </Button>
      </div>

      {/* ===== STAT CARDS ===== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <StatCard
          icon={DollarSign}
          label="Total Revenue"
          value={financialData.totalRevenue}
          change="+12%"
          trend="up"
          color="#10b981"
        />

        <StatCard
          icon={TrendingDown}
          label="Total Expense"
          value={financialData.totalExpense}
          change="+8%"
          trend="up"
          color="#ef4444"
        />

        <StatCard
          icon={TrendingUp}
          label="Net Profit"
          value={financialData.profit}
          change="+15%"
          trend="up"
          color="#2563eb"
        />
      </div>

      {/* ===== BUDGET PROGRESS ===== */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="m-0 text-lg font-semibold text-[#1e293b]">
            Budget vs Actual
          </h3>
          <span className="text-sm text-[#64748b]">
            ${financialData.totalExpense.toLocaleString()} /{" "}
            ${financialData.budgetLimit.toLocaleString()}
          </span>
        </div>

        <div className="h-3 bg-[#f1f5f9] rounded-full overflow-hidden mb-2">
          <div
            className={`h-full rounded-full transition-[width] duration-300 ${
              budgetPercentage > 90
                ? "bg-[#f59e0b]"
                : "bg-[#10b981]"
            }`}
            style={{ width: `${budgetPercentage}%` }}
          />
        </div>

        <div className="text-[13px] text-[#64748b]">
          {budgetPercentage.toFixed(1)}% of budget used
        </div>
      </div>

      {/* ===== CHARTS ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Revenue */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="mb-5 text-lg font-semibold text-[#1e293b]">
            Revenue by Source
          </h3>

          {financialData.revenueBySource.map((item) => (
            <div key={item.name} className="mb-4 last:mb-0">
              <div className="flex justify-between mb-1.5 text-sm">
                <span className="text-[#64748b]">{item.name}</span>
                <strong className="text-[#1e293b]">${item.value.toLocaleString()}</strong>
              </div>

              <div className="h-2.5 bg-[#f1f5f9] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${
                      (item.value / financialData.totalRevenue) *
                      100
                    }%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Expense */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="mb-5 text-lg font-semibold text-[#1e293b]">
            Expense by Category
          </h3>

          {financialData.expenseByCategory.map((item) => (
            <div key={item.name} className="mb-4 last:mb-0">
              <div className="flex justify-between mb-1.5 text-sm">
                <span className="text-[#64748b]">{item.name}</span>
                <strong className="text-[#1e293b]">${item.value.toLocaleString()}</strong>
              </div>

              <div className="h-2.5 bg-[#f1f5f9] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${
                      (item.value / financialData.totalExpense) *
                      100
                    }%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FinancialDashboard;
