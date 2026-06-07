import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import useAuth from "@/features/auth/hooks/useAuth";
import { Role } from "@/features/auth/types";
import {
  useSessionPaperFilesQuery,
} from "@/features/sessions/services/queries";
import {
  useSaveSessionPaperFilesMutation,
  useDeleteSessionPaperFileMutation,
} from "@/features/sessions/services/mutations";
import {
  FileText,
  UploadCloud,
  Trash2,
  ExternalLink,
  Loader2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface SessionPaperFilesManagerProps {
  sessionId: number;
  paperId: number;
  primaryAuthorId: number | null;
}

export const SessionPaperFilesManager: React.FC<SessionPaperFilesManagerProps> = ({
  sessionId,
  paperId,
  primaryAuthorId,
}) => {
  const { session, checkRoles } = useAuth();
  const userId = session?.user?.user_metadata["user_id"] as number | undefined;

  const isAdminOrBtc = checkRoles([Role.ADMIN, Role.SECRETARIAT]);

  // Check if current user is co-author of this paper
  const { data: isCoauthor } = useQuery({
    queryKey: ["paper_coauthors", paperId, userId],
    queryFn: async () => {
      if (!paperId || !userId) return false;
      const { data, error } = await supabase
        .from("paper_coauthors")
        .select("user_id")
        .eq("paper_id", paperId)
        .eq("user_id", userId);
      return !error && data && data.length > 0;
    },
    enabled: !!paperId && !!userId,
  });

  const canEditFiles = userId === primaryAuthorId || !!isCoauthor;
  const canViewFiles = canEditFiles || isAdminOrBtc;

  // Query files
  const { data: filesData, isLoading: loadingFiles } = useSessionPaperFilesQuery(
    canViewFiles ? sessionId : null,
    canViewFiles ? paperId : null,
    canViewFiles ? userId : null,
  );

  const saveMutation = useSaveSessionPaperFilesMutation();
  const deleteMutation = useDeleteSessionPaperFileMutation();

  const [isAddingFile, setIsAddingFile] = useState(false);
  const [uploadMode, setUploadMode] = useState<"file" | "text">("file");
  const [customName, setCustomName] = useState("");
  const [textInput, setTextInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  if (!canViewFiles) return null;

  const allSlots = [
    { type: "pdf", url: filesData?.pdf_url },
    { type: "slide", url: filesData?.slide_url },
    { type: "text", url: filesData?.text_url },
  ] as const;

  const usedSlots = allSlots.filter((s) => s.url);
  const emptySlots = allSlots.filter((s) => !s.url);

  const extractNameFromUrl = (url: string, type: string) => {
    try {
      const parts = url.split("/");
      const lastPart = parts[parts.length - 1]; // e.g. "pdf_my_file.txt"
      const prefix = `${type}_`;
      let decoded = decodeURIComponent(lastPart);
      if (decoded.startsWith(prefix)) {
        decoded = decoded.substring(prefix.length);
      }
      return decoded.replace(/_/g, " "); // Basic cleanup
    } catch (e) {
      return `Attachment`;
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || emptySlots.length === 0) return;

    let finalFile = selectedFile;
    const cleanCustomName = customName.trim();

    if (uploadMode === "text") {
      if (!textInput.trim()) return;
      const fileName = cleanCustomName ? `${cleanCustomName}.txt` : "document.txt";
      finalFile = new File([textInput], fileName, { type: "text/plain" });
    } else if (selectedFile && cleanCustomName) {
      const extMatch = selectedFile.name.match(/\.[^/.]+$/);
      const ext = extMatch ? extMatch[0] : "";
      finalFile = new File([selectedFile], `${cleanCustomName}${ext}`, {
        type: selectedFile.type,
      });
    } else if (!selectedFile) {
      return;
    }

    if (finalFile && finalFile.size > 20 * 1024 * 1024) {
      toast.error("File size exceeds the maximum limit of 20MB.");
      return;
    }

    const slotToUse = emptySlots[0].type; // pick first available slot

    await saveMutation.mutateAsync({
      sessionId,
      paperId,
      fileType: slotToUse,
      file: finalFile,
      url: null,
      userId,
    });

    setIsAddingFile(false);
    setSelectedFile(null);
    setTextInput("");
    setCustomName("");
  };

  const handleDelete = async (type: "pdf" | "slide" | "text") => {
    if (!userId) return;
    if (confirm(`Are you sure you want to delete this file?`)) {
      await deleteMutation.mutateAsync({
        sessionId,
        paperId,
        fileType: type,
        userId,
      });
    }
  };

  return (
    <div className="mt-4 border-t border-border/40 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h6 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Presentation Materials
        </h6>
        {isAdminOrBtc && (
          <Badge
            variant="outline"
            className="text-[10px] font-medium border-border/80 text-muted-foreground"
          >
            View Only (Admin/BTC)
          </Badge>
        )}
      </div>

      {loadingFiles ? (
        <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading presentation materials...
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {usedSlots.length > 0 ? (
            usedSlots.map((slot) => (
              <div
                key={slot.type}
                className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 p-2.5 transition-colors hover:bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background text-foreground shadow-sm shrink-0">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <a
                      href={slot.url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-foreground hover:text-primary hover:underline truncate"
                      title={extractNameFromUrl(slot.url!, slot.type)}
                    >
                      {extractNameFromUrl(slot.url!, slot.type)}
                    </a>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Badge
                        variant="outline"
                        className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[9px] font-bold px-1.5 py-0 leading-tight"
                      >
                        Uploaded
                      </Badge>
                      <ExternalLink className="h-2.5 w-2.5 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                {canEditFiles && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0 ml-2"
                    onClick={() => handleDelete(slot.type)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))
          ) : (
            <div className="text-xs italic text-muted-foreground">
              No files uploaded yet.
            </div>
          )}

          {canEditFiles && emptySlots.length > 0 && !isAddingFile && (
            <div className="mt-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs font-semibold w-full sm:w-auto"
                onClick={() => setIsAddingFile(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Add File ({emptySlots.length} slot{emptySlots.length > 1 ? "s" : ""} left)
              </Button>
            </div>
          )}

          {canEditFiles && isAddingFile && (
            <form
              onSubmit={handleUploadSubmit}
              className="mt-2 flex flex-col gap-3 rounded-lg border border-border/80 bg-background p-3.5 shadow-sm animate-in fade-in-50 duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex gap-1 bg-muted/60 p-0.5 rounded-md text-[11px] font-bold">
                  <button
                    type="button"
                    className={`px-3 py-1 rounded-sm transition-colors ${
                      uploadMode === "file"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setUploadMode("file")}
                  >
                    Upload File
                  </button>
                  <button
                    type="button"
                    className={`px-3 py-1 rounded-sm transition-colors ${
                      uploadMode === "text"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setUploadMode("text")}
                  >
                    Raw Text
                  </button>
                </div>
              </div>

              <Input
                type="text"
                placeholder="Custom file name (optional)"
                className="text-xs h-9"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />

              {uploadMode === "file" ? (
                <div>
                  <Input
                    type="file"
                    className="text-xs bg-muted/20 h-9 file:text-xs file:font-semibold mb-1"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        setSelectedFile(files[0]);
                      }
                    }}
                    required
                  />
                  <p className="text-[10px] text-muted-foreground text-right mt-0.5">
                    Max size: 20MB
                  </p>
                </div>
              ) : (
                <Textarea
                  placeholder="Paste your raw text here... It will be saved as a .txt file"
                  className="text-xs min-h-[100px] resize-y"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  required
                />
              )}

              <div className="flex justify-end gap-2 mt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs font-semibold"
                  onClick={() => {
                    setIsAddingFile(false);
                    setSelectedFile(null);
                    setTextInput("");
                    setCustomName("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="h-8 gap-1.5 text-xs font-semibold"
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-3.5 w-3.5" />
                      Save File
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
