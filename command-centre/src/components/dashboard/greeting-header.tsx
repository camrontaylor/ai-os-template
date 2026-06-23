"use client";

import { useEffect, useState } from "react";

interface GreetingHeaderProps {
  userName: string | null;
}

export function GreetingHeader({ userName }: GreetingHeaderProps) {
  // Compute greeting + date only after mount so the server-rendered HTML
  // (which doesn't know the user's local time) matches the first client
  // paint. Prevents hydration mismatches.
  const [state, setState] = useState<{ greeting: string; dateStr: string } | null>(null);

  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();
    const greeting =
      hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    const dateStr = now.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    setState({ greeting, dateStr });
  }, []);

  const greeting = state?.greeting ?? "Hello";
  const dateStr = state?.dateStr ?? "";

  return (
    <div className="mb-8">
      <h1 className="m-0 text-2xl font-semibold tracking-tight text-foreground">
        <span suppressHydrationWarning>{greeting}{userName ? `, ${userName}` : ""}.</span>
      </h1>
      <p
        className="mt-2 min-h-[1.2em] text-sm text-muted-foreground"
        suppressHydrationWarning
      >
        {dateStr ? `Here's your snapshot for ${dateStr}.` : "\u00a0"}
      </p>
    </div>
  );
}
