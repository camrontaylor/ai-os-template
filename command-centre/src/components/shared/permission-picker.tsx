"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, FastForward, Hand, ListTree } from "lucide-react";
import type { PermissionMode } from "@/types/task";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PickerMode = Extract<PermissionMode, "bypassPermissions" | "default" | "plan">;

interface Option {
  value: PickerMode;
  label: string;
  Icon: typeof FastForward;
  color: string;
}

const OPTIONS: Option[] = [
  { value: "bypassPermissions", label: "Auto", Icon: FastForward, color: "var(--destructive)" },
  { value: "default", label: "Ask", Icon: Hand, color: "var(--muted-foreground)" },
  { value: "plan", label: "Plan", Icon: ListTree, color: "var(--muted-foreground)" },
];

interface PermissionPickerProps {
  value: PermissionMode;
  onChange: (value: PickerMode) => void;
  disabled?: boolean;
}

export function PermissionPicker({ value, onChange, disabled }: PermissionPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Map any stored permission mode to a picker option.
  const current: PickerMode =
    value === "bypassPermissions" || value === "plan"
      ? value
      : value === "acceptEdits"
        ? "bypassPermissions" // legacy → Auto
        : "default";
  const currentOpt = OPTIONS.find((o) => o.value === current) || OPTIONS[1];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const CurrentIcon = currentOpt.Icon;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        title="Permission mode"
        className="h-[28px] gap-2 px-2 text-xs font-medium text-muted-foreground"
      >
        <CurrentIcon size={13} />
        {currentOpt.label}
        <ChevronDown size={11} />
      </Button>
      {open && (
        <div
          className="border border-border"
          style={{
            position: "absolute",
            left: 0,
            bottom: "100%",
            marginBottom: 8,
            backgroundColor: "var(--popover)",
            borderRadius: 10,
            boxShadow: "0 8px 24px color-mix(in srgb, var(--foreground) 8%, transparent)",
            zIndex: 60,
            minWidth: 160,
            padding: 8,
          }}
        >
          <div className="px-3 pb-2 pt-1 text-xs font-semibold text-muted-foreground">
            Permissions
          </div>
          {OPTIONS.map((opt) => {
            const Icon = opt.Icon;
            const isSelected = opt.value === current;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-[13px] font-medium text-foreground transition-colors hover:bg-muted",
                  isSelected && "bg-muted",
                )}
              >
                <Icon size={15} className="text-muted-foreground" />
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
