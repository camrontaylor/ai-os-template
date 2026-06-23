"use client";

import Link from "next/link";
import { Activity, ArrowRight, Zap } from "lucide-react";
import type { DashboardSummary } from "@/types/dashboard";
import { Card } from "@/components/ui/card";

interface ActivityPulseProps {
  weekStats: DashboardSummary["weekStats"];
  claudeUsage: DashboardSummary["claudeUsage"];
}

function formatTokens(n: number): string {
  if (n === 0) return "0";
  if (n < 1000) return n.toString();
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

const sectionLabelClass =
  "text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";
const subtextClass = "text-[11px] font-medium text-muted-foreground";
const totalValueClass =
  "mb-1 mt-1 flex items-center gap-2 text-lg font-semibold leading-none text-foreground";

export function ActivityPulse({ weekStats, claudeUsage }: ActivityPulseProps) {
  const hasActivity = claudeUsage.weekSessions > 0 || weekStats.tasksCompleted > 0;
  const hasBudget = claudeUsage.dailyTokenBudget > 0;
  const todayPct = hasBudget
    ? Math.min(100, Math.round((claudeUsage.todayTokens / claudeUsage.dailyTokenBudget) * 100))
    : 0;
  const isHigh = todayPct >= 80;
  const isMid = todayPct >= 50 && todayPct < 80;
  const barColor = isHigh ? "var(--destructive)" : isMid ? "var(--primary)" : "var(--primary)";

  return (
    <Card className="min-w-0 flex-1 gap-0 rounded-lg border p-6 shadow-none">
      <div className="mb-3 flex items-center gap-2">
        <Activity size={16} color="var(--muted-foreground)" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Token Usage
        </span>
      </div>
      {hasActivity ? (
        <>
          {/* Today */}
          <div className="mb-4">
            <div className="mb-2 flex items-baseline justify-between">
              <span className={sectionLabelClass}>Today</span>
              {hasBudget ? (
                <span
                  className="text-xl font-semibold leading-none"
                  style={{ color: isHigh ? "var(--destructive)" : "var(--foreground)" }}
                >
                  {todayPct}%
                </span>
              ) : (
                <div className={totalValueClass}>
                  <Zap size={13} color="var(--muted-foreground)" />
                  {formatTokens(claudeUsage.todayTokens)}
                </div>
              )}
            </div>
            {hasBudget && (
              <>
                {/* Progress bar */}
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-[width] duration-300"
                    style={{ width: `${todayPct}%`, backgroundColor: barColor }}
                  />
                </div>
                <div className="mt-1 flex justify-between">
                  <span className={subtextClass}>
                    {formatTokens(claudeUsage.todayTokens)} used
                  </span>
                  <span className={subtextClass}>
                    {formatTokens(claudeUsage.dailyTokenBudget)} daily budget
                  </span>
                </div>
              </>
            )}
            {!hasBudget && (
              <span className={subtextClass}>
                {claudeUsage.todaySessions} session{claudeUsage.todaySessions !== 1 ? "s" : ""} today
              </span>
            )}
          </div>

          {/* Week + Month totals */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className={sectionLabelClass}>This week</span>
              <div className={totalValueClass}>
                <Zap size={13} color="var(--muted-foreground)" />
                {formatTokens(claudeUsage.weekTokens)}
              </div>
              <span className={subtextClass}>tokens used</span>
              <div className="mt-1">
                <span className={subtextClass}>
                  {claudeUsage.weekSessions} session{claudeUsage.weekSessions !== 1 ? "s" : ""}
                  {weekStats.tasksCompleted > 0 && ` / ${weekStats.tasksCompleted} task${weekStats.tasksCompleted !== 1 ? "s" : ""}`}
                </span>
              </div>
            </div>
            <div>
              <span className={sectionLabelClass}>This month</span>
              <div className={totalValueClass}>
                <Zap size={13} color="var(--muted-foreground)" />
                {formatTokens(claudeUsage.monthTokens)}
              </div>
              <span className={subtextClass}>tokens used</span>
              {weekStats.totalCostUsd > 0 && (
                <div className="mt-1">
                  <span className={subtextClass}>
                    ${weekStats.totalCostUsd.toFixed(2)} task cost
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Last updated + budget hint */}
          <div className="mt-3 flex flex-col gap-1">
            {claudeUsage.lastUpdated && (
              <span className={subtextClass}>
                Last synced: {claudeUsage.lastUpdated === new Date().toISOString().slice(0, 10) ? "today" : claudeUsage.lastUpdated}
              </span>
            )}
          </div>

          <Link
            href="/history"
            className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary no-underline"
          >
            View history <ArrowRight size={13} />
          </Link>
        </>
      ) : (
        <p className={`m-0 ${sectionLabelClass}`}>No activity yet today.</p>
      )}
    </Card>
  );
}
