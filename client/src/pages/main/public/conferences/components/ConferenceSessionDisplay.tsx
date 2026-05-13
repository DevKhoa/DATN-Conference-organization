import {
  ChevronDown,
  Eye,
  EyeOff,
  FileText,
  MapPin,
  Monitor,
  User,
  Users,
  Video,
  Youtube,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { ChairSection } from "./ChairSection";
import type { ConferenceDetailSession } from "@/features/conferences/services/queries";

type SessionDisplayProps = {
  conferenceFormatType?: string | null;
  canAccessVirtual: boolean;
  canEdit: boolean;
  session: ConferenceDetailSession;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onNavigateToChairs: () => void;
  onToggleMeet: (payload: { sessionId: number; isActive: boolean }) => void;
  onDelete?: () => void;
};

const formatTimeOnly = (isoString: string | null) => {
  if (!isoString) return "N/A";

  return new Date(isoString).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

export const ConferenceSessionDisplay = ({
  conferenceFormatType,
  canAccessVirtual,
  canEdit,
  session,
  isExpanded,
  onToggle,
  onEdit,
  onNavigateToChairs,
  onToggleMeet,
  onDelete,
}: SessionDisplayProps) => {
  const chairs = session.chairs?.length
    ? session.chairs
    : session.chair
      ? [session.chair]
      : [];

  return (
    <div
      id={`session-${session.session_id}`}
      className={`group flex gap-4 md:gap-6 relative ${isExpanded ? "mb-0" : "mb-8"}`}
    >
      <div className="flex flex-col items-center shrink-0 w-16 z-10">
        <div className="bg-muted py-2 flex flex-col items-center w-full">
          <span
            className={`text-sm font-bold font-mono tracking-tight ${isExpanded ? "text-primary" : "text-muted-foreground"
              }`}
          >
            {formatTimeOnly(session.start_time)}
          </span>
          <span className="text-[10px] text-muted-foreground font-medium mb-3">
            {formatTimeOnly(session.end_time)}
          </span>
          <div
            className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 relative bg-white ${isExpanded
                ? "border-primary shadow-[0_0_0_4px_rgba(59,130,246,0.1)] scale-110"
                : "border-border group-hover:border-primary/40"
              }`}
          >
            {isExpanded && (
              <div className="absolute inset-0.5 rounded-full bg-primary" />
            )}
          </div>
        </div>
      </div>

      <div
        className={`grow relative z-10 rounded-2xl border bg-white transition-all duration-300 ${isExpanded
            ? "border-primary/30 shadow-lg ring-1 ring-primary/20 translate-x-1"
            : "border-border shadow-sm hover:border-border/80 hover:shadow-md"
          }`}
      >
        {canEdit && onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="absolute top-3 right-3 h-8 w-8 flex items-center justify-center rounded-full bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all duration-200 z-20 shadow-sm border border-destructive/20"
            title="Delete Session"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        <div onClick={onToggle} className="cursor-pointer p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
            <div
              className={`flex flex-1 items-start gap-3 text-lg font-bold transition-colors md:text-xl min-w-[280px] ${isExpanded
                  ? "text-primary"
                  : "text-foreground group-hover:text-primary"
                }`}
            >
              <div className="shrink-0 mt-0.5 rounded-xl bg-muted p-2 text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                {session.format_type?.toLowerCase() === "virtual" && (
                  <Monitor className="h-4 w-4" />
                )}
                {session.format_type?.toLowerCase() === "in-person" && (
                  <MapPin className="h-4 w-4" />
                )}
                {!session.format_type &&
                  conferenceFormatType?.toLowerCase() === "virtual" && (
                    <Monitor className="h-4 w-4" />
                  )}
                {!session.format_type &&
                  conferenceFormatType?.toLowerCase() !== "virtual" && (
                    <MapPin className="h-4 w-4" />
                  )}
              </div>
              <div className="flex min-w-0 flex-col">
                <span>{session.session_name}</span>
                <span className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {session.room_location ||
                    (session.format_type === "virtual"
                      ? "Virtual Session"
                      : "No Location Set")}
                </span>
              </div>
            </div>

            <div className="ml-auto flex items-center gap-3 transition-all w-full sm:w-auto">
              <div className="flex flex-wrap items-center justify-end gap-2">
                {session.format_type !== "in-person" && canAccessVirtual && (
                  <>
                    {session.meet_link !== undefined && (canEdit || (session.is_meet_active ?? true)) && (
                      <div className="flex items-center gap-1 animate-in slide-in-from-right-2 duration-300 group/meet">
                        <button
                          className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold shadow-sm transition-all duration-300 ${session.meet_link &&
                              (session.is_meet_active ?? true)
                              ? "border-transparent bg-linear-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 hover:shadow-indigo-200"
                              : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                            }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              session.meet_link &&
                              (session.is_meet_active ?? true)
                            ) {
                              window.open(session.meet_link, "_blank");
                            } else {
                              toast.info("Room is not available now", {
                                description:
                                  "The organizer has not opened this virtual room yet.",
                              });
                            }
                          }}
                        >
                          <Video className="h-3.5 w-3.5" />
                          Join Virtual Meeting
                        </button>

                        {canEdit && session.meet_link !== undefined && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleMeet({
                                sessionId: session.session_id,
                                isActive: !(session.is_meet_active ?? true),
                              });
                            }}
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-all duration-200 ${(session.is_meet_active ?? true)
                                ? "border-emerald-100 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                : "border-slate-200 bg-slate-100 text-slate-400 hover:bg-slate-200"
                              }`}
                            title={
                              (session.is_meet_active ?? true)
                                ? "Deactivate Meeting Room"
                                : "Activate Meeting Room"
                            }
                          >
                            {(session.is_meet_active ?? true) ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <EyeOff className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </div>
                    )}

                    {session.record_video_url !== undefined && (
                      <button
                        className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold shadow-sm transition-all duration-300 animate-in slide-in-from-right-2 ${session.record_video_url
                            ? "border-transparent bg-linear-to-r from-rose-600 to-pink-600 text-white hover:from-rose-700 hover:to-pink-700 hover:shadow-rose-200"
                            : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                          }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (session.record_video_url) {
                            window.open(session.record_video_url, "_blank");
                          } else {
                            toast.info("Recorded video is not available now", {
                              description:
                                "The recording will be uploaded after the conference concludes.",
                            });
                          }
                        }}
                      >
                        <Youtube className="h-3.5 w-3.5" />
                        Watch Recording
                      </button>
                    )}
                  </>
                )}

                {canEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit();
                    }}
                    className="shrink-0 rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                  >
                    Edit Session
                  </button>
                )}

                {canEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigateToChairs();
                    }}
                    className="shrink-0 rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 flex items-center gap-1.5"
                  >
                    <Users className="h-3.5 w-3.5" />
                    Manage Chairs
                  </button>
                )}

                {/* Delete button removed from here and moved to top-right of card */}
              </div>

              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300 ${isExpanded
                    ? "rotate-180 bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                  }`}
              >
                <ChevronDown className="h-5 w-5" />
              </div>
            </div>
          </div>

          {!isExpanded && chairs.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground animate-in fade-in duration-300">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                Chairs:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {chairs.map((chair) => (
                  <div key={chair.user_id} className="flex items-center gap-2">
                    {chair.avatar_url ? (
                      <img
                        src={chair.avatar_url}
                        className="h-5 w-5 rounded-full object-cover"
                        alt={chair.full_name || "Chair"}
                      />
                    ) : (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                        {(chair.full_name || "U").charAt(0)}
                      </div>
                    )}
                    <span className="font-medium text-foreground">
                      {chair.full_name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isExpanded && chairs.length === 0 && (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                Chair:
              </span>
              <span>Unassigned</span>
            </div>
          )}
        </div>

        {isExpanded && (
          <div className="animate-in slide-in-from-top-2 px-5 pb-6 md:px-6 duration-300">
            <hr className="mb-6 border-border" />

            {chairs.length > 0 ? (
              chairs.map((chair) => (
                <ChairSection key={chair.user_id} chair={chair} />
              ))
            ) : (
              <div className="mb-8 rounded-2xl border border-dashed border-border bg-muted/30 p-5 text-sm text-muted-foreground">
                No chairs assigned yet.
              </div>
            )}

            <div>
              <h4 className="mb-4 flex items-center text-sm font-bold uppercase tracking-wide text-foreground">
                <FileText className="mr-2 h-4 w-4 text-primary" />
                Presentations
              </h4>

              <div className="space-y-4">
                {session.session_papers && session.session_papers.length > 0 ? (
                  session.session_papers.map((sp, paperIdx) => (
                    <div
                      key={sp.paper.paper_id}
                      className="group/paper rounded-xl border border-transparent bg-muted/40 p-4 transition-all duration-200 hover:border-border hover:bg-card hover:shadow-sm"
                    >
                      <div className="flex gap-4">
                        <div className="hidden w-8 flex-col items-center justify-center pt-1 sm:flex">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground transition-colors group-hover/paper:bg-primary group-hover/paper:text-primary-foreground">
                            {paperIdx + 1}
                          </div>
                        </div>
                        <div className="grow">
                          <div className="mb-1 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                            <h5 className="text-base font-bold text-foreground transition-colors group-hover/paper:text-primary">
                              {sp.paper.title}
                            </h5>
                            {(sp.start_time || sp.end_time) && (
                              <span className="shrink-0 whitespace-nowrap rounded border border-primary/20 bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                                {sp.start_time
                                  ? formatTimeOnly(sp.start_time)
                                  : ""}{" "}
                                -{" "}
                                {sp.end_time ? formatTimeOnly(sp.end_time) : ""}
                              </span>
                            )}
                          </div>
                          <div className="mb-2 flex items-center text-sm text-muted-foreground">
                            <User className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-medium">
                              {sp.paper.author?.full_name || "Unknown Author"}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed text-muted-foreground">
                            {sp.paper.abstract}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 text-sm italic text-muted-foreground">
                    No papers assigned yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
