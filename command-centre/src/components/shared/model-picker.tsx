"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import type { ClaudeModel } from "@/types/task";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Option {
  value: ClaudeModel;
  label: string;
}

const OPTIONS: Option[] = [
  { value: "opus", label: "Opus" },
  { value: "sonnet", label: "Sonnet" },
  { value: "haiku", label: "Haiku" },
];

interface ModelPickerProps {
  value: ClaudeModel | null;
  onChange: (value: ClaudeModel) => void;
  disabled?: boolean;
}

export function ModelPicker({ value, onChange, disabled }: ModelPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current: ClaudeModel = value ?? "opus";
  const currentLabel = OPTIONS.find((o) => o.value === current)?.label || "Opus";

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        title="Model"
        className="h-[28px] gap-2 px-2 text-xs font-medium text-muted-foreground"
      >
        <Sparkles size={13} />
        {currentLabel}
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
            minWidth: 140,
            padding: 8,
          }}
        >
          <div className="px-3 pb-2 pt-1 text-xs font-semibold text-muted-foreground">
            Model
          </div>
          {OPTIONS.map((opt) => {
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
                  "flex w-full items-center rounded-md px-3 py-2 text-left text-[13px] font-medium text-foreground transition-colors hover:bg-muted",
                  isSelected && "bg-muted",
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
