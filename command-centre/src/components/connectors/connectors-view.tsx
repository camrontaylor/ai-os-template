"use client";

import { useEffect, useState } from "react";
import { Plug, Server, KeyRound } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface McpServer {
  name: string;
  command: string;
  source: string;
}

interface ApiService {
  key: string;
  service: string;
  usedBy: string;
  configured: boolean;
}

interface ConnectorsData {
  mcpServers: McpServer[];
  services: ApiService[];
  configuredCount: number;
}

export function ConnectorsView() {
  const [data, setData] = useState<ConnectorsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/connectors")
      .then((r) => r.json())
      .then((d: ConnectorsData) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const mcp = data?.mcpServers ?? [];
  const services = data?.services ?? [];

  if (mcp.length === 0 && services.length === 0) {
    return (
      <div className="px-5 py-16 text-center">
        <Plug className="mx-auto mb-4 size-12 text-muted-foreground" />
        <h4 className="mb-2 text-base font-semibold text-foreground">No connectors found</h4>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
          No MCP servers in .mcp.json and no services in .env.example.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* MCP servers */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Server className="size-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold text-foreground">MCP servers</h4>
          <span className="text-[11px] text-muted-foreground">({mcp.length})</span>
        </div>
        {mcp.length === 0 ? (
          <p className="text-sm text-muted-foreground">No MCP servers configured.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {mcp.map((s) => (
              <Card key={`${s.source}:${s.name}`} className="gap-2 rounded-lg p-4 shadow-none">
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                    {s.name}
                  </span>
                  <Badge variant="outline" className="shrink-0 px-2 py-0 text-[10px] font-normal text-muted-foreground">
                    {s.source}
                  </Badge>
                </div>
                {s.command && (
                  <p className="truncate text-[12px] text-muted-foreground" title={s.command}>
                    {s.command}
                  </p>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* API services */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <KeyRound className="size-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold text-foreground">API services</h4>
          <Badge variant="outline" className="ml-auto px-2 py-0 text-[10px] font-medium text-muted-foreground">
            {data?.configuredCount ?? 0} / {services.length} configured
          </Badge>
        </div>
        <Card className="divide-y divide-border rounded-lg p-0 shadow-none">
          {services.map((s) => (
            <div key={s.key} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-foreground">{s.service}</div>
                {s.usedBy && (
                  <div className="truncate text-[11px] text-muted-foreground">{s.usedBy}</div>
                )}
              </div>
              <code className="shrink-0 text-[10px] text-muted-foreground">{s.key}</code>
              <Badge
                variant={s.configured ? "secondary" : "outline"}
                className={`shrink-0 px-2 py-0 text-[10px] font-medium ${s.configured ? "text-foreground" : "text-muted-foreground"}`}
              >
                {s.configured ? "configured" : "missing"}
              </Badge>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
