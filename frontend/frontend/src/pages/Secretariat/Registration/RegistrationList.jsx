import React from "react";
import { Filter, Download, RefreshCw, Check, X, Eye } from "lucide-react";
import Button from "../../../ui/Button";

const RegistrationList = () => {
  const registrations = [
    { id: "R001", name: "John Smith", email: "john@example.com", ticket: "Full Access", payment: "paid", status: "pending", amount: 350 },
    { id: "R002", name: "Sarah Johnson", email: "sarah@example.com", ticket: "Student", payment: "paid", status: "approved", amount: 150 },
    { id: "R003", name: "Mike Chen", email: "mike@example.com", ticket: "Full Access", payment: "unpaid", status: "pending", amount: 350 },
  ];

  return (
    <div>
      <h2 className="text-[28px] font-semibold text-slate-800 mb-2">
        Registration List 👥
      </h2>
      <p className="text-slate-500 text-sm mb-6">
        Review and approve participant registrations.
      </p>

      <div className="flex gap-3 mb-6">
        <Button icon={Filter} variant="secondary">Filter</Button>
        <Button icon={Download} variant="secondary">Export</Button>
        <Button icon={RefreshCw}>Refresh</Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              {["ID", "Name", "Email", "Ticket", "Payment", "Status", "Amount", "Actions"].map(h => (
                <th key={h} className="px-4 py-3 text-left font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {registrations.map((r, i) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-3 font-semibold text-blue-600">{r.id}</td>
                <td className="px-4 py-3">{r.name}</td>
                <td className="px-4 py-3 text-slate-500">{r.email}</td>
                <td className="px-4 py-3">{r.ticket}</td>
                <td className="px-4 py-3">
                  <span className={`font-semibold ${r.payment === "paid" ? "text-emerald-500" : "text-red-500"}`}>
                    {r.payment.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`font-semibold ${r.status === "approved" ? "text-emerald-500" : "text-amber-500"}`}>
                    {r.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold">${r.amount}</td>
                <td className="px-4 py-3">
                  {r.status === "pending" ? (
                    <div className="flex gap-2">
                      <Button size="sm" icon={Check}>Approve</Button>
                      <Button size="sm" icon={X} variant="danger">Reject</Button>
                    </div>
                  ) : (
                    <Button size="sm" icon={Eye} variant="secondary">View</Button>
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

export default RegistrationList;
