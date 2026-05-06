import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";

import { DataTablePagination } from "@/components/data-table/pagination";
import { createSubscriptionHistoryColumns } from "./subscription-history-columns";
import type {
  SubscriptionHistoryItem,
  SubscriptionPlan,
} from "@/features/subscriptions/types";

type SubscriptionHistoryTableProps = {
  history: SubscriptionHistoryItem[];
  plans: SubscriptionPlan[];
  pageIndex: number;
  pageSize: number;
  rowCount: number;
  onPaginationChange: (pagination: PaginationState) => void;
};

export const SubscriptionHistoryTable = ({
  history,
  plans,
  pageIndex,
  pageSize,
  rowCount,
  onPaginationChange,
}: SubscriptionHistoryTableProps) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const pagination: PaginationState = {
    pageIndex,
    pageSize,
  };
  const columns = useMemo(
    () => createSubscriptionHistoryColumns(plans),
    [plans],
  );

  const table = useReactTable({
    data: history,
    columns,
    state: {
      sorting,
      pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: (updater) => {
      const nextPagination =
        typeof updater === "function" ? updater(pagination) : updater;
      onPaginationChange(nextPagination);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    rowCount,
  });

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border px-6 py-4">
        <h2 className="text-lg font-semibold">Payment History</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-230 text-left text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-6 py-3 font-medium">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-t border-border">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-6 py-4 align-top">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-border px-4 py-4">
        <DataTablePagination table={table} />
      </div>
    </section>
  );
};
