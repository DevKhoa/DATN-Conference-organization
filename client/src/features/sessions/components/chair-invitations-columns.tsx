import type { ColumnDef } from "@tanstack/react-table";

import { DataTableColumnHeader } from "@/components/data-table/column-header";

export type ChairInvitationTableItem = {
  invitation_id: string;
  session_id: number;
  session_name?: string;
  email: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED" | string;
  created_at?: string;
  responded_at?: string;
  invite_link?: string;
};

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  return new Date(value).toLocaleString();
};

export const createChairInvitationsColumns =
  (): ColumnDef<ChairInvitationTableItem>[] => {
    return [
      {
        id: "session",
        accessorFn: (row) => row.session_name || String(row.session_id),
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Session" />
        ),
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.session_name || row.original.session_id}
          </span>
        ),
      },
      {
        accessorKey: "email",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Email" />
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ getValue }) => (
          <span className="inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold">
            {String(getValue() || "-")}
          </span>
        ),
      },
      {
        accessorKey: "created_at",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Created" />
        ),
        cell: ({ getValue }) => (
          <span className="text-muted-foreground">
            {formatDateTime(getValue() as string | undefined)}
          </span>
        ),
      },
      {
        accessorKey: "responded_at",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Responded" />
        ),
        cell: ({ getValue }) => (
          <span className="text-muted-foreground">
            {formatDateTime(getValue() as string | undefined)}
          </span>
        ),
      },
      {
        accessorKey: "invite_link",
        enableSorting: false,
        header: () => "Invite Link",
        cell: ({ getValue }) => {
          const link = getValue() as string | undefined;
          return link ? (
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline underline-offset-2"
            >
              Open Link
            </a>
          ) : (
            <span className="text-muted-foreground">-</span>
          );
        },
      },
    ];
  };
