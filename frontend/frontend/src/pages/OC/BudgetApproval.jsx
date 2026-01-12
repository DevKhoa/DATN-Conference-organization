import React from "react";
import { AlertTriangle, Filter, Download, Check, X, Eye } from "lucide-react";
import Button from "../../ui/Button";

const BudgetApproval = () => {
  const budgetRequests = [
    {
      id: 1,
      category: "Catering",
      requested: 5000,
      reason: "Additional VIP dinner",
      status: "pending",
      date: "2025-03-15",
    },
    {
      id: 2,
      category: "Marketing",
      requested: 3000,
      reason: "Social media ads campaign",
      status: "pending",
      date: "2025-03-14",
    },
    {
      id: 3,
      category: "Technology",
      requested: 2500,
      reason: "Extra AV equipment",
      status: "approved",
      date: "2025-03-12",
    },
  ];

  return (
    <div>
      <div className="flex justify-between mb-6">
        <div>
          <h2 className="text-[28px] font-semibold">Budget Approval Requests ⚠️</h2>
          <p className="text-[#64748b]">
            Review and approve budget overrun requests.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" icon={Filter}>Filter</Button>
          <Button variant="secondary" icon={Download}>Export</Button>
        </div>
      </div>

      <div className="bg-white border border-[#e2e8f0] rounded-xl">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#f8fafc]">
              {["ID", "Category", "Amount", "Reason", "Date", "Status", "Actions"].map(h => (
                <th key={h} className="p-4 text-[13px] text-[#64748b] text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {budgetRequests.map((r, i) => (
              <tr key={r.id} className={i < budgetRequests.length - 1 ? "border-b border-[#e2e8f0]" : ""}>
                <td className="p-4 font-semibold text-[#2563eb]">#{r.id}</td>
                <td className="p-4">{r.category}</td>
                <td className="p-4 font-semibold">${r.requested.toLocaleString()}</td>
                <td className="p-4 text-[#64748b]">{r.reason}</td>
                <td className="p-4">{r.date}</td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                    r.status === "approved"
                      ? "bg-[#10b981]/15 text-[#10b981]"
                      : "bg-[#f59e0b]/15 text-[#f59e0b]"
                  }`}>
                    {r.status.toUpperCase()}
                  </span>
                </td>
                <td className="p-4">
                  {r.status === "pending" ? (
                    <div className="flex gap-2">
                      <Button size="sm" variant="success" icon={Check}>Approve</Button>
                      <Button size="sm" variant="danger" icon={X}>Reject</Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="secondary" icon={Eye}>View</Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BudgetApproval;
