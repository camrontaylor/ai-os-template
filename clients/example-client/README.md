# Example Client (blank template)

This is a blank example client. It shows the structure every client folder uses in the multi-client setup. Nothing here holds real data. Every file is a template with section headers and empty values for you to fill in.

## What to do with this folder

You have three options:

- **Copy it.** Duplicate this folder, rename it to your client's slug (lowercase, hyphens instead of spaces), and fill in the blanks.
- **Generate a fresh one.** From the root of the workspace, run `bash scripts/add-client.sh "Client Name"`. That builds a brand new client folder with the same structure, already named for you.
- **Delete it.** If you only run a single brand at the root and never need multiple clients, you can remove this folder.

## What lives in a client folder

- `AGENTS.md` and `CLAUDE.md` hold instructions specific to this client. They layer on top of the root files; they do not replace them.
- `brand_context/` holds this client's brand memory: voice, positioning, ideal customer, writing samples, and assets. These are blank templates here, ready to fill in.
- `context/` holds this client's memory, reference notes, and working files.
- `projects/` holds this client's deliverables.
- `cron/jobs/` holds this client's scheduled jobs.

## A note on the brand_context files

The `brand_context/` files here are blank templates. They have all the right section headers but no real content. Fill them in your own words, or let the brand skills build them for you (for example, the brand voice skill writes `voice-profile.md` and `samples.md`).
