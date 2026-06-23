const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const { loadTsModule } = require("./test-utils/load-ts-module.cjs");

const modulePath = path.resolve(__dirname, "goal-drafts.ts");
const drafts = loadTsModule(modulePath, {
  stubs: {
    "@/types/goal-draft": {},
    "@/types/chat-composer": {},
  },
});

function createStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    },
    dump() {
      return Object.fromEntries(map.entries());
    },
  };
}

function createDraft(id, updatedAt, overrides = {}) {
  return {
    version: 1,
    id,
    clientId: null,
    title: "",
    message: "",
    attachments: [],
    level: "task",
    permissionMode: "bypassPermissions",
    model: null,
    tag: null,
    pastedBlocks: [],
    createdAt: "2026-04-20T10:00:00.000Z",
    updatedAt,
    ...overrides,
  };
}

test("goal draft storage saves, loads, and sorts newest first", () => {
  const storage = createStorage();

  drafts.saveGoalDraft(createDraft("draft-1", "2026-04-20T11:00:00.000Z"), storage);
  drafts.saveGoalDraft(createDraft("draft-2", "2026-04-20T12:00:00.000Z"), storage);

  assert.deepEqual(
    drafts.loadGoalDrafts(storage).map((draft) => draft.id),
    ["draft-2", "draft-1"],
  );
});

test("goal draft storage removes invalid payloads and supports discard", () => {
  const storage = createStorage({
    "cc.goal-drafts:v1": JSON.stringify([
      createDraft("draft-1", "2026-04-20T11:00:00.000Z"),
      { nope: true },
    ]),
  });

  assert.deepEqual(
    drafts.loadGoalDrafts(storage).map((draft) => draft.id),
    ["draft-1"],
  );
  drafts.removeGoalDraft("draft-1", storage);
  assert.deepEqual(storage.dump(), {});
});

test("goal draft snapshot stays stable when only updatedAt changes", () => {
  const baseDraft = createDraft("draft-1", "2026-04-20T11:00:00.000Z", {
    message: "Body text",
  });
  const echoedDraft = {
    ...baseDraft,
    updatedAt: "2026-04-20T11:05:00.000Z",
  };

  assert.equal(
    drafts.buildGoalDraftSnapshot(baseDraft),
    drafts.buildGoalDraftSnapshot(echoedDraft),
  );
});

test("goal draft snapshot changes when the body changes", () => {
  const baseDraft = createDraft("draft-1", "2026-04-20T11:00:00.000Z", {
    message: "First body",
  });
  const editedDraft = {
    ...baseDraft,
    message: "Second body",
    updatedAt: "2026-04-20T11:05:00.000Z",
  };

  assert.notEqual(
    drafts.buildGoalDraftSnapshot(baseDraft),
    drafts.buildGoalDraftSnapshot(editedDraft),
  );
});

test("goal draft content ignores workspace and settings-only changes", () => {
  assert.equal(
    drafts.hasGoalDraftContent({
      title: "  ",
      message: "  ",
      attachments: [],
      pastedBlocks: [],
    }),
    false,
  );

  assert.equal(
    drafts.hasGoalDraftContent({
      title: "Goal title",
      message: "  ",
      attachments: [],
      pastedBlocks: [],
    }),
    true,
  );

  assert.equal(
    drafts.hasGoalDraftContent({
      title: "  ",
      message: "Goal body",
      attachments: [],
      pastedBlocks: [],
    }),
    true,
  );

  assert.equal(
    drafts.hasGoalDraftContent({
      title: "  ",
      message: "  ",
      attachments: [{ fileName: "notes.md" }],
      pastedBlocks: [],
    }),
    true,
  );

  assert.equal(
    drafts.hasGoalDraftContent({
      title: "  ",
      message: "  ",
      attachments: [],
      pastedBlocks: [{ id: "p-1", text: "pasted content" }],
    }),
    true,
  );
});
