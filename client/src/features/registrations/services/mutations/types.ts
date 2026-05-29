export interface ICreateRegistrationPayload {
  ticketId: number;
  returnUrl: string;
}

export interface ICreateRegistrationResponse {
  checkout_url: string;
  provider: string;
  amount: number;
}
