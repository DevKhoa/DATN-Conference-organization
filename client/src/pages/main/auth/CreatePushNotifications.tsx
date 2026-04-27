import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  AlertCircle,
  Bell,
  CheckCircle,
  ChevronDown,
  FileText,
  List,
  ListOrdered,
  Loader2,
  PenLine,
  Search,
  Send,
  Shield,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useNotificationConferenceUsersPoolQuery,
  useNotificationConferencesQuery,
  useNotificationTemplatesQuery,
  useNotificationUserSearchQuery,
  type NotificationConference,
  type NotificationTemplate,
  type NotificationUserResult,
} from "@/features/notifications/services/queries";
import {
  resolveNotificationTargetUsers,
  useSaveNotificationTemplateMutation,
  useSendNotificationMutation,
} from "@/features/notifications/services/mutations";
import useAuth from "@/features/auth/hooks/useAuth";
import { DefaultLayout } from "@/layouts/DefaultLayout";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "@tanstack/react-router";

// Interfaces

interface CreatePushNotificationsProps {
  /** Pre-selected conference id when coming from conference detail page */
  conferenceId?: number;
  conferenceName?: string;
  /** Current admin email to resolve sender_id */
  userEmail?: string;
  onClose?: () => void;
}

// Rich-text mini toolbar
const execCmd = (cmd: string, val?: string) =>
  document.execCommand(cmd, false, val);

const RichTextEditor: React.FC<{
  value: string;
  onChange: (html: string) => void;
  onFocus?: () => void;
}> = ({ value, onChange, onFocus }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [formatState, setFormatState] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
    orderedList: false,
    unorderedList: false,
    align: "left" as "left" | "center" | "right",
    block: "p" as "p" | "h3" | "blockquote" | "pre",
  });

  const isSelectionInEditor = useCallback(() => {
    const root = editorRef.current;
    const sel = document.getSelection();
    if (!root || !sel || sel.rangeCount === 0) return false;
    return root.contains(sel.anchorNode);
  }, []);

  const detectBlock = useCallback((): "p" | "h3" | "blockquote" | "pre" => {
    const root = editorRef.current;
    const sel = document.getSelection();
    if (!root || !sel || sel.rangeCount === 0 || !sel.anchorNode) return "p";

    let node: Node | null = sel.anchorNode;
    while (node && node !== root) {
      if (node instanceof HTMLElement) {
        const tag = node.tagName.toLowerCase();
        if (tag === "h3") return "h3";
        if (tag === "blockquote") return "blockquote";
        if (tag === "pre") return "pre";
      }
      node = node.parentNode;
    }
    return "p";
  }, []);

  const updateFormatState = useCallback(() => {
    if (!isSelectionInEditor()) return;

    const center = document.queryCommandState("justifyCenter");
    const right = document.queryCommandState("justifyRight");
    setFormatState({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      strikeThrough: document.queryCommandState("strikeThrough"),
      orderedList: document.queryCommandState("insertOrderedList"),
      unorderedList: document.queryCommandState("insertUnorderedList"),
      align: center ? "center" : right ? "right" : "left",
      block: detectBlock(),
    });
  }, [detectBlock, isSelectionInEditor]);

  const runEditorCommand = useCallback(
    (cmd: string, val?: string) => {
      execCmd(cmd, val);
      onChange(editorRef.current?.innerHTML || "");
      requestAnimationFrame(updateFormatState);
    },
    [onChange, updateFormatState],
  );

  const toggleBlock = useCallback(
    (target: "h3" | "blockquote" | "pre") => {
      const next = formatState.block === target ? "div" : target;
      runEditorCommand("formatBlock", next);
    },
    [formatState.block, runEditorCommand],
  );

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
    requestAnimationFrame(updateFormatState);
  }, [value, updateFormatState]);

  useEffect(() => {
    const onSelectionChange = () => updateFormatState();
    document.addEventListener("selectionchange", onSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", onSelectionChange);
  }, [updateFormatState]);

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 px-3 py-2 bg-muted/40 border-b border-border">
        {[
          { label: "B", cmd: "bold", title: "Bold" },
          { label: "I", cmd: "italic", title: "Italic" },
          { label: "U", cmd: "underline", title: "Underline" },
        ].map((btn) => (
          <button
            key={btn.cmd}
            type="button"
            title={btn.title}
            onMouseDown={(e) => {
              e.preventDefault();
              runEditorCommand(btn.cmd);
            }}
            className={`w-7 h-7 rounded text-sm font-semibold transition-colors ${btn.cmd === "bold"
              ? "font-extrabold"
              : btn.cmd === "italic"
                ? "italic"
                : "underline"
              } ${(btn.cmd === "bold" && formatState.bold) ||
                (btn.cmd === "italic" && formatState.italic) ||
                (btn.cmd === "underline" && formatState.underline)
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent"
              }`}
          >
            {btn.label}
          </button>
        ))}
        <button
          type="button"
          title="Strike"
          onMouseDown={(e) => {
            e.preventDefault();
            runEditorCommand("strikeThrough");
          }}
          className={`px-2 h-7 rounded text-xs font-semibold transition-colors ${formatState.strikeThrough
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-accent"
            }`}
        >
          Strike
        </button>
        <div className="w-px h-5 bg-border mx-1" />
        <button
          type="button"
          title="Heading"
          onMouseDown={(e) => {
            e.preventDefault();
            toggleBlock("h3");
          }}
          className={`px-2 h-7 rounded text-xs transition-colors ${formatState.block === "h3"
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-accent"
            }`}
        >
          H3
        </button>
        <button
          type="button"
          title="Quote"
          onMouseDown={(e) => {
            e.preventDefault();
            toggleBlock("blockquote");
          }}
          className={`px-2 h-7 rounded text-xs transition-colors ${formatState.block === "blockquote"
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-accent"
            }`}
        >
          Quote
        </button>
        <button
          type="button"
          title="Code block"
          onMouseDown={(e) => {
            e.preventDefault();
            toggleBlock("pre");
          }}
          className={`px-2 h-7 rounded text-xs transition-colors ${formatState.block === "pre"
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-accent"
            }`}
        >
          Code
        </button>
        <div className="w-px h-5 bg-border mx-1" />
        {/* Nút Ordered list (Numbering) */}
        <button
          type="button"
          title="Ordered list"
          onMouseDown={(e) => {
            e.preventDefault();
            runEditorCommand("insertOrderedList");
          }}
          className={`w-7 h-7 flex items-center justify-center rounded text-xs transition-colors ${formatState.orderedList
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-accent"
            }`}
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        {/* Nút Unordered list (Bullets) */}
        <button
          type="button"
          title="Unordered list"
          onMouseDown={(e) => {
            e.preventDefault();
            runEditorCommand("insertUnorderedList");
          }}
          className={`w-7 h-7 flex items-center justify-center rounded text-xs transition-colors ${formatState.unorderedList
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-accent"
            }`}
        >
          <List className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-border mx-1" />
        <button
          type="button"
          title="Align left"
          onMouseDown={(e) => {
            e.preventDefault();
            runEditorCommand("justifyLeft");
          }}
          className={`px-2 h-7 rounded text-xs transition-colors ${formatState.align === "left"
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-accent"
            }`}
        >
          Left
        </button>
        <button
          type="button"
          title="Align center"
          onMouseDown={(e) => {
            e.preventDefault();
            runEditorCommand("justifyCenter");
          }}
          className={`px-2 h-7 rounded text-xs transition-colors ${formatState.align === "center"
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-accent"
            }`}
        >
          Center
        </button>
        <button
          type="button"
          title="Align right"
          onMouseDown={(e) => {
            e.preventDefault();
            runEditorCommand("justifyRight");
          }}
          className={`px-2 h-7 rounded text-xs transition-colors ${formatState.align === "right"
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-accent"
            }`}
        >
          Right
        </button>
        <div className="w-px h-5 bg-border mx-1" />
        <button
          type="button"
          title="Undo"
          onMouseDown={(e) => {
            e.preventDefault();
            runEditorCommand("undo");
          }}
          className="px-2 h-7 rounded text-xs text-muted-foreground hover:bg-accent transition-colors"
        >
          Undo
        </button>
        <button
          type="button"
          title="Redo"
          onMouseDown={(e) => {
            e.preventDefault();
            runEditorCommand("redo");
          }}
          className="px-2 h-7 rounded text-xs text-muted-foreground hover:bg-accent transition-colors"
        >
          Redo
        </button>
        <button
          type="button"
          title="Clear formatting"
          onMouseDown={(e) => {
            e.preventDefault();
            runEditorCommand("removeFormat");
          }}
          className="px-2 h-7 rounded text-xs text-muted-foreground hover:bg-accent transition-colors"
        >
          Clear
        </button>
        <div className="w-px h-5 bg-border mx-1" />
        <label className="flex items-center gap-1 px-1 text-[11px] text-muted-foreground">
          Text
          <input
            type="color"
            title="Text color"
            className="w-6 h-6 rounded border border-border cursor-pointer"
            onChange={(e) => runEditorCommand("foreColor", e.target.value)}
          />
        </label>
        <label className="flex items-center gap-1 px-1 text-[11px] text-muted-foreground">
          Highlight
          <input
            type="color"
            title="Highlight color"
            className="w-6 h-6 rounded border border-border cursor-pointer"
            onChange={(e) => runEditorCommand("hiliteColor", e.target.value)}
          />
        </label>
        <div className="w-px h-5 bg-border mx-1" />
        <button
          type="button"
          title="Insert link"
          onMouseDown={(e) => {
            e.preventDefault();
            const url = prompt("Enter URL:");
            if (url) runEditorCommand("createLink", url);
          }}
          className="px-2 h-7 rounded text-xs text-primary hover:bg-primary/10 transition-colors font-medium"
        >
          Link
        </button>
      </div>
      <div className="px-3 py-1.5 bg-muted/40 border-b border-border">
        <p className="text-[11px] text-muted-foreground">
          Tip: Select text first, then choose a format. Use Text/Highlight color
          pickers for colors.
        </p>
      </div>
      {/* Editor area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onFocus={onFocus}
        onInput={() => {
          onChange(editorRef.current?.innerHTML || "");
          updateFormatState();
        }}
        onKeyUp={updateFormatState}
        onMouseUp={updateFormatState}
        className="min-h-45 px-4 py-3 text-sm text-foreground focus:outline-none leading-relaxed"
        data-placeholder="Write your notification content here..."
        style={{ wordBreak: "break-word" }}
      />
      <style>{`
        [contenteditable] h3 {
          font-size: 1.125rem;
          line-height: 1.5rem;
          font-weight: 700;
          color: hsl(var(--foreground));
          margin: 0.6rem 0;
        }
        [contenteditable] blockquote {
          border-left: 3px solid hsl(var(--border));
          background: hsl(var(--muted));
          margin: 0.6rem 0;
          padding: 0.35rem 0.75rem;
          color: hsl(var(--foreground));
          font-style: italic;
        }
        [contenteditable] pre {
          margin: 0.6rem 0;
          padding: 0.6rem 0.75rem;
          background: hsl(var(--foreground));
          color: hsl(var(--muted-foreground));
          border-radius: 0.5rem;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          white-space: pre-wrap;
        }
        [contenteditable] ol {
          list-style: decimal;
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        [contenteditable] ul {
          list-style: disc;
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        [contenteditable] li {
          margin: 0.15rem 0;
        }
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
        }
      `}</style>
    </div>
  );
};

// Main Component
const CreatePushNotificationsPage: React.FC<CreatePushNotificationsProps> = ({
  conferenceId,
  conferenceName,
  userEmail,
  onClose,
}) => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const resolvedUserEmail = userEmail ?? session?.user?.email ?? "";
  const handleClose = onClose ?? (() => navigate({ to: "/profile" }));
  const isConferenceScoped = !!conferenceId;

  // Tabs
  const [activeTab, setActiveTab] = useState<"template" | "manual">("manual");

  // Template state
  const [selectedTemplate, setSelectedTemplate] =
    useState<NotificationTemplate | null>(null);

  // Manual state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // Conference targeting - simplified to 2 options
  // 'all' = All conferences (System-wide), 'specific' = selected conference(s)
  const [confScope, setConfScope] = useState<"all" | "specific">(
    isConferenceScoped ? "specific" : "all",
  );
  const [selectedConfIds, setSelectedConfIds] = useState<number[]>(
    conferenceId ? [conferenceId] : [],
  );
  const [confSearch, setConfSearch] = useState("");
  const [confSearchFocused, setConfSearchFocused] = useState(false);

  // People targeting
  const [peopleScope, setPeopleScope] = useState<"all" | "specific" | "byRole">(
    "all",
  );
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const roleOptions = [
    {
      id: "author",
      label: "Author / Co-Author",
      description: "Primary authors and co-authors of submitted papers",
    },
    {
      id: "chairperson",
      label: "Chairperson",
      description: "Session chairpersons",
    },
    {
      id: "attendee",
      label: "Attendee",
      description: "Registered attendees via tickets",
    },
  ];
  const [selectedUsers, setSelectedUsers] = useState<NotificationUserResult[]>(
    [],
  );
  const [userSearch, setUserSearch] = useState("");
  const [userSearchFocused, setUserSearchFocused] = useState(false);

  // Submission
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Create / Edit template form state
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(
    null,
  ); // null = create, number = edit
  const [newTmplName, setNewTmplName] = useState("");
  const [newTmplTitle, setNewTmplTitle] = useState("");
  const [newTmplContent, setNewTmplContent] = useState("");
  const [newTmplConfId, setNewTmplConfId] = useState<number | null>(
    conferenceId ?? null,
  );
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [saveTemplateMsg, setSaveTemplateMsg] = useState("");

  const { data: templates = [] } = useNotificationTemplatesQuery();
  const { data: conferences = [] } = useNotificationConferencesQuery();
  const { data: confUsersPool = [] } = useNotificationConferenceUsersPoolQuery(
    confScope,
    selectedConfIds,
  );

  const [debouncedUserSearch, setDebouncedUserSearch] = useState("");
  const { data: userResults = [], isFetching: userSearchLoading } =
    useNotificationUserSearchQuery({
      keyword: debouncedUserSearch,
      confScope,
      selectedConfIds,
      confUsersPool,
      excludedUserIds: selectedUsers.map((user) => user.user_id),
    });

  const saveTemplateMutation = useSaveNotificationTemplateMutation();
  const sendNotificationMutation = useSendNotificationMutation();
  const submitting = sendNotificationMutation.isPending;

  // Save (create or update) template to DB
  const saveTemplate = async () => {
    if (!newTmplName.trim() || !newTmplTitle.trim() || !newTmplContent.trim()) {
      setSaveTemplateMsg("Please fill in template name, title, and content.");
      return;
    }
    setSavingTemplate(true);
    setSaveTemplateMsg("");
    try {
      const { data: senderData } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", resolvedUserEmail)
        .single();

      await saveTemplateMutation.mutateAsync({
        templateId: editingTemplateId,
        templateName: newTmplName.trim(),
        titleTemplate: newTmplTitle.trim(),
        contentTemplate: newTmplContent.trim(),
        confId: newTmplConfId,
        createdBy: senderData?.user_id ?? null,
      });

      setSaveTemplateMsg("Template saved!");
      setTimeout(() => {
        setShowCreateTemplate(false);
        setEditingTemplateId(null);
        setNewTmplName("");
        setNewTmplTitle("");
        setNewTmplContent("");
        setNewTmplConfId(conferenceId ?? null);
        setSaveTemplateMsg("");
      }, 1200);
    } catch (err: any) {
      setSaveTemplateMsg(`Error: ${err.message}`);
    } finally {
      setSavingTemplate(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedUserSearch(userSearch);
    }, 300);

    return () => clearTimeout(timeout);
  }, [userSearch]);

  // Build auto-populated vars from current context
  // [Conference_Name] -> comma-joined list of selected conference names
  const getAutoVars = (): Record<string, string> => {
    const selectedConferences = conferences.filter((c) =>
      confScope === "all" ? true : selectedConfIds.includes(c.conf_id),
    );
    const confList =
      selectedConferences.map((c) => c.conf_name).join(", ") ||
      "(All Conferences)";
    return {
      "[Conference_Name]": confList,
      "[Conferences]": confList,
      "[Date]": new Date().toLocaleDateString("vi-VN"),
    };
  };

  const resolveTemplate = (text: string) => {
    const merged = { ...getAutoVars() };
    let out = text;
    Object.entries(merged).forEach(([k, v]) => {
      out = out.replaceAll(k, v);
    });
    return out;
  };

  // Reset peopleScope when switching to "all" conferences
  useEffect(() => {
    if (confScope === "all" && peopleScope === "byRole") {
      setPeopleScope("all");
      setSelectedRoles([]);
    }
  }, [confScope, peopleScope]);

  // Fan-out: resolve user_ids based on conference + people scope
  // Submit
  const handleSubmit = async () => {
    const finalTitle = resolveTemplate(title.trim());
    const finalContent = resolveTemplate(content);

    if (!finalTitle) {
      setSubmitError("Please provide a title.");
      return;
    }
    if (!finalContent) {
      setSubmitError("Please provide content.");
      return;
    }
    if (confScope === "specific" && selectedConfIds.length === 0) {
      setSubmitError("Please select at least one conference.");
      return;
    }
    if (peopleScope === "byRole" && selectedRoles.length === 0) {
      setSubmitError("Please select at least one role.");
      return;
    }
    if (peopleScope === "specific" && selectedUsers.length === 0) {
      setSubmitError("Please select at least one recipient.");
      return;
    }

    setSubmitError("");

    try {
      const targetUserIds = await resolveNotificationTargetUsers({
        confScope,
        selectedConfIds,
        peopleScope,
        selectedRoles,
        selectedUserIds: selectedUsers.map((user) => user.user_id),
      });

      if (targetUserIds.length === 0 && peopleScope !== "all") {
        throw new Error(
          peopleScope === "byRole"
            ? `No users found matching the selected role(s): ${selectedRoles.join(", ")}. ` +
            "Make sure users exist as authors, chairpersons, or registered attendees."
            : "No registered users found for the selected conference(s). " +
            "Make sure users are registered via sessions -> ticket_session -> registrations.",
        );
      }

      await sendNotificationMutation.mutateAsync({
        senderEmail: resolvedUserEmail,
        conferenceId,
        confScope,
        selectedConfIds,
        peopleScope,
        selectedRoles,
        finalTitle,
        finalContent,
        targetUserIds,
        activeTab,
      });

      setSubmitSuccess(true);
      setTimeout(() => handleClose(), 2000);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to send notification.";
      setSubmitError(message);
    }
  };

  // Render
  const filteredTemplates = templates;
  const confDropdownRef = useRef<HTMLDivElement>(null);

  const filteredConferences = conferences.filter((c) => {
    if (selectedConfIds.includes(c.conf_id)) return false;
    const q = confSearch.trim().toLowerCase();
    if (!q) return true; // show all unselected when no query
    return (
      c.conf_name.toLowerCase().includes(q) ||
      c.status.toLowerCase().includes(q)
    );
  });

  // Handle Escape key and click-outside for conference dropdown
  useEffect(() => {
    if (!confSearchFocused) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setConfSearchFocused(false);
        setConfSearch("");
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        confDropdownRef.current &&
        !confDropdownRef.current.contains(e.target as Node)
      ) {
        setConfSearchFocused(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [confSearchFocused]);

  return (
    <DefaultLayout meta={{ title: "Create Notification" }}>
      <div className="min-h-[calc(100vh-4.5rem)] bg-muted/20 flex items-start justify-center p-4 md:p-6">
        <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-300 border border-border text-foreground">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">
                  {isConferenceScoped
                    ? "Conference Notification"
                    : "System Notification"}
                </h2>
                {isConferenceScoped && conferenceName && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Sending to:{" "}
                    <span className="font-medium text-primary">
                      {conferenceName}
                    </span>
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div
            className="flex-1 overflow-y-auto px-6 py-5 space-y-6"
            style={{ overscrollBehavior: "contain" }}
          >
            {!submitSuccess && submitError && (
              <div className="sticky top-0 z-30 -mx-1 px-1">
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 shadow-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {submitError}
                </div>
              </div>
            )}

            {/* Success State */}
            {submitSuccess && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <CheckCircle className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">
                  Notification Sent!
                </h3>
                <p className="text-sm text-muted-foreground">
                  Recipients have been notified successfully.
                </p>
              </div>
            )}

            {!submitSuccess && (
              <>
                {/* STEP 1 - TARGETING (conference + people) */}
                <div className="space-y-5 pb-5 border-b border-border">
                  <p className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" /> 1. Send To
                  </p>

                  {/* Conference scope pills */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Conference
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {[
                        {
                          id: "all" as const,
                          label: "All Conferences (System)",
                        },
                        { id: "specific" as const, label: "Select Specific" },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setConfScope(opt.id);
                            if (
                              opt.id === "specific" &&
                              conferenceId &&
                              selectedConfIds.length === 0
                            )
                              setSelectedConfIds([conferenceId]);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${confScope === opt.id
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-muted-foreground border-input hover:border-primary/60"
                            }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Conference search-and-select */}
                  {confScope === "specific" && (
                    <div className="space-y-3" ref={confDropdownRef}>
                      {/* Search input with toggle button */}
                      <div className="relative">
                        <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <input
                          type="text"
                          value={confSearch}
                          onChange={(e) => setConfSearch(e.target.value)}
                          onFocus={() => setConfSearchFocused(true)}
                          placeholder="Search or click dropdown to view all..."
                          className="w-full border border-input rounded-lg pl-9 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-colors bg-background text-foreground"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setConfSearchFocused(!confSearchFocused);
                            if (confSearchFocused) setConfSearch("");
                          }}
                          className={`absolute right-2 top-2.5 p-1 rounded transition-all ${confSearchFocused ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/10"}`}
                          title={
                            confSearchFocused
                              ? "Close dropdown"
                              : "Open dropdown"
                          }
                        >
                          <ChevronDown
                            className={`w-5 h-5 transition-transform font-semibold ${confSearchFocused ? "rotate-180" : ""}`}
                          />
                        </button>

                        {/* Conference list dropdown */}
                        {confSearchFocused && (
                          <div className="absolute left-0 right-0 top-full mt-2 z-20 border border-border rounded-lg overflow-hidden shadow-lg bg-card max-h-56 overflow-y-auto">
                            {filteredConferences.length > 0 ? (
                              filteredConferences.map((c) => (
                                <button
                                  key={c.conf_id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedConfIds((prev) => [
                                      ...prev,
                                      c.conf_id,
                                    ]);
                                    setConfSearch("");
                                    // Keep dropdown open for multi-select
                                  }}
                                  className="w-full flex items-center justify-between px-4 py-3 text-sm text-foreground hover:bg-primary/10 border-b border-border last:border-b-0 transition-colors cursor-pointer"
                                >
                                  <div className="text-left flex-1">
                                    <p className="font-medium text-foreground">
                                      {c.conf_name}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                                      {c.status}
                                    </p>
                                  </div>
                                  <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                                    + Add
                                  </span>
                                </button>
                              ))
                            ) : (
                              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                                {confSearch
                                  ? "No conferences found"
                                  : "All conferences already selected"}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Selected conference chips */}
                      {selectedConfIds.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {selectedConfIds.map((id) => {
                            const conf = conferences.find(
                              (c) => c.conf_id === id,
                            );
                            return conf ? (
                              <div
                                key={id}
                                className="flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-sm font-medium px-3 py-2 rounded-lg"
                              >
                                <div className="max-w-xs truncate">
                                  {conf.conf_name}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedConfIds((prev) =>
                                      prev.filter((x) => x !== id),
                                    );
                                  }}
                                  className="text-primary/70 hover:text-primary transition-colors ml-1"
                                  aria-label={`Remove conference ${conf.conf_name}`}
                                  title="Remove"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : null;
                          })}
                        </div>
                      )}

                      {selectedConfIds.length === 0 && (
                        <p className="text-xs text-muted-foreground italic">
                          No conferences selected. Click dropdown icon or search
                          to add.
                        </p>
                      )}
                    </div>
                  )}

                  {/* People scope */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Recipients
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {[
                        {
                          id: "all" as const,
                          label:
                            confScope === "specific"
                              ? "All registered members"
                              : "All users",
                        },
                        ...(confScope === "specific"
                          ? [{ id: "byRole" as const, label: "By Role" }]
                          : []),
                        {
                          id: "specific" as const,
                          label: "Select specific people",
                        },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setPeopleScope(opt.id);
                            setSelectedUsers([]);
                            setUserSearch("");
                            if (opt.id !== "byRole") setSelectedRoles([]);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${peopleScope === opt.id
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-muted-foreground border-input hover:border-primary/60"
                            }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* By Role selection */}
                  {peopleScope === "byRole" && (
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground">
                        Select one or more roles to target:
                      </p>
                      <div className="grid gap-2">
                        {roleOptions.map((role) => {
                          const isSelected = selectedRoles.includes(role.id);
                          return (
                            <label
                              key={role.id}
                              className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${isSelected
                                ? "bg-primary/10 border-primary/30 ring-1 ring-primary/20"
                                : "bg-card border-border hover:border-primary/20 hover:bg-accent"
                                }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) =>
                                  setSelectedRoles((prev) =>
                                    e.target.checked
                                      ? [...prev, role.id]
                                      : prev.filter((r) => r !== role.id),
                                  )
                                }
                                className="w-4 h-4 accent-primary shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <p
                                  className={`text-sm font-medium ${isSelected ? "text-primary" : "text-foreground"}`}
                                >
                                  {role.label}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {role.description}
                                </p>
                              </div>
                              <Shield
                                className={`w-4 h-4 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`}
                              />
                            </label>
                          );
                        })}
                      </div>
                      {selectedRoles.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {selectedRoles.map((roleId) => {
                            const role = roleOptions.find(
                              (r) => r.id === roleId,
                            );
                            return role ? (
                              <span
                                key={roleId}
                                className="flex items-center gap-1 bg-primary/10 border border-primary/20 text-primary text-xs font-medium px-2.5 py-1 rounded-full"
                              >
                                {role.label}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedRoles((prev) =>
                                      prev.filter((r) => r !== roleId),
                                    )
                                  }
                                  className="text-muted-foreground hover:text-destructive transition-colors"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>
                              </span>
                            ) : null;
                          })}
                        </div>
                      )}
                      {selectedRoles.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          Please select at least one role.
                        </p>
                      )}
                    </div>
                  )}

                  {/* People multi-select search */}
                  {peopleScope === "specific" && (
                    <div className="space-y-2">
                      <div
                        className="relative"
                        onFocus={() => setUserSearchFocused(true)}
                        onBlur={(e) => {
                          if (
                            !e.currentTarget.contains(e.relatedTarget as Node)
                          ) {
                            setUserSearchFocused(false);
                          }
                        }}
                      >
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                        <input
                          type="text"
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          disabled={
                            confScope === "specific" &&
                            selectedConfIds.length === 0
                          }
                          placeholder={
                            confScope === "specific" &&
                              selectedConfIds.length > 0
                              ? "Search attendees & chairpersons of selected conferences..."
                              : confScope === "specific"
                                ? "Please select at least one conference first..."
                                : "Search all users by name or email..."
                          }
                          className={`w-full border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground ${confScope === "specific" &&
                            selectedConfIds.length === 0
                            ? "border-input bg-muted text-muted-foreground cursor-not-allowed"
                            : "border-input"
                            }`}
                        />
                        {userSearchLoading && (
                          <Loader2 className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground animate-spin" />
                        )}

                        {/* Search results dropdown */}
                        {userSearchFocused && userSearch.trim().length >= 2 && (
                          <div className="absolute left-0 right-0 top-full mt-1 z-20 border border-border rounded-xl overflow-hidden shadow-lg bg-card max-h-48 overflow-y-auto">
                            {userResults.length > 0 ? (
                              userResults.map((u) => (
                                <button
                                  key={u.user_id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedUsers((prev) => [...prev, u]);
                                    setUserSearch("");
                                  }}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                                >
                                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                                    {u.full_name.charAt(0)}
                                  </div>
                                  <div className="text-left flex-1">
                                    <p className="font-medium">{u.full_name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {u.email}
                                    </p>
                                  </div>
                                </button>
                              ))
                            ) : (
                              <div className="px-4 py-3 text-xs text-muted-foreground">
                                {confScope === "specific"
                                  ? "No matching users found in selected conference(s)."
                                  : "No matching users found in the system."}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Selected people chips */}
                      {selectedUsers.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {selectedUsers.map((u) => (
                            <span
                              key={u.user_id}
                              className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary text-xs font-medium px-2.5 py-1 rounded-full"
                            >
                              {u.full_name}
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedUsers((prev) =>
                                    prev.filter((x) => x.user_id !== u.user_id),
                                  )
                                }
                                className="text-muted-foreground hover:text-destructive transition-colors"
                                aria-label={`Remove user ${u.full_name}`}
                                title="Remove user"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      {selectedUsers.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          {confScope === "specific" &&
                            selectedConfIds.length === 0
                            ? "Please select at least one conference before searching recipients."
                            : "Search and select at least one recipient."}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Info banner */}
                  <div className="flex items-start gap-2 bg-muted/40 border border-border rounded-xl px-4 py-3">
                    <Users className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      {peopleScope === "specific"
                        ? selectedUsers.length === 0
                          ? "No recipients selected yet."
                          : `Sending to ${selectedUsers.length} selected person(s).`
                        : peopleScope === "byRole"
                          ? selectedRoles.length === 0
                            ? "No roles selected yet."
                            : `Sending to users with role(s): ${selectedRoles.map((r) => roleOptions.find((o) => o.id === r)?.label).join(", ")}${confScope === "specific" ? ` in ${selectedConfIds.length} conference(s)` : " (system-wide)"}.`
                          : confScope === "all"
                            ? "Sending to all users in the system."
                            : selectedConfIds.length === 0
                              ? "Select at least one conference."
                              : `Sending to all members registered in the ${selectedConfIds.length} selected conference(s).`}
                    </p>
                  </div>
                </div>

                {/* STEP 2 - CONTENT (template or manual) */}
                <div className="space-y-4">
                  <p className="text-sm font-bold text-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" /> 2. Content
                  </p>

                  {/* Tab switcher */}
                  <div className="flex gap-2 p-1 bg-muted rounded-xl">
                    {(["template", "manual"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab
                          ? "bg-card text-primary shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                          }`}
                      >
                        {tab === "template" ? (
                          <>
                            <FileText className="w-4 h-4" /> Template
                          </>
                        ) : (
                          <>
                            <PenLine className="w-4 h-4" /> Manual
                          </>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Template Tab */}
                  {activeTab === "template" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold text-foreground">
                          {showCreateTemplate
                            ? editingTemplateId !== null
                              ? "Edit Template"
                              : "Create New Template"
                            : "Select Template"}
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            if (showCreateTemplate) setEditingTemplateId(null);
                            setShowCreateTemplate(!showCreateTemplate);
                            setSaveTemplateMsg("");
                          }}
                          className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                        >
                          {showCreateTemplate ? (
                            <>
                              <FileText className="w-3.5 h-3.5" /> Back to
                              Select
                            </>
                          ) : (
                            <>
                              <PenLine className="w-3.5 h-3.5" /> + Create New
                            </>
                          )}
                        </button>
                      </div>

                      {/* SELECT MODE */}
                      {!showCreateTemplate && (
                        <>
                          <div className="relative">
                            <select
                              className="w-full border border-input rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring bg-background appearance-none pr-10"
                              value={selectedTemplate?.template_id || ""}
                              onChange={(e) => {
                                const t =
                                  filteredTemplates.find(
                                    (t) =>
                                      t.template_id === Number(e.target.value),
                                  ) || null;
                                setSelectedTemplate(t);
                                setTitle(
                                  t ? resolveTemplate(t.title_template) : "",
                                );
                                setContent(
                                  t ? resolveTemplate(t.content_template) : "",
                                );
                              }}
                            >
                              <option value="">Choose a template</option>
                              {filteredTemplates.map((t) => (
                                <option
                                  key={t.template_id}
                                  value={t.template_id}
                                >
                                  {t.template_name}
                                  {t.conf_id === null ? " (Global)" : ""}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-muted-foreground pointer-events-none" />
                          </div>
                          {filteredTemplates.length === 0 && (
                            <p className="text-xs text-muted-foreground">
                              No templates available.
                            </p>
                          )}

                          {selectedTemplate && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTemplateId(
                                    selectedTemplate.template_id,
                                  );
                                  setNewTmplName(
                                    selectedTemplate.template_name,
                                  );
                                  setNewTmplTitle(
                                    selectedTemplate.title_template,
                                  );
                                  setNewTmplContent(
                                    selectedTemplate.content_template,
                                  );
                                  setNewTmplConfId(selectedTemplate.conf_id);
                                  setSaveTemplateMsg("");
                                  setShowCreateTemplate(true);
                                }}
                                className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                              >
                                <PenLine className="w-3.5 h-3.5" /> Edit this
                                template
                              </button>

                              <div className="border border-primary/20 rounded-xl p-4 bg-primary/10 space-y-3">
                                <p className="text-xs font-semibold text-primary uppercase tracking-wide">
                                  Message to send (editable)
                                </p>
                                <div>
                                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                    Title
                                  </label>
                                  <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Notification title..."
                                    className="w-full border border-input rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                                    Content
                                  </label>
                                  <RichTextEditor
                                    value={content}
                                    onChange={setContent}
                                  />
                                </div>
                              </div>
                            </>
                          )}
                        </>
                      )}

                      {/* CREATE / EDIT MODE */}
                      {showCreateTemplate && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                              Template Name
                            </label>
                            <input
                              type="text"
                              value={newTmplName}
                              onChange={(e) => setNewTmplName(e.target.value)}
                              placeholder="e.g. CFP Announcement"
                              className="w-full border border-input rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                              Scope
                            </label>
                            <div className="relative">
                              <select
                                value={newTmplConfId ?? ""}
                                onChange={(e) =>
                                  setNewTmplConfId(
                                    e.target.value === ""
                                      ? null
                                      : Number(e.target.value),
                                  )
                                }
                                className="w-full border border-input rounded-xl px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring bg-background appearance-none pr-10"
                              >
                                <option value="">
                                  Global - usable for all conferences
                                </option>
                                {conferences.map((c) => (
                                  <option key={c.conf_id} value={c.conf_id}>
                                    {c.conf_name}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                              Title Template
                            </label>
                            <input
                              type="text"
                              value={newTmplTitle}
                              onChange={(e) => setNewTmplTitle(e.target.value)}
                              placeholder="e.g. [Conference_Name] - Call for Papers"
                              className="w-full border border-input rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                              Content Template
                            </label>
                            <textarea
                              value={newTmplContent}
                              onChange={(e) =>
                                setNewTmplContent(e.target.value)
                              }
                              rows={5}
                              placeholder="Write the body. Use [Conference_Name], [Author_Name], etc."
                              className="w-full border border-input rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none leading-relaxed bg-background text-foreground"
                            />
                          </div>

                          {saveTemplateMsg && (
                            <p className="text-sm text-muted-foreground">
                              {saveTemplateMsg}
                            </p>
                          )}

                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowCreateTemplate(false)}
                              disabled={savingTemplate}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={saveTemplate}
                              disabled={savingTemplate}
                            >
                              {savingTemplate && (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              )}
                              {savingTemplate
                                ? "Saving..."
                                : editingTemplateId !== null
                                  ? "Save Changes"
                                  : "Save Template"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Manual Tab */}
                  {activeTab === "manual" && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">
                          Title
                        </label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Notification title..."
                          className="w-full border border-input rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-foreground mb-2">
                          Content
                        </label>
                        <RichTextEditor value={content} onChange={setContent} />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          {!submitSuccess && (
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border shrink-0 bg-muted/40">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={submitting}
                className={submitting ? "animate-pulse" : ""}
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                {submitting ? "Sending..." : "Send Notification"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </DefaultLayout>
  );
};

export default CreatePushNotificationsPage;
