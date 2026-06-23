"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface MarkdownEditorProps {
  content: string;
  onSave: (content: string) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export function MarkdownEditor({ content, onSave, onCancel, isSaving }: MarkdownEditorProps) {
  const [localContent, setLocalContent] = useState(content);

  return (
    <div className="flex flex-col gap-4">
      <Textarea
        value={localContent}
        onChange={(e) => setLocalContent(e.target.value)}
        className="min-h-[400px] resize-y text-[13px] leading-relaxed"
      />
      <div className="flex justify-end gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={() => onSave(localContent)}
          disabled={isSaving}
        >
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
