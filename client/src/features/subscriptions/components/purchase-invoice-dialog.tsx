import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShoppingCart,
  X,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SubscriptionPlan } from "@/features/subscriptions/types";
import { fmtCurrency } from "./subscription-history-columns";

type PurchaseInvoiceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: SubscriptionPlan | null;
  onConfirm: () => Promise<void>;
  isPending: boolean;
};

const formatSubscriptionType = (value: string | null) => {
  if (!value) return "Custom";
  return value.replaceAll("_", " ");
};

export const PurchaseInvoiceDialog = ({
  open,
  onOpenChange,
  plan,
  onConfirm,
  isPending,
}: PurchaseInvoiceDialogProps) => {
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  if (!plan) return null;

  const closeDialog = () => {
    onOpenChange(false);
    setAgreedToTerms(false);
  };

  const handleConfirm = async () => {
    await onConfirm();
    setAgreedToTerms(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirm Subscription Purchase</DialogTitle>
          <DialogDescription>
            Review your invoice details before continuing to PayOS checkout.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-3 rounded-lg border p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {formatSubscriptionType(plan.subscription_type)} subscription
                </p>
              </div>
              <Badge className="bg-primary text-primary-foreground">Plan</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {plan.description ||
                "Flexible AI access for conference workflows."}
            </p>
          </div>

          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted">
                  <th className="px-4 py-3 text-left font-semibold">
                    Description
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="px-4 py-3">
                    <p className="font-medium">{plan.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {plan.monthly_tokens.toLocaleString()} tokens/month
                      {plan.max_chats_per_day
                        ? `, ${plan.max_chats_per_day.toLocaleString()} chats/day`
                        : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {fmtCurrency(plan.price)}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="flex items-center justify-between border-t bg-muted p-4">
              <p className="text-lg font-semibold">Total</p>
              <p className="text-2xl font-bold">{fmtCurrency(plan.price)}</p>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                disabled={isPending}
                className="mt-1"
              />
              <span className="text-sm leading-relaxed">
                I confirm this subscription purchase and understand billing is
                processed securely via PayOS. Purchased subscription benefits
                are applied based on the selected plan.
              </span>
            </label>
          </div>

          <div className="rounded-lg border bg-muted/20 p-4">
            <p className="text-sm font-medium">Included with this plan</p>
            <ul className="mt-2 space-y-2">
              {plan.feature_list.length > 0 ? (
                plan.feature_list.map((feature, index) => (
                  <li
                    key={`${plan.plan_id}-${index}`}
                    className="flex items-start gap-2 text-sm"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <span>{feature}</span>
                  </li>
                ))
              ) : (
                <li className="flex items-start gap-2 text-sm">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <span>No additional feature details provided.</span>
                </li>
              )}
            </ul>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={closeDialog}
              disabled={isPending}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!agreedToTerms || isPending}
              className="gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4" />
                  Confirm & Continue
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
