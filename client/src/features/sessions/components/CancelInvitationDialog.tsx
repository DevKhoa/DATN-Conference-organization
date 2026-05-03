import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type CancelInvitationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inviteeEmail: string;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
};

export const CancelInvitationDialog = ({
  open,
  onOpenChange,
  inviteeEmail,
  onConfirm,
  isLoading = false,
}: CancelInvitationDialogProps) => {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Invitation</DialogTitle>
          <DialogDescription>
            Confirm cancellation of invitation to{" "}
            <span className="font-semibold">{inviteeEmail}</span>. This action
            cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep Invitation
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isConfirming || isLoading}
          >
            {isConfirming || isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Cancel Invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
