"use client";

import { useState, useEffect, useCallback } from "react";
import { Pencil, Eye, Trash2 } from "lucide-react";
import { SlideOutPanel } from "@/components/shared/slide-out-panel";
import { MarkdownPreview } from "@/components/shared/markdown-preview";
import { MarkdownEditor } from "@/components/shared/markdown-editor";
import { useClientId, appendClientId } from "@/hooks/use-client-id";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { FileContent } from "@/types/file";

interface BrandDetailPanelProps {
  path: string | null;
  onClose: () => void;
  onFileDeleted?: () => void;
}

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
  return `${days}d ago`;
}

export function BrandDetailPanel({ path, onClose, onFileDeleted }: BrandDetailPanelProps) {
  const clientId = useClientId();
  const [file, setFile] = useState<FileContent | null>(null);
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFile = useCallback(async (filePath: string) => {
    setLoading(true);
    setError(null);
    setConflict(false);
    setMode("preview");
    try {
      const res = await fetch(appendClientId(`/api/files/${encodeURIComponent(filePath)}`, clientId));
      if (!res.ok) throw new Error("Failed to load file");
      const data: FileContent = await res.json();
      setFile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load file");
      setFile(null);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (path) {
      fetchFile(path);
    } else {
      setFile(null);
      setMode("preview");
    }
  }, [path, fetchFile]);

  const handleSave = async (content: string) => {
    if (!file || !path) return;
    setIsSaving(true);
    setConflict(false);
    try {
      const res = await fetch(appendClientId(`/api/files/${encodeURIComponent(path)}`, clientId), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, lastModified: file.lastModified }),
      });
      if (res.status === 409) {
        setConflict(true);
        return;
      }
      if (!res.ok) throw new Error("Save failed");
      const updated: FileContent = await res.json();
      setFile(updated);
      setMode("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!path) return;
    setIsDeleting(true);
    try {
      const res = await fetch(appendClientId(`/api/files/${encodeURIComponent(path)}`, clientId), {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      setFile(null);
      setShowDeleteConfirm(false);
      onClose();
      onFileDeleted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setIsDeleting(false);
    }
  };

  const fileName = path ? path.split("/").pop() || path : "";
  const title = toTitleCase(fileName);

  return (
    <SlideOutPanel isOpen={!!path} onClose={onClose} title={title}>
      {loading && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-[300px] max-w-full" />
          <Skeleton className="h-4 w-[180px] max-w-full" />
          <Skeleton className="h-4 w-[260px] max-w-full" />
        </div>
      )}

      {error && (
        <div className="rounded-md border border-border bg-muted p-4">
          <p className="m-0 text-sm font-medium text-destructive">{error}</p>
          <Button
            variant="link"
            onClick={() => path && fetchFile(path)}
            className="mt-2 h-auto p-0 text-[13px]"
          >
            Retry
          </Button>
        </div>
      )}

      {!loading && !error && file && (
        <>
          {/* File path + mode toggle */}
          <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
            <div>
              <p className="m-0 text-xs text-muted-foreground">{path}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                last modified: {formatRelativeTime(file.lastModified)}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMode(mode === "preview" ? "edit" : "preview")}
              >
                {mode === "preview" ? (
                  <>
                    <Pencil className="size-4" /> Edit
                  </>
                ) : (
                  <>
                    <Eye className="size-4" /> Preview
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" /> Delete
              </Button>
            </div>
          </div>

          {/* Delete confirmation */}
          {showDeleteConfirm && (
            <div className="mb-4 flex items-center justify-between rounded-md border border-border bg-muted p-3">
              <p className="m-0 text-[13px] text-destructive">
                Delete {fileName}? This cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>
          )}

          {/* Conflict warning */}
          {conflict && (
            <div className="mb-4 flex items-center justify-between rounded-md border border-border bg-card p-3">
              <p className="m-0 text-[13px] text-muted-foreground">
                This file was modified by another process. Reload?
              </p>
              <Button
                variant="link"
                size="sm"
                onClick={() => path && fetchFile(path)}
                className="h-auto p-0 text-[13px] font-semibold"
              >
                Reload
              </Button>
            </div>
          )}

          {/* Content */}
          {mode === "preview" ? (
            <MarkdownPreview content={file.content} />
          ) : (
            <MarkdownEditor
              content={file.content}
              onSave={handleSave}
              onCancel={() => setMode("preview")}
              isSaving={isSaving}
            />
          )}
        </>
      )}
    </SlideOutPanel>
  );
}
