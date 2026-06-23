"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Folder, FolderOpen } from "lucide-react";
import type { FileNode } from "@/types/file";
import { getFileIcon, getFileIconColor } from "@/lib/file-icons";
import { useClientId, appendClientId } from "@/hooks/use-client-id";
import { Skeleton } from "@/components/ui/skeleton";

interface ScopedFileTreeProps {
  /** Directory (relative to the AI-OS root) that should act as the tree root. */
  rootDir: string;
  /** Currently selected file path (relative). */
  selectedPath: string | null;
  /** Called when the user clicks a file leaf. */
  onSelectFile: (relativePath: string) => void;
  /** Override the active workspace for task-scoped previews. */
  clientId?: string | null;
}

/**
 * Read-only file tree rooted at a specific directory. Auto-expands the
 * chain of directories leading to `selectedPath` on mount, so the
 * currently-open file is always visible inside its context.
 */
export function ScopedFileTree({
  rootDir,
  selectedPath,
  onSelectFile,
  clientId: clientIdOverride,
}: ScopedFileTreeProps) {
  const selectedClientId = useClientId();
  const clientId = clientIdOverride ?? selectedClientId;
  const [rootNodes, setRootNodes] = useState<FileNode[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [childrenMap, setChildrenMap] = useState<Record<string, FileNode[]>>({});
  const [loading, setLoading] = useState(true);

  const ancestorDirs = useMemo(() => {
    if (!selectedPath || !selectedPath.startsWith(rootDir)) return [];
    const rel = selectedPath.slice(rootDir.length).replace(/^\//, "");
    const parts = rel.split("/").slice(0, -1);
    const out: string[] = [];
    let cur = rootDir;
    for (const p of parts) {
      cur = `${cur}/${p}`;
      out.push(cur);
    }
    return out;
  }, [rootDir, selectedPath]);

  const fetchDir = useCallback(
    async (dir: string): Promise<FileNode[]> => {
      try {
        const res = await fetch(
          appendClientId(`/api/files?dir=${encodeURIComponent(dir)}`, clientId)
        );
        if (!res.ok) return [];
        return (await res.json()) as FileNode[];
      } catch {
        return [];
      }
    },
    [clientId]
  );

  // Initial load: root + all ancestors of the selected file
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const root = await fetchDir(rootDir);
      if (cancelled) return;
      setRootNodes(root);
      const toExpand = new Set<string>();
      const newChildren: Record<string, FileNode[]> = {};
      for (const dir of ancestorDirs) {
        toExpand.add(dir);
        newChildren[dir] = await fetchDir(dir);
      }
      if (cancelled) return;
      setExpandedDirs(toExpand);
      setChildrenMap(newChildren);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ancestorDirs, fetchDir, rootDir]);

  const toggleDir = useCallback(
    async (dirPath: string) => {
      setExpandedDirs((prev) => {
        const next = new Set(prev);
        if (next.has(dirPath)) {
          next.delete(dirPath);
          return next;
        }
        next.add(dirPath);
        return next;
      });
      if (!childrenMap[dirPath]) {
        const kids = await fetchDir(dirPath);
        setChildrenMap((prev) => ({ ...prev, [dirPath]: kids }));
      }
    },
    [childrenMap, fetchDir]
  );

  const renderNode = (node: FileNode, depth: number) => {
    const isDir = node.type === "directory";
    const isExpanded = expandedDirs.has(node.path);
    const isSelected = node.path === selectedPath;
    const children = childrenMap[node.path] || node.children || [];
    const Icon = isDir ? (isExpanded ? FolderOpen : Folder) : getFileIcon(node.name);
    const iconColor = isDir ? "var(--primary)" : getFileIconColor(node.name);

    return (
      <div key={node.path}>
        <button
          onClick={() => (isDir ? toggleDir(node.path) : onSelectFile(node.path))}
          title={node.name}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            padding: "4px 8px",
            paddingLeft: 8 + depth * 16,
            border: "none",
            background: isSelected ? "var(--muted)" : "transparent",
            color: isSelected ? "var(--foreground)" : "var(--foreground)",
            fontFamily: "var(--font-inter), Inter, sans-serif",
            fontSize: 12,
            cursor: "pointer",
            borderRadius: 4,
            textAlign: "left",
            transition: "background 120ms ease",
          }}
          onMouseEnter={(e) => {
            if (!isSelected) e.currentTarget.style.background = "var(--muted)";
          }}
          onMouseLeave={(e) => {
            if (!isSelected) e.currentTarget.style.background = "transparent";
          }}
        >
          <Icon size={14} style={{ color: iconColor, flexShrink: 0 }} />
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
            }}
          >
            {node.name}
          </span>
        </button>
        {isDir && isExpanded && children.length > 0 && (
          <div>{children.map((c) => renderNode(c, depth + 1))}</div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-3"
            style={{ width: `${50 + Math.random() * 40}%` }}
          />
        ))}
      </div>
    );
  }

  return (
    <div style={{ padding: "8px 4px", overflowY: "auto", flex: 1, minHeight: 0 }}>
      <div
        style={{
          padding: "4px 8px 8px",
          fontFamily: "var(--font-inter), Inter, sans-serif",
          fontSize: 10,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--muted-foreground)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={rootDir}
      >
        {rootDir}
      </div>
      {rootNodes.map((n) => renderNode(n, 0))}
    </div>
  );
}
