export interface SessionPaperDetail {
  paper_id: number;
  start_time: string;
  end_time: string;
}

export interface ExistingSession {
  temp_id: string;
  db_id: number;
  session_name: string;
  start_time: string;
  end_time: string;
  room_location: string;
  is_ai_generated: boolean;
  assigned_papers: SessionPaperDetail[];
  meet_link?: string;
  is_meet_active?: boolean;
  record_video_url?: string;
  format_type: string;
}

export interface LocalSession {
  temp_id: string;
  db_id?: number;
  session_name: string;
  start_time: string;
  end_time: string;
  room_location: string;
  is_ai_generated: boolean;
  assigned_papers: SessionPaperDetail[];
  meet_link?: string;
  is_meet_active?: boolean;
  record_video_url?: string;
  format_type: string;
}

export interface Session {
  session_id: number;
  session_name: string;
  room_location: string;
}
