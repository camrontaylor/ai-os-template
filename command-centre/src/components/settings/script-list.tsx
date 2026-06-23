"use client";

import { useCallback, useEffect, useState } from "react";
import { Play, Check, XCircle, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { ScriptConfirmModal } from "@/components/settings/script-confirm-modal";
import { ScriptRunner } from "@/components/settings/script-runner";
import type { ScriptDefinition } from "@/lib/script-registry";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ScriptList() {
  const [scripts, setScripts] = useState<ScriptDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedScript, setExpandedScript] = useState<string | null>(null);
  const [argValues, setArgValues] = useState<Record<string, string>>({});
  const [runningScript, setRunningScript] = useState<{
    executionId: string;
    id: string;
    label: string;
    args: Record<string, string>;
  } | null>(null);
  const [confirmScript, setConfirmScript] = useState<ScriptDefinition | null>(null);
  const [lastResult, setLastResult] = useState<Record<string, "success" | "error">>({});

  useEffect(() => {
    fetch("/api/settings/scripts")
      .then((r) => r.json())
      .then((data) => {
        setScripts(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleRunClick = useCallback(
    (script: ScriptDefinition) => {
      // If script has args and isn't expanded yet, expand the form
      if (script.args.length > 0 && expandedScript !== script.id) {
        setExpandedScript(script.id);
        setArgValues({});
        return;
      }

      // Collect args
      const args: Record<string, string> = {};
      for (const arg of script.args) {
        args[arg.name] = argValues[arg.name] || "";
      }

      // If destructive, show confirmation
      if (script.destructive) {
        setConfirmScript(script);
        return;
      }

      // Start execution
      startExecution(script, args);
    },
    [expandedScript, argValues],
  );

  const handleExecuteFromForm = useCallback(
    (script: ScriptDefinition) => {
      const args: Record<string, string> = {};
      for (const arg of script.args) {
        args[arg.name] = argValues[arg.name] || "";
      }

      if (script.destructive) {
        setConfirmScript(script);
        return;
      }

      startExecution(script, args);
    },
    [argValues],
  );

  const startExecution = useCallback((script: ScriptDefinition, args: Record<string, string>) => {
    setRunningScript({
      executionId: crypto.randomUUID(),
      id: script.id,
      label: script.label,
      args,
    });
    setExpandedScript(null);
    setConfirmScript(null);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!confirmScript) return;
    const args: Record<string, string> = {};
    for (const arg of confirmScript.args) {
      args[arg.name] = argValues[arg.name] || "";
    }
    startExecution(confirmScript, args);
  }, [confirmScript, argValues, startExecution]);

  const handleComplete = useCallback(
    (success: boolean) => {
      if (runningScript) {
        setLastResult((prev) => ({
          ...prev,
          [runningScript.id]: success ? "success" : "error",
        }));
      }
    },
    [runningScript],
  );

  const handleRunnerClose = useCallback(() => {
    setRunningScript(null);
  }, []);

  if (loading) {
    return (
      <div className="p-4 text-sm text-muted-foreground sm:p-6">
        Loading scripts...
      </div>
    );
  }

  const allArgsValid = (script: ScriptDefinition) =>
    script.args.every((arg) => !arg.required || (argValues[arg.name] || "").trim() !== "");

  return (
    <div>
      {/* Header */}
      <div className="border-b border-border px-4 py-4 sm:px-6">
        <div className="text-base font-semibold text-foreground">System Scripts</div>
        <div className="mt-1 text-[13px] text-muted-foreground">
          Run maintenance and setup scripts for your AI-OS installation
        </div>
      </div>

      {/* Script cards */}
      {scripts.map((script) => (
        <div
          key={script.id}
          className="flex flex-col border-b border-border px-4 py-4 sm:px-6"
        >
          {/* Top row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-foreground">
                {script.label}
              </div>
              <div className="mt-1 text-[13px] text-muted-foreground">
                {script.description}
              </div>
              {script.helpUrl && (
                <a
                  href={script.helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-foreground hover:underline"
                >
                  <ExternalLink size={12} />
                  Watch video guide
                </a>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {script.destructive && (
                <Badge variant="outline" className="px-2 py-0 text-[10px] text-destructive">
                  Destructive
                </Badge>
              )}
              {script.longRunning && (
                <Badge variant="secondary" className="px-2 py-0 text-[10px]">
                  Long-running
                </Badge>
              )}
              {lastResult[script.id] === "success" && (
                <Check size={16} className="text-muted-foreground" />
              )}
              {lastResult[script.id] === "error" && (
                <XCircle size={16} className="text-destructive" />
              )}
              <Button
                size="sm"
                onClick={() => handleRunClick(script)}
                disabled={runningScript !== null}
              >
                {script.args.length > 0 && expandedScript !== script.id ? (
                  <ChevronDown size={16} />
                ) : script.args.length > 0 && expandedScript === script.id ? (
                  <ChevronUp size={16} />
                ) : (
                  <Play size={16} />
                )}
                Run
              </Button>
            </div>
          </div>

          {/* Arg form */}
          {expandedScript === script.id && script.args.length > 0 && (
            <Card className="mt-3 gap-3 rounded-lg border p-4 shadow-none">
              {script.args.map((arg) => (
                <div key={arg.name} className="flex flex-col gap-2">
                  <Label className="text-xs text-muted-foreground">
                    {arg.label}
                    {arg.required && (
                      <span className="text-destructive">*</span>
                    )}
                  </Label>
                  <Input
                    type="text"
                    value={argValues[arg.name] || ""}
                    onChange={(e) =>
                      setArgValues((prev) => ({ ...prev, [arg.name]: e.target.value }))
                    }
                    placeholder={arg.placeholder || ""}
                  />
                </div>
              ))}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setExpandedScript(null);
                    setArgValues({});
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleExecuteFromForm(script)}
                  disabled={!allArgsValid(script) || runningScript !== null}
                >
                  Execute
                </Button>
              </div>
            </Card>
          )}
        </div>
      ))}

      {/* Script runner */}
      {runningScript && (
        <ScriptRunner
          key={runningScript.executionId}
          executionId={runningScript.executionId}
          scriptId={runningScript.id}
          scriptLabel={runningScript.label}
          args={runningScript.args}
          onClose={handleRunnerClose}
          onComplete={handleComplete}
        />
      )}

      {/* Confirm modal */}
      {confirmScript && (
        <ScriptConfirmModal
          scriptLabel={confirmScript.label}
          scriptDescription={confirmScript.description}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmScript(null)}
        />
      )}
    </div>
  );
}
