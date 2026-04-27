import { useMutation, useQueryClient } from "@tanstack/react-query";

import useAuth from "@/features/auth/hooks/useAuth";
import { request } from "@/lib/axios";
import { supabase } from "@/lib/supabase";
import { SubscriptionsKeys } from "@/features/subscriptions/services/queries/keys";

import type {
  ICancelSubscriptionPayload,
  ICreateSubscriptionPayload,
  ICreateSubscriptionResponse,
  IUpgradeSubscriptionPayload,
  IUpgradeSubscriptionResponse,
} from "./types";

export const useCreateSubscriptionMutation = () => {
  const { session } = useAuth();

  return useMutation({
    mutationFn: async ({
      planId,
      returnUrl,
    }: ICreateSubscriptionPayload): Promise<ICreateSubscriptionResponse> => {
      if (!session?.user.user_metadata["user_id"]) {
        throw new Error("User not authenticated");
      }

      const data = await request.post<ICreateSubscriptionResponse>(
        "/subscriptions",
        {
          user_id: session.user.user_metadata["user_id"],
          plan_id: planId,
          provider: "PAYOS",
          returnUrl,
        },
      );

      if (!data.checkout_url) {
        throw new Error("Failed to create subscription checkout session.");
      }

      return data;
    },
  });
};

export const useUpgradeSubscriptionMutation = () => {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      newPlanCode,
      returnUrl,
    }: IUpgradeSubscriptionPayload): Promise<IUpgradeSubscriptionResponse> => {
      const userId = session?.user.user_metadata["user_id"] as
        | number
        | undefined;

      if (!userId) {
        throw new Error("User not authenticated");
      }

      const data = await request.post<IUpgradeSubscriptionResponse>(
        "/subscriptions/upgrade",
        {
          user_id: userId,
          new_plan_code: newPlanCode,
          provider: "PAYOS",
          returnUrl,
        },
      );

      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [SubscriptionsKeys.MyCurrent],
        }),
        queryClient.invalidateQueries({
          queryKey: [SubscriptionsKeys.MyHistoryCount],
        }),
        queryClient.invalidateQueries({
          queryKey: [SubscriptionsKeys.PaginatedMyHistory],
        }),
        queryClient.invalidateQueries({
          queryKey: [SubscriptionsKeys.MyHistory],
        }),
      ]);
    },
  });
};

export const useCancelSubscriptionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ subscriptionId }: ICancelSubscriptionPayload) => {
      const { error } = await supabase.rpc("cancel_subscription", {
        p_subscription_id: subscriptionId,
      });

      if (error) throw error;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [SubscriptionsKeys.MyCurrent],
        }),
        queryClient.invalidateQueries({
          queryKey: [SubscriptionsKeys.MyHistoryCount],
        }),
        queryClient.invalidateQueries({
          queryKey: [SubscriptionsKeys.PaginatedMyHistory],
        }),
        queryClient.invalidateQueries({
          queryKey: [SubscriptionsKeys.MyHistory],
        }),
      ]);
    },
  });
};
