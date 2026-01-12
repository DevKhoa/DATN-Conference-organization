import React from "react";
import { Mail, Plus, Send, CheckCircle, X, Clock } from "lucide-react";
import Button from "../../ui/Button";

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white border border-[#e2e8f0] rounded-xl p-6 flex-1">
    <Icon size={24} color={color} />
    <div className="text-[#64748b]">{label}</div>
    <div className="text-[28px] font-bold" style={{ color }}>{value}</div>
  </div>
);

const EmailManagement = () => {
  const inviteStats = {
    sent: 45,
    accepted: 38,
    declined: 3,
    pending: 4,
  };

  return (
    <div>
      <h2 className="text-[28px] font-semibold">Email Management 📧</h2>
      <p className="text-[#64748b] mb-6">
        Manage invitations and RSVP tracking.
      </p>

      <div className="flex gap-3 mb-6">
        <Button icon={Plus}>Create Template</Button>
        <Button variant="secondary" icon={Mail}>View Logs</Button>
      </div>

      <div className="flex gap-4">
        <StatCard icon={Send} label="Sent" value={inviteStats.sent} color="#2563eb" />
        <StatCard icon={CheckCircle} label="Accepted" value={inviteStats.accepted} color="#10b981" />
        <StatCard icon={X} label="Declined" value={inviteStats.declined} color="#ef4444" />
        <StatCard icon={Clock} label="Pending" value={inviteStats.pending} color="#f59e0b" />
      </div>
    </div>
  );
};

export default EmailManagement;
