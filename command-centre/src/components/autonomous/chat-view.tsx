"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useChatStore } from "@/store/chat-store";
import { useClientStore } from "@/store/client-store";
import { ChatInput } from "./chat-input";
import { BubbledQuestion } from "./bubbled-question";
import { ChatMessageAttachmentList } from "@/components/shared/chat-attachment-strip";
import { Bot } from "lucide-react";
import type { Message } from "@/types/chat";
import type { ClaudeModel, ClaudeThinkingEffort, PermissionMode } from "@/types/task";
import type { ChatAttachment } from "@/types/chat-composer";
import { cn } from "@/lib/utils";

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const isSubAgent = message.role === "sub_agent";

  return (
    <div
      className={cn(
        "flex max-w-[85%] flex-col gap-1",
        isUser ? "items-end self-end" : "items-start self-start",
      )}
    >
      {/* Avatar + name */}
      {!isUser && (
        <div className="flex items-center gap-2 pl-1">
          <div
            className={cn(
              "flex size-5 items-center justify-center rounded-full",
              isSubAgent ? "bg-muted" : "bg-muted/60",
            )}
          >
            <Bot size={11} className="text-foreground" />
          </div>
          <span className="text-[10px] font-semibold text-muted-foreground">
            {isSubAgent ? "Sub-agent" : "Agent"}
          </span>
        </div>
      )}

      {/* Message content */}
      <div
        className={cn(
          "whitespace-pre-wrap break-words px-4 py-3 text-[13px] leading-relaxed",
          isUser
            ? "rounded-[12px_12px_4px_12px] bg-primary text-primary-foreground"
            : "rounded-[12px_12px_12px_4px] bg-muted text-foreground",
        )}
      >
        {message.content}
        <ChatMessageAttachmentList attachments={message.metadata?.attachments ?? []} isUser={isUser} />
      </div>

      {/* Timestamp */}
      <span
        className={cn(
          "text-[10px] text-muted-foreground",
          isUser ? "pr-1" : "pl-1",
        )}
      >
        {formatTime(message.createdAt)}
      </span>
    </div>
  );
}

export function ChatView() {
  const conversation = useChatStore((s) => s.conversation);
  const messages = useChatStore((s) => s.messages);
  const isProcessing = useChatStore((s) => s.isProcessing);
  const loadOrCreateConversation = useChatStore((s) => s.loadOrCreateConversation);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const replyToQuestion = useChatStore((s) => s.replyToQuestion);
  const selectedClientId = useClientStore((s) => s.selectedClientId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isConversationLoading, setIsConversationLoading] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    setIsConversationLoading(true);

    void loadOrCreateConversation(selectedClientId ?? null)
      .catch((error) => {
        console.error("Failed to load chat conversation:", error);
      })
      .finally(() => {
        if (!isCancelled) {
          setIsConversationLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [loadOrCreateConversation, selectedClientId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const handleSend = useCallback((content: string, options: { permissionMode: PermissionMode; model: ClaudeModel | null; thinkingEffort: ClaudeThinkingEffort | null; attachments: ChatAttachment[] }) => {
    sendMessage(content, options);
  }, [sendMessage]);

  const handleReply = useCallback((messageId: string, content: string, attachments: ChatAttachment[] = []) => {
    replyToQuestion(messageId, content, attachments);
  }, [replyToQuestion]);

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-card">
      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 sm:px-6"
      >
        {messages.length === 0 && !isProcessing && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-10">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted/60">
              <Bot size={24} className="text-foreground" />
            </div>
            <p className="text-[15px] font-semibold text-foreground">
              Autonomous Mode
            </p>
            <p className="max-w-90 text-center text-[13px] leading-relaxed text-muted-foreground">
              Tell me what you need - I&apos;ll scope it, create tasks, and manage execution. You can track progress in the sidebar.
            </p>
          </div>
        )}

        {messages.map((msg) => {
          // Check if this message is a bubbled question
          const isBubbledQuestion = msg.role === "sub_agent" && msg.metadata?.questionText;

          if (isBubbledQuestion) {
            return <BubbledQuestion key={msg.id} message={msg} onReply={handleReply} />;
          }

          return <MessageBubble key={msg.id} message={msg} />;
        })}

        {/* Processing indicator */}
        {isProcessing && (
          <div className="flex items-center gap-2 self-start rounded-[12px_12px_12px_4px] bg-muted px-4 py-2">
            <div className="flex items-center gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="size-2 rounded-full bg-foreground/40"
                  style={{ animation: `pulse-dot 1.4s ease-in-out ${i * 0.16}s infinite` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput
        scopeId={conversation?.id}
        onSend={handleSend}
        disabled={isProcessing || isConversationLoading}
        placeholder="Tell me what you need..."
      />
    </div>
  );
}
