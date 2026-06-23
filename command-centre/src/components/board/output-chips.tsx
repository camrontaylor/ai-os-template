"use client";

import { FileText, Image, FileType } from "lucide-react";
import type { OutputFile } from "@/types/task";
import { Badge } from "@/components/ui/badge";

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg"]);
const PDF_EXTENSIONS = new Set(["pdf"]);

function truncateFilename(name: string, maxLen = 20): string {
  if (name.length <= maxLen) return name;
  return name.slice(0, maxLen - 3) + "...";
}

function getFileIcon(ext: string) {
  if (IMAGE_EXTENSIONS.has(ext)) return Image;
  if (PDF_EXTENSIONS.has(ext)) return FileType;
  return FileText;
}

export function OutputChips({
  files,
}: {
  files: OutputFile[];
}) {
  if (files.length === 0) return null;

  const visible = files.slice(0, 2);
  const remaining = files.length - 2;

  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {visible.map((file) => {
        const Icon = getFileIcon(file.extension);

        return (
          <Badge
            key={file.id}
            variant="secondary"
            className="gap-1 px-2 py-0 text-[11px] font-normal"
          >
            <Icon size={10} />
            {truncateFilename(file.fileName)}
          </Badge>
        );
      })}
      {remaining > 0 && (
        <span className="text-[11px] leading-5 text-muted-foreground">
          +{remaining} more
        </span>
      )}
    </div>
  );
}
