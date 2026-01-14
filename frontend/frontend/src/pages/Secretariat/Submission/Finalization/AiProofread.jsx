import React, { useState } from "react";
import Button from "../../../../ui/Button";
import Modal from "../../../../ui/Modal";
import { Upload, Send, FileText, Loader, AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";
import { useSubmission } from "../../../../hooks/secretariat/useSubmission";

const LoadingState = () => (
  <div className="flex flex-col items-center justify-center h-64">
    <Loader className="animate-spin text-blue-600" size={40} />
    <div className="text-sm text-slate-600 mt-4">Analyzing document...</div>
  </div>
);

const ErrorState = ({ error, onRetry }) => (
  <div className="bg-red-50 border border-red-200 rounded-xl p-6">
    <div className="flex items-center gap-2 text-red-900 mb-2">
      <AlertCircle size={20} />
      <strong className="text-base font-semibold">Analysis failed</strong>
    </div>
    <p className="text-sm text-red-700 mb-4">{error}</p>
    <Button variant="secondary" onClick={onRetry}>Try Again</Button>
  </div>
);

const SuggestionItem = ({ type, text, onAccept }) => {
  const icons = {
    grammar: <AlertTriangle size={16} className="text-amber-600" />,
    clarity: <AlertCircle size={16} className="text-blue-600" />,
    style: <CheckCircle size={16} className="text-green-600" />,
  };

  const colors = {
    grammar: "border-l-amber-600",
    clarity: "border-l-blue-600",
    style: "border-l-green-600",
  };

  return (
    <div className={`bg-slate-50 border-l-4 ${colors[type]} rounded-lg p-3 flex items-start justify-between gap-3`}>
      <div className="flex items-start gap-2 flex-1">
        {icons[type]}
        <p className="text-xs text-slate-900 leading-relaxed">{text}</p>
      </div>
      <button
        onClick={onAccept}
        className="px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 whitespace-nowrap"
      >
        Accept
      </button>
    </div>
  );
};

const ResultModal = ({ analysisResult, onClose, onGenerate }) => {
  if (!analysisResult) return null;

  const { fileName, fileSize, suggestions, stats } = analysisResult;

  return (
    <Modal isOpen={!!analysisResult} onClose={onClose} title="AI Proofreading Results" size="large">
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-blue-600" />
            <span className="text-sm font-semibold text-slate-900">{fileName}</span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            {(fileSize / 1024).toFixed(0)} KB • Analyzed just now
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-amber-700">{stats.issuesFound}</div>
            <div className="text-xs text-amber-900 uppercase tracking-wide">Issues Found</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-green-700">{stats.qualityScore}%</div>
            <div className="text-xs text-green-900 uppercase tracking-wide">Quality Score</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-blue-700">{stats.pagesChecked}</div>
            <div className="text-xs text-blue-900 uppercase tracking-wide">Pages Checked</div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-slate-900 mb-3">AI Suggestions</h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {suggestions.map((s, i) => (
              <SuggestionItem
                key={i}
                type={s.type}
                text={s.text}
                onAccept={() => alert(`✅ Accepted: ${s.text.substring(0, 50)}...`)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <Button variant="secondary" onClick={onClose}>Close</Button>
        <Button icon={Send} onClick={onGenerate}>Generate Revised PDF</Button>
      </div>
    </Modal>
  );
};

const AiProofread = () => {
  const { analysisResult, loading, error, analyzeDocument, generateRevisedPDF } = useSubmission();
  const [file, setFile] = useState(null);
  const [showResults, setShowResults] = useState(false);

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (selectedFile.type !== 'application/pdf') {
      alert('⚠️ Please select a PDF file');
      return;
    }

    setFile(selectedFile);
    
    const result = await analyzeDocument(selectedFile);
    if (result.success) {
      setShowResults(true);
    } else {
      alert(`❌ Analysis failed: ${result.error}`);
    }
  };

  const handleGenerate = async () => {
    if (!analysisResult) return;

    const result = await generateRevisedPDF(analysisResult.id, analysisResult.suggestions);
    if (result.success) {
      alert("✅ Revised PDF generated successfully!");
      window.open(result.data.url, '_blank');
      setShowResults(false);
      setFile(null);
    } else {
      alert(`❌ Generation failed: ${result.error}`);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={() => setFile(null)} />;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">
          AI Proofreading 🔍
        </h1>
        <p className="text-sm text-slate-600">
          Upload your paper and let AI detect grammar and style issues
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-2">
          What AI Checks:
        </h3>
        <ul className="space-y-1 text-xs text-slate-700">
          <li className="flex items-start gap-2">
            <span className="text-blue-600">✓</span>
            <span>Grammar and punctuation errors</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600">✓</span>
            <span>Sentence clarity and readability</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600">✓</span>
            <span>Academic writing style consistency</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600">✓</span>
            <span>Technical terminology usage</span>
          </li>
        </ul>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-12">
        <label className="flex flex-col items-center justify-center gap-4 border-2 border-dashed border-slate-300 rounded-xl p-12 cursor-pointer hover:border-blue-600 hover:bg-slate-50 transition-all">
          <Upload size={48} className="text-slate-400" />
          <div className="text-center">
            <span className="text-base font-semibold text-slate-700 block mb-1">
              Select PDF to upload
            </span>
            <span className="text-xs text-slate-600">
              Supports PDF files up to 10MB
            </span>
          </div>
          <input
            type="file"
            hidden
            accept=".pdf"
            onChange={handleFileSelect}
          />
        </label>

        {file && !showResults && (
          <div className="mt-6 bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-blue-600" />
              <span className="text-sm font-semibold text-slate-900">{file.name}</span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              {(file.size / 1024).toFixed(0)} KB • Ready for analysis
            </p>
          </div>
        )}
      </div>

      {showResults && analysisResult && (
        <ResultModal
          analysisResult={analysisResult}
          onClose={() => {
            setShowResults(false);
            setFile(null);
          }}
          onGenerate={handleGenerate}
        />
      )}
    </div>
  );
};

export default AiProofread;