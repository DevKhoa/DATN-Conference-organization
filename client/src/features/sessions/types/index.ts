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
  chair_person_id?: number;
  assigned_papers: SessionPaperDetail[];
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
  chair_person_id?: number;
}

export interface Session {
  session_id: number;
  session_name: string;
  room_location: string;
}
