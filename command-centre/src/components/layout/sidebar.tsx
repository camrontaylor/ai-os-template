"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  LayoutDashboard,
  Clock,
  Cpu,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  History,
  type LucideIcon,
} from "lucide-react";
import { ClientSwitcher } from "./client-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = { label: string; icon: LucideIcon; href: string };

const mainNavItems: NavItem[] = [
  { label: "Overview", icon: Home, href: "/" },
  { label: "Board", icon: LayoutDashboard, href: "/board" },
  { label: "Scheduled", icon: Clock, href: "/cron" },
  { label: "History", icon: History, href: "/history" },
  { label: "Skills", icon: Cpu, href: "/skills" },
  { label: "Docs", icon: FileText, href: "/docs" },
];

const bottomNavItems: NavItem[] = [
  { label: "Settings", icon: Settings, href: "/settings" },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive =
      item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
    return (
      <Button
        key={item.label}
        asChild
        variant="ghost"
        className={cn(
          "h-9 w-full justify-start gap-3 rounded-md px-3 font-normal text-muted-foreground",
          "hover:bg-sidebar-accent hover:text-sidebar-foreground",
          isActive && "bg-sidebar-accent font-medium text-sidebar-foreground",
          collapsed && "w-9 justify-center px-0",
        )}
        title={collapsed ? item.label : undefined}
      >
        <Link href={item.href}>
          <Icon className="size-4 shrink-0" />
          {!collapsed && <span className="truncate">{item.label}</span>}
        </Link>
      </Button>
    );
  };

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col gap-6 overflow-hidden border-r border-sidebar-border bg-sidebar transition-[width,padding] duration-200",
        collapsed ? "w-14 px-2 py-4" : "w-[220px] p-4",
      )}
    >
      {/* Wordmark + collapse toggle */}
      <div
        className={cn(
          "flex items-center",
          collapsed ? "justify-center" : "justify-between px-1",
        )}
      >
        {collapsed ? (
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-sidebar-foreground"
            onClick={onToggle}
            title="Expand sidebar"
          >
            <ChevronRight className="size-4" />
          </Button>
        ) : (
          <>
            <Link
              href="/"
              className="text-[15px] font-semibold tracking-tight text-sidebar-foreground"
            >
              AI-OS
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-sidebar-foreground"
              onClick={onToggle}
              title="Collapse sidebar"
            >
              <ChevronLeft className="size-4" />
            </Button>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1">
        {mainNavItems.map(renderItem)}
        <div className="my-2 border-t border-sidebar-border" />
        {bottomNavItems.map(renderItem)}
      </nav>

      {/* Theme toggle */}
      <div className={cn("flex", collapsed ? "justify-center" : "")}>
        <ThemeToggle compact={collapsed} />
      </div>

      {/* Client switcher */}
      <div className="border-t border-sidebar-border pt-4">
        <ClientSwitcher collapsed={collapsed} />
      </div>
    </aside>
  );
}
