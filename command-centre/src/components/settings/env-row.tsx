"use client";

import { useState } from "react";
import { Eye, EyeOff, Copy, Check, Pencil, Trash2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EnvRowProps {
  entry: { key: string; value: string };
  isNew?: boolean;
  onUpdate: (key: string, value: string) => void;
  onDelete: (key: string) => void;
  onCancelNew?: () => void;
}

export function EnvRow({ entry, isNew, onUpdate, onDelete, onCancelNew }: EnvRowProps) {
  const [revealed, setRevealed] = useState(false);
  const [editing, setEditing] = useState(isNew ?? false);
  const [editKey, setEditKey] = useState(entry.key);
  const [editValue, setEditValue] = useState(entry.value);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(entry.value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    onUpdate(editKey, editValue);
    setEditing(false);
  };

  const handleCancel = () => {
    if (isNew) {
      onCancelNew?.();
    } else {
      setEditKey(entry.key);
      setEditValue(entry.value);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <div className="flex flex-wrap items-center gap-3 border-b border-border bg-muted/30 px-4 py-3">
        <Input
          className={cn(
            "w-full shrink-0 font-mono text-[13px] font-semibold md:w-auto md:min-w-[200px]",
            !isNew && "cursor-default bg-muted",
          )}
          value={editKey}
          onChange={(e) => setEditKey(e.target.value)}
          readOnly={!isNew}
          placeholder="KEY_NAME"
        />
        <Input
          className="w-full flex-1 font-mono text-[13px] md:w-auto"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          placeholder="value"
        />
        <Button variant="ghost" size="icon" onClick={handleSave} title="Save">
          <Check size={16} />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleCancel} title="Cancel">
          <X size={16} />
        </Button>
      </div>
    );
  }

  return (
    <div className="group flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 transition-colors hover:bg-muted/30">
      <span className="w-full shrink-0 text-[13px] font-semibold text-foreground md:w-auto md:min-w-[200px]">
        {entry.key}
      </span>
      <span className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[13px] text-muted-foreground">
        {revealed ? entry.value : "••••••••••••"}
      </span>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setRevealed(!revealed)}
        title={revealed ? "Hide" : "Reveal"}
      >
        {revealed ? <Eye size={16} /> : <EyeOff size={16} />}
      </Button>
      <Button variant="ghost" size="icon" onClick={handleCopy} title="Copy value">
        {copied ? <Check size={16} /> : <Copy size={16} />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          setEditKey(entry.key);
          setEditValue(entry.value);
          setEditing(true);
        }}
        title="Edit"
      >
        <Pencil size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="hover:text-destructive"
        onClick={() => onDelete(entry.key)}
        title="Delete"
      >
        <Trash2 size={16} />
      </Button>
    </div>
  );
}
