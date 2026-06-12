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

export type ReportReason = "spam" | "abuse" | "spoilers" | "other";

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "spam", label: "Spam or misleading" },
  { value: "abuse", label: "Abusive or hateful" },
  { value: "spoilers", label: "Untagged spoilers" },
  { value: "other", label: "Something else" },
];

interface ReportDialogProps {
  open: boolean;
  title: string;
  description: string;
  onSubmit: (reason: ReportReason) => void;
  onOpenChange: (open: boolean) => void;
}

export function ReportDialog({
  open,
  title,
  description,
  onSubmit,
  onOpenChange,
}: ReportDialogProps) {
  const [reason, setReason] = useState<ReportReason>("spam");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 py-1">
          {REASONS.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2.5 text-sm cursor-pointer hover:bg-secondary/40 transition-colors"
            >
              <input
                type="radio"
                name="report-reason"
                value={option.value}
                checked={reason === option.value}
                onChange={() => setReason(option.value)}
                className="accent-current"
              />
              {option.label}
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onSubmit(reason);
              onOpenChange(false);
            }}
          >
            Submit report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
