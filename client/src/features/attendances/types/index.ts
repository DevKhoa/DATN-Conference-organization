export interface Attendance {
  at_id: number;
  registration_id: number;
  session_id: number;
  is_checkin: boolean;
  checkin_time: string | null;
}

export interface AttendanceUpsertPayload {
  registration_id: number;
  session_id: number;
  is_checkin: boolean;
  checkin_time: string | null;
}

export interface CheckinPayload {
  registration_id: number;
  session_ids: number[];
}
