import React from "react";
import { Award, Eye, Send } from "lucide-react";
import Button from "../../ui/Button";

const AwardsAnnouncement = () => {
  const awardCandidates = [
    { id: "P001", title: "Medical Imaging with Deep Learning", score: 92.3, status: "Proposed", type: "Best Paper" },
    { id: "P005", title: "Quantum Machine Learning", score: 88.3, status: "Proposed", type: "Best Student Paper" },
    { id: "C001", title: "Dr. Evelyn Reed", score: null, status: "Finalized", type: "Lifetime Achievement" },
  ];

  return (
    <div>
      <h2 className="text-[28px] font-semibold">Awards & Results 🏆</h2>
      <p className="text-[#64748b] mb-6">
        Review, finalize, and announce awards.
      </p>

      <div className="bg-white border border-[#e2e8f0] rounded-xl p-6">
        <div className="flex justify-between mb-4">
          <h3>Pending Award Finalization</h3>
          <Button icon={Award} variant="success">Announce Awards</Button>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#f8fafc]">
              {["ID", "Title", "Type", "Score", "Status", "Actions"].map(h => (
                <th key={h} className="p-3 text-[13px] text-[#64748b] text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {awardCandidates.map((a, i) => (
              <tr key={a.id} className={i < awardCandidates.length - 1 ? "border-b border-[#e2e8f0]" : ""}>
                <td className="p-3 font-semibold text-[#2563eb]">{a.id}</td>
                <td className="p-3">{a.title}</td>
                <td className="p-3">{a.type}</td>
                <td className="p-3">{a.score ?? "N/A"}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs ${
                    a.status === "Finalized"
                      ? "bg-[#10b981]/15 text-[#10b981]"
                      : "bg-[#f59e0b]/15 text-[#f59e0b]"
                  }`}>
                    {a.status}
                  </span>
                </td>
                <td className="p-3">
                  <Button size="sm" variant="secondary" icon={Eye}>Review</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-5">
          <Button size="sm" icon={Send} variant="secondary">
            Send Internal Notification
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AwardsAnnouncement;
