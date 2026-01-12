import React, { useState } from "react";
import Button from "../../../../ui/Button";
import Modal from "../../../../ui/Modal";
import { Upload, Eye, CheckCircle, XCircle } from "lucide-react";

const FinalSubmissionView = () => {
  const [selected, setSelected] = useState(null);
  const [show, setShow] = useState(false);

  const submissions = [
    { id: "P001", title: "Deep Learning for Imaging", author: "Smith J.", status: "Pending", file: "P001_final.pdf" },
    { id: "P002", title: "Blockchain Transparency", author: "Park S.", status: "Approved", file: "P002_final.pdf" },
    { id: "P003", title: "Quantum Optimization", author: "Chen W.", status: "Rejected", file: "P003_final.pdf" },
  ];

  return (
    <div>
      <h2 className="text-[28px] font-semibold text-slate-800 mb-2">
        Final Submissions
      </h2>
      <p className="text-slate-500 text-sm mb-6">
        Manage final uploaded papers
      </p>

      <div className="flex justify-end mb-4">
        <Button icon={Upload}>Upload Final Version</Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              {["ID", "Title", "Author", "File", "Status", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {submissions.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="px-4 py-3 font-semibold text-blue-600">{s.id}</td>
                <td className="px-4 py-3">{s.title}</td>
                <td className="px-4 py-3">{s.author}</td>
                <td className="px-4 py-3">{s.file}</td>
                <td className="px-4 py-3 font-semibold">{s.status}</td>
                <td className="px-4 py-3">
                  <button
                    className="p-2 border rounded-lg"
                    onClick={() => {
                      setSelected(s);
                      setShow(true);
                    }}
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
        show={show}
        onClose={() => setShow(false)}
        title="Final Submission Preview"
      >
        {selected && (
          <div className="space-y-2 text-sm">
            <p><strong>ID:</strong> {selected.id}</p>
            <p><strong>Title:</strong> {selected.title}</p>
            <p><strong>Author:</strong> {selected.author}</p>
            <p><strong>File:</strong> {selected.file}</p>

            <div className="flex gap-3 mt-4">
              <Button icon={CheckCircle} variant="success">Approve</Button>
              <Button icon={XCircle} variant="danger">Reject</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default FinalSubmissionView;
