# Skills Library - License & Provenance Roll-up

Single source of truth for what each vendored backlog subtree is licensed under and whether it is safe to redistribute. Pairs with `sources.json` (which holds the upstream URLs and pinned SHAs). Added 2026-06-22.

| Subtree | Source | License | Redistribution | License file |
|---------|--------|---------|----------------|--------------|
| `backlog/cybersecurity-skills/` | briiirussell/cybersecurity-skills | **MIT** | Publish-safe (attribution preserved) | `backlog/cybersecurity-skills/LICENSE` |
| `backlog/marketing/` | coreyhaines31/marketingskills | **MIT** | Publish-safe (attribution preserved) | `backlog/marketing/LICENSE` |
| `backlog/thinking-partner/` | mattnowdev/thinking-partner | **MIT** | Publish-safe (attribution preserved) | `backlog/thinking-partner/LICENSE` |

## Notes

- **MIT (cybersecurity, marketing):** the upstream `LICENSE` text + copyright line is now committed alongside each pack, satisfying MIT's attribution condition. Closes the audit blocker from `projects/_threads/skills-library-merge.md`.

## Keeping current

When a new pack is vendored into `backlog/`, add a row here and commit its upstream `LICENSE` if the license requires it (MIT, Apache, BSD do; all-rights-reserved gets a "private only" note instead).
