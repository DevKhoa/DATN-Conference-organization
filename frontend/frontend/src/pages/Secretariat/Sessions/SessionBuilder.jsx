import React, { useState } from "react";
import { Edit, Lock, Unlock, Play, Save } from "lucide-react";
import Button from "../../../ui/Button";
import Modal from "../../../ui/Modal";

const SessionBuilderView = () => {
  const [sessions, setSessions] = useState([
    {
      id: "S1",
      title: "AI & Machine Learning Applications",
      time: "2025-04-15 09:00",
      room: "Hall A",
      chair: "Dr. Smith",
      locked: false,
      papers: [],
    },
    {
      id: "S2",
      title: "Blockchain & Distributed Systems",
      time: "2025-04-15 11:00",
      room: "Hall B",
      chair: "Dr. Johnson",
      locked: false,
      papers: [],
    },
  ]);

  const [selectedSession, setSelectedSession] = useState(null);
  const [showSessionModal, setShowSessionModal] = useState(false);

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-[28px] font-semibold text-slate-800 mb-2">
            AI Session Builder
          </h2>
          <p className="text-slate-500 text-sm">
            AI-assisted scheduling for the conference
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="secondary">Manual Builder</Button>
          <Button icon={Play}>Run AI Suggestion</Button>
          <Button icon={Save} variant="success">Save Schedule</Button>
        </div>
      </div>

      {/* Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
        {/* Config Panel */}
        <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
          <h3 className="font-semibold text-slate-800">Configuration</h3>

          <div>
            <label className="text-sm text-slate-500">Number of Sessions</label>
            <input
              type="number"
              defaultValue={10}
              className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="text-sm text-slate-500">Duration</label>
            <input
              type="time"
              defaultValue="02:00"
              className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="text-sm text-slate-500">Max Papers</label>
            <input
              type="number"
              defaultValue={5}
              className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
            />
          </div>
        </div>

        {/* Sessions */}
        <div className="space-y-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="bg-white rounded-xl shadow-sm p-5"
            >
              <div className="flex justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800">
                    {session.title}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {session.time} — {session.room}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    className="p-2 border rounded-lg"
                    onClick={() => {
                      setSelectedSession(session);
                      setShowSessionModal(true);
                    }}
                  >
                    <Edit size={16} />
                  </button>

                  <button
                    className="p-2 border rounded-lg"
                    onClick={() =>
                      setSessions(
                        sessions.map((s) =>
                          s.id === session.id
                            ? { ...s, locked: !s.locked }
                            : s
                        )
                      )
                    }
                  >
                    {session.locked ? (
                      <Lock size={16} />
                    ) : (
                      <Unlock size={16} />
                    )}
                  </button>
                </div>
              </div>

              <p className="mt-3 text-sm text-slate-500">
                {session.papers.length} papers assigned
              </p>
            </div>
          ))}
        </div>
      </div>

      <Modal
        show={showSessionModal}
        onClose={() => setShowSessionModal(false)}
        title="Edit Session"
      >
        <p className="text-sm">ID: {selectedSession?.id}</p>
        <p className="text-sm">Title: {selectedSession?.title}</p>
      </Modal>
    </div>
  );
};

export default SessionBuilderView;
