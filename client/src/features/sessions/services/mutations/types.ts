import { SessionPaperDetail } from "../../types";

export interface IAutoGeneratePayload {
  paper_ids: number[];
  n_session: number;
  min_paper: number;
  max_paper: number;
  only_accepted_papers: boolean;
}

export interface IAutoGenerateResponse {
  sessions: Array<{
    session_id?: number;
    id?: number;
    name?: string;
    papers?: string[];
  }>;
}

export interface ISaveSessionPayload {
  conferenceId: number;
  sessions: Array<{
    temp_id: string;
    db_id?: number;
    session_name: string;
    start_time: string;
    end_time: string;
    room_location: string;
    is_ai_generated: boolean;
    assigned_papers: SessionPaperDetail[];
    format_type: string;
    meet_link?: string;
    record_video_url?: string;
  }>;
}

export interface ISaveSessionResponse {
  savedSessions: Array<{
    temp_id: string;
    db_id: number;
  }>;
}

export interface IRecommendChairPayload {
  sessionId: number;
  limit?: number;
  threshold?: number;
}

export interface IRecommendChairResponse {
  recommended_chairs: Array<{
    user_id: number;
    full_name: string;
    email: string;
    organization: string;
    similarity_score: number;
    match_score: number;
    similarity: string;
  }>;
}

export interface IMatchReviewPayload {
  sessionId: number;
  userId: number;
}

export interface IMatchReviewResponse {
  session_id: number;
  session_name: string;
  user_id: number;
  analysis: {
    analyzed_papers: Array<{
      new_paper_title: string;
      relevance_score: "High" | "Medium" | "Low";
      reasoning: string;
      related_profile_papers?: Array<{
        title: string;
        reasoning: string;
      }>;
    }>;
  };
}

export interface IFinalizeChairsPayload {
  sessions: Array<{
    db_id?: number;
    chair_user_ids?: number[];
  }>;
}

export interface IMeetCreationResponse {
  event_id: string;
  meet_link: string;
  html_link: string;
}
