"use client";

import { useCallback, useEffect, useState, KeyboardEvent } from "react";
import { Paperclip, Send } from "lucide-react";
import { PermissionPicker } from "@/components/shared/permission-picker";
import { ModelPicker } from "@/components/shared/model-picker";
import { ThinkingEffortPicker } from "@/components/shared/thinking-effort-picker";
import { ComposerAssetTray } from "@/components/shared/composer-asset-tray";
import { ComposerDraftAssetCollection } from "@/components/shared/composer-draft-asset-collection";
import { useChatComposer } from "@/hooks/use-chat-composer";
import { useComposerResize } from "@/hooks/use-composer-resize";
import type { PermissionMode, ClaudeModel, ClaudeThinkingEffort } from "@/types/task";
import type { ChatAttachment } from "@/types/chat-composer";
import { insertTextareaNewline, shouldInsertModifierNewline, shouldSubmitOnPlainEnter, syncComposerTextareaHeight } from "@/lib/composer";
import { getChatAttachmentExtension } from "@/lib/chat-attachment-policy";
import { normalizeClaudeThinkingEffortForModel } from "@/lib/claude-options";
import { loadClaudeLlmPreference, saveClaudeLlmPreference } from "@/lib/llm-preferences";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  scopeId?: string | null;
  onSend: (
    message: string,
    options: {
      permissionMode: PermissionMode;
      model: ClaudeModel | null;
      thinkingEffort: ClaudeThinkingEffort | null;
      attachments: ChatAttachment[];
    },
  ) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ scopeId, onSend, disabled, placeholder }: ChatInputProps) {
  const [permissionMode, setPermissionMode] = useState<PermissionMode>("bypassPermissions");
  const [model, setModel] = useState<ClaudeModel | null>(() => loadClaudeLlmPreference().model);
  const [thinkingEffort, setThinkingEffort] = useState<ClaudeThinkingEffort | null>(() => loadClaudeLlmPreference().reasoningEffort);
  const composer = useChatComposer({
    surface: "conversation",
    scopeId,
  });
  const minHeight = 60;
  const maxHeight = 320;
  const { composerHeight, hasUserResized, handleResizePointerDown } = useComposerResize({
    minHeight,
    maxHeight,
    initialHeight: minHeight,
  });
  const hasAssets = composer.attachments.length > 0 || composer.uploads.length > 0 || composer.pastedBlocks.length > 0;
  const canSend =
    !disabled &&
    (
      composer.message.trim().length > 0 ||
      composer.attachments.length > 0 ||
      composer.pastedBlocks.length > 0
    );

  useEffect(() => {
    syncComposerTextareaHeight(composer.textareaRef.current, {
      minHeight,
      maxHeight,
      targetHeight: hasUserResized ? composerHeight : null,
    });
  }, [composer.message, composer.textareaRef, composerHeight, hasUserResized, maxHeight, minHeight]);

  useEffect(() => {
    const preference = loadClaudeLlmPreference();
    setModel(preference.model);
    setThinkingEffort(preference.reasoningEffort);
  }, []);

  const handleSend = useCallback(() => {
    const submission = composer.buildSubmission();
    if ((!submission.message && submission.attachments.length === 0) || disabled) return;

    onSend(submission.message, {
      permissionMode,
      model,
      thinkingEffort,
      attachments: submission.attachments,
    });
    composer.clearComposer();
  }, [composer, disabled, model, onSend, permissionMode, thinkingEffort]);

  const handleModelChange = useCallback((nextModel: ClaudeModel | null) => {
    const nextThinkingEffort =
      normalizeClaudeThinkingEffortForModel(nextModel, thinkingEffort ?? "auto") ?? "auto";
    setModel(nextModel);
    setThinkingEffort(nextThinkingEffort);
    saveClaudeLlmPreference({
      model: nextModel,
      reasoningEffort: nextThinkingEffort,
    });
  }, [thinkingEffort]);

  const handleThinkingEffortChange = useCallback((nextThinkingEffort: ClaudeThinkingEffort) => {
    const normalizedThinkingEffort =
      normalizeClaudeThinkingEffortForModel(model, nextThinkingEffort) ?? "auto";
    setThinkingEffort(normalizedThinkingEffort);
    saveClaudeLlmPreference({
      model: model ?? undefined,
      reasoningEffort: normalizedThinkingEffort,
    });
  }, [model]);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (shouldInsertModifierNewline(event)) {
      event.preventDefault();
      insertTextareaNewline(event.currentTarget, composer.setMessage);
      return;
    }
    if (shouldSubmitOnPlainEnter(event)) {
      event.preventDefault();
      handleSend();
    }
  }, [composer.setMessage, handleSend]);

  return (
    <div
      onDragEnter={composer.handleDragEnter}
      onDragOver={composer.handleDragOver}
      onDragLeave={composer.handleDragLeave}
      onDrop={composer.handleDrop}
      className="border-t border-border bg-card px-4 py-3"
    >
      <div
        className={cn(
          "rounded-xl border bg-muted transition-[border-color,box-shadow]",
          composer.isDragging
            ? "border-foreground/40 shadow-[0_0_0_3px_color-mix(in_srgb,var(--foreground)_8%,transparent)]"
            : "border-border",
        )}
      >
        <div className="flex justify-center px-3 pt-2">
          <button
            type="button"
            aria-label="Drag to resize input"
            onPointerDown={handleResizePointerDown}
            className="h-2 w-11 cursor-ns-resize rounded-full bg-foreground/25"
          />
        </div>

        {hasAssets ? (
          <ComposerAssetTray>
            <ComposerDraftAssetCollection
              pastedBlocks={composer.pastedBlocks}
              attachmentItems={[
                ...composer.attachments.map((attachment) => ({
                  id: attachment.id,
                  fileName: attachment.fileName,
                  extension: attachment.extension,
                  sizeBytes: attachment.sizeBytes,
                  contentType: attachment.contentType ?? null,
                  previewPath: attachment.relativePath,
                  previewSurface: attachment.surface,
                  previewScopeId: attachment.scopeId,
                  status: "ready" as const,
                })),
                ...composer.uploads.map((upload) => ({
                  id: upload.id,
                  fileName: upload.fileName,
                  extension: getChatAttachmentExtension(upload.fileName),
                  status: upload.status,
                  error: upload.error,
                })),
              ]}
              padding="0"
              onInsertPastedBlock={composer.insertPastedTextBlock}
              onRemovePastedBlock={composer.removePastedTextBlock}
              onRemoveAttachmentItem={(itemId) => {
                const attachment = composer.attachments.find((candidate) => candidate.id === itemId);
                if (attachment) {
                  void composer.removeAttachment(attachment);
                  return;
                }
                composer.removeUpload(itemId);
              }}
              onRetryAttachmentItem={(itemId) => { void composer.retryUpload(itemId); }}
            />
          </ComposerAssetTray>
        ) : null}

        <div className="flex min-w-0 items-end gap-2 px-3 py-2">
          <textarea
            ref={composer.textareaRef}
            value={composer.message}
            onChange={(event) => composer.setMessage(event.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={composer.handlePaste}
            placeholder={placeholder || "Type a message..."}
            disabled={disabled}
            rows={1}
            className="box-border max-w-full flex-1 resize-none break-words bg-transparent py-1 text-sm leading-5 text-foreground outline-none [overflow-wrap:anywhere] [white-space:pre-wrap]"
            style={{
              minHeight,
              maxHeight: hasUserResized ? composerHeight : maxHeight,
              overflowX: "hidden",
              overflowY: "auto",
            }}
          />
          <Button
            type="button"
            size="icon"
            onClick={handleSend}
            disabled={!canSend}
            className="size-8 shrink-0"
          >
            <Send size={16} />
          </Button>
        </div>

        <input
          ref={composer.fileInputRef}
          type="file"
          multiple
          onChange={composer.handleFileInputChange}
          style={{ display: "none" }}
          accept={composer.accept}
        />

        <div className="flex flex-wrap items-center gap-1 border-t border-border px-2 pb-2 pt-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={composer.openFilePicker}
            disabled={composer.isUploading || !scopeId}
            className="size-7 text-muted-foreground"
            title={scopeId ? "Attach files" : "Chat is still loading"}
          >
            <Paperclip size={14} />
          </Button>
          {composer.hasDraft && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { void composer.discardDraft(); }}
              className="h-7 px-2 text-[11px] text-muted-foreground"
            >
              Discard draft
            </Button>
          )}
          <ModelPicker value={model} onChange={handleModelChange} />
          <ThinkingEffortPicker value={thinkingEffort} model={model} onChange={handleThinkingEffortChange} />
          <PermissionPicker value={permissionMode} onChange={setPermissionMode} />
        </div>
      </div>
    </div>
  );
}
