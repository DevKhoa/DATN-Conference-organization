import { Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AwardTemplateWithCriteria } from "@/features/awards/types";

type DeleteAwardTemplateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: AwardTemplateWithCriteria | null;
  onConfirm: (templateId: number) => Promise<void>;
  isLoading?: boolean;
};

export const DeleteAwardTemplateDialog = ({
  open,
  onOpenChange,
  template,
  onConfirm,
  isLoading = false,
}: DeleteAwardTemplateDialogProps) => {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    if (!template) return;

    setIsConfirming(true);
    try {
      await onConfirm(template.template_id);
      onOpenChange(false);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Award Template</DialogTitle>
          <DialogDescription>
            Delete <span className="font-semibold">{template?.name}</span> and
            all its criteria? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isConfirming || isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isConfirming || isLoading}
          >
            {isConfirming || isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
