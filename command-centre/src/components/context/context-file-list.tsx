"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  ChevronUp,
  ChevronDown,
  FolderOpen,
  ChevronRight,
} from "lucide-react";
import type { FileNode } from "@/types/file";
import { useClientId, appendClientId } from "@/hooks/use-client-id";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ContextFileListProps {
  onSelectFile: (path: string) => void;
  selectedPath: string | null;
  onFilesLoaded?: (firstPath: string | null) => void;
}

const STORAGE_KEY = "context-file-order";

const iconMap: Record<string, React.ReactNode> = {
  SOUL: <FileText size={18} className="text-primary" />,
  USER: <FileText size={18} className="text-primary" />,
  learnings: <FileText size={18} className="text-primary" />,
};

function toDisplayName(name: string): string {
  return name.replace(/\.md$/, "");
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

function getIcon(name: string): React.ReactNode {
  const base = name.replace(/\.md$/, "");
  return iconMap[base] || <FileText size={18} className="text-primary" />;
}

function loadOrder(): string[] | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveOrder(paths: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(paths));
  } catch {
    // Ignore storage errors
  }
}

export function ContextFileList({
  onSelectFile,
  selectedPath,
  onFilesLoaded,
}: ContextFileListProps) {
  const clientId = useClientId();
  const [files, setFiles] = useState<FileNode[]>([]);
  const [memoryFiles, setMemoryFiles] = useState<FileNode[]>([]);
  const [memoryExpanded, setMemoryExpanded] = useState(false);
  const [memoryLimit, setMemoryLimit] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(appendClientId("/api/files?dir=context", clientId))
      .then((r) => r.json())
      .then((nodes: FileNode[]) => {
        const topFiles = nodes.filter((n) => n.type === "file");
        const savedOrder = loadOrder();
        if (savedOrder) {
          // Sort files by saved order, putting unknown files at the end
          topFiles.sort((a, b) => {
            const ai = savedOrder.indexOf(a.path);
            const bi = savedOrder.indexOf(b.path);
            if (ai === -1 && bi === -1) return 0;
            if (ai === -1) return 1;
            if (bi === -1) return -1;
            return ai - bi;
          });
        }
        setFiles(topFiles);
        setLoading(false);
        if (topFiles.length > 0) {
          onFilesLoaded?.(topFiles[0].path);
        } else {
          onFilesLoaded?.(null);
        }
      })
      .catch(() => setLoading(false));
  }, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  const moveFile = useCallback(
    (index: number, direction: "up" | "down") => {
      setFiles((prev) => {
        const next = [...prev];
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= next.length) return prev;
        [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
        saveOrder(next.map((f) => f.path));
        return next;
      });
    },
    []
  );

  const loadMemory = useCallback(
    (limit: number) => {
      fetch(
        appendClientId(
          `/api/files?dir=context/memory&limit=${limit}`,
          clientId
        )
      )
        .then((r) => r.json())
        .then((children: FileNode[]) => {
          setMemoryFiles(children);
          setMemoryLimit(limit);
        });
    },
    [clientId]
  );

  const toggleMemory = useCallback(() => {
    setMemoryExpanded((prev) => {
      if (!prev && memoryFiles.length === 0) {
        loadMemory(30);
      }
      return !prev;
    });
  }, [memoryFiles.length, loadMemory]);

  if (loading) {
    return (
      <div className="flex flex-col gap-2 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-lg" />
        ))}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="px-5 py-16 text-center">
        <FileText size={48} className="mx-auto mb-4 block text-muted-foreground" />
        <h4 className="mb-2 text-base font-semibold text-foreground">
          No context files found
        </h4>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
          Context files like SOUL.md and USER.md will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {files.map((file, index) => {
        const isSelected = file.path === selectedPath;
        return (
          <div key={file.path} className="flex items-center gap-1">
            {/* Reorder buttons */}
            <div className="flex shrink-0 flex-col">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  moveFile(index, "up");
                }}
                disabled={index === 0}
                className="size-5 text-muted-foreground"
                title="Move up"
              >
                <ChevronUp size={14} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  moveFile(index, "down");
                }}
                disabled={index === files.length - 1}
                className="size-5 text-muted-foreground"
                title="Move down"
              >
                <ChevronDown size={14} />
              </Button>
            </div>

            {/* File row */}
            <Card
              onClick={() => onSelectFile(file.path)}
              className={cn(
                "flex-1 cursor-pointer flex-row items-center gap-3 rounded-lg p-4 shadow-none transition-colors hover:border-foreground/20 hover:bg-muted/40",
                isSelected && "bg-muted",
              )}
            >
              {getIcon(file.name)}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-foreground">
                  {toDisplayName(file.name)}
                </div>
                <div className="mt-1 flex items-center gap-3">
                  <span
                    className={cn(
                      "text-xs",
                      isSelected ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {formatRelativeTime(file.lastModified)}
                  </span>
                  <span
                    className={cn(
                      "text-xs",
                      isSelected ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {(file.size / 1024).toFixed(1)}KB
                  </span>
                </div>
              </div>
            </Card>
          </div>
        );
      })}

      {/* Memory section */}
      <div className="mt-2">
        <button
          onClick={toggleMemory}
          className="ml-6 flex w-full items-center gap-2 rounded-lg px-4 py-3 text-left text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted"
        >
          <FolderOpen size={16} className="shrink-0 text-primary" />
          <span className="flex-1">Memory</span>
          <ChevronRight
            size={14}
            className="text-muted-foreground transition-transform"
            style={{ transform: memoryExpanded ? "rotate(90deg)" : "none" }}
          />
        </button>

        {memoryExpanded && (
          <div className="ml-6 mt-1 flex flex-col gap-1">
            {memoryFiles.map((mf) => {
              const isSelected = mf.path === selectedPath;
              return (
                <button
                  key={mf.path}
                  onClick={() => onSelectFile(mf.path)}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-4 py-2 text-left text-sm text-foreground transition-colors",
                    isSelected ? "bg-muted" : "hover:bg-muted",
                  )}
                >
                  <FileText size={14} className="shrink-0 text-muted-foreground" />
                  <span className="truncate">{mf.name}</span>
                </button>
              );
            })}
            {memoryFiles.length >= memoryLimit && (
              <button
                onClick={() => loadMemory(memoryLimit + 30)}
                className="px-4 py-2 text-left text-xs font-medium text-primary"
              >
                Load more...
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
