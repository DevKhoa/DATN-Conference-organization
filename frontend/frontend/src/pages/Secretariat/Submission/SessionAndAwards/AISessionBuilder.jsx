import React from "react";
import { Zap, CheckCircle } from "lucide-react";
import Button from "../../../../ui/Button";

const AISessionBuilder = () => {
  const aiSessions = [
    { id: "AI-S1", title: "Deep Learning & Neural Networks", papers: 5, confidence: 92 },
    { id: "AI-S2", title: "Natural Language Processing", papers: 4, confidence: 88 },
  ];

  return (
    <div>
      {/* Header */}
      <h2 className="text-[28px] font-semibold text-slate-800 mb-2">
        AI Session Builder 🧠
      </h2>
      <p className="text-sm text-slate-500 mb-6">
        AI analyzes accepted papers and proposes optimal session structures.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Config */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-3 text-slate-800">
            AI Configuration
          </h3>
          <p className="text-sm text-slate-500 mb-4">
            Configure AI constraints such as session size and duration.
          </p>

          <Button icon={Zap}>Run AI Optimization</Button>
        </div>

        {/* Results */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4 text-slate-800">
            AI Proposal Results
          </h3>

          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                {["ID", "Title", "Papers", "Confidence"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {aiSessions.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-3 py-2 font-semibold text-blue-600">
                    {s.id}
                  </td>
                  <td className="px-3 py-2">{s.title}</td>
                  <td className="px-3 py-2">{s.papers}</td>
                  <td
                    className={`px-3 py-2 font-semibold ${
                      s.confidence > 90
                        ? "text-emerald-600"
                        : "text-amber-600"
                    }`}
                  >
                    {s.confidence}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end mt-4">
            <Button variant="success" icon={CheckCircle}>
              Accept All Proposals
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AISessionBuilder;
