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

function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const isSubAgent = message.role === "sub_agent";

  return (
    <div className="flex items-start gap-2">
      {/* Avatar for non-user messages */}
      {!isUser && (
        <div
          className={cn(
            "mt-px flex size-[24px] shrink-0 items-center justify-center rounded-full",
            isSubAgent ? "bg-muted" : "bg-muted/60",
          )}
        >
          <Bot size={11} className="text-foreground" />
        </div>
      )}

      <div className={cn("min-w-0 flex-1", isUser && "ml-[32px]")}>
        {/* Name + timestamp */}
        <div className="mb-1 flex items-center gap-2">
          <span className="text-[11px] font-semibold text-muted-foreground">
            {isUser ? "You" : isSubAgent ? "Sub-agent" : "Agent"}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {formatTime(message.createdAt)}
          </span>
        </div>

        {/* Content */}
        <div className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-foreground">
          {message.content}
        </div>
        <ChatMessageAttachmentList attachments={message.metadata?.attachments ?? []} />
      </div>
    </div>
  );
}

export function ChatPanel() {
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
    <div className="sticky top-[52px] flex h-[calc(100vh-52px)] w-full shrink-0 flex-col border-t border-border bg-card md:w-90 md:border-t-0 md:border-l">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
        <div className="flex size-5 items-center justify-center rounded-full bg-muted/60">
          <Bot size={11} className="text-foreground" />
        </div>
        <span className="text-[13px] font-semibold text-foreground">
          Agent Chat
        </span>
        {isProcessing && (
          <div className="ml-auto flex items-center gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="size-1 rounded-full bg-foreground/40"
                style={{ animation: `pulse-dot 1.4s ease-in-out ${i * 0.16}s infinite` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-3"
      >
        {messages.length === 0 && !isProcessing && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-10">
            <p className="text-center text-xs leading-relaxed text-muted-foreground">
              Tell me what you need - tasks appear in the feed as they&apos;re created.
            </p>
          </div>
        )}

        {messages.map((msg) => {
          if (msg.role === "sub_agent" && msg.metadata?.questionText) {
            return <BubbledQuestion key={msg.id} message={msg} onReply={handleReply} />;
          }
          return <ChatMessage key={msg.id} message={msg} />;
        })}
      </div>

      {/* Input */}
      <ChatInput
        scopeId={conversation?.id}
        onSend={handleSend}
        disabled={isProcessing || isConversationLoading}
        placeholder="Type a message..."
      />
    </div>
  );
}
