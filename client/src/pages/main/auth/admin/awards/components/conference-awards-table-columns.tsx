import type { ColumnDef } from "@tanstack/react-table";

import { DataTableColumnHeader } from "@/components/data-table/column-header";
import type { AwardWithSessions } from "@/features/awards/types";
import { ConferenceAwardRowActions } from "./conference-award-row-actions";

type ConferenceAwardColumnsOptions = {
  onEdit: (award: AwardWithSessions) => void;
  onDelete: (award: AwardWithSessions) => void;
};

const toDateTime = (value: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleString();
};

export const createConferenceAwardsColumns = ({
  onEdit,
  onDelete,
}: ConferenceAwardColumnsOptions): ColumnDef<AwardWithSessions>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Award Name" />
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
    id: "sessions",
    accessorFn: (row) =>
      row.sessions.map((session) => session.session_name).join(", "),
    header: () => "Target Sessions",
    cell: ({ row }) => {
      const sessions = row.original.sessions;
      if (!sessions.length) {
        return <span className="text-muted-foreground">No sessions</span>;
      }

      const visibleSessions = sessions.slice(0, 5);
      const remainingCount = sessions.length - 5;

      return (
        <div className="flex flex-wrap gap-1">
          {visibleSessions.map((session) => (
            <span
              key={session.session_id}
              className="rounded-md border px-2 py-0.5 text-xs"
            >
              {session.session_name || `Session #${session.session_id}`}
            </span>
          ))}
          {remainingCount > 0 && (
            <span className="rounded-md border px-2 py-0.5 text-xs text-muted-foreground">
              +{remainingCount} more
            </span>
          )}
        </div>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: "open_time",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Open Time" />
    ),
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">
        {toDateTime(getValue() as string | null)}
      </span>
    ),
  },
  {
    accessorKey: "close_time",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Close Time" />
    ),
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">
        {toDateTime(getValue() as string | null)}
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
        <ConferenceAwardRowActions
          row={row.original}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>
    ),
  },
];
