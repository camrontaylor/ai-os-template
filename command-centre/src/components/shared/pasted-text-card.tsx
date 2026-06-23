"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import {
  buildPastedTextLabel,
  buildPastedTextPreview,
} from "@/lib/pasted-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PastedTextCardProps {
  text: string;
  onInsert: () => void;
  onRemove: () => void;
}

function PastedTextPreviewModal({
  open,
  label,
  text,
  onClose,
}: {
  open: boolean;
  label: string;
  text: string;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "color-mix(in srgb, var(--card) 82%, transparent)",
        backdropFilter: "blur(10px)",
        zIndex: 320,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pasted text preview"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(760px, 92vw)",
          maxHeight: "84vh",
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
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--foreground)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                fontFamily: "var(--font-inter), Inter, sans-serif",
              }}
            >
              Pasted text
            </div>
            <div
              style={{
                marginTop: 8,
                fontSize: 12,
                color: "var(--muted-foreground)",
                lineHeight: 1.45,
                fontFamily: "var(--font-inter), Inter, sans-serif",
              }}
            >
              {label}
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
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: "20px 24px 24px",
          }}
        >
          <div
            style={{
              fontSize: 13,
              lineHeight: 1.55,
              color: "var(--foreground)",
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
              wordBreak: "break-word",
              fontFamily: "ui-monospace, SFMono-Regular, monospace",
            }}
          >
            {text}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PastedTextCard({
  text,
  onInsert,
  onRemove,
}: PastedTextCardProps) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const preview = useMemo(
    () => buildPastedTextPreview(text, { maxLines: 5, maxChars: 170 }),
    [text],
  );
  const label = useMemo(() => buildPastedTextLabel(text), [text]);
  const showActions = hovered || focused;

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setShowPreview(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setShowPreview(true);
          }
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="flex cursor-pointer flex-col gap-2 rounded-lg border border-border bg-card outline-none transition-colors hover:border-foreground/20 hover:bg-muted/40"
        style={{
          flex: "0 1 164px",
          maxWidth: 164,
          minWidth: 0,
          minHeight: 128,
          padding: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <Badge variant="secondary" className="px-2 py-0 text-[10px] font-semibold tracking-wide">
            PASTED
          </Badge>
          <button
            type="button"
            aria-label="Remove pasted text"
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
            className="inline-flex size-[24px] shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X size={13} />
          </button>
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            padding: "4px 4px 0",
            fontSize: 12,
            lineHeight: 1.35,
            color: "var(--muted-foreground)",
            whiteSpace: "pre-wrap",
            overflow: "hidden",
            overflowWrap: "anywhere",
            wordBreak: "break-word",
          }}
        >
          {preview}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span className="overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-muted-foreground">
            {label}
          </span>
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              display: "flex",
              alignItems: "center",
              minHeight: 30,
            }}
          >
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onInsert}
              className={cn(
                "h-7 rounded-full px-3 text-[11px] transition-opacity",
                showActions ? "opacity-100" : "pointer-events-none opacity-0",
              )}
            >
              Insert into input
            </Button>
          </div>
        </div>
      </div>
      <PastedTextPreviewModal
        open={showPreview}
        label={label}
        text={text}
        onClose={() => setShowPreview(false)}
      />
    </>
  );
}
