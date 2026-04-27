import { ArrowRight, Loader2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import type { PaginationState } from "@tanstack/react-table";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubscriptionHistoryTable } from "@/features/subscriptions/components/subscription-history-table";
import {
  useActiveSubscriptionPlansQuery,
  useMySubscriptionHistoryCountQuery,
  useMyCurrentSubscriptionQuery,
  usePaginatedMySubscriptionHistoryQuery,
  useProratedUpgradeAmountQuery,
} from "@/features/subscriptions/services/queries";
import {
  useCancelSubscriptionMutation,
  useUpgradeSubscriptionMutation,
} from "@/features/subscriptions/services/mutations";
import { DefaultLayout } from "@/layouts/DefaultLayout";
import {
  fmtCurrency,
  fmtDate,
} from "@/features/subscriptions/components/subscription-history-columns";
import { isSubscriptionUsable } from "@/features/subscriptions/utils";

const DEFAULT_PAGE_SIZE = 10;

const MySubscriptionsPage = () => {
  const navigate = useNavigate();
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  const { data: totalCount = 0 } = useMySubscriptionHistoryCountQuery();
  const { data: plans = [] } = useActiveSubscriptionPlansQuery();
  const {
    data: paginatedHistory,
    isLoading,
    isError,
    refetch,
  } = usePaginatedMySubscriptionHistoryQuery({
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    totalCount,
  });
  const { data: currentSubscription } = useMyCurrentSubscriptionQuery();
  const cancelSubscriptionMutation = useCancelSubscriptionMutation();
  const upgradeSubscriptionMutation = useUpgradeSubscriptionMutation();

  const history = paginatedHistory?.data || [];

  const activeSubscription = isSubscriptionUsable(
    currentSubscription?.status,
    currentSubscription?.expires_at,
  )
    ? currentSubscription
    : history.find((item) =>
        isSubscriptionUsable(item.status, item.expires_at),
      );

  const canCancelActiveSubscription =
    activeSubscription?.status === "ACTIVE" &&
    isSubscriptionUsable(
      activeSubscription?.status,
      activeSubscription?.expires_at,
    );

  const availableUpgradePlans = useMemo(() => {
    if (!activeSubscription) return [];
    const currentTokens = activeSubscription.monthly_tokens ?? 0;
    return plans.filter(
      (plan) =>
        plan.is_active &&
        plan.monthly_tokens > currentTokens &&
        plan.plan_code !== activeSubscription.plan_code,
    );
  }, [activeSubscription, plans]);

  const [selectedUpgradePlanCode, setSelectedUpgradePlanCode] = useState<
    string | null
  >(null);

  const {
    data: upgradePreview,
    isLoading: isLoadingUpgradePreview,
    isError: isUpgradePreviewError,
  } = useProratedUpgradeAmountQuery(
    activeSubscription?.subscription_id ?? null,
    selectedUpgradePlanCode,
    isUpgradeDialogOpen,
  );

  const handleCancelActiveSubscription = async () => {
    if (!activeSubscription?.subscription_id) {
      toast.error("Subscription id is missing.");
      return;
    }

    try {
      await cancelSubscriptionMutation.mutateAsync({
        subscriptionId: activeSubscription.subscription_id,
      });
      toast.success("Subscription canceled successfully.");
      setIsCancelDialogOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to cancel subscription. Please try again.");
    }
  };

  const handleUpgradeActiveSubscription = async () => {
    if (!selectedUpgradePlanCode) {
      toast.error("Please select a plan to upgrade.");
      return;
    }

    if (!upgradePreview) {
      toast.error("Unable to preview upgrade amount. Please try again.");
      return;
    }

    try {
      const result = await upgradeSubscriptionMutation.mutateAsync({
        newPlanCode: selectedUpgradePlanCode,
        returnUrl: window.location.href,
      });

      setIsUpgradeDialogOpen(false);

      if (result.checkout_url) {
        window.location.href = result.checkout_url;
        return;
      }

      toast.success("Subscription upgraded successfully.");
    } catch (error) {
      console.error(error);
      toast.error("Failed to upgrade subscription. Please try again.");
    }
  };

  return (
    <DefaultLayout meta={{ title: "My Subscriptions" }}>
      <div className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold">My Subscriptions</h1>
              <p className="mt-2 text-muted-foreground">
                Track your active plan and complete payment history.
              </p>
            </div>
            <Button onClick={() => navigate({ to: "/subscriptions" })}>
              Browse Plans
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          {isLoading ? (
            <div className="rounded-2xl border border-border bg-card p-10 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
              <p className="mt-3 text-muted-foreground">
                Loading your subscriptions...
              </p>
            </div>
          ) : isError ? (
            <div className="rounded-2xl border border-destructive/25 bg-destructive/5 p-8 text-center">
              <p className="text-lg font-semibold text-destructive">
                Failed to fetch subscription history.
              </p>
              <Button
                className="mt-4"
                variant="outline"
                onClick={() => refetch()}
              >
                Try Again
              </Button>
            </div>
          ) : history.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-10 text-center">
              <p className="text-lg font-semibold">No subscriptions yet.</p>
              <p className="mt-2 text-muted-foreground">
                Choose a plan to unlock monthly AI tokens and chat capacity.
              </p>
              <Button
                className="mt-6"
                onClick={() => navigate({ to: "/subscriptions" })}
              >
                View Available Plans
              </Button>
            </div>
          ) : (
            <>
              {activeSubscription && (
                <section className="mb-8 rounded-2xl border border-primary/30 bg-primary/5 p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                        Current Subscription
                      </p>
                      <h2 className="mt-1 text-2xl font-bold">
                        {activeSubscription.plan_name ||
                          activeSubscription.subscription_type ||
                          "Current Plan"}
                      </h2>
                      <p className="mt-1 text-muted-foreground">
                        Started {fmtDate(activeSubscription.started_at)} •
                        Expires {fmtDate(activeSubscription.expires_at)}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 md:w-auto">
                      <div className="rounded-xl border border-border bg-card px-4 py-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Tokens Left
                        </p>
                        <p className="mt-1 text-xl font-bold">
                          {activeSubscription.tokens_remaining?.toLocaleString() ??
                            "-"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-border bg-card px-4 py-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Monthly Quota
                        </p>
                        <p className="mt-1 text-xl font-bold">
                          {activeSubscription.monthly_tokens?.toLocaleString() ??
                            "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {availableUpgradePlans.length > 0 && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedUpgradePlanCode(
                            availableUpgradePlans[0].plan_code,
                          );
                          setIsUpgradeDialogOpen(true);
                        }}
                      >
                        Upgrade Plan
                      </Button>
                    )}
                    {canCancelActiveSubscription && (
                      <Button
                        variant="destructive"
                        onClick={() => setIsCancelDialogOpen(true)}
                      >
                        Cancel Subscription
                      </Button>
                    )}
                  </div>
                </section>
              )}

              <SubscriptionHistoryTable
                history={history}
                plans={plans}
                pageIndex={pagination.pageIndex}
                pageSize={pagination.pageSize}
                rowCount={totalCount}
                onPaginationChange={setPagination}
              />

              <Dialog
                open={isCancelDialogOpen}
                onOpenChange={setIsCancelDialogOpen}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Cancel subscription</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to cancel this active subscription?
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsCancelDialogOpen(false)}
                      disabled={cancelSubscriptionMutation.isPending}
                    >
                      Keep subscription
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleCancelActiveSubscription}
                      disabled={cancelSubscriptionMutation.isPending}
                    >
                      {cancelSubscriptionMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Canceling...
                        </>
                      ) : (
                        "Confirm cancel"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog
                open={isUpgradeDialogOpen}
                onOpenChange={setIsUpgradeDialogOpen}
              >
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upgrade subscription</DialogTitle>
                    <DialogDescription>
                      Choose a higher plan. You may be redirected to PayOS when
                      payment is required.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Available plans
                    </p>
                    <Select
                      value={selectedUpgradePlanCode ?? undefined}
                      onValueChange={(value) =>
                        setSelectedUpgradePlanCode(value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUpgradePlans.map((plan) => (
                          <SelectItem key={plan.plan_id} value={plan.plan_code}>
                            {plan.name} • {plan.monthly_tokens.toLocaleString()}{" "}
                            tokens • {fmtCurrency(plan.price)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="rounded-md border bg-muted/40 p-3 text-sm">
                      <p className="text-muted-foreground">
                        Upgrade amount preview
                      </p>
                      {isLoadingUpgradePreview ? (
                        <p className="mt-1">Calculating prorated amount...</p>
                      ) : isUpgradePreviewError ? (
                        <p className="mt-1 text-destructive">
                          Failed to calculate upgrade amount.
                        </p>
                      ) : upgradePreview ? (
                        <div className="mt-1 space-y-1">
                          <p>
                            Amount to pay:{" "}
                            <span className="font-semibold">
                              {fmtCurrency(upgradePreview.amount_to_pay)}
                            </span>
                          </p>
                          <p className="text-muted-foreground">
                            Remaining days: {upgradePreview.remaining_days}
                          </p>
                        </div>
                      ) : (
                        <p className="mt-1 text-muted-foreground">
                          Select a plan to see preview.
                        </p>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsUpgradeDialogOpen(false)}
                      disabled={upgradeSubscriptionMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleUpgradeActiveSubscription}
                      disabled={
                        upgradeSubscriptionMutation.isPending ||
                        !selectedUpgradePlanCode ||
                        isLoadingUpgradePreview ||
                        !upgradePreview
                      }
                    >
                      {upgradeSubscriptionMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Continue"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>
    </DefaultLayout>
  );
};

export default MySubscriptionsPage;
