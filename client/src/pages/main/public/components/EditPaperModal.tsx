import React, { useState } from "react";
import { Loader2, Upload, FileText, Link as LinkIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useUpdatePaperContentMutation,
  useUpdatePaperInfoMutation,
} from "@/features/papers/services/mutations";
import useAuth from "@/features/auth/hooks/useAuth";

interface EditPaperModalProps {
  isOpen: boolean;
  onClose: () => void;
  paperId: number;
  initialTitle: string;
  initialAbstract: string;
  versionId: number | null;
}

export const EditPaperModal: React.FC<EditPaperModalProps> = ({
  isOpen,
  onClose,
  paperId,
  initialTitle,
  initialAbstract,
  versionId,
}) => {
  const { session } = useAuth();
  const currentUserId = session?.user?.user_metadata?.["user_id"] as number | undefined;

  const [title, setTitle] = useState(initialTitle);
  const [abstract, setAbstract] = useState(initialAbstract);
  const [file, setFile] = useState<File | null>(null);
  const [driveLink, setDriveLink] = useState("");
  const [uploadMode, setUploadMode] = useState<"FILE" | "LINK">("FILE");

  const [error, setError] = useState("");

  const updateInfoMutation = useUpdatePaperInfoMutation();
  const updateContentMutation = useUpdatePaperContentMutation();

  const loading = updateInfoMutation.isPending || updateContentMutation.isPending;

  const handleSubmit = async () => {
    setError("");

    if (!title || !abstract) {
      setError("Please provide both title and abstract.");
      return;
    }

    try {
      // 1. Update Info
      if (title !== initialTitle || abstract !== initialAbstract) {
        await updateInfoMutation.mutateAsync({ paperId, title, abstract });
      }

      // 2. Update Content (File or Link)
      if (file || driveLink) {
        if (!currentUserId) throw new Error("User not authenticated.");

        await updateContentMutation.mutateAsync({
          paperId,
          versionId,
          uploaderId: currentUserId,
          file: uploadMode === "FILE" ? file : null,
          driveLink: uploadMode === "LINK" ? driveLink : undefined,
        });
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update paper.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit Paper & Upload Content</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm border border-red-200">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Abstract</label>
            <textarea
              rows={4}
              value={abstract}
              onChange={(e) => setAbstract(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="space-y-3 pt-2">
            <label className="text-sm font-semibold text-slate-700">
              Update Content (Optional)
            </label>

            <div className="flex p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setUploadMode("FILE")}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                  uploadMode === "FILE"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                File Upload
              </button>
              <button
                type="button"
                onClick={() => setUploadMode("LINK")}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                  uploadMode === "LINK"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Drive Link
              </button>
            </div>

            {uploadMode === "FILE" ? (
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-slate-50 transition-colors relative cursor-pointer">
                <input
                  type="file"
                  accept="application/pdf"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                {file ? (
                  <div className="flex flex-col items-center">
                    <FileText className="w-8 h-8 text-blue-500 mb-2" />
                    <p className="font-medium text-slate-800">{file.name}</p>
                    <p className="text-xs text-slate-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="w-8 h-8 text-slate-400 mb-2" />
                    <p className="font-medium text-slate-800">Click to select PDF</p>
                    <p className="text-xs text-slate-500 mt-1">PDF format only</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="url"
                  placeholder="https://drive.google.com/..."
                  value={driveLink}
                  onChange={(e) => setDriveLink(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
