import type { Tables } from "@/types/database.types";

export type SubscriptionPlan = Tables<"subscription_plans"> & {
  feature_list: string[];
};

export type SubscriptionHistoryItem = Tables<
  { schema: "public" },
  "user_subscription_history"
> & {
  plan_name: string | null;
  plan_code: string | null;
};

export interface CurrentSubscriptionItem {
  amount: number;
  expires_at: string;
  is_valid: boolean;
  last_reset_at: string;
  monthly_tokens: number;
  order_code: string;
  paid_at: string;
  payment_gateway: string;
  plan_snapshot: unknown;
  price_paid: number;
  started_at: string;
  status: "PENDING" | "ACTIVE" | "CANCELED" | "EXPIRED";
  subscription_id: number;
  subscription_type: "1_MONTH" | "3_MONTH" | "1_YEAR";
  tokens_left: number;
  tokens_remaining: number;
  transaction_id: number;
  plan_name: string | null;
  plan_code: string | null;
}

export interface ProratedUpgradeAmountItem {
  amount_to_pay: number;
  currency: string;
  current_plan_type: string;
  current_subscription_id: number;
  new_plan_code: string;
  new_plan_name: string;
  prorated_current_plan: number;
  prorated_new_plan: number;
  remaining_days: number;
}
