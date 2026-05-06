import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";

import { DataTablePagination } from "@/components/data-table/pagination";
import { DataTableToolbar } from "@/components/data-table/toolbar";
import type { AwardWithSessions } from "@/features/awards/types";
import { createConferenceAwardsColumns } from "./conference-awards-table-columns";

type ConferenceAwardsTableProps = {
  awards: AwardWithSessions[];
  onEdit: (award: AwardWithSessions) => void;
  onDelete: (award: AwardWithSessions) => void;
};

const DEFAULT_PAGINATION: PaginationState = {
  pageIndex: 0,
  pageSize: 10,
};

export const ConferenceAwardsTable = ({
  awards,
  onEdit,
  onDelete,
}: ConferenceAwardsTableProps) => {
  const [sorting, setSorting] = useState<SortingState>([
    {
      id: "open_time",
      desc: true,
    },
  ]);
  const [pagination, setPagination] =
    useState<PaginationState>(DEFAULT_PAGINATION);

  const columns = useMemo(
    () => createConferenceAwardsColumns({ onEdit, onDelete }),
    [onEdit, onDelete],
  );

  const table = useReactTable({
    data: awards,
    columns,
    state: {
      sorting,
      pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border px-4 py-4">
        <DataTableToolbar
          table={table}
          searchKey="name"
          searchPlaceholder="Search award name..."
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-260 text-left text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-4 py-2 font-medium">
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
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No conference awards found.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-border/70 transition-colors hover:bg-muted/30"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 align-top">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-border px-4 py-4">
        <DataTablePagination table={table} />
      </div>
    </section>
  );
};
