import React from "react";
import { MessageSquare, ArrowRight } from "lucide-react";
import { usePaperQuestionsQuery } from "@/features/qa/services/queries";
import { Link, useParams } from "@tanstack/react-router";

interface QAManagerProps {
  paperId: number;
}

export const QAManager: React.FC<QAManagerProps> = ({ paperId }) => {
  const { conferenceId } = useParams({ strict: false });
  // Pass paperId basically just to know if it has questions
  const { data: questions = [] } = usePaperQuestionsQuery(paperId);

  return (
    <div className="mt-4 pt-4 border-t border-border">
      <Link 
        to="/conferences/$conferenceId/papers/$paperId/qa"
        params={{ 
          conferenceId: conferenceId as string,
          paperId: paperId.toString()
        }}
        className="inline-flex items-center text-sm font-medium text-primary hover:text-primary/80 transition-colors group"
      >
        <MessageSquare className="w-4 h-4 mr-2" />
        Open Q&A Discussion
        {questions.length > 0 && (
          <span className="ml-2 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-bold">
            {questions.length} {questions.length === 1 ? 'question' : 'questions'}
          </span>
        )}
        <ArrowRight className="w-4 h-4 ml-1.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
      </Link>
    </div>
  );
};
