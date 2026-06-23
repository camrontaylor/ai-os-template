"use client";

import { Terminal, KeyRound, Plug, FileCode, Waypoints } from "lucide-react";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
}

const tabs: Tab[] = [
  { id: "connectors", label: "Connectors", icon: Waypoints },
  { id: "scripts", label: "Scripts", icon: Terminal },
  { id: "env", label: "Environment", icon: KeyRound },
  { id: "mcp", label: "MCP", icon: Plug },
  { id: "claude", label: "Claude Settings", icon: FileCode },
];

interface SettingsTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function SettingsTabs({ activeTab, onTabChange }: SettingsTabsProps) {
  return (
    <div className="flex overflow-x-auto border-b border-border px-4 sm:px-6">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors sm:px-5",
              isActive
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon size={16} />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
