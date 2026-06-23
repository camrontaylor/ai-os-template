"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface ScheduleValue {
  time: string;
  days: string;
}

interface ScheduleSelectorProps {
  value: ScheduleValue;
  onChange: (value: ScheduleValue) => void;
}

type Preset = "daily" | "weekdays" | "weekly" | "custom";

const PRESETS: { label: string; value: Preset }[] = [
  { label: "Daily", value: "daily" },
  { label: "Weekdays", value: "weekdays" },
  { label: "Weekly", value: "weekly" },
  { label: "Custom", value: "custom" },
];

const DAYS_OF_WEEK = [
  { label: "Mon", value: "mon" },
  { label: "Tue", value: "tue" },
  { label: "Wed", value: "wed" },
  { label: "Thu", value: "thu" },
  { label: "Fri", value: "fri" },
  { label: "Sat", value: "sat" },
  { label: "Sun", value: "sun" },
];

function getPresetFromDays(days: string): Preset {
  if (days === "daily") return "daily";
  if (days === "weekdays") return "weekdays";
  if (DAYS_OF_WEEK.some((d) => d.value === days)) return "weekly";
  return "custom";
}

export function ScheduleSelector({ value, onChange }: ScheduleSelectorProps) {
  const [preset, setPreset] = useState<Preset>(() => getPresetFromDays(value.days));

  const handlePresetChange = useCallback(
    (p: Preset) => {
      setPreset(p);
      let days = value.days;
      switch (p) {
        case "daily":
          days = "daily";
          break;
        case "weekdays":
          days = "weekdays";
          break;
        case "weekly":
          days = "mon";
          break;
        case "custom":
          // Keep current days
          break;
      }
      onChange({ time: value.time, days });
    },
    [value, onChange]
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Preset chips */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <Button
            key={p.value}
            type="button"
            size="sm"
            variant={preset === p.value ? "secondary" : "outline"}
            onClick={() => handlePresetChange(p.value)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {/* Time picker -- always visible */}
      <div className="flex items-center gap-2">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Time
        </Label>
        <Input
          type="time"
          value={value.time}
          onChange={(e) => onChange({ ...value, time: e.target.value })}
          className="h-8 w-auto"
        />
      </div>

      {/* Weekly: day selector */}
      {preset === "weekly" && (
        <div className="flex flex-wrap gap-2">
          {DAYS_OF_WEEK.map((d) => (
            <Button
              key={d.value}
              type="button"
              size="sm"
              variant={value.days === d.value ? "secondary" : "outline"}
              onClick={() => onChange({ ...value, days: d.value })}
            >
              {d.label}
            </Button>
          ))}
        </div>
      )}

      {/* Custom: day checkboxes */}
      {preset === "custom" && (
        <div className="flex flex-wrap gap-3">
          {DAYS_OF_WEEK.map((d) => {
            const selected = value.days.split(",").includes(d.value);
            return (
              <Label
                key={d.value}
                className="flex cursor-pointer items-center gap-2 text-[13px] font-normal text-foreground"
              >
                <Checkbox
                  checked={selected}
                  onCheckedChange={() => {
                    const current = value.days
                      .split(",")
                      .filter((v) => v.length > 0);
                    const next = selected
                      ? current.filter((v) => v !== d.value)
                      : [...current, d.value];
                    onChange({
                      ...value,
                      days: next.length > 0 ? next.join(",") : "daily",
                    });
                  }}
                />
                {d.label}
              </Label>
            );
          })}
        </div>
      )}
    </div>
  );
}
