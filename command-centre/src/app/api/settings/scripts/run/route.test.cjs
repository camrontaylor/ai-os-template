const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const path = require("node:path");
const test = require("node:test");

const { loadTsModule } = require("../../../../../lib/test-utils/load-ts-module.cjs");

function createProcessHarness() {
  const processes = [];

  return {
    processes,
    spawnUiProcess() {
      const proc = new EventEmitter();
      proc.stdout = new EventEmitter();
      proc.stderr = new EventEmitter();
      proc.stdin = {
        end() {},
      };
      processes.push(proc);
      return proc;
    },
  };
}

function createNextServerStub() {
  return {
    NextRequest: class {},
    NextResponse: {
      json(body, init = {}) {
        return {
          status: init.status ?? 200,
          body,
          async json() {
            return body;
          },
        };
      },
    },
  };
}

function createRequest(body) {
  return {
    async json() {
      return body;
    },
  };
}

test("settings script route rejects concurrent runs but clears after process close", async () => {
  const harness = createProcessHarness();
  const modulePath = path.resolve(__dirname, "route.ts");
  const route = loadTsModule(modulePath, {
    stubs: {
      "next/server": createNextServerStub(),
      "fs": {
        existsSync() {
          return true;
        },
      },
      "@/lib/config": {
        getConfig() {
          return { agenticOsDir: "/ai-os" };
        },
      },
      "@/lib/script-registry": {
        getScriptById(scriptId) {
          if (scriptId !== "add-client") return undefined;
          return {
            id: "add-client",
            file: "add-client.sh",
            args: [{ name: "clientName", label: "Client Name", required: true }],
          };
        },
      },
      "@/lib/subprocess": {
        spawnUiProcess: harness.spawnUiProcess,
      },
    },
  });

  const firstResponse = await route.POST(createRequest({
    scriptId: "add-client",
    args: { clientName: "Acme" },
  }));
  assert.equal(firstResponse.status, 200);

  const concurrentResponse = await route.POST(createRequest({
    scriptId: "add-client",
    args: { clientName: "Beta" },
  }));
  assert.equal(concurrentResponse.status, 409);
  assert.deepEqual(await concurrentResponse.json(), { error: "Script already running" });

  harness.processes[0].emit("close", 0);
  if (firstResponse.body) {
    await firstResponse.body.cancel().catch(() => {});
  }

  const secondResponse = await route.POST(createRequest({
    scriptId: "add-client",
    args: { clientName: "Beta" },
  }));
  assert.equal(secondResponse.status, 200);
});

test("settings script route finalizes safely when error and close both fire", async () => {
  const harness = createProcessHarness();
  const modulePath = path.resolve(__dirname, "route.ts");
  const route = loadTsModule(modulePath, {
    stubs: {
      "next/server": createNextServerStub(),
      "fs": {
        existsSync() {
          return true;
        },
      },
      "@/lib/config": {
        getConfig() {
          return { agenticOsDir: "/ai-os" };
        },
      },
      "@/lib/script-registry": {
        getScriptById(scriptId) {
          if (scriptId !== "add-client") return undefined;
          return {
            id: "add-client",
            file: "add-client.sh",
            args: [{ name: "clientName", label: "Client Name", required: true }],
          };
        },
      },
      "@/lib/subprocess": {
        spawnUiProcess: harness.spawnUiProcess,
      },
    },
  });

  const response = await route.POST(createRequest({
    scriptId: "add-client",
    args: { clientName: "Gamma" },
  }));
  assert.equal(response.status, 200);

  harness.processes[0].emit("error", new Error("boom"));
  harness.processes[0].emit("close", 0);
  if (response.body) {
    await response.body.cancel().catch(() => {});
  }

  const nextResponse = await route.POST(createRequest({
    scriptId: "add-client",
    args: { clientName: "Delta" },
  }));
  assert.equal(nextResponse.status, 200);
});
