import React from "react";
import { Plus, Globe, Edit } from "lucide-react";
import Button from "../../../ui/Button";

const CMS = () => {
  const publishedContent = [
    { title: "Call for Papers (CFP)", status: "Published", date: "2024-10-01", color: "text-emerald-500" },
    { title: "Final Agenda", status: "Scheduled (2025-04-15)", date: "2025-04-01", color: "text-amber-500" },
    { title: "Venue Information & Map", status: "Published", date: "2024-12-01", color: "text-emerald-500" },
    { title: "Keynote Speakers Bio", status: "Draft", date: "2025-03-25", color: "text-red-500" },
  ];

  return (
    <div>
      <h2 className="text-[28px] font-semibold text-slate-800 mb-2">
        Content Management System 🌐
      </h2>
      <p className="text-slate-500 text-sm mb-6">
        Manage and schedule publication of website content.
      </p>

      <div className="flex gap-4 mb-6">
        <Button icon={Plus}>Create New Post</Button>
        <Button icon={Globe} variant="secondary">View Live Website</Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Published Content
        </h3>

        <div className="space-y-3">
          {publishedContent.map((c, idx) => (
            <div
              key={idx}
              className="flex justify-between items-center bg-slate-50 rounded-lg p-4"
            >
              <span className="font-medium text-slate-800">
                {c.title}
              </span>

              <div className="flex items-center gap-6 text-sm">
                <span className="text-slate-500">
                  Last edit: {c.date}
                </span>
                <span className={`font-semibold ${c.color}`}>
                  {c.status}
                </span>
                <Button size="sm" icon={Edit} variant="secondary">
                  Edit
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CMS;
