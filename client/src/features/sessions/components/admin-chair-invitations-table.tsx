import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type PaginationState,
  type SortingState,
} from "@tanstack/react-table";
import { useMemo, useState, useCallback } from "react";

import { DataTablePagination } from "@/components/data-table/pagination";
import {
  createChairInvitationsColumns,
  type ChairInvitationTableItem,
} from "./chair-invitations-columns";
import { useCancelChairInvitationMutation } from "@/features/sessions/services/mutations";
import { CancelInvitationDialog } from "./CancelInvitationDialog";
import { toast } from "sonner";

type AdminChairInvitationsTableProps = {
  invitations: ChairInvitationTableItem[];
};

const DEFAULT_PAGINATION: PaginationState = {
  pageIndex: 0,
  pageSize: 10,
};

export const AdminChairInvitationsTable = ({
  invitations,
}: AdminChairInvitationsTableProps) => {
  const [sorting, setSorting] = useState<SortingState>([
    {
      id: "created_at",
      desc: true,
    },
  ]);
  const [pagination, setPagination] =
    useState<PaginationState>(DEFAULT_PAGINATION);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<{
    id: string;
    sessionId: number;
    email: string;
  } | null>(null);

  const cancelMutation = useCancelChairInvitationMutation();

  const handleCancel = useCallback(
    (invitationId: string, sessionId: number, email: string) => {
      setSelectedInvitation({ id: invitationId, sessionId, email });
      setDialogOpen(true);
    },
    [],
  );

  const handleConfirmCancel = useCallback(async () => {
    if (!selectedInvitation) return;

    try {
      await cancelMutation.mutateAsync({
        sessionId: selectedInvitation.sessionId,
        invitationId: selectedInvitation.id,
      });
      toast.success("Invitation canceled.");
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ||
        err?.message ||
        "Failed to cancel invitation.";
      toast.error(message);
    }
  }, [selectedInvitation, cancelMutation]);

  const columns = useMemo(
    () => createChairInvitationsColumns(handleCancel),
    [handleCancel],
  );

  const table = useReactTable({
    data: invitations,
    columns,
    state: {
      sorting,
      pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-195 text-left text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="px-3 py-2 font-medium">
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
                <tr
                  key={row.id}
                  className="border-b border-border/70 transition-colors hover:bg-muted/30"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-3 align-top">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
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

      {selectedInvitation && (
        <CancelInvitationDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          inviteeEmail={selectedInvitation.email}
          onConfirm={handleConfirmCancel}
          isLoading={cancelMutation.isPending}
        />
      )}
    </>
  );
};
