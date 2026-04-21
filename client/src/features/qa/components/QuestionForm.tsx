import React, { useState } from "react";
import { Send, AlertCircle } from "lucide-react";
import type { AxiosError } from "axios";
import useAuth from "@/features/auth/hooks/useAuth";
import { useCreateQuestionMutation } from "@/features/qa/services/mutations";
import { Button } from "@/components/ui/button";

// Extract user-friendly message from FastAPI error responses
function getErrorMessage(error: unknown, fallback: string): string {
  const axiosError = error as AxiosError<{ detail: string }>;
  return axiosError?.response?.data?.detail ?? fallback;
}

interface QuestionFormProps {
  paperId: number;
  defaultAttendeeType?: "in-person" | "virtual";
}

export const QuestionForm = ({ paperId, defaultAttendeeType }: QuestionFormProps) => {
  const { session } = useAuth();
  const userId = session?.user?.user_metadata["user_id"] as number | undefined;
  
  const [content, setContent] = useState("");
  const [attendeeType, setAttendeeType] = useState<"in-person" | "virtual">(defaultAttendeeType || "in-person");

  // Update attendee type if default changes (e.g. paper data loads)
  React.useEffect(() => {
    if (defaultAttendeeType) {
      setAttendeeType(defaultAttendeeType);
    }
  }, [defaultAttendeeType]);
  
  const createMutation = useCreateQuestionMutation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !content.trim()) return;

    createMutation.mutate({
      paper_id: paperId,
      author_id: userId,
      content: content.trim(),
      attendee_type: attendeeType
    }, {
      onSuccess: () => {
        setContent("");
      }
    });
  };

  if (!userId) return null;

  return (
    <form onSubmit={handleSubmit} className="mt-4 pt-4 border-t border-border">
      <div className="flex gap-3 items-start">
        <div className="flex-1 space-y-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Ask a question about this paper..."
            className="w-full h-20 bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          />
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Posting as:
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${attendeeType === "in-person" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                {attendeeType}
              </span>
            </div>
            <Button 
              type="submit" 
              disabled={!content.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? "Sending..." : "Ask"} <Send className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
      
      {createMutation.isError && (
        <div className="mt-2 text-xs text-destructive flex items-center bg-destructive/10 p-2 rounded border border-destructive/20">
          <AlertCircle className="w-3 h-3 mr-1" />
          {getErrorMessage(createMutation.error, "Failed to post your question. Please try again.")}
        </div>
      )}
    </form>
  );
};
