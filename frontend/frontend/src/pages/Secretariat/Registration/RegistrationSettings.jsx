import React from "react";
import { Plus, Edit, X } from "lucide-react";
import Button from "../../../ui/Button";

const RegistrationSettings = () => {
  const ticketTypes = [
    { name: "Full Access (Early Bird)", price: 300, limit: 100, status: "Active", color: "text-emerald-500" },
    { name: "Regular Attendee", price: 350, limit: "No Limit", status: "Active", color: "text-emerald-500" },
    { name: "Student", price: 150, limit: 150, status: "Active", color: "text-emerald-500" },
    { name: "On-Site Registration", price: 400, limit: "N/A", status: "Inactive", color: "text-red-500" },
  ];

  return (
    <div>
      <h2 className="text-[28px] font-semibold text-slate-800 mb-2">
        Registration Settings 🎟️
      </h2>
      <p className="text-slate-500 text-sm mb-6">
        Configure ticket types, pricing, and limits.
      </p>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-slate-800">
            Ticket Types
          </h3>
          <Button size="sm" icon={Plus}>Add Ticket</Button>
        </div>

        <div className="space-y-3">
          {ticketTypes.map((t, i) => (
            <div
              key={i}
              className="flex justify-between items-center bg-slate-50 rounded-lg p-4"
            >
              <span className="font-medium">{t.name}</span>
              <div className="flex items-center gap-5 text-sm">
                <span>Limit: {t.limit}</span>
                <span className="font-semibold text-blue-600">${t.price}</span>
                <span className={`font-semibold ${t.color}`}>{t.status}</span>
                <Button size="sm" icon={Edit} variant="secondary">Edit</Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-4 border-t">
          <p className="text-slate-500 mb-3">
            Registration portal is currently OPEN
          </p>
          <Button icon={X} variant="danger">
            Force Close Portal
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RegistrationSettings;
