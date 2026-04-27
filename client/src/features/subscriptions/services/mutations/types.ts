export interface ICreateSubscriptionPayload {
  planId: number;
  returnUrl: string;
}

export interface ICreateSubscriptionResponse {
  status: string;
  subscription_id: number;
  order_code: number;
  checkout_url: string;
  amount: number;
  provider: string;
}

export interface IUpgradeSubscriptionPayload {
  newPlanCode: string;
  returnUrl: string;
}

export interface IUpgradeSubscriptionResponse {
  status: string;
  subscription_id: number;
  order_code: string;
  checkout_url: string | null;
  amount_to_pay: number;
  provider: string;
}

export interface ICancelSubscriptionPayload {
  subscriptionId: number;
}
