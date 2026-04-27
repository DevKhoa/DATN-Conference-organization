import { MoreHorizontal, Eye, X, ArrowUpCircle, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCancelSubscriptionMutation,
  useUpgradeSubscriptionMutation,
} from "@/features/subscriptions/services/mutations";
import { useProratedUpgradeAmountQuery } from "@/features/subscriptions/services/queries";
import type {
  SubscriptionHistoryItem,
  SubscriptionPlan,
} from "@/features/subscriptions/types";

import {
  fmtCurrency,
  fmtDate,
  fmtDateTime,
} from "./subscription-history-columns";

type SubscriptionHistoryRowActionsProps = {
  row: SubscriptionHistoryItem;
  plans: SubscriptionPlan[];
};

export const SubscriptionHistoryDataTableRowActions = ({
  row,
  plans,
}: SubscriptionHistoryRowActionsProps) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);

  const upgradeMutation = useUpgradeSubscriptionMutation();
  const cancelMutation = useCancelSubscriptionMutation();

  const currentTokens = row.monthly_tokens ?? 0;
  const availableUpgradePlans = useMemo(
    () =>
      plans.filter(
        (plan) =>
          plan.is_active &&
          plan.monthly_tokens > currentTokens &&
          plan.plan_code !== row.plan_code,
      ),
    [plans, currentTokens, row.plan_code],
  );

  const [selectedUpgradePlanCode, setSelectedUpgradePlanCode] = useState<
    string | null
  >(availableUpgradePlans[0]?.plan_code ?? null);

  const {
    data: upgradePreview,
    isLoading: isLoadingUpgradePreview,
    isError: isUpgradePreviewError,
  } = useProratedUpgradeAmountQuery(
    row.subscription_id ?? null,
    selectedUpgradePlanCode,
    isUpgradeOpen,
  );

  useEffect(() => {
    if (!selectedUpgradePlanCode && availableUpgradePlans.length > 0) {
      setSelectedUpgradePlanCode(availableUpgradePlans[0].plan_code);
    }
  }, [availableUpgradePlans, selectedUpgradePlanCode]);

  const isNotExpired = row.expires_at
    ? new Date(row.expires_at).getTime() > Date.now()
    : false;
  const isUsableSubscription =
    isNotExpired && (row.status === "ACTIVE" || row.status === "CANCELED");
  const canCancel = isNotExpired && row.status === "ACTIVE";

  const handleCancelSubscription = async () => {
    if (!row.subscription_id) {
      toast.error("Subscription id is missing.");
      return;
    }

    try {
      await cancelMutation.mutateAsync({ subscriptionId: row.subscription_id });
      toast.success("Subscription canceled successfully.");
      setIsCancelOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to cancel subscription. Please try again.");
    }
  };

  const handleUpgradeSubscription = async () => {
    if (!selectedUpgradePlanCode) {
      toast.error("Please select a plan to upgrade.");
      return;
    }

    if (!upgradePreview) {
      toast.error("Unable to preview upgrade amount. Please try again.");
      return;
    }

    try {
      const result = await upgradeMutation.mutateAsync({
        newPlanCode: selectedUpgradePlanCode,
        returnUrl: window.location.href,
      });

      setIsUpgradeOpen(false);

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
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsDetailsOpen(true)}>
            <Eye className="mr-2 h-4 w-4" />
            View details
          </DropdownMenuItem>

          {isUsableSubscription && availableUpgradePlans.length > 0 && (
            <DropdownMenuItem onClick={() => setIsUpgradeOpen(true)}>
              <ArrowUpCircle className="mr-2 h-4 w-4" />
              Upgrade subscription
            </DropdownMenuItem>
          )}

          {canCancel && (
            <DropdownMenuItem
              className="text-red-600"
              onClick={() => setIsCancelOpen(true)}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel subscription
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subscription details</DialogTitle>
            <DialogDescription>
              ID #{row.subscription_id} • Order {row.order_code || "-"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">Plan</p>
              <p className="font-medium">
                {row.plan_name || row.subscription_type}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <Badge className="mt-1">{row.status || "PENDING"}</Badge>
            </div>
            <div>
              <p className="text-muted-foreground">Payment status</p>
              <Badge variant="outline" className="mt-1">
                {row.payment_status || "PENDING"}
              </Badge>
            </div>
            <div>
              <p className="text-muted-foreground">Period</p>
              <p className="font-medium">
                {fmtDate(row.started_at)} - {fmtDate(row.expires_at)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Amount</p>
              <p className="font-medium">
                {fmtCurrency(row.amount ?? row.price_paid)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Paid at</p>
              <p className="font-medium">{fmtDateTime(row.paid_at)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Tokens remaining</p>
              <p className="font-medium">
                {row.tokens_remaining?.toLocaleString() ?? "-"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Monthly tokens</p>
              <p className="font-medium">
                {row.monthly_tokens?.toLocaleString() ?? "-"}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
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
              onClick={() => setIsCancelOpen(false)}
              disabled={cancelMutation.isPending}
            >
              Keep subscription
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelSubscription}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? (
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

      <Dialog open={isUpgradeOpen} onOpenChange={setIsUpgradeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade subscription</DialogTitle>
            <DialogDescription>
              Choose a higher plan. You will be redirected to PayOS when payment
              is required.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Available plans</p>
            <Select
              value={selectedUpgradePlanCode ?? undefined}
              onValueChange={(value) => setSelectedUpgradePlanCode(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a plan" />
              </SelectTrigger>
              <SelectContent>
                {availableUpgradePlans.map((plan) => (
                  <SelectItem key={plan.plan_id} value={plan.plan_code}>
                    {plan.name} • {plan.monthly_tokens.toLocaleString()} tokens
                    • {fmtCurrency(plan.price)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <p className="text-muted-foreground">Upgrade amount preview</p>
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
              onClick={() => setIsUpgradeOpen(false)}
              disabled={upgradeMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpgradeSubscription}
              disabled={
                upgradeMutation.isPending ||
                !selectedUpgradePlanCode ||
                isLoadingUpgradePreview ||
                !upgradePreview
              }
            >
              {upgradeMutation.isPending ? (
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
  );
};
