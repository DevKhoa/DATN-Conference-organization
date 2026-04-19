import React, { useState } from "react";
import { ThumbsUp, CheckCircle, Clock, Volume2, MessageCircle, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { QuestionResponse } from "@/features/qa/types";
import { 
  useUpvoteQuestionMutation, 
  useApproveQuestionMutation, 
  useUpdateQuestionStatusMutation,
  useAnswerQuestionMutation,
  useRemoveUpvoteQuestionMutation
} from "@/features/qa/services/mutations";
import { Button } from "@/components/ui/button";

interface QuestionItemProps {
  question: QuestionResponse;
  userId?: number;
  isAuthor: boolean;
  isModerator: boolean;
  isSessionActive: boolean;
}

export const QuestionItem = ({
  question,
  userId,
  isAuthor,
  isModerator,
  isSessionActive
}: QuestionItemProps) => {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  
  const upvoteMutation = useUpvoteQuestionMutation();
  const removeUpvoteMutation = useRemoveUpvoteQuestionMutation();
  const approveMutation = useApproveQuestionMutation();
  const statusMutation = useUpdateQuestionStatusMutation();
  const answerMutation = useAnswerQuestionMutation();

  const handleUpvote = () => {
    if (!userId) return;
    if (question.is_upvoted) {
      removeUpvoteMutation.mutate({ questionId: question.question_id, userId });
    } else {
      upvoteMutation.mutate({ questionId: question.question_id, userId });
    }
  };

  const handleApprove = () => {
    if (!userId) return;
    approveMutation.mutate({ questionId: question.question_id, userId });
  };

  const handleSubmitReply = () => {
    if (!userId || !replyText.trim()) return;
    answerMutation.mutate({
      questionId: question.question_id,
      payload: {
        user_id: userId,
        answer_type: "written",
        answer_content: replyText.trim()
      }
    }, {
      onSuccess: () => {
        setIsReplying(false);
        setReplyText("");
      }
    });
  };

  const handleLiveAnswering = () => {
    if (!userId) return;
    answerMutation.mutate({
      questionId: question.question_id,
      payload: {
        user_id: userId,
        answer_type: "direct",
        answer_content: null
      }
    });
  };

  const isPendingApproval = !question.is_approved;
  const isAnswering = question.status === "answering";
  const isDone = question.status === "done";

  return (
    <div className={`p-4 rounded-xl border ${isAnswering ? 'border-primary shadow-sm bg-primary/5' : 'border-border bg-card'} transition-all`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-foreground">{question.author_name || "Attendee"}</span>
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded uppercase font-semibold">
            {question.attendee_type}
          </span>
          <span className="text-xs text-muted-foreground">
            {question.created_at ? formatDistanceToNow(new Date(question.created_at), { addSuffix: true }) : ''}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {isPendingApproval && (
            <span className="flex items-center text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full font-medium">
              <AlertCircle className="w-3 h-3 mr-1" /> Pending
            </span>
          )}
          {isAnswering && (
            <span className="flex items-center text-xs text-primary bg-primary/10 px-2 py-1 rounded-full font-bold animate-pulse">
              <Volume2 className="w-3 h-3 mr-1" /> Live Answering...
            </span>
          )}
          {isDone && (
            <span className="flex items-center text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full font-medium">
              <CheckCircle className="w-3 h-3 mr-1" /> Answered
            </span>
          )}
        </div>
      </div>

      <p className="text-sm text-foreground mt-1 mb-3">{question.content}</p>

      {/* Answer Area */}
      {question.answer_content && (
        <div className="mt-3 mb-3 p-3 bg-muted/40 rounded-lg border-l-4 border-l-primary">
          <p className="text-xs font-bold text-primary mb-1 flex items-center">
            <MessageCircle className="w-3 h-3 mr-1" /> Author Reply:
          </p>
          <p className="text-sm text-foreground">{question.answer_content}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-4 mt-2">
        <button 
          onClick={handleUpvote}
          disabled={!userId || upvoteMutation.isPending || removeUpvoteMutation.isPending}
          className={`flex items-center text-xs font-medium transition-colors ${
            question.is_upvoted 
              ? 'text-primary' 
              : 'text-muted-foreground hover:text-primary'
          }`}
        >
          <ThumbsUp 
            className={`w-4 h-4 mr-1.5 ${
              question.is_upvoted ? 'fill-primary' : ''
            } ${(upvoteMutation.isPending || removeUpvoteMutation.isPending) ? 'opacity-50' : ''}`} 
          />
          {question.upvotes_count} Upvotes
        </button>

        {isModerator && isPendingApproval && (
          <button 
            onClick={handleApprove}
            disabled={approveMutation.isPending}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
          >
            Approve Question
          </button>
        )}

        {isAuthor && question.is_approved && !isDone && (
          <div className="flex items-center gap-3 border-l border-border pl-4">
            <button 
              onClick={() => setIsReplying(!isReplying)}
              className="text-xs font-bold text-primary hover:text-primary/80"
            >
              Write Answer
            </button>
            {isSessionActive && (
              <button 
                onClick={handleLiveAnswering}
                disabled={answerMutation.isPending}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center"
              >
                <Volume2 className="w-3 h-3 mr-1" /> Answer Live
              </button>
            )}
          </div>
        )}
      </div>

      {isReplying && (
        <div className="mt-3 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Type your answer..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="flex-1 h-9 bg-background border border-border rounded-md px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Button 
              size="sm" 
              onClick={handleSubmitReply}
              disabled={!replyText.trim() || answerMutation.isPending}
            >
              {answerMutation.isPending ? "Sending..." : "Send"}
            </Button>
          </div>
          
          {answerMutation.isError && (
            <div className="text-[10px] text-destructive flex items-center bg-destructive/5 p-1.5 rounded border border-destructive/10">
              <AlertCircle className="w-3 h-3 mr-1" />
              {answerMutation.error instanceof Error ? answerMutation.error.message : "Failed to send answer. Please try again."}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
