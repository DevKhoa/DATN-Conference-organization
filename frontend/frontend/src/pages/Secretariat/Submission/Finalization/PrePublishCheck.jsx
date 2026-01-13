import React, { useState } from "react";
import Button from "../../../../ui/Button";
import { CheckCircle, XCircle, RefreshCw, Loader, AlertCircle, FileCheck } from "lucide-react";

/* ===== LOADING STATE ===== */
const LoadingState = () => (
  <div className="flex flex-col items-center justify-center h-64">
    <Loader className="animate-spin text-[#2563eb]" size={40} />
    <div className="text-[14px] text-[#64748b] mt-4">Running validation checks...</div>
  </div>
);

/* ===== ERROR STATE ===== */
const ErrorState = ({ error, onRetry }) => (
  <div className="bg-[#fee2e2] border border-[#fca5a5] rounded-xl p-6">
    <div className="flex items-center gap-2 text-[#991b1b] mb-2">
      <AlertCircle size={20} />
      <strong className="text-[16px] font-semibold">Check failed</strong>
    </div>
    <p className="text-[14px] text-[#dc2626] mb-4">{error}</p>
    <Button variant="secondary" onClick={onRetry}>Try Again</Button>
  </div>
);

/* ===== CHECK ROW ===== */
const CheckRow = ({ check }) => {
  const isOk = check.status === "OK";

  return (
    <tr className="border-b border-[#e2e8f0] last:border-b-0 hover:bg-[#f8fafc] transition-colors">
      <td className="p-4 text-[14px] text-[#334155]">{check.name}</td>
      <td className="p-4">
        <div className={`flex items-center gap-2 font-semibold ${isOk ? "text-[#10b981]" : "text-[#ef4444]"}`}>
          {isOk ? (
            <>
              <CheckCircle size={16} />
              <span>OK</span>
            </>
          ) : (
            <>
              <XCircle size={16} />
              <span>FAIL</span>
            </>
          )}
        </div>
      </td>
      {check.details && (
        <td className="p-4 text-[13px] text-[#64748b]">{check.details}</td>
      )}
    </tr>
  );
};

/* ===== STAT CARD ===== */
const StatCard = ({ label, value, color, icon: Icon }) => (
  <div className="bg-white border border-[#e2e8f0] rounded-xl p-4">
    <div className="flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: `${color}15` }}
      >
        <Icon size={20} color={color} />
      </div>
      <div>
        <div className="text-[13px] text-[#64748b] font-medium">{label}</div>
        <div className="text-[20px] font-bold text-[#1e293b]">{value}</div>
      </div>
    </div>
  </div>
);

/* ===== MAIN COMPONENT ===== */
const PrePublishCheckView = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);

  const runCheck = () => {
    setLoading(true);
    setError(null);

    setTimeout(() => {
      setResults([
        { id: 1, name: "Metadata completeness", status: "OK", details: "All required fields present" },
        { id: 2, name: "Missing files", status: "FAIL", details: "2 papers missing source files" },
        { id: 3, name: "PDF format compliance", status: "OK", details: "All PDFs meet IEEE standards" },
        { id: 4, name: "Plagiarism scan", status: "OK", details: "No issues detected (similarity < 15%)" },
        { id: 5, name: "Author affiliations", status: "OK", details: "All authors have verified affiliations" },
        { id: 6, name: "Reference formatting", status: "FAIL", details: "3 papers have inconsistent citation styles" },
        { id: 7, name: "Copyright forms", status: "OK", details: "All forms received and signed" },
      ]);
      setLoading(false);
    }, 2000);
  };

  const stats = results ? {
    total: results.length,
    passed: results.filter(r => r.status === "OK").length,
    failed: results.filter(r => r.status === "FAIL").length,
  } : null;

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={() => setError(null)} />;

  return (
    <div>
      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-[28px] font-semibold text-[#1e293b] leading-tight mb-2">
          Pre-Publish Check ✓
        </h1>
        <p className="text-[14px] text-[#64748b] leading-relaxed">
          Automatic validation before publication
        </p>
      </div>

      {/* INFO BOX */}
      {!results && (
        <div className="bg-[#eff6ff] border border-[#dbeafe] rounded-xl p-5 mb-6">
          <h3 className="text-[14px] font-semibold text-[#1e293b] mb-2">
            What Gets Checked:
          </h3>
          <ul className="space-y-1 text-[13px] text-[#475569]">
            <li className="flex items-start gap-2">
              <span className="text-[#2563eb]">✓</span>
              <span>Metadata completeness (titles, authors, keywords)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#2563eb]">✓</span>
              <span>PDF format compliance with conference standards</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#2563eb]">✓</span>
              <span>Plagiarism detection and similarity checks</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#2563eb]">✓</span>
              <span>Reference formatting consistency</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#2563eb]">✓</span>
              <span>Copyright forms and legal requirements</span>
            </li>
          </ul>
        </div>
      )}

      {/* RUN CHECK BUTTON */}
      {!results && (
        <div className="flex justify-center">
          <Button icon={RefreshCw} onClick={runCheck} size="lg">
            Run Pre-Publish Check
          </Button>
        </div>
      )}

      {/* RESULTS */}
      {results && (
        <>
          {/* STATS */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <StatCard
              label="Total Checks"
              value={stats.total}
              color="#64748b"
              icon={FileCheck}
            />
            <StatCard
              label="Passed"
              value={stats.passed}
              color="#10b981"
              icon={CheckCircle}
            />
            <StatCard
              label="Failed"
              value={stats.failed}
              color="#ef4444"
              icon={XCircle}
            />
          </div>

          {/* OVERALL STATUS */}
          {stats.failed > 0 ? (
            <div className="bg-[#fee2e2] border border-[#fca5a5] rounded-xl p-5 mb-6">
              <div className="flex items-center gap-2 text-[#991b1b] mb-2">
                <XCircle size={20} />
                <strong className="text-[16px] font-semibold">
                  {stats.failed} issue{stats.failed > 1 ? "s" : ""} must be resolved before publishing
                </strong>
              </div>
              <p className="text-[13px] text-[#dc2626]">
                Please address the failed checks below and run the validation again.
              </p>
            </div>
          ) : (
            <div className="bg-[#d1fae5] border border-[#a7f3d0] rounded-xl p-5 mb-6">
              <div className="flex items-center gap-2 text-[#065f46] mb-2">
                <CheckCircle size={20} />
                <strong className="text-[16px] font-semibold">
                  All checks passed! Ready to publish.
                </strong>
              </div>
              <p className="text-[13px] text-[#059669]">
                Your proceedings meet all publication requirements.
              </p>
            </div>
          )}

          {/* RESULTS TABLE */}
          <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden mb-6">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                  <th className="p-4 text-left text-[13px] font-semibold text-[#64748b] uppercase tracking-wide">
                    Check Name
                  </th>
                  <th className="p-4 text-left text-[13px] font-semibold text-[#64748b] uppercase tracking-wide">
                    Status
                  </th>
                  <th className="p-4 text-left text-[13px] font-semibold text-[#64748b] uppercase tracking-wide">
                    Details
                  </th>
                </tr>
              </thead>

              <tbody>
                {results.map((check) => (
                  <CheckRow key={check.id} check={check} />
                ))}
              </tbody>
            </table>
          </div>

          {/* ACTIONS */}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" icon={RefreshCw} onClick={runCheck}>
              Re-run Check
            </Button>
            {stats.failed === 0 && (
              <Button variant="success" icon={CheckCircle}>
                Proceed to Publish
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default PrePublishCheckView;