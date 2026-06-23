"use client";

import { useState, useEffect } from "react";
import { Mic, Target, Users, FileText, Palette } from "lucide-react";
import type { FileNode } from "@/types/file";
import { useClientId, appendClientId } from "@/hooks/use-client-id";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface BrandCardGridProps {
  onSelectFile: (path: string) => void;
}

const iconMap: Record<string, React.ReactNode> = {
  "voice-profile": <Mic className="size-5 text-primary" />,
  positioning: <Target className="size-5 text-primary" />,
  icp: <Users className="size-5 text-primary" />,
  samples: <FileText className="size-5 text-primary" />,
  "brand-assets": <Palette className="size-5 text-primary" />,
};

function toTitleCase(name: string): string {
  return name
    .replace(/\.md$/, "")
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

function getIcon(fileName: string): React.ReactNode {
  const baseName = fileName.replace(/\.md$/, "");
  return iconMap[baseName] || <FileText className="size-5 text-primary" />;
}

export function BrandCardGrid({ onSelectFile }: BrandCardGridProps) {
  const clientId = useClientId();
  const [files, setFiles] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(appendClientId("/api/files?dir=brand_context", clientId))
      .then((r) => r.json())
      .then((nodes: FileNode[]) => {
        // Filter to only files (not directories)
        setFiles(nodes.filter((n) => n.type === "file"));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [clientId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="min-h-[120px] gap-2 rounded-lg p-4 shadow-none">
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-12 w-full" />
          </Card>
        ))}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="px-5 py-16 text-center">
        <Palette className="mx-auto mb-4 block size-12 text-muted-foreground" />
        <h4 className="mb-2 text-base font-semibold text-foreground">
          No brand context files found
        </h4>
        <p className="mx-auto max-w-xs text-sm text-muted-foreground">
          Run /start-here to build your brand.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {files.map((file) => (
        <Card
          key={file.path}
          onClick={() => onSelectFile(file.path)}
          className="min-h-[120px] cursor-pointer gap-2 rounded-lg p-5 shadow-none transition-colors hover:border-foreground/20 hover:bg-muted/40"
        >
          <div className="flex items-center gap-3">
            {getIcon(file.name)}
            <span className="text-[15px] font-semibold text-foreground">
              {toTitleCase(file.name)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(file.lastModified)}
            </span>
            <span className="text-xs text-muted-foreground">
              {(file.size / 1024).toFixed(1)}KB
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
}
