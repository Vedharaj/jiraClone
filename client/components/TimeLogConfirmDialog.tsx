"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";

import { ButtonLoader } from "./ui/loader-components";

interface TimeLogConfirmDialogProps {
  open: boolean;
  mode: "update" | "delete";
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function TimeLogConfirmDialog({ open, mode, loading = false, onCancel, onConfirm }: TimeLogConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700"><AlertTriangle className="h-5 w-5" /></div>
          <DialogTitle>Confirm {mode}</DialogTitle>
        </DialogHeader>
        <p className="text-sm leading-6 text-[#42526E]">{mode === "delete" ? "This work log will be permanently deleted." : "These changes will replace the existing work log."} The action will be recorded in the audit log.</p>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <ButtonLoader 
            variant={mode === "delete" ? "destructive" : "default"} 
            loading={loading} 
            onClick={onConfirm}
          >
            Confirm {mode}
          </ButtonLoader>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
