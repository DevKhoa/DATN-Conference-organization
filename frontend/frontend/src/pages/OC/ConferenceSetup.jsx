import React from "react";
import { Save, Send } from "lucide-react";
import Button from "../../ui/Button";

const ConferenceSetup = () => {
  return (
    <div>
      <h2 className="text-[28px] font-semibold">Conference Setup & Timeline 🏢</h2>
      <p className="text-[#64748b] mb-6">
        Configure conference details and schedule.
      </p>

      <div className="bg-white border border-[#e2e8f0] rounded-xl p-6">
        <h3>Basic Information</h3>

        <div className="grid grid-cols-2 gap-4">
          <input placeholder="Conference Name" />
          <input placeholder="Venue" />
          <input type="date" />
          <input type="number" placeholder="Duration (days)" />
        </div>

        <div className="mt-5 flex justify-end">
          <Button icon={Save}>Save Draft</Button>
        </div>

        <div className="mt-6 border-t border-[#e2e8f0] pt-5">
          <h3>Timeline Editor</h3>
          <p className="text-[#64748b]">
            Placeholder for schedule editor and conflict detection.
          </p>
          <Button icon={Send}>Submit for Approval</Button>
        </div>
      </div>
    </div>
  );
};

export default ConferenceSetup;
