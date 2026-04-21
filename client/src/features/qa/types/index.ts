export interface QuestionResponse {
  question_id: number;
  session_id: number;
  paper_id: number;
  author_id: number;
  author_name: string | null;
  content: string;
  attendee_type: "in-person" | "virtual";
  status: "pending" | "approved" | "denied" | "done";
  answer_type: "direct" | "written" | null;
  answer_content: string | null;
  answered_at: string | null;
  upvotes_count: number;
  created_at: string;
  is_upvoted: boolean;
}

export interface QuestionCreate {
  paper_id: number;
  author_id: number;
  content: string;
  attendee_type: "in-person" | "virtual";
}

export interface QuestionStatusUpdate {
  status: "pending" | "approved" | "denied" | "done";
}

export interface QuestionAnswer {
  user_id: number;
  answer_type: "direct" | "written";
  answer_content: string | null;
}
