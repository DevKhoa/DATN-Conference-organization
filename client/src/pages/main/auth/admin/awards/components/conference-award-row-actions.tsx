import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AwardWithSessions } from "@/features/awards/types";

type ConferenceAwardRowActionsProps = {
  row: AwardWithSessions;
  onEdit: (award: AwardWithSessions) => void;
  onDelete: (award: AwardWithSessions) => void;
};

export const ConferenceAwardRowActions = ({
  row,
  onEdit,
  onDelete,
}: ConferenceAwardRowActionsProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(row)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit award
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => onDelete(row)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete award
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
