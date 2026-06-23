"use client";

import { useEffect, useRef, useState } from "react";
import { Brain, ChevronDown } from "lucide-react";
import {
  getSupportedClaudeThinkingEfforts,
  normalizeClaudeThinkingEffortForModel,
} from "@/lib/claude-options";
import type { ClaudeModel, ClaudeThinkingEffort } from "@/types/task";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Option {
  value: ClaudeThinkingEffort;
  label: string;
}

const OPTIONS: Option[] = [
  { value: "auto", label: "Auto" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "xhigh", label: "XHigh" },
  { value: "max", label: "Max" },
];

interface ThinkingEffortPickerProps {
  value: ClaudeThinkingEffort | null;
  model?: ClaudeModel | null;
  onChange: (value: ClaudeThinkingEffort) => void;
  disabled?: boolean;
}

export function ThinkingEffortPicker({ value, model, onChange, disabled }: ThinkingEffortPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const supportedValues = getSupportedClaudeThinkingEfforts(model);
  const visibleOptions = OPTIONS.filter((option) => supportedValues.includes(option.value));
  const current = normalizeClaudeThinkingEffortForModel(model, value ?? "auto") ?? "auto";
  const currentLabel = visibleOptions.find((option) => option.value === current)?.label || "Auto";

  useEffect(() => {
    const rawCurrent = value ?? "auto";
    if (current !== rawCurrent) {
      onChange(current);
    }
  }, [current, onChange, value]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
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
        onClick={() => setOpen((value) => !value)}
        title="Thinking effort"
        className="h-[28px] gap-2 px-2 text-xs font-medium text-muted-foreground"
      >
        <Brain size={13} />
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
            minWidth: 150,
            padding: 8,
          }}
        >
          <div className="px-3 pb-2 pt-1 text-xs font-semibold text-muted-foreground">
            Thinking
          </div>
          {visibleOptions.map((option) => {
            const isSelected = option.value === current;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center rounded-md px-3 py-2 text-left text-[13px] font-medium text-foreground transition-colors hover:bg-muted",
                  isSelected && "bg-muted",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
