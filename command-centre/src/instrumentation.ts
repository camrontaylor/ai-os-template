/**
 * Next.js instrumentation hook.
 * Runs once on server startup. Used to initialize the queue watcher
 * which auto-executes tasks when they enter 'queued' status.
 *
 * See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  // Only run on the server (Node.js runtime), not during build or in edge runtime
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initQueueWatcher } = await import("./lib/queue-watcher");
    initQueueWatcher();

    // Start the in-process cron scheduler used while the Command Centre is running.
    const { initCronScheduler } = await import("./lib/cron-scheduler");
    initCronScheduler();

    // Write port file so hooks can discover the command centre
    const fs = await import("fs");
    const path = await import("path");
    const { getConfig } = await import("./lib/config");
    const port = process.env.PORT || "3000";
    const portDir = path.default.join(getConfig().agenticOsDir, ".command-centre");
    fs.default.mkdirSync(portDir, { recursive: true });
    fs.default.writeFileSync(path.default.join(portDir, "port"), port);

    // Clean up file watchers on shutdown
    const { fileWatcher } = await import("./lib/file-watcher");
    const cleanupFileWatchers = () => fileWatcher.cleanupAll();
    process.on("exit", cleanupFileWatchers);
    process.on("SIGTERM", cleanupFileWatchers);
    process.on("SIGINT", cleanupFileWatchers);
  }
}
