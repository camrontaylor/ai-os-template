"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ArrowLeft, FileText } from "lucide-react";
import type { TaskLevel } from "@/types/task";
import { useTaskStore } from "@/store/task-store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { LEVEL_LABELS, LEVEL_HINTS } from "@/lib/levels";

const levels: { value: TaskLevel; label: string; hint: string }[] = [
  { value: "task", label: LEVEL_LABELS.task, hint: LEVEL_HINTS.task },
  { value: "project", label: LEVEL_LABELS.project, hint: LEVEL_HINTS.project },
  { value: "gsd", label: LEVEL_LABELS.gsd, hint: LEVEL_HINTS.gsd },
];

interface ModalNewTaskFormProps {
  attachedFile: { fileName: string; relativePath: string };
  projectSlug: string | null;
  onCancel: () => void;
  onCreated: () => void;
}

export function ModalNewTaskForm({
  attachedFile,
  projectSlug,
  onCancel,
  onCreated,
}: ModalNewTaskFormProps) {
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState<TaskLevel>("task");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createTask = useTaskStore((s) => s.createTask);


  const descRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus description on mount
  useEffect(() => {
    descRef.current?.focus();
  }, []);

  // Auto-grow textarea
  const adjustTextareaHeight = useCallback(() => {
    const el = descRef.current;
    if (!el) return;
    el.style.height = "80px";
    const scrollH = el.scrollHeight;
    el.style.height = Math.min(Math.max(scrollH, 80), 200) + "px";
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmedDesc = description.trim();
    if (!trimmedDesc || isSubmitting) return;
    setIsSubmitting(true);

    // Build description with attached file
    let fullDescription = trimmedDesc;
    const attachmentBlock = `\n\nAttached files:\n- ${attachedFile.relativePath}`;
    fullDescription = fullDescription + attachmentBlock;

    // Quick fallback title from first line
    const firstLine = fullDescription.split("\n")[0];
    const firstSentence = firstLine.match(/^[^.!?]+[.!?]?/)?.[0] || firstLine;
    const fallbackTitle = firstSentence.length <= 60
      ? firstSentence
      : firstSentence.slice(0, 57).replace(/\s+\S*$/, "") + "...";

    createTask(fallbackTitle, fullDescription, level, projectSlug).then(() => {
      onCreated();
    }).finally(() => {
      setIsSubmitting(false);
    });
  }, [description, level, attachedFile, projectSlug, isSubmitting, createTask, onCreated]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border bg-muted px-6 py-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-auto gap-1 px-2 py-1 text-[13px]"
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <span className="text-sm font-semibold text-foreground">
          New Task
        </span>
      </div>

      {/* Form */}
      <div className="flex max-w-[640px] flex-1 flex-col overflow-y-auto p-6">
        {/* Attached file chip */}
        <div className="mb-5">
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Attached Output
          </label>
          <Card className="inline-flex flex-row items-center gap-2 rounded-lg border bg-muted p-3 shadow-none">
            <FileText className="size-4 shrink-0 text-primary" />
            <div>
              <div className="text-[13px] font-medium text-foreground">
                {attachedFile.fileName}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {attachedFile.relativePath}
              </div>
            </div>
          </Card>
        </div>

        {/* Task details */}
        <div className="mb-5">
          <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            What should Claude do?
          </label>
          <Textarea
            ref={descRef}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              adjustTextareaHeight();
            }}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
              }
            }}
            disabled={isSubmitting}
            placeholder="Describe the task - a short title will be generated automatically..."
            className="max-h-[200px] min-h-[100px] resize-none"
          />
        </div>

        {/* Bottom bar: level + submit */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Level selector */}
          <div className="flex h-8 items-center gap-1 rounded-md bg-muted p-1">
            {levels.map((l) => (
              <Button
                key={l.value}
                variant="ghost"
                size="sm"
                onClick={() => setLevel(l.value)}
                title={l.hint}
                className={cn(
                  "h-7 px-4 text-xs font-medium",
                  level === l.value
                    ? "bg-background text-foreground shadow-none hover:bg-background"
                    : "text-muted-foreground",
                )}
              >
                {l.label}
              </Button>
            ))}
          </div>
          <div className="mt-2 min-h-4 text-[11px] text-muted-foreground">
            {levels.find((l) => l.value === level)?.hint}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!description.trim() || isSubmitting}
            >
              {isSubmitting ? "Sending..." : "Send to Claude"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
