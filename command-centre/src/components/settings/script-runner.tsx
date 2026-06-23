"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { createScriptRunnerSession, type ScriptRunnerSession } from "@/lib/script-runner-session";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ScriptRunnerProps {
  executionId: string;
  scriptId: string;
  scriptLabel: string;
  args: Record<string, string>;
  onClose: () => void;
  onComplete: (success: boolean) => void;
}

interface OutputLine {
  type: "stdout" | "stderr";
  data: string;
}

export function ScriptRunner({
  executionId,
  scriptId,
  scriptLabel,
  args,
  onClose,
  onComplete,
}: ScriptRunnerProps) {
  const [lines, setLines] = useState<OutputLine[]>([]);
  const [status, setStatus] = useState<"running" | "success" | "error">("running");
  const [exitCode, setExitCode] = useState<number | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<ScriptRunnerSession | null>(null);
  const onCompleteRef = useRef(onComplete);

  if (!sessionRef.current) {
    sessionRef.current = createScriptRunnerSession();
  }

  onCompleteRef.current = onComplete;

  useEffect(() => {
    const session = sessionRef.current!;
    const shouldStart = session.begin();

    const completeOnce = (success: boolean, code: number) => {
      if (!session.complete()) return;
      if (session.isDisposed()) return;
      setStatus(success ? "success" : "error");
      setExitCode(code);
      onCompleteRef.current(success);
    };

    if (!shouldStart) {
      return () => {
        session.dispose();
      };
    }

    async function run() {
      const appendLine = (type: "stdout" | "stderr", data: string) => {
        if (session.isDisposed()) return;
        setLines((prev) => [...prev, { type, data }]);
      };

      try {
        const response = await fetch("/api/settings/scripts/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scriptId, args }),
        });

        if (!response.ok) {
          const text = await response.text();
          appendLine("stderr", `Error: ${response.status} - ${text}`);
          completeOnce(false, 1);
          return;
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n");
          buffer = parts.pop() || "";

          for (const part of parts) {
            if (!part.trim()) continue;
            try {
              const parsed = JSON.parse(part);
              if (parsed.type === "stdout" || parsed.type === "stderr") {
                appendLine(parsed.type, parsed.data || "");
              } else if (parsed.type === "exit") {
                const success = parsed.code === 0;
                completeOnce(success, parsed.code ?? 1);
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
        }

        // Process any remaining buffer
        if (buffer.trim()) {
          try {
            const parsed = JSON.parse(buffer);
            if (parsed.type === "exit") {
              const success = parsed.code === 0;
              completeOnce(success, parsed.code ?? 1);
            }
          } catch {
            // Ignore
          }
        }
      } catch (err: unknown) {
        appendLine("stderr", `Connection error: ${err instanceof Error ? err.message : "Unknown error"}`);
        completeOnce(false, 1);
      }
    }

    run();

    return () => {
      session.dispose();
    };
  }, [args, executionId, scriptId]);

  useEffect(() => {
    outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight });
  }, [lines]);

  return (
    <div className="mx-4 mb-4 overflow-hidden rounded-lg bg-foreground sm:mx-6 sm:mb-6">
      {/* Header bar */}
      <div className="flex items-center justify-between bg-white/5 px-4 py-3">
        <span className="text-[13px] font-medium text-background/80">
          {scriptLabel}
        </span>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              "size-2 rounded-full",
              status === "error" ? "bg-destructive" : "bg-background/50",
              status === "running" && "[animation:pulse-dot_1.5s_ease-in-out_infinite]",
            )}
          />
          <span
            className={cn(
              "text-xs",
              status === "error" ? "text-destructive" : "text-background/60",
            )}
          >
            {status === "running" ? "Running..." : status === "success" ? "Completed" : "Failed"}
          </span>
        </div>

        {status !== "running" && (
          <Button
            variant="ghost"
            size="icon"
            className="size-6 text-background/60 hover:bg-white/10 hover:text-background"
            onClick={onClose}
          >
            <X size={16} />
          </Button>
        )}
        {status === "running" && <div className="w-6" />}
      </div>

      {/* Output area */}
      <div
        ref={outputRef}
        className="max-h-[400px] overflow-y-auto p-4 font-mono text-xs leading-relaxed"
      >
        {lines.map((line, i) => (
          <pre
            key={i}
            className={cn(
              "m-0 whitespace-pre-wrap break-all",
              line.type === "stderr" ? "text-red-400" : "text-background/80",
            )}
          >
            {line.data}
          </pre>
        ))}
        {lines.length === 0 && status === "running" && (
          <span className="text-xs text-background/50">Waiting for output...</span>
        )}
      </div>

      {/* Exit code footer */}
      {status !== "running" && exitCode !== null && (
        <div
          className={cn(
            "border-t border-white/10 px-4 py-2 text-xs",
            exitCode === 0 ? "text-background/60" : "text-red-400",
          )}
        >
          Exited with code {exitCode}
        </div>
      )}
    </div>
  );
}
