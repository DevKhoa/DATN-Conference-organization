import React, { useState } from "react";
import Button from "../../../../ui/Button";
import { Upload, Send, FileText, Loader, AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";

/* ===== LOADING STATE ===== */
const LoadingState = () => (
  <div className="flex flex-col items-center justify-center h-64">
    <Loader className="animate-spin text-[#2563eb]" size={40} />
    <div className="text-[14px] text-[#64748b] mt-4">Analyzing document...</div>
  </div>
);

/* ===== ERROR STATE ===== */
const ErrorState = ({ error, onRetry }) => (
  <div className="bg-[#fee2e2] border border-[#fca5a5] rounded-xl p-6">
    <div className="flex items-center gap-2 text-[#991b1b] mb-2">
      <AlertCircle size={20} />
      <strong className="text-[16px] font-semibold">Analysis failed</strong>
    </div>
    <p className="text-[14px] text-[#dc2626] mb-4">{error}</p>
    <Button variant="secondary" onClick={onRetry}>Try Again</Button>
  </div>
);

/* ===== SUGGESTION ITEM ===== */
const SuggestionItem = ({ type, text }) => {
  const icons = {
    grammar: <AlertTriangle size={16} className="text-[#f59e0b]" />,
    clarity: <AlertCircle size={16} className="text-[#2563eb]" />,
    style: <CheckCircle size={16} className="text-[#10b981]" />,
  };

  const colors = {
    grammar: "border-l-[#f59e0b]",
    clarity: "border-l-[#2563eb]",
    style: "border-l-[#10b981]",
  };

  return (
    <div className={`bg-[#f8fafc] border-l-4 ${colors[type]} rounded-lg p-3`}>
      <div className="flex items-start gap-2">
        {icons[type]}
        <p className="text-[13px] text-[#334155] leading-relaxed">{text}</p>
      </div>
    </div>
  );
};

/* ===== RESULT MODAL ===== */
const ResultModal = ({ file, onClose, onGenerate }) => {
  if (!file) return null;

  const suggestions = [
    { type: "grammar", text: 'Grammar issue on page 3: "which" should be "that" in restrictive clause' },
    { type: "clarity", text: "Paragraph 2 contains complex sentences. Consider breaking into shorter statements for clarity." },
    { type: "grammar", text: "Missing comma after introductory phrase in abstract (line 5)" },
    { type: "style", text: "Consider using active voice in methodology section for stronger impact" },
    { type: "clarity", text: "Technical term 'CNN architecture' used without definition - add brief explanation" },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full m-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-[18px] font-semibold text-[#1e293b] mb-4">
          AI Proofreading Results
        </h3>

        {/* FILE INFO */}
        <div className="bg-[#eff6ff] border border-[#dbeafe] rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-[#2563eb]" />
            <span className="text-[14px] font-semibold text-[#1e293b]">{file.name}</span>
          </div>
          <p className="text-[13px] text-[#64748b] mt-1">
            {(file.size / 1024).toFixed(0)} KB • Uploaded just now
          </p>
        </div>

        {/* SUMMARY STATS */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-[#fef3c7] border border-[#fde68a] rounded-lg p-3 text-center">
            <div className="text-[20px] font-bold text-[#d97706]">5</div>
            <div className="text-[12px] text-[#92400e] uppercase tracking-wide">Issues Found</div>
          </div>
          <div className="bg-[#d1fae5] border border-[#a7f3d0] rounded-lg p-3 text-center">
            <div className="text-[20px] font-bold text-[#059669]">92%</div>
            <div className="text-[12px] text-[#065f46] uppercase tracking-wide">Quality Score</div>
          </div>
          <div className="bg-[#dbeafe] border border-[#bfdbfe] rounded-lg p-3 text-center">
            <div className="text-[20px] font-bold text-[#1e40af]">8</div>
            <div className="text-[12px] text-[#1e3a8a] uppercase tracking-wide">Pages Checked</div>
          </div>
        </div>

        {/* SUGGESTIONS */}
        <div className="mb-6">
          <h4 className="text-[14px] font-semibold text-[#1e293b] mb-3">AI Suggestions</h4>
          <div className="space-y-2">
            {suggestions.map((s, i) => (
              <SuggestionItem key={i} type={s.type} text={s.text} />
            ))}
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button icon={Send} onClick={onGenerate}>Generate Revised PDF</Button>
        </div>
      </div>
    </div>
  );
};

/* ===== MAIN COMPONENT ===== */
const AiProofreadView = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [file, setFile] = useState(null);
  const [showResults, setShowResults] = useState(false);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setLoading(true);
      
      // Simulate AI analysis
      setTimeout(() => {
        setLoading(false);
        setShowResults(true);
      }, 2000);
    }
  };

  const handleGenerate = () => {
    alert("✅ Revised PDF generated successfully!");
    setShowResults(false);
    setFile(null);
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={() => setError(null)} />;

  return (
    <div>
      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-[28px] font-semibold text-[#1e293b] leading-tight mb-2">
          AI Proofreading 📝
        </h1>
        <p className="text-[14px] text-[#64748b] leading-relaxed">
          Upload your paper and let AI detect grammar and style issues
        </p>
      </div>

      {/* INFO BOX */}
      <div className="bg-[#eff6ff] border border-[#dbeafe] rounded-xl p-5 mb-6">
        <h3 className="text-[14px] font-semibold text-[#1e293b] mb-2">
          What AI Checks:
        </h3>
        <ul className="space-y-1 text-[13px] text-[#475569]">
          <li className="flex items-start gap-2">
            <span className="text-[#2563eb]">✓</span>
            <span>Grammar and punctuation errors</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#2563eb]">✓</span>
            <span>Sentence clarity and readability</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#2563eb]">✓</span>
            <span>Academic writing style consistency</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[#2563eb]">✓</span>
            <span>Technical terminology usage</span>
          </li>
        </ul>
      </div>

      {/* UPLOAD AREA */}
      <div className="bg-white border border-[#e2e8f0] rounded-xl p-12">
        <label className="flex flex-col items-center justify-center gap-4 border-2 border-dashed border-[#cbd5e1] rounded-xl p-12 cursor-pointer hover:border-[#2563eb] hover:bg-[#f8fafc] transition-all">
          <Upload size={48} className="text-[#94a3b8]" />
          <div className="text-center">
            <span className="text-[16px] font-semibold text-[#334155] block mb-1">
              Select PDF to upload
            </span>
            <span className="text-[13px] text-[#64748b]">
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
          <div className="mt-6 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-4">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-[#2563eb]" />
              <span className="text-[14px] font-semibold text-[#1e293b]">{file.name}</span>
            </div>
          </div>
        )}
      </div>

      {/* RESULT MODAL */}
      {showResults && (
        <ResultModal
          file={file}
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

export default AiProofreadView;