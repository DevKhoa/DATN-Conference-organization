import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, CalendarClock, CreditCard } from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  SubscriptionHistoryItem,
  SubscriptionPlan,
} from "@/features/subscriptions/types";
import { SubscriptionHistoryDataTableRowActions } from "./subscription-history-data-table-row-actions";

const statusClasses: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700 border-emerald-200",
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  CANCELED: "bg-rose-100 text-rose-700 border-rose-200",
  EXPIRED: "bg-slate-200 text-slate-700 border-slate-300",
};

const paymentStatusClasses: Record<string, string> = {
  COMPLETED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  CANCELED: "bg-rose-100 text-rose-700 border-rose-200",
};

export const fmtDateTime = (value: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const fmtDate = (value: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

export const fmtCurrency = (value: number | null) => {
  if (value === null) return "-";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
};

export const createSubscriptionHistoryColumns = (
  plans: SubscriptionPlan[],
): ColumnDef<SubscriptionHistoryItem>[] => [
  {
    accessorKey: "plan_name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="h-auto p-0 font-medium"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Plan
        <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
      </Button>
    ),
    cell: ({ row }) => (
      <div>
        <p className="font-semibold text-foreground">
          {row.original.plan_name ||
            row.original.subscription_type ||
            "Subscription"}
        </p>
        <p className="text-xs text-muted-foreground">
          {row.original.plan_code || "-"}
        </p>
      </div>
    ),
  },
  {
    id: "period",
    header: "Period",
    cell: ({ row }) => (
      <div className="flex items-center gap-2 text-muted-foreground">
        <CalendarClock className="h-4 w-4" />
        <span>
          {fmtDate(row.original.started_at)} -{" "}
          {fmtDate(row.original.expires_at)}
        </span>
      </div>
    ),
  },
  {
    id: "amount",
    accessorFn: (row) => row.amount ?? row.price_paid,
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="h-auto p-0 font-medium"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Amount
        <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="font-semibold">
        {fmtCurrency(row.original.amount ?? row.original.price_paid)}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status || "PENDING";
      return (
        <span
          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
            statusClasses[status] ||
            "bg-muted text-muted-foreground border-border"
          }`}
        >
          {status}
        </span>
      );
    },
  },
  {
    accessorKey: "payment_status",
    header: "Payment",
    cell: ({ row }) => {
      const paymentStatus = row.original.payment_status || "PENDING";
      return (
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
              paymentStatusClasses[paymentStatus] ||
              "bg-muted text-muted-foreground border-border"
            }`}
          >
            {paymentStatus}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "paid_at",
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="h-auto p-0 font-medium"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Paid At
        <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {fmtDateTime(row.original.paid_at)}
      </span>
    ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <div className="flex justify-end">
        <SubscriptionHistoryDataTableRowActions
          row={row.original}
          plans={plans}
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
];
