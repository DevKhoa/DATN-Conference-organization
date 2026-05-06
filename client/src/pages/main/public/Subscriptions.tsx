import { CheckCircle2, Loader2, Sparkles, Wallet } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import useAuth from "@/features/auth/hooks/useAuth";
import { PurchaseInvoiceDialog } from "@/features/subscriptions/components/purchase-invoice-dialog";
import { useCreateSubscriptionMutation } from "@/features/subscriptions/services/mutations";
import {
  useActiveSubscriptionPlansQuery,
  useMyCurrentSubscriptionQuery,
} from "@/features/subscriptions/services/queries";
import type { SubscriptionPlan } from "@/features/subscriptions/types";
import { DefaultLayout } from "@/layouts/DefaultLayout";
import { isSubscriptionUsable } from "@/features/subscriptions/utils";

const formatCurrency = (value: number | null) => {
  if (!value) return "Free";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
};

const formatSubscriptionType = (value: string | null) => {
  if (!value) return "Custom";
  return value.replaceAll("_", " ");
};

const SubscriptionsPage = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(
    null,
  );

  const {
    data: plans = [],
    isLoading,
    isError,
    refetch,
  } = useActiveSubscriptionPlansQuery();
  const { data: currentSubscription } = useMyCurrentSubscriptionQuery();

  const createSubscriptionMutation = useCreateSubscriptionMutation();
  const hasActiveSubscription = Boolean(
    isSubscriptionUsable(
      currentSubscription?.status,
      currentSubscription?.expires_at,
    ),
  );

  const handleSubscribe = (plan: SubscriptionPlan) => {
    if (!session) {
      navigate({
        to: "/login",
        search: {
          redirect: window.location.href,
        },
      });
      return;
    }

    setSelectedPlan(plan);
    setIsPurchaseDialogOpen(true);
  };

  const handleConfirmCheckout = async () => {
    if (!selectedPlan) return;

    try {
      const checkout = await createSubscriptionMutation.mutateAsync({
        planId: selectedPlan.plan_id,
        returnUrl: window.location.href,
      });

      window.location.href = checkout.checkout_url;
    } catch (error) {
      console.error(error);
      toast.error("Unable to start subscription payment. Please try again.");
    }
  };

  return (
    <DefaultLayout meta={{ title: "Subscriptions" }}>
      <div className="min-h-screen bg-background text-foreground">
        <section className="relative overflow-hidden py-20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.14),transparent_45%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.12),transparent_38%)]" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                <Sparkles className="h-4 w-4" />
                AI Subscription Plans
              </div>
              <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
                Pick Your Plan, Power Your Research
              </h1>
              <p className="mt-4 text-base text-muted-foreground sm:text-lg">
                Subscribe to unlock AI chat capacity and monthly token quotas.
                All subscriptions are processed securely via PayOS.
              </p>
              {hasActiveSubscription && (
                <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  You already have a valid subscription period. You can view
                  your plan details in My Subscriptions.
                </div>
              )}
              {session && (
                <div className="mt-8">
                  <Button
                    variant="outline"
                    onClick={() => navigate({ to: "/subscriptions/me" })}
                  >
                    View My Subscriptions
                  </Button>
                </div>
              )}
            </div>

            {isLoading ? (
              <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-96 animate-pulse rounded-2xl border border-border bg-card"
                  />
                ))}
              </div>
            ) : isError ? (
              <div className="mx-auto mt-16 max-w-xl rounded-2xl border border-destructive/25 bg-destructive/5 p-8 text-center">
                <p className="text-lg font-semibold text-destructive">
                  Failed to load subscription plans.
                </p>
                <Button
                  className="mt-5"
                  variant="outline"
                  onClick={() => refetch()}
                >
                  Try Again
                </Button>
              </div>
            ) : plans.length === 0 ? (
              <div className="mx-auto mt-16 max-w-xl rounded-2xl border border-border bg-card p-8 text-center">
                <p className="text-lg font-semibold">
                  No active plans right now.
                </p>
                <p className="mt-2 text-muted-foreground">
                  Please check back later for available subscriptions.
                </p>
              </div>
            ) : (
              <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {plans.map((plan, index) => {
                  const highlight =
                    index === 1 || (plans.length === 1 && index === 0);
                  return (
                    <article
                      key={plan.plan_id}
                      className={`relative flex h-full flex-col rounded-2xl border bg-card p-6 shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg ${
                        highlight
                          ? "border-primary/40 ring-2 ring-primary/10"
                          : "border-border"
                      }`}
                    >
                      {highlight && (
                        <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                          Recommended
                        </span>
                      )}

                      <div className="mb-6">
                        <p className="text-sm uppercase tracking-wide text-muted-foreground">
                          {formatSubscriptionType(plan.subscription_type)}
                        </p>
                        <h2 className="mt-2 text-2xl font-bold">{plan.name}</h2>
                        <p className="mt-3 text-sm text-muted-foreground">
                          {plan.description ||
                            "Flexible AI access for conference workflows."}
                        </p>
                      </div>

                      <div className="mb-6 rounded-xl bg-muted/40 p-4">
                        <p className="text-sm text-muted-foreground">Price</p>
                        <p className="mt-1 text-3xl font-bold">
                          {formatCurrency(plan.price)}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {plan.monthly_tokens.toLocaleString()} tokens / month
                        </p>
                        {plan.max_chats_per_day && (
                          <p className="text-sm text-muted-foreground">
                            {plan.max_chats_per_day.toLocaleString()} chats /
                            day
                          </p>
                        )}
                      </div>

                      <div className="mb-6 space-y-3">
                        {plan.feature_list.length > 0 ? (
                          plan.feature_list.map((feature, featureIndex) => (
                            <div
                              key={featureIndex}
                              className="flex items-start gap-2"
                            >
                              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                              <span className="text-sm text-foreground/90">
                                {feature}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                            <span className="text-sm text-foreground/90">
                              Access your selected AI token quota.
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mt-auto">
                        <Button
                          className="w-full"
                          size="lg"
                          onClick={() => handleSubscribe(plan)}
                          disabled={
                            createSubscriptionMutation.isPending ||
                            hasActiveSubscription
                          }
                        >
                          {hasActiveSubscription ? (
                            <>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Active Subscription
                            </>
                          ) : createSubscriptionMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <Wallet className="mr-2 h-4 w-4" />
                              Subscribe with PayOS
                            </>
                          )}
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <PurchaseInvoiceDialog
          open={isPurchaseDialogOpen}
          onOpenChange={setIsPurchaseDialogOpen}
          plan={selectedPlan}
          onConfirm={handleConfirmCheckout}
          isPending={createSubscriptionMutation.isPending}
        />
      </div>
    </DefaultLayout>
  );
};

export default SubscriptionsPage;
