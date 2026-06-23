import type { LogEntry, TaskStatus } from "@/types/task";

export function hasVisibleAssistantResponse(logEntries: LogEntry[]): boolean {
  return logEntries.some(
    (entry) =>
      entry.type === "text" ||
      entry.type === "question" ||
      entry.type === "structured_question",
  );
}

export function shouldShowInitialTaskSpinner({
  status,
  isRunning,
  needsInput,
  hasVisibleResponse,
}: {
  status: TaskStatus | string;
  isRunning: boolean;
  needsInput: boolean;
  hasVisibleResponse: boolean;
}): boolean {
  if (needsInput || hasVisibleResponse) {
    return false;
  }

  return status === "queued" || isRunning;
}
