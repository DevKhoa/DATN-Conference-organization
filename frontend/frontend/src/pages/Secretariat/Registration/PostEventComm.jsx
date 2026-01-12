import React from "react";
import { Send, FileText, ExternalLink } from "lucide-react";
import Button from "../../../ui/Button";

const PostEventComm = () => {
  return (
    <div>
      <h2 className="text-[28px] font-semibold text-slate-800 mb-2">
        Post-Event Communication 📢
      </h2>
      <p className="text-slate-500 text-sm mb-6">
        Send thank-you emails, proceedings links, and feedback forms.
      </p>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Thank You Email
        </h3>

        <div className="flex gap-4 mb-5">
          <input
            placeholder="Subject"
            className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button icon={FileText} variant="secondary">
            Proceedings
          </Button>
          <Button icon={ExternalLink} variant="secondary">
            Feedback Form
          </Button>
        </div>

        <textarea
          rows={8}
          placeholder="Email content..."
          className="w-full px-3 py-2 border rounded-lg text-sm mb-5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <div className="flex justify-end">
          <Button icon={Send}>Schedule Send</Button>
        </div>
      </div>
    </div>
  );
};

export default PostEventComm;
