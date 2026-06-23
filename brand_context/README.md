# brand_context/

This is the AI-OS root. The root is the operating system itself: shared skills,
methodology, scripts, your USER profile, and memory. It intentionally holds no
single brand's voice or positioning.

## Where brand data lives

- If you run **one brand**, onboarding (`/start-here`) writes your brand files
  straight into this folder: `voice-profile.md`, `positioning.md`, `icp.md`,
  `samples.md`, `assets.md`.
- If you run **multiple brands or clients**, each one gets its own workspace under
  `clients/`. Create one with `bash scripts/add-client.sh "Client Name"`. Each
  client folder gets its own `brand_context/`, memory, and projects, while sharing
  the same skills and scripts at the root.

The skills load only the brand files they need (see the Context Matrix in
`AGENTS.md`). Missing files never block work; the skills produce solid generic
output and tell you what would sharpen it.

This file keeps the root treated as already set up rather than a first run for the
root itself. Do not delete it.
