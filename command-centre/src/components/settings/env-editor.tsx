"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { parseEnv, serializeEnv, type EnvEntry } from "@/lib/env-parser";
import { EnvRow } from "./env-row";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function EnvEditor() {
  const [entries, setEntries] = useState<EnvEntry[]>([]);
  const [lastModified, setLastModified] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [addingNew, setAddingNew] = useState(false);

  useEffect(() => {
    fetch("/api/settings/env")
      .then((r) => r.json())
      .then((data) => {
        if (data.exists) {
          setEntries(parseEnv(data.content));
          setLastModified(data.lastModified);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load environment file");
        setLoading(false);
      });
  }, []);

  const handleUpdate = (key: string, value: string) => {
    setEntries((prev) =>
      prev.map((e) => (e.key === key && !e.isComment ? { ...e, value } : e))
    );
    setDirty(true);
  };

  const handleDelete = (key: string) => {
    setEntries((prev) => prev.filter((e) => e.isComment || e.key !== key));
    setDirty(true);
  };

  const handleAddNew = (key: string, value: string) => {
    setEntries((prev) => [...prev, { key, value, isComment: false, raw: "" }]);
    setAddingNew(false);
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const content = serializeEnv(entries);
      const res = await fetch("/api/settings/env", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, lastModified }),
      });
      if (res.status === 409) {
        setError("File was modified externally. Reload the page to get latest changes.");
        setSaving(false);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }
      const data = await res.json();
      setLastModified(data.lastModified);
      setDirty(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save environment file");
    } finally {
      setSaving(false);
    }
  };

  const visibleEntries = entries.filter((e) => !e.isComment);

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="my-2 h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-6">
        <span className="text-base font-semibold text-foreground">
          Environment Variables
        </span>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={() => setAddingNew(true)}>
            <Plus size={16} /> Add Variable
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!dirty || saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 text-[13px] text-destructive sm:px-6">{error}</div>
      )}

      {/* Entries */}
      {visibleEntries.length === 0 && !addingNew ? (
        <div className="px-4 py-10 text-center text-sm text-muted-foreground sm:px-6">
          No .env file found. Add variables to create one.
        </div>
      ) : (
        <div>
          {visibleEntries.map((entry) => (
            <EnvRow
              key={entry.key}
              entry={entry}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {addingNew && (
        <EnvRow
          entry={{ key: "", value: "" }}
          isNew
          onUpdate={handleAddNew}
          onDelete={() => {}}
          onCancelNew={() => setAddingNew(false)}
        />
      )}
    </div>
  );
}
