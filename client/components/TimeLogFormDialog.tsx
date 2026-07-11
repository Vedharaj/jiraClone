"use client";

import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";
import { TimeLog, TimeLogInput } from "@/types/timeTracking";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

import { ButtonLoader } from "./ui/loader-components";

interface TimeLogFormDialogProps {
  open: boolean;
  log?: TimeLog | null;
  saving?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: TimeLogInput) => void;
}

const today = () => new Date().toLocaleDateString("en-CA");

export default function TimeLogFormDialog({ open, log, saving = false, onOpenChange, onSubmit }: TimeLogFormDialogProps) {
  const [date, setDate] = useState(today());
  const [durationHours, setDurationHours] = useState(1);
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) return;
    setDate(log?.date || today());
    setDurationHours(log?.durationHours || 1);
    setDescription(log?.description || "");
  }, [open, log]);

  const valid = date && durationHours > 0 && date <= today();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-lg bg-[#DEEBFF] text-[#0C66E4]"><Clock3 className="h-5 w-5" /></div>
          <DialogTitle>{log ? "Edit work log" : "Log work"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <div><label className="mb-1.5 block text-sm font-medium">Date</label><Input type="date" max={today()} value={date} onChange={(event) => setDate(event.target.value)} /></div>
          <div><label className="mb-1.5 block text-sm font-medium">Hours</label><Input type="number" min="0.01" step="0.25" value={durationHours} onChange={(event) => setDurationHours(Number(event.target.value))} /></div>
          <div className="sm:col-span-2"><label className="mb-1.5 block text-sm font-medium">Work description</label><Textarea className="min-h-24" placeholder="Describe the work completed" value={description} onChange={(event) => setDescription(event.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <ButtonLoader 
            className="bg-[#0C66E4] text-white hover:bg-[#0055CC]" 
            disabled={!valid} 
            loading={saving} 
            onClick={() => onSubmit({ date, durationHours, description })}
          >
            {log ? "Review changes" : "Add work log"}
          </ButtonLoader>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
