import React, { useState } from "react";
import { Filter, Eye } from "lucide-react";
import Modal from "../../../../ui/Modal";

const ReviewDecisionsView = () => {
  const [selected, setSelected] = useState(null);

  const data = [
    { id: "P001", title: "Deep Learning", avg: 4.2, count: 3, status: "Accepted" },
    { id: "P002", title: "Blockchain", avg: 3.8, count: 3, status: "Accepted" },
    { id: "P003", title: "Quantum", avg: 3.5, count: 2, status: "Minor Revision" },
  ];

  return (
    <div>
      <h2 className="text-[28px] font-semibold text-slate-800 mb-2">
        Review Decisions
      </h2>
      <p className="text-sm text-slate-500 mb-6">
        View reviewer scores and final recommendations
      </p>

      <div className="bg-white rounded-xl shadow-sm p-5 mb-6 flex items-center gap-2">
        <Filter size={18} className="text-slate-400" />
        <span className="font-semibold text-slate-700">Filters</span>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              {["ID", "Title", "Avg", "Reviews", "Status", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-4 py-3 font-semibold text-blue-600">{p.id}</td>
                <td className="px-4 py-3">{p.title}</td>
                <td className="px-4 py-3">{p.avg}</td>
                <td className="px-4 py-3">{p.count}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 text-xs rounded-md bg-emerald-50 text-emerald-600">
                    {p.status}
                  </span>
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

      <Modal
        show={!!selected}
        onClose={() => setSelected(null)}
        title="Review Summary"
      >
        {selected && (
          <div className="space-y-2 text-sm">
            <p><strong>ID:</strong> {selected.id}</p>
            <p><strong>Title:</strong> {selected.title}</p>
            <p><strong>Avg Score:</strong> {selected.avg}</p>
            <p><strong>Reviews:</strong> {selected.count}</p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ReviewDecisionsView;
