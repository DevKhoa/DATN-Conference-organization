import React, { useState } from "react";
import Button from "../../../../ui/Button";
import { CheckCircle, XCircle, RefreshCw } from "lucide-react";

const PrePublishCheckView = () => {
  const [results, setResults] = useState(null);

  return (
    <div>
      <h2 className="text-[28px] font-semibold text-slate-800 mb-2">
        Pre-Publish Check
      </h2>
      <p className="text-slate-500 text-sm mb-6">
        Automatic validation before publication
      </p>

      <Button
        icon={RefreshCw}
        onClick={() =>
          setResults([
            { id: 1, name: "Metadata completeness", status: "OK" },
            { id: 2, name: "Missing files", status: "FAIL" },
            { id: 3, name: "PDF format compliance", status: "OK" },
            { id: 4, name: "Plagiarism scan", status: "OK" },
          ])
        }
      >
        Run Check
      </Button>

      {results && (
        <div className="bg-white rounded-xl shadow-sm mt-6 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Check</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
              </tr>
            </thead>

            <tbody>
              {results.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-4 py-3">{r.name}</td>
                  <td className="px-4 py-3 flex items-center gap-2 font-semibold">
                    {r.status === "OK" ? (
                      <span className="text-emerald-500 flex items-center gap-2">
                        <CheckCircle size={16} /> OK
                      </span>
                    ) : (
                      <span className="text-red-500 flex items-center gap-2">
                        <XCircle size={16} /> FAIL
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PrePublishCheckView;
