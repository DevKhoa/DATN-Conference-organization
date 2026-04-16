export interface User {
  user_id: number;
  full_name: string;
  email: string;
  organization: string | null;
}

export interface TicketConfigWithSession {
  ticket_name: string;
  ticket_session: { session_id: number }[];
}

export interface AttendanceRecord {
  at_id: number;
  is_checkin: boolean;
  checkin_time: string | null;
  session_id: number;
}

export interface RegistrationWithDetails {
  registration_id: number;
  user: User;
  ticket_configs: TicketConfigWithSession;
  attendences: AttendanceRecord[];
}

export interface AttendeeRow {
  registration_id: number;
  user_id: number;
  full_name: string;
  email: string;
  organization: string | null;
  ticket_name: string;
  is_checkin: boolean;
  checkin_time: string | null;
  at_id: number | null;
}
