"use client";

import { useState, useCallback, useEffect } from "react";
import { SkillsFileTree } from "@/components/skills/skills-file-tree";
import { SkillsSummary } from "@/components/skills/skills-summary";
import { SkillsLibrary } from "@/components/skills/skills-library";
import { SkillUploadModal } from "@/components/skills/skill-upload-modal";
import { ContentViewer } from "@/components/context/content-viewer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

/**
 * The skills workspace: Installed (with file browser) and Library (the
 * candidate pipeline) tabs, plus a file-view for drilling into a skill's
 * files. Used by both the /skills route and the home page Skills tab so the
 * two stay in sync.
 */
export function SkillsWorkspace({ minHeight = "calc(100vh - 200px)" }: { minHeight?: string }) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [tab, setTab] = useState("installed");
  const [refreshKey, setRefreshKey] = useState(0);
  const [showUpload, setShowUpload] = useState(false);
  const [counts, setCounts] = useState<{ installed: number | null; library: number | null }>({
    installed: null,
    library: null,
  });

  useEffect(() => {
    fetch("/api/skills")
      .then((r) => r.json())
      .then((d) => setCounts((c) => ({ ...c, installed: Array.isArray(d) ? d.length : 0 })))
      .catch(() => {});
    fetch("/api/skills/library")
      .then((r) => r.json())
      .then((d) => setCounts((c) => ({ ...c, library: Array.isArray(d?.candidates) ? d.candidates.length : 0 })))
      .catch(() => {});
  }, [refreshKey]);

  const handleFileDeleted = useCallback(() => {
    setSelectedPath(null);
    setRefreshKey((k) => k + 1);
  }, []);

  const handleAddSkill = useCallback(() => setShowUpload(true), []);

  const handleUploadComplete = useCallback(() => {
    setShowUpload(false);
    setRefreshKey((k) => k + 1);
  }, []);

  if (selectedPath) {
    return (
      <>
        <div
          className="flex flex-col overflow-hidden rounded-lg border border-border md:flex-row"
          style={{ minHeight }}
        >
          <div className="max-h-56 w-full shrink-0 overflow-y-auto border-b border-border bg-muted md:max-h-none md:w-[280px] md:border-b-0 md:border-r">
            <SkillsFileTree key={refreshKey} onSelectFile={setSelectedPath} selectedPath={selectedPath} />
          </div>
          <div className="min-h-[400px] flex-1 bg-card">
            <button
              onClick={() => setSelectedPath(null)}
              className="flex w-full items-center gap-2 border-b border-border px-4 py-3 text-[13px] font-medium text-foreground transition-colors hover:bg-muted/50"
            >
              &larr; All skills
            </button>
            <ContentViewer selectedPath={selectedPath} onFileDeleted={handleFileDeleted} />
          </div>
        </div>
        {showUpload && (
          <SkillUploadModal onClose={() => setShowUpload(false)} onComplete={handleUploadComplete} />
        )}
      </>
    );
  }

  return (
    <>
      <Tabs value={tab} onValueChange={setTab} className="gap-4">
        <TabsList>
          <TabsTrigger value="installed">
            Installed{counts.installed != null ? ` · ${counts.installed}` : ""}
          </TabsTrigger>
          <TabsTrigger value="library">
            Library{counts.library != null ? ` · ${counts.library}` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="installed">
          <div
            className="flex flex-col overflow-hidden rounded-lg border border-border md:flex-row"
            style={{ minHeight }}
          >
            <div className="max-h-56 w-full shrink-0 overflow-y-auto border-b border-border bg-muted md:max-h-none md:w-[280px] md:border-b-0 md:border-r">
              <SkillsFileTree key={refreshKey} onSelectFile={setSelectedPath} selectedPath={selectedPath} />
            </div>
            <div className="min-h-[400px] flex-1 bg-card">
              <SkillsSummary onSelectSkill={setSelectedPath} onAddSkill={handleAddSkill} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="library">
          <div className="overflow-hidden rounded-lg border border-border bg-card" style={{ minHeight }}>
            <SkillsLibrary />
          </div>
        </TabsContent>
      </Tabs>

      {showUpload && (
        <SkillUploadModal onClose={() => setShowUpload(false)} onComplete={handleUploadComplete} />
      )}
    </>
  );
}
