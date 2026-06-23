"use client";

import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ScriptConfirmModalProps {
  scriptLabel: string;
  scriptDescription: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ScriptConfirmModal({
  scriptLabel,
  scriptDescription,
  onConfirm,
  onCancel,
}: ScriptConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <Card className="w-[90%] max-w-[420px] gap-4 rounded-lg border p-6 shadow-lg">
        <div className="flex justify-center">
          <AlertTriangle size={24} className="text-destructive" />
        </div>

        <div className="text-center text-base font-semibold text-foreground">
          Confirm: {scriptLabel}
        </div>

        <div className="text-center text-sm leading-relaxed text-muted-foreground">
          {scriptDescription}
        </div>

        <div className="rounded-md border border-border bg-muted/40 px-4 py-3 text-center text-[13px] text-destructive">
          This action may modify or remove files. Are you sure?
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" className="flex-1" onClick={onConfirm}>
            Run Anyway
          </Button>
        </div>
      </Card>
    </div>
  );
}
