import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AwardTemplateWithCriteria } from "@/features/awards/types";

type AwardTemplateTableRowActionsProps = {
  row: AwardTemplateWithCriteria;
  onEdit: (template: AwardTemplateWithCriteria) => void;
  onDelete: (template: AwardTemplateWithCriteria) => void;
};

export const AwardTemplateTableRowActions = ({
  row,
  onEdit,
  onDelete,
}: AwardTemplateTableRowActionsProps) => {
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
          Edit template
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => onDelete(row)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete template
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
