import {
  spawn,
  spawnSync,
  type ChildProcess,
  type SpawnOptions,
} from "child_process";

const isWindows = process.platform === "win32";

function withQuietWindowsOptions(options: SpawnOptions = {}): SpawnOptions {
  if (!isWindows) {
    return options;
  }

  return {
    ...options,
    windowsHide: true,
  };
}

export function spawnUiProcess(
  command: string,
  args: readonly string[],
  options: SpawnOptions = {},
): ChildProcess {
  return spawn(command, [...args], withQuietWindowsOptions(options));
}

export function spawnManagedTaskProcess(
  command: string,
  args: readonly string[],
  options: SpawnOptions = {},
): ChildProcess {
  const quietOptions = withQuietWindowsOptions(options);

  if (isWindows) {
    const { detached: _ignored, ...rest } = quietOptions;
    return spawn(command, [...args], rest);
  }

  return spawn(command, [...args], {
    ...quietOptions,
    detached: options.detached ?? true,
  });
}

export function killChildProcessTree(
  proc: ChildProcess,
  signal: NodeJS.Signals = "SIGTERM",
): void {
  if (!proc.pid) {
    return;
  }

  if (isWindows) {
    const taskkillArgs = ["/PID", String(proc.pid), "/T"];
    if (signal === "SIGKILL") {
      taskkillArgs.push("/F");
    }

    const result = spawnSync("taskkill", taskkillArgs, {
      stdio: "ignore",
      windowsHide: true,
    });

    if (!result.error && result.status === 0) {
      return;
    }
  }

  try {
    process.kill(-proc.pid, signal);
  } catch {
    try {
      proc.kill(signal);
    } catch {
      // Process already exited.
    }
  }
}
