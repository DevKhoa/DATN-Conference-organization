import React from "react";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  FileText,
  Loader2,
  Mic,
  Plus,
  RefreshCw,
  Trash2,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";

interface ProceedingsBasicTabsSectionProps {
  vm: any;
}

export const ProceedingsBasicTabsSection = ({
  vm,
}: ProceedingsBasicTabsSectionProps) => {
  const {
    activeTab,
    addKeynote,
    COMMITTEE_ROLES,
    committeeByRole,
    committeeActiveRole,
    committeeCollapsed,
    downloadPdfFromUrl,
    edPages,
    edReady,
    fieldCls,
    generateBlobInBackground,
    getKState,
    handlePaperSearch,
    handlePaperSelect,
    handleUserSearch,
    handleUserSelect,
    labelCls,
    loading,
    loadMorePapers,
    papersError,
    papersLoading,
    papersTotal,
    patchCommitteeMember,
    patchKeynote,
    patchKState,
    previewBlobUrl,
    previewGenerating,
    procData,
    abstractModal,
    removeCommitteeMember,
    removeKeynote,
    setAbstractModal,
    setCommitteeActiveRole,
    setCommitteeCollapsed,
    setProcData,
    updateCommittee,
    updateCover,
    updateGeneralInfo
  } = vm;

  return (
    <>
                      {/* ─── COVER ─── */}
                      {activeTab === "cover" && (
                        <div className="space-y-5 max-w-2xl">
                          <div>
                            <label className={labelCls}>Publication Title</label>
                            <input
                              className={fieldCls}
                              value={procData.cover.title}
                              onChange={(e) => updateCover({ title: e.target.value })}
                              placeholder="e.g. Proceedings of the 14th International Symposium…"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-5">
                            <div>
                              <label className={labelCls}>Event Dates</label>
                              <input
                                className={fieldCls}
                                value={procData.cover.date}
                                onChange={(e) =>
                                  updateCover({ date: e.target.value })
                                }
                              />
                            </div>
                            <div>
                              <label className={labelCls}>Location</label>
                              <input
                                className={fieldCls}
                                value={procData.cover.location}
                                onChange={(e) =>
                                  updateCover({ location: e.target.value })
                                }
                              />
                            </div>
                          </div>
                          <div>
                            <label className={labelCls}>
                              Sponsor / Partner Logos
                            </label>
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              onChange={(e) => {
                                if (e.target.files) {
                                  const files = Array.from(
                                    e.target.files as FileList,
                                  );
                                  // Sử dụng mảng tạm để thu thập toàn bộ Base64 trước khi cập nhật State 1 lần duy nhất
                                  const loadedBase64: string[] = [];
                                  let count = 0;
      
                                  files.forEach((file) => {
                                    const reader = new FileReader();
                                    reader.onload = (ev) => {
                                      loadedBase64.push(ev.target?.result as string);
                                      count++;
                                      // Khi đã đọc xong tất cả các file
                                      if (count === files.length) {
                                        setProcData((d) => ({
                                          ...d,
                                          cover: {
                                            ...d.cover,
                                            sponsorLogos: [
                                              ...d.cover.sponsorLogos,
                                              ...loadedBase64.map((src) => ({
                                                src,
                                                selected: true,
                                              })),
                                            ],
                                          },
                                        }));
                                      }
                                    };
                                    reader.readAsDataURL(file);
                                  });
                                }
                              }}
                              className="block w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                            />
                            {procData.cover.sponsorLogos.length > 0 && (
                              <div className="mt-4 flex flex-wrap gap-3">
                                {procData.cover.sponsorLogos.map((logo, idx) => (
                                  <div
                                    key={idx}
                                    className={`relative w-24 h-20 border rounded-lg bg-slate-50 flex items-center justify-center transition-all ${logo.selected ? "border-indigo-400 ring-2 ring-indigo-100" : "border-slate-200 opacity-60"}`}
                                  >
                                    <img
                                      src={logo.src}
                                      alt=""
                                      className="max-w-full max-h-full object-contain p-1.5"
                                    />
                                    {/* Selection checkbox */}
                                    <input
                                      type="checkbox"
                                      checked={logo.selected}
                                      onChange={(e) => {
                                        const checked = e.target.checked;
                                        updateCover({
                                          sponsorLogos:
                                            procData.cover.sponsorLogos.map((lg, i) =>
                                              i === idx
                                                ? { ...lg, selected: checked }
                                                : lg,
                                            ),
                                        });
                                      }}
                                      className="absolute -top-2 -left-2 w-4 h-4 accent-indigo-600 rounded cursor-pointer z-10"
                                      title={
                                        logo.selected ? "Deselect" : "Select to show"
                                      }
                                    />
                                    <button
                                      onClick={() =>
                                        updateCover({
                                          sponsorLogos:
                                            procData.cover.sponsorLogos.filter(
                                              (_, i) => i !== idx,
                                            ),
                                        })
                                      }
                                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs flex items-center justify-center shadow-sm z-10"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
      
                      {/* ─── FOREWORD ─── */}
                      {activeTab === "foreword" && (
                        <div className="max-w-2xl">
                          <textarea
                            rows={18}
                            className={`${fieldCls} resize-none font-serif leading-relaxed`}
                            value={procData.foreword}
                            onChange={(e) =>
                              setProcData((d) => ({ ...d, foreword: e.target.value }))
                            }
                            placeholder="Write the foreword here. Each paragraph separated by a blank line will be rendered as a separate paragraph in the PDF."
                          />
                          <p className="text-xs text-slate-400 mt-2">
                            {
                              procData.foreword.split("\n").filter((l) => l.trim())
                                .length
                            }{" "}
                            paragraph(s)
                          </p>
                        </div>
                      )}
      
                      {/* ─── COMMITTEE ─── */}
                      {activeTab === "committee" && (
                        <div className="space-y-5">
      
                          {/* ── Role filter tabs + counts ── */}
                          <div className="flex flex-wrap gap-1.5">
                            {(["All", ...COMMITTEE_ROLES] as string[]).map(role => {
                              const count = role === "All"
                                ? procData.committee.length
                                : (committeeByRole[role]?.length ?? 0);
                              const active = committeeActiveRole === role;
                              return (
                                <button
                                  key={role}
                                  onClick={() => setCommitteeActiveRole(role)}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all border ${active
                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                    : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                                    }`}
                                >
                                  {role === "All" ? "All Roles" : role}
                                  <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold ${active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                                    }`}>{count}</span>
                                </button>
                              );
                            })}
                          </div>
      
                          {/* ── Grouped accordion by role ── */}
                          {Object.keys(committeeByRole).length === 0 && committeeActiveRole === "All" && (
                            <div className="py-8 text-center text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">
                              No committee members yet. Add members below.
                            </div>
                          )}
      
                          {(committeeActiveRole === "All" ? Object.keys(committeeByRole) : [committeeActiveRole].filter(r => committeeByRole[r]))
                            .map(role => {
                              const members = committeeByRole[role] || [];
                              const isCollapsed = committeeCollapsed[role];
                              return (
                                <div key={role} className="border border-slate-200 rounded-xl overflow-hidden">
                                  {/* Role header */}
                                  <button
                                    onClick={() => setCommitteeCollapsed(prev => ({ ...prev, [role]: !prev[role] }))}
                                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                                  >
                                    <div className="flex items-center gap-3">
                                      <UserCheck className="w-4 h-4 text-indigo-500 shrink-0" />
                                      <span className="text-sm font-semibold text-slate-800">{role}</span>
                                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full">
                                        {members.length}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          updateCommittee([
                                            ...procData.committee,
                                            { id: uuidv4(), role, name: "", affiliation: "" }
                                          ]);
                                          setCommitteeCollapsed(prev => ({ ...prev, [role]: false }));
                                        }}
                                        className="p-1 text-indigo-500 hover:bg-indigo-50 rounded-md transition-colors"
                                        title={`Add ${role}`}
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                      </button>
                                      {isCollapsed ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
                                    </div>
                                  </button>
      
                                  {/* Members list */}
                                  {!isCollapsed && (
                                    <div className="divide-y divide-slate-100">
                                      {members.map((m: any, mIdx: number) => (
                                        <div key={m.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50/60 group">
                                          <span className="text-[10px] text-slate-400 font-mono w-5 text-right shrink-0">{mIdx + 1}</span>
                                          <input
                                            className="flex-1 min-w-0 text-sm border border-transparent bg-transparent rounded-md px-2 py-1 outline-none focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all"
                                            placeholder="Full name"
                                            value={m.name}
                                            onChange={(e) => patchCommitteeMember(m.id, { name: e.target.value })}
                                          />
                                          <input
                                            className="flex-1 min-w-0 text-sm text-slate-500 border border-transparent bg-transparent rounded-md px-2 py-1 outline-none focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all"
                                            placeholder="Affiliation"
                                            value={m.affiliation}
                                            onChange={(e) => patchCommitteeMember(m.id, { affiliation: e.target.value })}
                                          />
                                          {/* Move to different role */}
                                          <select
                                            value={m.role}
                                            onChange={(e) => patchCommitteeMember(m.id, { role: e.target.value })}
                                            className="text-[10px] border border-slate-200 rounded-md px-1.5 py-1 bg-white outline-none focus:ring-1 focus:ring-indigo-400 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity w-32 shrink-0"
                                            title="Move to role"
                                          >
                                            {COMMITTEE_ROLES.map(r => (
                                              <option key={r} value={r}>{r}</option>
                                            ))}
                                          </select>
                                          <button
                                            onClick={() => removeCommitteeMember(m.id)}
                                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all opacity-0 group-hover:opacity-100 shrink-0"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      ))}
                                      {members.length === 0 && (
                                        <p className="px-4 py-3 text-xs text-slate-400 italic">No members in this role yet.</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
      
                          {/* ── Add member — role-aware ── */}
                          <div className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                            <Plus className="w-4 h-4 text-indigo-500 shrink-0" />
                            <span className="text-xs font-semibold text-indigo-600 shrink-0">Add to:</span>
                            <select
                              className="text-xs border border-indigo-200 rounded-lg px-2.5 py-1.5 bg-white outline-none focus:ring-2 focus:ring-indigo-400 text-slate-700 font-medium"
                              value={committeeActiveRole === "All" ? "Program Committee" : committeeActiveRole}
                              onChange={(e) => setCommitteeActiveRole(e.target.value)}
                            >
                              {COMMITTEE_ROLES.map(r => (
                                <option key={r} value={r}>{r}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => {
                                const role = committeeActiveRole === "All" ? "Program Committee" : committeeActiveRole;
                                updateCommittee([
                                  ...procData.committee,
                                  { id: uuidv4(), role, name: "", affiliation: "" }
                                ]);
                                setCommitteeCollapsed(prev => ({ ...prev, [role]: false }));
                                if (committeeActiveRole === "All") setCommitteeActiveRole(role);
                              }}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                            >
                              <Plus className="w-3.5 h-3.5" /> Add Member
                            </button>
                          </div>
      
                        </div>
                      )}
      
                      {/* ─── GENERAL INFO ─── */}
                      {activeTab === "generalInfo" && (
                        <div className="space-y-5 max-w-2xl">
                          {[
                            {
                              key: "venueDetails",
                              label: "Conference Venue",
                              rows: 3,
                              placeholder: "Hotel name, address, city, country…",
                            },
                            {
                              key: "registrationHours",
                              label: "Registration Desk Hours",
                              rows: 2,
                              placeholder: "e.g. Friday 12 Dec 2025 | 07:30 – 18:00",
                            },
                            {
                              key: "roomAssignments",
                              label: "Function Rooms / Layout",
                              rows: 2,
                              placeholder:
                                "e.g. Level 2: Grand Ballroom A, B – Yersin Ballroom A, B",
                            },
                            {
                              key: "coffeeInternetInfo",
                              label: "Refreshments & Internet",
                              rows: 2,
                              placeholder:
                                "Tea break location, Wi-Fi network name and password…",
                            },
                            {
                              key: "galaDinner",
                              label: "Gala Dinner",
                              rows: 2,
                              placeholder:
                                "Venue name, address, date, time, bus pickup…",
                            },
                          ].map(({ key, label, rows, placeholder }) => (
                            <div key={key}>
                              <label className={labelCls}>{label}</label>
                              <textarea
                                rows={rows}
                                className={`${fieldCls} resize-none`}
                                placeholder={placeholder}
                                value={(procData.generalInfo as any)[key]}
                                onChange={(e) =>
                                  updateGeneralInfo({ [key]: e.target.value })
                                }
                              />
                            </div>
                          ))}
                          <div>
                            <label className={labelCls}>
                              Venue Floor Plan (image)
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                // Use FileReader to get base64 data URL (works on server, unlike blob: URLs)
                                const reader = new FileReader();
                                reader.onload = (ev) => {
                                  updateGeneralInfo({ floorPlan: ev.target!.result as string });
                                };
                                reader.readAsDataURL(file);
                              }}
                              className="block w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                            />
                            {procData.generalInfo.floorPlan && (
                              <div className="mt-3 relative inline-block">
                                <img
                                  src={procData.generalInfo.floorPlan}
                                  alt="Floor plan"
                                  className="max-h-48 rounded-lg border border-slate-200"
                                />
                                <button
                                  onClick={() => updateGeneralInfo({ floorPlan: "" })}
                                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                                >
                                  ×
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
      
                      {/* ─── SCHEDULE AT A GLANCE ─── */}
                      {activeTab === "schedule" && (
                        <div className="space-y-4">
                          <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <table className="w-full text-sm text-left">
                              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 border-b border-slate-200">
                                <tr>
                                  <th className="px-4 py-3 w-40">Date</th>
                                  <th className="px-4 py-3 w-36">Time</th>
                                  <th className="px-4 py-3">Session / Event</th>
                                  <th className="px-4 py-3 w-36">Location</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {procData.summarySchedule.length === 0 ? (
                                  <tr>
                                    <td
                                      colSpan={4}
                                      className="px-4 py-6 text-center text-slate-400 italic text-sm"
                                    >
                                      No sessions found for this conference.
                                    </td>
                                  </tr>
                                ) : (
                                  procData.summarySchedule.map((s, i) => (
                                    <tr
                                      key={s.id}
                                      className="hover:bg-slate-50/60 transition-colors"
                                    >
                                      <td className="px-4 py-3 text-slate-600 text-xs">
                                        {s.date}
                                      </td>
                                      <td className="px-4 py-3 font-semibold text-slate-800 text-xs">
                                        {s.time}
                                      </td>
                                      <td className="px-4 py-3 text-slate-700">
                                        {s.topic}
                                      </td>
                                      <td className="px-4 py-3 text-slate-500 text-xs">
                                        {s.location}
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                          <p className="text-xs text-slate-400">
                            Session schedule is auto-loaded from the database. Edit
                            sessions via the Sessions management screen.
                          </p>
                        </div>
                      )}
      
                      {/* ─── KEYNOTES ─── */}
                      {activeTab === "keynotes" && (
                        <div className="space-y-5">
                          {procData.keynotes.length === 0 && (
                            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-8 text-center">
                              <Mic className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                              <p className="text-sm text-slate-500">
                                No keynote speakers added yet.
                              </p>
                              <p className="text-xs text-slate-400 mt-1">
                                Keynote speakers will appear in the PDF after the
                                schedule section.
                              </p>
                            </div>
                          )}
                          {procData.keynotes.map((k, idx) => {
                            // Duplicate speaker detection
                            const isDuplicateSpeaker = k.name.trim() !== "" &&
                              procData.keynotes.some((other, otherIdx) =>
                                otherIdx !== idx && other.name.trim().toLowerCase() === k.name.trim().toLowerCase()
                              );
                            return (
                              <div
                                key={k.id}
                                className={`border rounded-xl overflow-hidden ${isDuplicateSpeaker ? "border-amber-300" : "border-slate-200"}`}
                              >
                                <div className={`flex items-center justify-between px-5 py-3 border-b ${isDuplicateSpeaker ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200"}`}>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                      Keynote {idx + 1}
                                    </span>
                                    {isDuplicateSpeaker && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full border border-amber-200">
                                        <AlertCircle className="w-3 h-3" />
                                        Duplicate speaker
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => removeKeynote(k.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                                <div className="p-5 grid grid-cols-3 gap-5">
                                  {/* Photo */}
                                  <div className="col-span-1 flex flex-col items-center gap-3">
                                    <div className="w-28 h-28 rounded-full border-2 border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center">
                                      {k.photo ? (
                                        <img
                                          src={k.photo}
                                          alt={k.name}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <Users className="w-10 h-10 text-slate-300" />
                                      )}
                                    </div>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const reader = new FileReader();
                                        reader.onload = (ev) => {
                                          patchKeynote(k.id, { photo: ev.target!.result as string });
                                        };
                                        reader.readAsDataURL(file);
                                      }}
                                      className="block w-full text-[11px] text-slate-500 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:font-medium file:bg-indigo-50 file:text-indigo-600"
                                    />
                                  </div>
                                  <div className="col-span-2 space-y-3">
                                    <div className="relative">
                                      <label className={labelCls}>Speaker Name</label>
                                      <input
                                        className={fieldCls}
                                        value={getKState(k.id).userQuery !== "" ? getKState(k.id).userQuery : k.name}
                                        placeholder="e.g. Prof. Vincent Wong"
                                        onChange={(e) => {
                                          patchKeynote(k.id, { name: e.target.value });
                                          handleUserSearch(k.id, e.target.value);
                                        }}
                                        onFocus={() => patchKState(k.id, { userQuery: k.name })}
                                        onBlur={() => setTimeout(() => patchKState(k.id, { userQuery: "", userResults: [] }), 200)}
                                      />
                                      {(getKState(k.id).userResults.length > 0 || getKState(k.id).userSearching) && (
                                        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                                          {getKState(k.id).userSearching ? (
                                            <div className="px-4 py-3 text-xs text-slate-500 flex items-center gap-2">
                                              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching users...
                                            </div>
                                          ) : (
                                            <ul className="py-1">
                                              {getKState(k.id).userResults.map((user) => (
                                                <li
                                                  key={user.user_id}
                                                  className="px-4 py-2 hover:bg-indigo-50 cursor-pointer transition-colors"
                                                  onMouseDown={(e) => { e.preventDefault(); handleUserSelect(k.id, user); }}
                                                >
                                                  <div className="flex items-center gap-2.5">
                                                    <div className="w-6 h-6 rounded-full bg-slate-100 overflow-hidden shrink-0">
                                                      {user.avatar_url ? (
                                                        <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                                                      ) : (
                                                        <Users className="w-3 h-3 m-auto text-slate-400 mt-1.5" />
                                                      )}
                                                    </div>
                                                    <div className="min-w-0">
                                                      <p className="text-sm font-medium text-slate-900 truncate">{user.full_name}</p>
                                                      <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                                                    </div>
                                                  </div>
                                                </li>
                                              ))}
                                            </ul>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    <div className="relative">
                                      <label className={labelCls}>Presentation Title</label>
                                      <input
                                        className={fieldCls}
                                        value={getKState(k.id).isEditingTitle ? getKState(k.id).paperQuery : k.presentationTitle}
                                        placeholder="e.g. Machine Learning for Integrated Sensing and Communication"
                                        onChange={(e) => {
                                          handlePaperSearch(k.id, e.target.value);
                                        }}
                                        onFocus={() => {
                                          // On focus: switch to editing mode, seed paperQuery from current title
                                          patchKState(k.id, { isEditingTitle: true, paperQuery: k.presentationTitle });
                                        }}
                                        onBlur={() => setTimeout(() => {
                                          // On blur: save whatever was typed, exit editing mode
                                          const q = getKState(k.id).paperQuery;
                                          if (getKState(k.id).isEditingTitle) {
                                            patchKeynote(k.id, { presentationTitle: q });
                                          }
                                          patchKState(k.id, { isEditingTitle: false, paperQuery: "", paperResults: [] });
                                        }, 200)}
                                      />
                                      {getKState(k.id).paperResults.length > 0 && (
                                        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                                          <ul className="py-1">
                                            {getKState(k.id).paperResults.map((paper) => (
                                              <li
                                                key={paper.paper_id}
                                                className="px-4 py-2.5 hover:bg-indigo-50 cursor-pointer transition-colors"
                                                onMouseDown={(e) => { e.preventDefault(); handlePaperSelect(k.id, paper); }}
                                              >
                                                <div className="min-w-0">
                                                  <p className="text-sm font-medium line-clamp-2 leading-tight mb-1">{paper.paperTitle}</p>
                                                  <p className="text-[10px] text-slate-500 truncate italic">{paper.authors}</p>
                                                </div>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mt-3">
                                      <div>
                                        <label className={labelCls}>Keynote Label</label>
                                        <input
                                          className={fieldCls}
                                          value={k.keynoteLabel || ""}
                                          placeholder="e.g. KEYNOTE I"
                                          onChange={(e) =>
                                            patchKeynote(k.id, {
                                              keynoteLabel: e.target.value,
                                            })
                                          }
                                        />
                                      </div>
                                      <div>
                                        <label className={labelCls}>Affiliation</label>
                                        <input
                                          className={fieldCls}
                                          value={k.affiliation || ""}
                                          placeholder="e.g. The University of British Columbia, Canada"
                                          onChange={(e) =>
                                            patchKeynote(k.id, {
                                              affiliation: e.target.value,
                                            })
                                          }
                                        />
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 mt-3">
                                      <div>
                                        <label className={labelCls}>Day Label</label>
                                        <input
                                          className={fieldCls}
                                          value={k.dayLabel || ""}
                                          placeholder="e.g. DAY 1 - FRIDAY, 12 DECEMBER 2025"
                                          onChange={(e) =>
                                            patchKeynote(k.id, {
                                              dayLabel: e.target.value,
                                            })
                                          }
                                        />
                                      </div>
                                      <div>
                                        <label className={labelCls}>Time Slot</label>
                                        <input
                                          className={fieldCls}
                                          value={k.timeSlot || ""}
                                          placeholder="e.g. 08:50 - 09:30"
                                          onChange={(e) =>
                                            patchKeynote(k.id, {
                                              timeSlot: e.target.value,
                                            })
                                          }
                                        />
                                      </div>
                                      <div>
                                        <label className={labelCls}>Location</label>
                                        <input
                                          className={fieldCls}
                                          value={k.location || ""}
                                          placeholder="e.g. Grand Ballroom - 2F"
                                          onChange={(e) =>
                                            patchKeynote(k.id, {
                                              location: e.target.value,
                                            })
                                          }
                                        />
                                      </div>
                                    </div>
                                  </div>
                                  <div className="col-span-3">
                                    <label className={labelCls}>Abstract</label>
                                    <textarea
                                      rows={4}
                                      className={`${fieldCls} resize-none`}
                                      value={k.abstract}
                                      placeholder="Keynote abstract…"
                                      onChange={(e) =>
                                        patchKeynote(k.id, { abstract: e.target.value })
                                      }
                                    />
                                  </div>
                                  <div className="col-span-3">
                                    <label className={labelCls}>Biography</label>
                                    <textarea
                                      rows={3}
                                      className={`${fieldCls} resize-none`}
                                      value={k.bio}
                                      placeholder="Speaker's biography…"
                                      onChange={(e) =>
                                        patchKeynote(k.id, { bio: e.target.value })
                                      }
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          <button
                            onClick={addKeynote}
                            className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all flex items-center justify-center gap-2"
                          >
                            <Plus className="w-4 h-4" /> Add Keynote Speaker
                          </button>
                        </div>
                      )}
      
                      {/* ─── PAPERS ─── */}
                      {activeTab === "papers" && (
                        <div className="space-y-4">
                          <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <table className="w-full text-sm text-left">
                              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 border-b border-slate-200">
                                <tr>
                                  <th className="px-5 py-3">#</th>
                                  <th className="px-5 py-3">Title & Authors</th>
                                  <th className="px-5 py-3 w-24 text-center">
                                    Abstract
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {procData.detailedSchedule.length === 0 ? (
                                  <tr>
                                    <td
                                      colSpan={3}
                                      className="px-5 py-8 text-center text-slate-400 italic"
                                    >
                                      No accepted papers found for this conference.
                                    </td>
                                  </tr>
                                ) : (
                                  procData.detailedSchedule.map((p, i) => (
                                    <tr
                                      key={p.id}
                                      className="hover:bg-slate-50/60 transition-colors"
                                    >
                                      <td className="px-5 py-3 text-slate-400 text-xs">
                                        {i + 1}
                                      </td>
                                      <td className="px-5 py-3">
                                        <p className="font-semibold text-slate-900 leading-snug text-sm">
                                          {p.paperTitle}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-0.5 italic">
                                          {p.authors}
                                        </p>
                                      </td>
                                      <td className="px-5 py-3 text-center">
                                        {p.abstract ? (
                                          <button
                                            onClick={() =>
                                              setAbstractModal({
                                                title: p.paperTitle,
                                                authors: p.authors,
                                                abstract: p.abstract,
                                              })
                                            }
                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-medium transition-all"
                                            title="View abstract"
                                          >
                                            <Eye className="w-3.5 h-3.5" /> Read
                                          </button>
                                        ) : (
                                          <span className="text-slate-300 text-xs">
                                            —
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                          <div className="flex flex-col gap-2">
                            <p className="text-xs text-slate-400">
                              Loaded {procData.detailedSchedule.length}/
                              {Math.max(
                                papersTotal,
                                procData.detailedSchedule.length,
                              )}{" "}
                              papers (status = ACCEPTED).
                            </p>
                            {papersError && (
                              <p className="text-xs text-rose-500">{papersError}</p>
                            )}
                            {procData.detailedSchedule.length < papersTotal && (
                              <button
                                onClick={loadMorePapers}
                                disabled={papersLoading}
                                className="self-start px-3 py-2 text-xs bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-700 disabled:opacity-50"
                              >
                                {papersLoading ? "Loading…" : "Load more papers"}
                              </button>
                            )}
                          </div>
      
                          {/* Abstract modal */}
                          {abstractModal && (
                            <div
                              className="fixed inset-0 bg-black/50 flex items-center justify-center p-6"
                              style={{ zIndex: 9999 }}
                              onClick={() => setAbstractModal(null)}
                            >
                              <div
                                className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-start justify-between p-6 pb-4 border-b border-slate-100">
                                  <div className="flex-1 min-w-0 pr-4">
                                    <h3 className="font-bold text-slate-900 text-base leading-snug">
                                      {abstractModal.title}
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1 italic">
                                      {abstractModal.authors}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => setAbstractModal(null)}
                                    className="p-1.5 rounded-lg hover:bg-slate-100 shrink-0"
                                  >
                                    <X className="w-4 h-4 text-slate-500" />
                                  </button>
                                </div>
                                <div className="p-6 overflow-y-auto">
                                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
                                    Abstract
                                  </p>
                                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                                    {abstractModal.abstract}
                                  </p>
                                </div>
                                <div className="p-4 border-t border-slate-100 flex justify-end">
                                  <button
                                    onClick={() => setAbstractModal(null)}
                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-all"
                                  >
                                    Close
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
      
                      {activeTab === 'preview' && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-slate-400 flex items-center gap-1.5">
                              {previewGenerating && <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />}
                              {previewGenerating
                                ? `Rendering ${Math.max(
                                  papersTotal,
                                  procData.detailedSchedule.length,
                                )} papers...`
                                : previewBlobUrl
                                  ? "Preview ready. Edit in PDF Editor, then click Sync View to update."
                                  : procData.detailedSchedule.length <
                                    Math.max(
                                      papersTotal,
                                      procData.detailedSchedule.length,
                                    )
                                    ? `Loaded ${procData.detailedSchedule.length}/${Math.max(
                                      papersTotal,
                                      procData.detailedSchedule.length,
                                    )} papers. Click Sync View to load remaining and render.`
                                    : "Click Sync View to generate preview."}
                            </p>
                            <div className="flex gap-2">
                              {/* Sync View — explicit trigger, không auto-update khi edit */}
                              <button
                                onClick={() => generateBlobInBackground(procData, edReady ? edPages : undefined)}
                                disabled={previewGenerating || papersLoading}
                                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg disabled:opacity-50 transition-all shadow-md shadow-indigo-200"
                              >
                                {previewGenerating || papersLoading
                                  ? (
                                    <>
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      {papersLoading ? "Loading papers..." : "Rendering..."}
                                    </>
                                  )
                                  : <><RefreshCw className="w-3.5 h-3.5" /> Sync View</>}
                              </button>
                              {previewBlobUrl && (
                                <button
                                  onClick={() =>
                                    downloadPdfFromUrl(previewBlobUrl, "proceedings.pdf")
                                  }
                                  className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-all"
                                >
                                  <Download className="w-3.5 h-3.5" /> Export PDF
                                </button>
                              )}
                            </div>
                          </div>
      
                          <div className="h-[720px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                            {previewGenerating ? (
                              <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-slate-50">
                                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                                <p className="text-sm text-slate-500">
                                  Rendering {Math.max(
                                    papersTotal,
                                    procData.detailedSchedule.length,
                                  )} papers
                                  {edReady ? ` across ${edPages.length} pages` : ""}...
                                </p>
                              </div>
                            ) : previewBlobUrl ? (
                              <iframe src={previewBlobUrl} width="100%" height="100%"
                                className="border-none" title="PDF Preview" />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-slate-50">
                                <FileText className="w-12 h-12 text-slate-300" />
                                <p className="text-sm text-slate-500">
                                  {Math.max(
                                    papersTotal,
                                    procData.detailedSchedule.length,
                                  )} papers
                                  · {procData.keynotes.length} keynotes
                                  {edReady ? ` · ${edPages.length} editor pages` : ""}
                                </p>
                                <button
                                  onClick={() => generateBlobInBackground(procData, edReady ? edPages : undefined)}
                                  disabled={previewGenerating || papersLoading}
                                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-all shadow-md shadow-indigo-200"
                                >
                                  {previewGenerating || papersLoading ? (
                                    <>
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                      {papersLoading ? "Loading papers..." : "Rendering..."}
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="w-4 h-4" /> Sync View
                                    </>
                                  )}
                                </button>
                                {edReady && (
                                  <p className="text-xs text-slate-400 text-center max-w-xs">
                                    Includes {edPages.length} pages from PDF Editor (with your inserted pages)
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
      
    </>
  );
};
