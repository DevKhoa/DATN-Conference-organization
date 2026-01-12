import React, { useState } from "react";
import {
  Eye,
  Download,
  Filter,
  RefreshCw,
  Save,
  Edit,
  X,
} from "lucide-react";
import Button from "../../../../ui/Button";
import Modal from "../../../../ui/Modal";

const PapersListView = () => {
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);

  const papers = [
    {
      id: "P001",
      title: "Deep Learning Approaches for Medical Image Analysis",
      authors: "Smith J., Lee K., Zhang M.",
      track: "AI & ML",
      keywords: "deep learning, medical imaging, CNN",
      type: "Oral",
      status: "Accepted",
    },
    {
      id: "P002",
      title: "Blockchain-based Supply Chain Transparency",
      authors: "Park S., Anderson M.",
      track: "Blockchain",
      keywords: "blockchain, supply chain",
      type: "Oral",
      status: "Accepted",
    },
    {
      id: "P003",
      title: "Quantum Computing for Optimization Problems",
      authors: "Chen W., Liu Y.",
      track: "Quantum Computing",
      keywords: "quantum, optimization",
      type: "Poster",
      status: "Conditional",
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-[28px] font-semibold text-slate-800">
            Accepted Papers
          </h2>
          <p className="text-sm text-slate-500">
            Manage and organize all accepted papers
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" icon={RefreshCw}>
            Reload
          </Button>
          <Button
            variant="secondary"
            icon={Download}
            onClick={() => setShowExportModal(true)}
          >
            Export
          </Button>
          <Button icon={Save}>Save</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={18} className="text-slate-400" />
          <span className="font-semibold text-slate-700">Filters</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            placeholder="Author"
            className="px-3 py-2 border rounded-lg text-sm"
          />
          <select className="px-3 py-2 border rounded-lg text-sm">
            <option>All Tracks</option>
            <option>AI & ML</option>
            <option>Blockchain</option>
          </select>
          <select className="px-3 py-2 border rounded-lg text-sm">
            <option>All Status</option>
            <option>Accepted</option>
            <option>Conditional</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              {["ID", "Title", "Authors", "Track", "Type", "Status", "Actions"].map(
                (h) => (
                  <th key={h} className="px-4 py-3 text-left font-semibold">
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>

          <tbody>
            {papers.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-4 py-3 font-semibold text-blue-600">
                  {p.id}
                </td>
                <td className="px-4 py-3">{p.title}</td>
                <td className="px-4 py-3 text-slate-500">{p.authors}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 text-xs rounded-md bg-blue-50 text-blue-600">
                    {p.track}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 text-xs rounded-md ${
                      p.type === "Oral"
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-amber-50 text-amber-600"
                    }`}
                  >
                    {p.type}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 text-xs rounded-md ${
                      p.status === "Accepted"
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-amber-50 text-amber-600"
                    }`}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3 flex gap-2">
                  <button
                    className="p-2 border rounded-lg"
                    onClick={() => {
                      setSelectedPaper(p);
                      setShowDetailPanel(true);
                    }}
                  >
                    <Eye size={16} />
                  </button>
                  <button className="p-2 border rounded-lg">
                    <Download size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Side Panel */}
      {showDetailPanel && selectedPaper && (
        <div className="fixed top-16 right-0 w-[400px] h-[calc(100vh-64px)] bg-white border-l shadow-lg z-50">
          <div className="flex justify-between items-center px-5 py-4 border-b">
            <h3 className="font-semibold">Paper Details</h3>
            <button onClick={() => setShowDetailPanel(false)}>
              <X size={18} />
            </button>
          </div>

          <div className="p-5 space-y-2 text-sm">
            <p><strong>ID:</strong> {selectedPaper.id}</p>
            <p><strong>Title:</strong> {selectedPaper.title}</p>
            <p><strong>Authors:</strong> {selectedPaper.authors}</p>
            <p><strong>Keywords:</strong> {selectedPaper.keywords}</p>

            <div className="flex gap-2 mt-4">
              <Button size="sm" icon={Download}>Download</Button>
              <Button size="sm" variant="secondary" icon={Edit}>Add Notes</Button>
            </div>
          </div>
        </div>
      )}

      <Modal
        show={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Papers"
      >
        <Button>Download Excel</Button>
      </Modal>
    </div>
  );
};

export default PapersListView;
