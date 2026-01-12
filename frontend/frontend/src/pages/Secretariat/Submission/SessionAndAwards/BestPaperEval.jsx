import React, { useState } from "react";
import { Star, Filter, Eye, Save, Brain } from "lucide-react";
import Button from "../../../../ui/Button";
import Modal from "../../../../ui/Modal";

const mockPapers = [
  { id: "P001", title: "Medical Imaging with Deep Learning", novelty: 4.5, impact: 4.2, clarity: 4.3, ai_depth: 8.9 },
  { id: "P002", title: "Blockchain Transparency Systems", novelty: 4.0, impact: 3.8, clarity: 4.1, ai_depth: 7.5 },
  { id: "P003", title: "Quantum Optimization Models", novelty: 3.8, impact: 4.0, clarity: 3.7, ai_depth: 8.1 },
];

const avgScore = (p) =>
  ((p.novelty + p.impact + p.clarity) / 3).toFixed(2);

const BestPaperEvalView = () => {
  const [papers, setPapers] = useState(mockPapers);
  const [selected, setSelected] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

  const runAI = () => {
    setLoadingAI(true);
    setTimeout(() => {
      setPapers((prev) =>
        prev.map((p) => ({
          ...p,
          ai_depth: +(Math.random() * (9.5 - 7) + 7).toFixed(1),
        }))
      );
      setLoadingAI(false);
    }, 2000);
  };

  return (
    <div>
      <h2 className="text-[28px] font-semibold text-slate-800 mb-2">
        Best Paper Evaluation 🌟
      </h2>
      <p className="text-sm text-slate-500 mb-6">
        Evaluate top papers using reviewer scores and AI-assisted metrics.
      </p>

      {/* AI Filter */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-blue-600" />
          <span className="font-semibold text-blue-600">
            AI Filter: Top Candidates
          </span>
        </div>

        <Button
          variant="secondary"
          icon={Brain}
          onClick={runAI}
          disabled={loadingAI}
        >
          {loadingAI ? "Running AI Analysis..." : "Run AI Deep Review"}
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              {[
                "ID",
                "Title",
                "Novelty",
                "Impact",
                "Clarity",
                "Avg",
                "AI Depth",
                "Actions",
              ].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {papers.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-4 py-3 font-semibold text-blue-600">
                  {p.id}
                </td>
                <td className="px-4 py-3">{p.title}</td>
                <td className="px-4 py-3">{p.novelty}</td>
                <td className="px-4 py-3">{p.impact}</td>
                <td className="px-4 py-3">{p.clarity}</td>
                <td className="px-4 py-3 font-semibold text-emerald-600">
                  {avgScore(p)}
                </td>
                <td className="px-4 py-3 font-semibold text-blue-600">
                  {p.ai_depth} / 10
                </td>
                <td className="px-4 py-3">
                  <button
                    className="p-2 border rounded-lg"
                    onClick={() => setSelected(p)}
                  >
                    <Eye size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end mt-6">
        <Button icon={Star}>Finalize Best Paper</Button>
      </div>

      {/* Modal */}
      <Modal
        show={!!selected}
        onClose={() => setSelected(null)}
        title="Evaluation Details"
      >
        {selected && (
          <div className="space-y-3 text-sm">
            <p><strong>Title:</strong> {selected.title}</p>
            <p><strong>Avg Score:</strong> {avgScore(selected)}</p>
            <p><strong>AI Depth:</strong> {selected.ai_depth} / 10</p>

            <input
              type="number"
              placeholder="Override Final Score"
              className="w-full px-3 py-2 border rounded-lg"
            />

            <Button icon={Save}>Save Evaluation</Button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BestPaperEvalView;
