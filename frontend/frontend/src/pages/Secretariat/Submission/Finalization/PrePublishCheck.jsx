import React, { useState, useEffect } from "react";
import Button from "../../../../ui/Button";
import { CheckCircle, XCircle, RefreshCw, Loader, AlertCircle, FileCheck } from "lucide-react";
import { useSubmission } from "../../../../hooks/secretariat/useSubmission";

const LoadingState = () => (
  <div className="flex flex-col items-center justify-center h-64">
    <Loader className="animate-spin text-blue-600" size={40} />
    <div className="text-sm text-slate-600 mt-4">Running validation checks...</div>
  </div>
);

const ErrorState = ({ error, onRetry }) => (
  <div className="bg-red-50 border border-red-200 rounded-xl p-6">
    <div className="flex items-center gap-2 text-red-900 mb-2">
      <AlertCircle size={20} />
      <strong className="text-base font-semibold">Check failed</strong>
    </div>
    <p className="text-sm text-red-700 mb-4">{error}</p>
    <Button variant="secondary" onClick={onRetry}>Try Again</Button>
  </div>
);

const CheckRow = ({ check }) => {
  const isOk = check.status === "OK";

  return (
    <tr className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3 text-sm text-slate-900">{check.name}</td>
      <td className="px-4 py-3">
        <div className={`flex items-center gap-2 font-semibold ${isOk ? "text-green-600" : "text-red-600"}`}>
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
      <td className="px-4 py-3 text-xs text-slate-600">{check.details}</td>
    </tr>
  );
};

const StatCard = ({ label, value, color, icon: Icon }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-4">
    <div className="flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: `${color}15` }}
      >
        <Icon size={20} color={color} />
      </div>
      <div>
        <div className="text-xs text-slate-600 font-medium">{label}</div>
        <div className="text-xl font-bold text-slate-900">{value}</div>
      </div>
    </div>
  </div>
);

const PrePublishCheck = () => {
  const {
    checkResults,
    loading,
    error,
    runPrePublishChecks,
    generateProceedings,
  } = useSubmission();

  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    runPrePublishChecks();
  }, [runPrePublishChecks]);

  const handleReRun = async () => {
    const result = await runPrePublishChecks();
    if (result.success) {
      alert("✅ Checks completed!");
    }
  };

  const handlePublish = async () => {
    if (!checkResults || checkResults.failed > 0) {
      alert("⚠️ Cannot publish: There are failed checks that must be resolved first");
      return;
    }

    if (!confirm("Are you sure you want to proceed with publication?")) {
      return;
    }

    setGenerating(true);
    const result = await generateProceedings();
    setGenerating(false);

    if (result.success) {
      alert(`✅ ${result.message}`);
      window.open(result.data.url, '_blank');
    } else {
      alert(`❌ Publication failed: ${result.error}`);
    }
  };

  if (loading && !checkResults) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={handleReRun} />;

  const stats = checkResults ? {
    total: checkResults.checks.length,
    passed: checkResults.checks.filter(c => c.status === "OK").length,
    failed: checkResults.checks.filter(c => c.status === "FAIL").length,
  } : null;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">
          Pre-Publish Check ✓
        </h1>
        <p className="text-sm text-slate-600">
          Automatic validation before publication
        </p>
      </div>

      {!checkResults ? (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">
            What Gets Checked:
          </h3>
          <ul className="space-y-1 text-xs text-slate-700">
            <li className="flex items-start gap-2">
              <span className="text-blue-600">✓</span>
              <span>Metadata completeness (titles, authors, keywords)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">✓</span>
              <span>PDF format compliance with conference standards</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">✓</span>
              <span>Plagiarism detection and similarity checks</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">✓</span>
              <span>Reference formatting consistency</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">✓</span>
              <span>Copyright forms and legal requirements</span>
            </li>
          </ul>
        </div>
      ) : (
        <>
          {stats && (
            <div className="grid grid-cols-3 gap-4">
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
          )}

          {stats && stats.failed > 0 ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5">
              <div className="flex items-center gap-2 text-red-900 mb-2">
                <XCircle size={20} />
                <strong className="text-base font-semibold">
                  {stats.failed} issue{stats.failed > 1 ? "s" : ""} must be resolved before publishing
                </strong>
              </div>
              <p className="text-xs text-red-700">
                Please address the failed checks below and run the validation again.
              </p>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-xl p-5">
              <div className="flex items-center gap-2 text-green-900 mb-2">
                <CheckCircle size={20} />
                <strong className="text-base font-semibold">
                  All checks passed! Ready to publish.
                </strong>
              </div>
              <p className="text-xs text-green-700">
                Your proceedings meet all publication requirements.
              </p>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Check Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {checkResults.checks.map((check) => (
                  <CheckRow key={check.id} check={check} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" icon={RefreshCw} onClick={handleReRun} disabled={loading}>
              Re-run Check
            </Button>
            {stats && stats.failed === 0 && (
              <Button
                variant="success"
                icon={CheckCircle}
                onClick={handlePublish}
                disabled={generating}
              >
                {generating ? "Publishing..." : "Proceed to Publish"}
              </Button>
            )}
          </div>
        </>
      )}

      {!checkResults && (
        <div className="flex justify-center">
          <Button icon={RefreshCw} onClick={handleReRun} disabled={loading}>
            Run Pre-Publish Check
          </Button>
        </div>
      )}
    </div>
  );
};

export default PrePublishCheck;