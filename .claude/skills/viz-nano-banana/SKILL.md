---
name: viz-nano-banana
description: >
  Generate images, infographics, and visual content via Gemini 3 Pro Image.
  Five visual styles: technical (annotated schematics), notebook (sketchnotes),
  comic (B&W storyboard), color (warm illustrated PaperBanana), mono (sketchy ink).
  Two modes: direct prompt (default) or SVG blueprint for precise layout control.
  Triggers on: "generate an image", "create an infographic", "nano banana",
  "notebook sketch", "comic strip", "hand-drawn diagram", "visual for",
  "make an image of", "illustrated diagram", "sketchnote", "storyboard",
  "generate a visual", "image of", "draw me". Also use when any skill needs
  a visual asset generated - this is the image generation backend.
  Does NOT trigger for Excalidraw diagrams (use viz-excalidraw-diagram),
  charts/graphs, slide decks, or text-only content.
---

# Nano Banana - Image Generation via Gemini

Generate images and infographics using Gemini 3 Pro Image. The skill's value is in prompt construction - combining tested style templates with the user's content to get consistent, high-quality visual output.

## Context Needs

| File | Load level | Purpose |
|------|-----------|---------|
| `context/learnings.md` | `## viz-nano-banana` section | Apply previous feedback |

No brand_context files needed. This skill produces visuals, not branded copy.

## Dependencies

| Skill | Required? | What it provides | Without it |
|-------|-----------|-----------------|------------|
| None | - | `scripts/generate_image.py` is bundled directly | - |

## Step 0: Check API Key

Before generating, verify `GEMINI_API_KEY` is set. If missing, tell the user:
- "Image generation needs a Gemini API key. Get one free at https://ai.google.dev/"
- "Add `GEMINI_API_KEY=your-key` to your `.env` file"
- This skill cannot fall back - image generation requires the API.

## Step 1: Read Learnings

Read `context/learnings.md` → `## viz-nano-banana` for any previous feedback on styles, prompt patterns, or quality issues.

## Step 2: Understand the Request

Figure out what the user wants to visualize. Ask if unclear:
- What concept, workflow, or content to illustrate?
- Any style preference? (If not stated, suggest one based on context)
- Aspect ratio needs? (social post = 1:1, presentation = 16:9, story = 9:16)

## Step 3: Pick a Style

Five styles available. Read `references/styles.md` for full prompt templates.

| Style | Best for | Auto-select when |
|-------|----------|-----------------|
| `technical` | Architecture, workflows, annotated screenshots | User mentions "workflow", "architecture", "annotate", SaaS tools |
| `notebook` | Educational content, summaries, how-tos | User mentions "notes", "summary", "explain", "learn" |
| `comic` | Step-by-step stories, sequences, narratives | User mentions "story", "steps", "before/after", "journey" |
| `color` | Marketing infographics, concept explainers | User mentions "infographic", "visual", "social post", marketing content |
| `mono` | Technical docs, dark-mode, minimalist | User mentions "clean", "minimal", "technical", "B&W" |

Present the style choice to the user if they haven't specified. Show a one-line description of each and let them pick.

## Step 4: Choose Generation Mode

### Mode A: Direct Prompt (default)

Best for most requests. Claude constructs a detailed prompt by combining:
1. The style template from `references/styles.md`
2. The user's content description
3. Composition instructions (what goes where, relative sizing, emphasis)

The prompt should be specific and visual - describe what the viewer sees, not abstract concepts. Include spatial relationships ("top-left", "center", "flowing right to left"), relative sizes, and the visual hierarchy.

### Mode B: SVG Blueprint (complex layouts only)

Use when the user needs precise control over element placement - multi-panel infographics, specific spatial relationships, or content-dense layouts. Read `references/layout-patterns.md` and `references/svg-construction.md`.

1. Build an SVG blueprint with exact positions, sizes, and text
2. Use the SVG as detailed composition instructions in the prompt: describe each element's position, size, color, and relationship to other elements
3. The SVG itself is not sent to Gemini - it's a planning tool for writing a better prompt

## Step 5: Generate

Run the bundled script:

```bash
uv run .claude/skills/viz-nano-banana/scripts/generate_image.py \
  --prompt "FULL CONSTRUCTED PROMPT" \
  --filename "projects/viz-nano-banana/{YYYY-MM-DD}_{descriptive-name}.png" \
  --resolution 1K \
  --aspect-ratio 16:9
```

**Options:**
- `--resolution`: `1K` (default), `2K`, `4K`
- `--aspect-ratio`: `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `3:2`, `2:3`, `4:5`, `5:4`, `21:9`
- `--input-image` / `-i`: For editing existing images (up to 14)

**Do NOT read the generated image back.** Report the saved path only.

## Step 6: Save and Report

**Always save output to disk.** Create the folder if it doesn't exist.

Save to: `projects/viz-nano-banana/{YYYY-MM-DD}_{descriptive-name}.png`

Tell the user the file path so they can view it.

## Step 7: Feedback

Ask: "How does this look? Want to adjust the style, composition, or try a different approach?"

Log feedback to `context/learnings.md` → `## viz-nano-banana` with date and context.

---

## Rules

*Updated when the user flags issues. Read before every run.*

---

## Self-Update

If the user flags an issue - wrong style, bad composition, missed detail - update the `## Rules` section immediately with the correction and today's date.
