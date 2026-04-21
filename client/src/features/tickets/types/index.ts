export interface TicketConfig {
  ticket_id: number;
  ticket_name: string;
  price: number | null;
  quantity_limit: number | null;
  sold_quantity: number;
  open_time: string;
  close_time: string;
  description: string | null;
  currency: string;
  is_active: boolean;
  assigned_session_ids: number[];
  ticket_type: string | null;
}

export interface SessionOption {
  session_id: number;
  session_name: string;
  start_time: string;
}

export interface TicketFormData {
  ticket_name: string;
  currency: string;
  quantity_limit: string;
  open_time: string;
  close_time: string;
  is_active: boolean;
  description: string;
  price: string;
  session_ids: number[];
  ticket_type: string;
}
