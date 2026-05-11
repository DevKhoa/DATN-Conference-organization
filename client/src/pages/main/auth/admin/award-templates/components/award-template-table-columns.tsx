import type { ColumnDef } from "@tanstack/react-table";

import { DataTableColumnHeader } from "@/components/data-table/column-header";
import type { AwardTemplateWithCriteria } from "@/features/awards/types";
import { AwardTemplateTableRowActions } from "./award-template-table-row-actions";

const toDateTime = (value: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleString();
};

type CreateAwardTemplateColumnsOptions = {
  onEdit: (template: AwardTemplateWithCriteria) => void;
  onDelete: (template: AwardTemplateWithCriteria) => void;
};

export const createAwardTemplateColumns = ({
  onEdit,
  onDelete,
}: CreateAwardTemplateColumnsOptions): ColumnDef<AwardTemplateWithCriteria>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Template Name" />
    ),
    cell: ({ row }) => (
      <div>
        <p className="font-semibold">{row.original.name}</p>
      </div>
    ),
  },
  {
    accessorKey: "description",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Description" />
    ),
    cell: ({ getValue }) => {
      const value = (getValue() as string | null) || "";
      return value ? (
        <p className="line-clamp-2 max-w-xl text-sm">{value}</p>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    },
  },
  {
    id: "grader_weight",
    accessorFn: (row) => `${row.chair_pct}:${row.attendee_pct}`,
    header: () => "Grader Weight",
    cell: ({ row }) => (
      <span className="text-sm">
        Chair {row.original.chair_pct}% • Attendee {row.original.attendee_pct}%
      </span>
    ),
    enableSorting: false,
  },
  {
    id: "criteria_count",
    accessorFn: (row) => row.criteria.length,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Criteria" />
    ),
    cell: ({ row }) => (
      <span className="rounded-md border px-2 py-0.5 text-xs font-semibold">
        {row.original.criteria.length}
      </span>
    ),
  },
  {
    id: "actions",
    enableSorting: false,
    enableHiding: false,
    header: () => "",
    cell: ({ row }) => (
      <div className="flex justify-end">
        <AwardTemplateTableRowActions
          row={row.original}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>
    ),
  },
];
