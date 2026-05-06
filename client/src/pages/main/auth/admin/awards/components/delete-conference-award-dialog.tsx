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
import type { AwardWithSessions } from "@/features/awards/types";

type DeleteConferenceAwardDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  award?: AwardWithSessions | null;
  onConfirm: (awardId: number) => Promise<void>;
  isLoading?: boolean;
};

export const DeleteConferenceAwardDialog = ({
  open,
  onOpenChange,
  award,
  onConfirm,
  isLoading = false,
}: DeleteConferenceAwardDialogProps) => {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    if (!award) return;
    setIsConfirming(true);
    try {
      await onConfirm(award.award_id);
      onOpenChange(false);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Conference Award</DialogTitle>
          <DialogDescription>
            Delete <span className="font-semibold">{award?.name}</span> from this
            conference? This action cannot be undone.
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
