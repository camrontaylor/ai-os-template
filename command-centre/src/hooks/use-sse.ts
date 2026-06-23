"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useTaskStore } from "@/store/task-store";
import { useClientStore } from "@/store/client-store";
import { useChatStore } from "@/store/chat-store";

export function useSSE() {
  const [isConnected, setIsConnected] = useState(false);
  const retryDelay = useRef(3000);
  const eventSourceRef = useRef<EventSource | null>(null);
  const applySSEEvent = useTaskStore((s) => s.applySSEEvent);
  const applyChatSSE = useChatStore((s) => s.applyChatSSE);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource("/api/events");
    eventSourceRef.current = es;

    es.addEventListener("connected", () => {
      setIsConnected(true);
      retryDelay.current = 3000; // Reset on successful connect
    });

    const taskEvents = [
      "task:created",
      "task:updated",
      "task:deleted",
      "task:status",
      "task:progress",
      "task:output",
      "task:question",
      "task:log",
    ];

    for (const eventType of taskEvents) {
      es.addEventListener(eventType, (e: MessageEvent) => {
        try {
          const event = JSON.parse(e.data);
          const activeClientSlugs = useClientStore.getState().activeClientSlugs;
          if (activeClientSlugs !== null) {
            const eventClientSlug = event.task?.clientId ?? "_root";
            if (!activeClientSlugs.includes(eventClientSlug)) return;
          }
          applySSEEvent(event);
        } catch {
          // Ignore malformed events
        }
      });
    }

    // Chat events for autonomous mode
    const chatEvents = ["chat:message", "chat:decision"];
    for (const eventType of chatEvents) {
      es.addEventListener(eventType, (e: MessageEvent) => {
        try {
          const event = JSON.parse(e.data);
          applyChatSSE(event);
        } catch {
          // Ignore malformed events
        }
      });
    }

    es.onerror = () => {
      setIsConnected(false);
      es.close();
      eventSourceRef.current = null;

      // Reconnect with exponential backoff
      const delay = retryDelay.current;
      retryDelay.current = Math.min(delay * 2, 30000);
      setTimeout(connect, delay);
    };
  }, [applySSEEvent, applyChatSSE]);

  useEffect(() => {
    connect();
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [connect]);

  return { isConnected };
}
