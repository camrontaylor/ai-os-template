"use client";

import { useState, useEffect, useCallback } from "react";
import { FileText, Folder, FolderOpen, Cpu } from "lucide-react";
import type { FileNode } from "@/types/file";
import { useClientId, appendClientId } from "@/hooks/use-client-id";
import { asFileNodes, fetchFileNodes } from "@/lib/file-node-response";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SkillsFileTreeProps {
  onSelectFile: (path: string) => void;
  selectedPath: string | null;
}

export function SkillsFileTree({ onSelectFile, selectedPath }: SkillsFileTreeProps) {
  const clientId = useClientId();
  const [skillFolders, setSkillFolders] = useState<FileNode[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [childrenMap, setChildrenMap] = useState<Record<string, FileNode[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const nodes = await fetchFileNodes(
          appendClientId(`/api/files?dir=${encodeURIComponent(".claude/skills")}`, clientId)
        );
        if (mounted) {
          // Filter out _catalog and non-directories, sort alphabetically
          const folders = nodes
            .filter((n) => n.type === "directory" && n.name !== "_catalog")
            .sort((a, b) => a.name.localeCompare(b.name));
          setSkillFolders(folders);
          setLoading(false);
        }
      } catch {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [clientId]);

  const toggleDir = useCallback(
    (dirPath: string) => {
      setExpandedDirs((prev) => {
        const next = new Set(prev);
        if (next.has(dirPath)) {
          next.delete(dirPath);
        } else {
          next.add(dirPath);
          if (!childrenMap[dirPath]) {
            fetch(appendClientId(`/api/files?dir=${encodeURIComponent(dirPath)}`, clientId))
              .then(async (r) => {
                if (!r.ok) return [];
                const payload: unknown = await r.json();
                return asFileNodes(payload);
              })
              .then((children) => {
                setChildrenMap((prev) => ({ ...prev, [dirPath]: children }));
              })
              .catch(() => {
                setChildrenMap((prev) => ({ ...prev, [dirPath]: [] }));
              });
          }
        }
        return next;
      });
    },
    [childrenMap, clientId]
  );

  const renderNode = (node: FileNode, depth: number = 0) => {
    const isDir = node.type === "directory";
    const isExpanded = expandedDirs.has(node.path);
    const isSelected = node.path === selectedPath;
    const children = childrenMap[node.path] || node.children || [];

    return (
      <div key={node.path}>
        <button
          onClick={() => (isDir ? toggleDir(node.path) : onSelectFile(node.path))}
          style={{ paddingLeft: 12 + depth * 16 }}
          className={cn(
            "flex w-full items-center gap-2 rounded py-2 pr-3 text-left text-[13px] text-foreground transition-colors",
            isSelected ? "bg-muted" : "hover:bg-muted"
          )}
        >
          {isDir ? (
            isExpanded ? (
              <FolderOpen className="size-4 shrink-0 text-primary" />
            ) : (
              <Folder className="size-4 shrink-0 text-muted-foreground" />
            )
          ) : (
            <FileText className="size-4 shrink-0 text-muted-foreground" />
          )}
          <span className="flex-1 truncate">{node.name}</span>
        </button>

        {isDir && isExpanded && (
          <div>
            {children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-2 p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-4"
            style={{ width: `${60 + Math.random() * 40}%` }}
          />
        ))}
      </div>
    );
  }

  if (skillFolders.length === 0) {
    return (
      <div className="p-6 text-center">
        <Cpu className="mx-auto mb-2 size-8 text-muted-foreground" />
        <p className="text-[13px] text-muted-foreground">No skills installed</p>
      </div>
    );
  }

  // Group folders by category prefix
  const grouped: Record<string, FileNode[]> = {};
  for (const folder of skillFolders) {
    const category = folder.name.split("-")[0];
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(folder);
  }
  const sortedGroups = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="py-2">
      <div className="px-3 pb-3 pt-2 text-[11px] text-muted-foreground">
        {skillFolders.length} skills
      </div>
      {sortedGroups.map(([category, folders]) => (
        <div key={category} className="mb-1">
          <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {category}
          </div>
          {folders.map((folder) => {
            const isExpanded = expandedDirs.has(folder.path);
            const children = childrenMap[folder.path] || [];
            // Check if any child file is selected
            const hasSelectedChild = selectedPath?.startsWith(folder.path + "/") || false;

            return (
              <div key={folder.path}>
                <button
                  onClick={() => toggleDir(folder.path)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded px-3 py-2 text-left text-[13px] font-medium text-foreground transition-colors hover:bg-muted",
                    hasSelectedChild && !isExpanded && "bg-muted"
                  )}
                >
                  {isExpanded ? (
                    <FolderOpen className="size-4 shrink-0 text-primary" />
                  ) : (
                    <Folder className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="flex-1 truncate">{folder.name}</span>
                </button>

                {isExpanded && (
                  <div>
                    {children.map((child) => renderNode(child, 1))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
