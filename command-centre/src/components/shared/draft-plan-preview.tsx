"use client";

import type { CSSProperties } from "react";
import { Maximize2, X } from "lucide-react";
import { MarkdownPreview } from "@/components/shared/markdown-preview";
import { Button } from "@/components/ui/button";

const FRONTMATTER_BLOCK = /^---\s*\r?\n[\s\S]*?\r?\n---\s*\r?\n*/;

const SHELL_STYLE: CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 10,
  backgroundColor: "var(--card)",
  overflow: "hidden",
};

const HEADER_LABEL_STYLE: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "var(--foreground)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  fontFamily: "var(--font-inter), Inter, sans-serif",
};

function Header({
  title,
  subtitle,
  onExpand,
}: {
  title: string;
  subtitle: string;
  onExpand?: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
        padding: "12px 16px 12px",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={HEADER_LABEL_STYLE}>{title}</div>
        <div
          style={{
            marginTop: 4,
            fontSize: 13,
            color: "var(--muted-foreground)",
            lineHeight: 1.45,
            fontFamily: "var(--font-inter), Inter, sans-serif",
          }}
        >
          {subtitle}
        </div>
      </div>
      {onExpand && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onExpand}
          className="shrink-0 gap-2"
        >
          <Maximize2 size={13} />
          Expand
        </Button>
      )}
    </div>
  );
}

function getCompactPreviewContent(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return content;

  const withoutFrontmatter = trimmed.replace(FRONTMATTER_BLOCK, "").trim();
  return withoutFrontmatter || trimmed;
}

export function DraftPlanPreviewCard({
  content,
  onExpand,
  compact = false,
}: {
  content: string;
  onExpand?: () => void;
  compact?: boolean;
}) {
  const previewContent = compact ? getCompactPreviewContent(content) : content;

  return (
    <div style={SHELL_STYLE}>
      <Header
        title="Draft preview - not saved yet"
        subtitle="This is the generated plan preview. It becomes the real brief only after approval."
        onExpand={onExpand}
      />
      <div
        style={{
          maxHeight: compact ? 260 : 280,
          overflowY: compact ? "hidden" : "auto",
          padding: "12px 16px 16px",
          position: "relative",
        }}
      >
        <MarkdownPreview content={previewContent} />
        {compact && (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: 36,
              background: "linear-gradient(180deg, color-mix(in srgb, var(--foreground) 0%, transparent) 0%, var(--card) 100%)",
              pointerEvents: "none",
            }}
          />
        )}
      </div>
    </div>
  );
}

export function DraftPlanPreviewPanel({
  content,
  onExpand,
}: {
  content: string;
  onExpand?: () => void;
}) {
  return (
    <div style={{ ...SHELL_STYLE, display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <Header
        title="Draft preview - not saved yet"
        subtitle="You are previewing the generated plan before approval. The saved brief appears here after approval."
        onExpand={onExpand}
      />
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px 16px 20px" }}>
        <MarkdownPreview content={content} />
      </div>
    </div>
  );
}

export function DraftPlanPreviewModal({
  content,
  onClose,
}: {
  content: string;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "color-mix(in srgb, var(--card) 84%, transparent)",
        backdropFilter: "blur(12px)",
        zIndex: 70,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(960px, 92vw)",
          maxHeight: "85vh",
          backgroundColor: "var(--card)",
          borderRadius: 14,
          boxShadow: "0 20px 60px color-mix(in srgb, var(--foreground) 12%, transparent)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            padding: "16px 20px 16px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div>
            <div style={HEADER_LABEL_STYLE}>Draft preview - not saved yet</div>
            <div
              style={{
                marginTop: 8,
                fontSize: 14,
                color: "var(--muted-foreground)",
                lineHeight: 1.5,
                fontFamily: "var(--font-inter), Inter, sans-serif",
              }}
            >
              Review the generated plan in full. Approving the plan writes it to <code>brief.md</code>.
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="shrink-0 text-muted-foreground"
          >
            <X size={18} />
          </Button>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 24px 28px" }}>
          <MarkdownPreview content={content} />
        </div>
      </div>
    </div>
  );
}
