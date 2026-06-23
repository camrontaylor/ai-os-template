import { EventEmitter } from "events";
import type { Task } from "@/types/task";

export type TaskEventType =
  | "task:created"
  | "task:updated"
  | "task:deleted"
  | "task:status"
  | "task:progress"
  | "task:output"
  | "task:question"
  | "task:log"
  | "chat:message"
  | "chat:decision";

export interface TaskEvent {
  type: TaskEventType;
  task: Task;
  timestamp: string;
  questionText?: string;
  logEntry?: import("@/types/task").LogEntry;
}

// Use globalThis to ensure a single EventEmitter instance across all
// Next.js module instances (route handlers, instrumentation, etc.)
// Without this, dev mode / Turbopack creates separate instances per import.
const globalKey = "__command_centre_event_bus__";
const globalObj = globalThis as Record<string, unknown>;
if (!globalObj[globalKey]) {
  const em = new EventEmitter();
  em.setMaxListeners(100);
  globalObj[globalKey] = em;
}
const emitter = globalObj[globalKey] as EventEmitter;

type TaskEventCallback = (event: TaskEvent) => void;

export function emitTaskEvent(event: TaskEvent): void {
  const count = emitter.listenerCount("task-event");
  console.log(`[event-bus] Emitting ${event.type} for task ${event.task.id.slice(0, 8)} (${count} listeners)`);
  emitter.emit("task-event", event);
}

export function onTaskEvent(callback: TaskEventCallback): void {
  emitter.on("task-event", callback);
}

export function offTaskEvent(callback: TaskEventCallback): void {
  emitter.off("task-event", callback);
}

// --------------- Chat events ---------------

export interface ChatEvent {
  type: "chat:message" | "chat:decision" | "chat:typing";
  conversationId: string;
  message?: import("@/types/chat").Message;
  decision?: import("@/types/chat").AgentDecision;
  timestamp: string;
}

type ChatEventCallback = (event: ChatEvent) => void;

export function emitChatEvent(event: ChatEvent): void {
  const count = emitter.listenerCount("chat-event");
  console.log(`[event-bus] Emitting ${event.type} for conversation ${event.conversationId.slice(0, 8)} (${count} listeners)`);
  emitter.emit("chat-event", event);
}

export function onChatEvent(callback: ChatEventCallback): void {
  emitter.on("chat-event", callback);
}

export function offChatEvent(callback: ChatEventCallback): void {
  emitter.off("chat-event", callback);
}
