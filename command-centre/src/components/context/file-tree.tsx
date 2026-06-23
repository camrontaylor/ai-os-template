"use client";

import { useState, useEffect, useCallback } from "react";
import { FileText, Folder, FolderOpen } from "lucide-react";
import type { FileNode } from "@/types/file";
import { useClientId, appendClientId } from "@/hooks/use-client-id";
import { getFileIcon, getFileIconColor } from "@/lib/file-icons";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface FileTreeProps {
  onSelectFile: (path: string) => void;
  selectedPath: string | null;
}

export function FileTree({ onSelectFile, selectedPath }: FileTreeProps) {
  const clientId = useClientId();
  const [rootNodes, setRootNodes] = useState<FileNode[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [childrenMap, setChildrenMap] = useState<Record<string, FileNode[]>>({});
  const [memoryLimit, setMemoryLimit] = useState(30);
  const [memoryTotal, setMemoryTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(appendClientId("/api/files?dir=context", clientId))
      .then((r) => r.json())
      .then((nodes: FileNode[]) => {
        setRootNodes(nodes);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [clientId]);

  const toggleDir = useCallback(
    (dirPath: string) => {
      setExpandedDirs((prev) => {
        const next = new Set(prev);
        if (next.has(dirPath)) {
          next.delete(dirPath);
        } else {
          next.add(dirPath);
          // Fetch children if not already loaded
          if (!childrenMap[dirPath]) {
            const isMemory = dirPath === "context/memory" || dirPath.endsWith("/memory");
            const url = appendClientId(`/api/files?dir=${encodeURIComponent(dirPath)}${isMemory ? "&limit=30" : ""}`, clientId);
            fetch(url)
              .then((r) => r.json())
              .then((children: FileNode[]) => {
                setChildrenMap((prev) => ({ ...prev, [dirPath]: children }));
                if (isMemory) {
                  setMemoryTotal(children.length >= 30 ? 999 : children.length);
                }
              });
          }
        }
        return next;
      });
    },
    [childrenMap, clientId]
  );

  const loadMoreMemory = useCallback(
    (dirPath: string) => {
      const newLimit = memoryLimit + 30;
      fetch(appendClientId(`/api/files?dir=${encodeURIComponent(dirPath)}&limit=${newLimit}`, clientId))
        .then((r) => r.json())
        .then((children: FileNode[]) => {
          setChildrenMap((prev) => ({ ...prev, [dirPath]: children }));
          setMemoryLimit(newLimit);
          if (children.length < newLimit) setMemoryTotal(children.length);
        });
    },
    [memoryLimit, clientId]
  );

  const renderNode = (node: FileNode, depth: number = 0) => {
    const isDir = node.type === "directory";
    const isExpanded = expandedDirs.has(node.path);
    const isSelected = node.path === selectedPath;
    const isMemoryDir = node.name === "memory";
    const children = childrenMap[node.path] || node.children || [];

    return (
      <div key={node.path}>
        <button
          onClick={() => (isDir ? toggleDir(node.path) : onSelectFile(node.path))}
          style={{ paddingLeft: 12 + depth * 16 }}
          className={cn(
            "flex w-full items-center gap-2 rounded py-2 pr-3 text-left text-sm text-foreground transition-colors",
            isSelected ? "bg-muted" : "hover:bg-muted",
          )}
        >
          {isDir ? (
            isExpanded ? (
              <FolderOpen size={16} className="shrink-0 text-primary" />
            ) : (
              <Folder size={16} className="shrink-0 text-muted-foreground" />
            )
          ) : (
            (() => {
              const Icon = getFileIcon(node.name);
              return <Icon size={16} style={{ color: getFileIconColor(node.name) }} className="shrink-0" />;
            })()
          )}
          <span className="flex-1 truncate">{node.name}</span>
        </button>

        {isDir && isExpanded && (
          <div>
            {children.map((child) => renderNode(child, depth + 1))}
            {isMemoryDir && children.length >= memoryLimit && (
              <button
                onClick={() => loadMoreMemory(node.path)}
                style={{ paddingLeft: 12 + (depth + 1) * 16 }}
                className="block w-full py-2 pr-3 text-left text-xs font-medium text-primary"
              >
                Load more...
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-2 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-4" style={{ width: `${60 + Math.random() * 40}%` }} />
        ))}
      </div>
    );
  }

  if (rootNodes.length === 0) {
    return (
      <div className="p-4 text-center sm:p-6">
        <FileText size={32} className="mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No context files found</p>
      </div>
    );
  }

  return (
    <div className="py-2">
      {rootNodes.map((node) => renderNode(node, 0))}
    </div>
  );
}
