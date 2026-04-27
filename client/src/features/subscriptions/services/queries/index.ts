import { useQuery } from "@tanstack/react-query";

import useAuth from "@/features/auth/hooks/useAuth";
import { supabase } from "@/lib/supabase";

import { SubscriptionsKeys } from "./keys";
import type {
  CurrentSubscriptionItem,
  ProratedUpgradeAmountItem,
  SubscriptionHistoryItem,
  SubscriptionPlan,
} from "../../types";
import type { Json } from "@/types/database.types";
import type { PaginatedParams } from "@/hooks/usePagination";

const parseFeatures = (
  features: Json | null,
  fallbackDescription: string | null,
) => {
  if (Array.isArray(features)) {
    return features.filter((item): item is string => typeof item === "string");
  }

  if (features && typeof features === "object") {
    const featuresObj = features as Record<string, Json>;
    const entries: string[] = [];

    const discount = featuresObj.discount;
    if (typeof discount === "number") {
      entries.push(`Discount: ${discount}%`);
    } else if (typeof discount === "string") {
      const normalized = discount.trim();
      if (normalized.length > 0) {
        entries.push(
          normalized.endsWith("%")
            ? `Discount: ${normalized}`
            : `Discount: ${normalized}%`,
        );
      }
    }

    if (featuresObj.advanced_models === true) {
      entries.push("Advanced models");
    }

    if (featuresObj.priority_support === true) {
      entries.push("Priority support");
    }

    const extraStringEntries = Object.entries(featuresObj).reduce<string[]>(
      (acc, [key, value]) => {
        if (
          key === "discount" ||
          key === "advanced_models" ||
          key === "priority_support"
        ) {
          return acc;
        }

        if (typeof value === "string") {
          const normalized = value.trim();
          if (normalized.length > 0) {
            acc.push(normalized);
          }
        }

        return acc;
      },
      [],
    );

    entries.push(...extraStringEntries);

    if (entries.length > 0) {
      return entries;
    }
  }

  return fallbackDescription ? [fallbackDescription] : [];
};

const parsePlanFromMetadata = (metadata: Json | null) => {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return { plan_name: null, plan_code: null };
  }

  const metaObj = metadata as Record<string, Json>;
  const planData = metaObj.plan_data;

  if (!planData || typeof planData !== "object" || Array.isArray(planData)) {
    return { plan_name: null, plan_code: null };
  }

  const planObj = planData as Record<string, Json>;
  return {
    plan_name: typeof planObj.name === "string" ? planObj.name : null,
    plan_code: typeof planObj.plan_code === "string" ? planObj.plan_code : null,
  };
};

const parsePlanFromSnapshot = (snapshot: Json | null) => {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return { plan_name: null, plan_code: null };
  }

  const snapshotObj = snapshot as Record<string, Json>;
  return {
    plan_name: typeof snapshotObj.name === "string" ? snapshotObj.name : null,
    plan_code:
      typeof snapshotObj.plan_code === "string" ? snapshotObj.plan_code : null,
  };
};

export const useActiveSubscriptionPlansQuery = () => {
  return useQuery({
    queryKey: [SubscriptionsKeys.ActivePlans],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("price", { ascending: true });

      if (error) throw error;

      return (data || []).map((plan) => ({
        ...plan,
        feature_list: parseFeatures(plan.features, plan.description),
      })) as SubscriptionPlan[];
    },
  });
};

export const useMySubscriptionHistoryQuery = () => {
  const { session } = useAuth();

  return useQuery({
    queryKey: [SubscriptionsKeys.MyHistory, session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase
        .from("user_subscription_history")
        .select("*")
        .order("paid_at", { ascending: false, nullsFirst: false });

      if (error) throw error;

      return (data || []).map((row) => ({
        ...row,
        ...parsePlanFromMetadata(row.metadata),
      })) as SubscriptionHistoryItem[];
    },
    enabled: !!session?.user?.id,
  });
};

export const useMySubscriptionHistoryCountQuery = () => {
  const { session } = useAuth();

  return useQuery({
    queryKey: [SubscriptionsKeys.MyHistoryCount, session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) {
        throw new Error("User not authenticated");
      }

      const { count, error } = await supabase
        .from("user_subscription_history")
        .select("*", { count: "exact", head: true });

      if (error) throw error;

      return count || 0;
    },
    enabled: !!session?.user?.id,
    staleTime: 5 * 60 * 1000,
  });
};

export const usePaginatedMySubscriptionHistoryQuery = ({
  page,
  pageSize,
  totalCount = 0,
}: PaginatedParams) => {
  const { session } = useAuth();

  return useQuery({
    queryKey: [
      SubscriptionsKeys.PaginatedMyHistory,
      session?.user?.id,
      page,
      pageSize,
      totalCount,
    ],
    queryFn: async () => {
      if (!session?.user?.id) {
        throw new Error("User not authenticated");
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const totalPages = Math.ceil(totalCount / pageSize);

      const { data, error } = await supabase
        .from("user_subscription_history")
        .select("*")
        .order("paid_at", { ascending: false, nullsFirst: false })
        .range(from, to);

      if (error) throw error;

      const history = (data || []).map((row) => ({
        ...row,
        ...parsePlanFromMetadata(row.metadata),
      })) as SubscriptionHistoryItem[];

      return {
        data: history,
        totalCount,
        totalPages,
        currentPage: page,
      };
    },
    enabled: !!session?.user?.id,
    placeholderData: (previousData) => previousData,
  });
};

export const useMyCurrentSubscriptionQuery = () => {
  const { session } = useAuth();

  return useQuery({
    queryKey: [SubscriptionsKeys.MyCurrent, session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase.rpc(
        "get_current_user_subscription",
      );

      if (error) throw error;

      const current = data?.[0];
      if (!current) return null;

      return {
        ...current,
        ...parsePlanFromSnapshot(current.plan_snapshot),
      } as CurrentSubscriptionItem;
    },
    enabled: !!session?.user?.id,
  });
};

export const useProratedUpgradeAmountQuery = (
  currentSubscriptionId: number | null,
  newPlanCode: string | null,
  enabled = true,
) => {
  const { session } = useAuth();

  return useQuery({
    queryKey: [
      SubscriptionsKeys.ProratedUpgradeAmount,
      session?.user?.id,
      currentSubscriptionId,
      newPlanCode,
    ],
    queryFn: async () => {
      if (!currentSubscriptionId || !newPlanCode) {
        return null;
      }

      const { data, error } = await supabase.rpc(
        "get_prorated_upgrade_amount",
        {
          p_current_subscription_id: currentSubscriptionId,
          p_new_plan_code: newPlanCode,
        },
      );

      if (error) throw error;

      const preview = data?.[0];
      return (preview || null) as ProratedUpgradeAmountItem | null;
    },
    enabled:
      !!session?.user?.id &&
      !!currentSubscriptionId &&
      !!newPlanCode &&
      enabled,
  });
};
