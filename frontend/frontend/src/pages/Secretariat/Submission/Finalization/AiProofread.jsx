import React, { useState } from "react";
import Button from "../../../../ui/Button";
import Modal from "../../../../ui/Modal";
import { Upload, Send, FileText } from "lucide-react";

const AiProofreadView = () => {
  const [file, setFile] = useState(null);
  const [show, setShow] = useState(false);

  return (
    <div>
      <h2 className="text-[28px] font-semibold text-slate-800 mb-2">
        AI Proofreading
      </h2>
      <p className="text-slate-500 text-sm mb-6">
        Upload your paper and let AI detect grammar issues
      </p>

      <label className="flex items-center justify-center gap-3 border-2 border-dashed rounded-xl p-6 cursor-pointer text-slate-500 hover:bg-slate-50">
        <Upload />
        <span>Select PDF to upload</span>
        <input
          type="file"
          hidden
          onChange={(e) => {
            setFile(e.target.files[0]);
            setShow(true);
          }}
        />
      </label>

      <Modal
        show={show}
        onClose={() => setShow(false)}
        title="AI Proofreading Result"
      >
        <p className="flex items-center gap-2 text-sm font-semibold">
          <FileText size={16} />
          {file?.name}
        </p>

        <h4 className="mt-4 font-semibold">AI Suggestions</h4>

        <ul className="list-disc pl-5 text-sm space-y-1 mt-2">
          <li>Improve sentence clarity here…</li>
          <li>Grammar issue: “which” → “that”</li>
          <li>Simplify paragraph 3</li>
        </ul>

        <div className="mt-4">
          <Button icon={Send}>Generate Revised PDF</Button>
        </div>
      </Modal>
    </div>
  );
};

export default AiProofreadView;
