# Sharing AI-OS With Your Team

The short version: AI-OS keeps two things apart on purpose.

- The **system** is shared - the rules, skills, scripts, docs, and the app. It lives in git.
- The **brain** is private - your memory, your client work, your brand info, your API keys. Git ignores all of it automatically, so it never leaves your machine.

So sharing is mostly already done. You only ever hand someone the system, never the brain. Each teammate gets their own private brain the moment they run setup.

## One time: make the shared copy

From your AI-OS folder, run:

    bash scripts/make-team-copy.sh

This builds a clean copy at `../AI-OS-team-starter` with all personal data stripped out (your `clients/`, your `projects/`, your memory, your profile, your private rules, your keys). It has fresh git history, so nothing personal hides in old commits either.

Then push it to a private repo your team can access:

    cd ../AI-OS-team-starter
    git remote add origin <your-private-repo-url>
    git push -u origin main

Invite your teammates to that repo.

## For each teammate: 3 steps

1. Clone it: `git clone <your-private-repo-url> && cd AI-OS-team-starter`
2. Run setup: `bash scripts/centre.sh`
3. Paste their own API keys when asked, then let Claude run `/onboarding` to build their own brand voice and memory.

That is the whole setup. They now have their own assistant, their own private brain, sharing your skills and rules.

## Updates

When you improve a skill or a rule:

- You: commit and push to the shared repo.
- Them: `git pull`.

Their memory, keys, and client work are never touched, because git ignores all of it. No merge surprises in the common case.

## What this does NOT do

Everyone gets their **own** brain. The team does not share one memory and does not see each other's sessions. That is on purpose - memory is kept private and per person.

To share knowledge across the team, share it through the committed system (skills, docs) or by putting work in a shared client folder and committing that, never through the live memory files.

## Keeping the shared copy fresh later

`make-team-copy.sh` builds a fresh starter each time. To re-cut it after you have improved the system, push your new commits to the shared repo and teammates pull - you do not need to re-run the script. Re-run it only if you want a brand new clean starter (for a new team, say); point it at a new empty folder: `bash scripts/make-team-copy.sh ../some-new-folder`.
