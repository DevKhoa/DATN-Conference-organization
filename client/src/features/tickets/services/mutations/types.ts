export interface ICreateTicketPayload {
  ticket_name: string;
  currency: string;
  quantity_limit: number | null;
  open_time: string;
  close_time: string;
  is_active: boolean;
  description: string | null;
  price: number | null;
  session_ids: number[];
  ticket_type: "in-person" | "virtual";
}

export interface IUpdateTicketPayload extends ICreateTicketPayload {
  ticket_id: number;
}

export interface IDeleteTicketPayload {
  ticket_id: number;
}

export interface ITicketMutationResponse {
  ticket_id: number;
}
