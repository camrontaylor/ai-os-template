"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, FileText, Image, FileType, Check } from "lucide-react";
import { CHAT_ATTACHMENT_ACCEPT_ATTR } from "@/lib/chat-attachment-policy";

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg"]);
const PDF_EXTENSIONS = new Set(["pdf"]);

interface UploadedFile {
  fileName: string;
  filePath: string;
  relativePath: string;
  extension: string;
  sizeBytes: number;
}

interface FileUploadProps {
  targetDir?: string;
  onUpload?: (file: UploadedFile) => void;
  compact?: boolean;
}

function getFileIcon(ext: string) {
  if (IMAGE_EXTENSIONS.has(ext)) return Image;
  if (PDF_EXTENSIONS.has(ext)) return FileType;
  return FileText;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUpload({ targetDir, onUpload, compact }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState<UploadedFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (file: File) => {
    setUploading(true);
    setError(null);
    setUploaded(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (targetDir) {
        formData.append("dir", targetDir);
      }

      const res = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      const result: UploadedFile = await res.json();
      setUploaded(result);
      onUpload?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [targetDir, onUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }, [handleUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    // Reset the input so the same file can be uploaded again
    e.target.value = "";
  }, [handleUpload]);

  if (compact) {
    return (
      <>
        <input
          ref={inputRef}
          type="file"
          onChange={handleFileInput}
          style={{ display: "none" }}
          accept={CHAT_ATTACHMENT_ACCEPT_ATTR}
        />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 rounded-md border border-dashed border-border bg-transparent px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground disabled:opacity-60"
          style={{ cursor: uploading ? "wait" : "pointer" }}
        >
          <Upload size={14} />
          {uploading ? "Uploading..." : "Upload file"}
        </button>
        {error && (
          <span className="text-xs text-destructive">{error}</span>
        )}
      </>
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        onChange={handleFileInput}
        style={{ display: "none" }}
        accept={CHAT_ATTACHMENT_ACCEPT_ATTR}
      />
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? "var(--primary)" : "var(--border)"}`,
          borderRadius: 12,
          padding: "32px 24px",
          textAlign: "center",
          cursor: uploading ? "wait" : "pointer",
          backgroundColor: isDragging ? "var(--muted)" : "transparent",
          transition: "border-color 200ms ease, background-color 200ms ease",
        }}
      >
        {uploading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: "3px solid var(--border)",
                borderTopColor: "var(--primary)",
                animation: "spin 1s linear infinite",
              }}
            />
            <span style={{ fontSize: 14, color: "var(--muted-foreground)", fontFamily: "var(--font-inter), Inter, sans-serif" }}>
              Uploading...
            </span>
          </div>
        ) : uploaded ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <Check size={32} color="var(--muted-foreground)" />
            <span style={{ fontSize: 14, color: "var(--foreground)", fontFamily: "var(--font-inter), Inter, sans-serif", fontWeight: 500 }}>
              {uploaded.fileName}
            </span>
            <span style={{ fontSize: 12, color: "var(--muted-foreground)", fontFamily: "var(--font-inter), Inter, sans-serif" }}>
              {formatBytes(uploaded.sizeBytes)}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setUploaded(null);
              }}
              style={{
                background: "none",
                border: "none",
                color: "var(--primary)",
                fontSize: 12,
                cursor: "pointer",
                textDecoration: "underline",
                fontFamily: "var(--font-inter), Inter, sans-serif",
              }}
            >
              Upload another
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <Upload size={32} color={isDragging ? "var(--primary)" : "var(--border)"} />
            <span
              style={{
                fontSize: 14,
                color: isDragging ? "var(--primary)" : "var(--muted-foreground)",
                fontFamily: "var(--font-inter), Inter, sans-serif",
              }}
            >
              Drop a file here or click to browse
            </span>
            <span
              style={{
                fontSize: 12,
                color: "var(--muted-foreground)",
                fontFamily: "var(--font-inter), Inter, sans-serif",
              }}
            >
              Images, PDFs, and common text or code files (max 10MB)
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-2 flex items-center justify-between rounded-md border border-border bg-card px-3 py-2">
          <span className="text-xs text-destructive">
            {error}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setError(null);
            }}
            className="flex cursor-pointer border-none bg-transparent p-1 text-destructive"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
