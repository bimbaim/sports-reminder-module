"use client";

import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw, Play, Shield, Database, Activity, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { ingestSportData } from "./actions";

type MatchItem = {
  id: string;
  competitor_a: string | null;
  competitor_b: string | null;
  event_title: string | null;
  kickoff_time: string;
  status: string;
  league_id: number | null;
  leagues?: {
    sport_category: string;
    name: string;
  } | null;
};

type ActiveSport = {
  id: string;
  sport_name: string;
  is_active: boolean;
  last_synced_at: string | null;
};

type MatchesClientProps = {
  initialMatches: MatchItem[];
  activeSports: ActiveSport[];
  stats: {
    totalLeagues: number;
    totalMatches: number;
    activePipelines: number;
  };
};

export function MatchesClient({ initialMatches, activeSports, stats }: MatchesClientProps) {
  const [syncingSports, setSyncingSports] = useState<Record<string, boolean>>({});

  const handleSyncSport = async (sport: ActiveSport) => {
    setSyncingSports((prev) => ({ ...prev, [sport.id]: true }));

    try {
      const result = await ingestSportData(sport.id);
      if (result.success) {
        toast.success(result.message || `Successfully synced ${sport.sport_name}.`);
      } else {
        toast.error(result.error || `Failed to sync ${sport.sport_name}.`);
      }
    } catch (err) {
      console.error(err);
      toast.error(`An error occurred while syncing ${sport.sport_name}.`);
    } finally {
      setSyncingSports((prev) => ({ ...prev, [sport.id]: false }));
    }
  };

  const getSportBadgeColor = (sportCategory: string) => {
    switch (sportCategory) {
      case "football":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "ufc":
        return "bg-red-50 text-red-700 border-red-200";
      case "nba":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "f1":
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="flex-1 space-y-8 p-8 pt-6 bg-slate-50/50 min-h-screen text-slate-900">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Data Ingestion Dashboard</h2>
        <p className="text-sm text-slate-500">
          Orchestrate and trigger dynamic updates from third-party API providers.
        </p>
      </div>

      {/* Bento Grid Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Total Monitored Leagues
            </p>
            <p className="text-3xl font-bold tracking-tight text-slate-800">
              {stats.totalLeagues}
            </p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
            <Database className="h-6 w-6" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Total Cached Matches
            </p>
            <p className="text-3xl font-bold tracking-tight text-slate-800">
              {stats.totalMatches}
            </p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <CalendarDays className="h-6 w-6" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
              Active Ingestion Pipelines
            </p>
            <p className="text-3xl font-bold tracking-tight text-slate-800">
              {stats.activePipelines}
            </p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Activity className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Control Panel Grid */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-800 tracking-tight">Manual Ingestion Control</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {activeSports.map((sport) => {
            const isLoading = syncingSports[sport.id] || false;
            return (
              <div
                key={sport.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 capitalize">
                      {sport.sport_name}
                    </span>
                    <Badge variant="outline" className="bg-emerald-50/50 text-emerald-700 border-emerald-200 text-[10px] py-0 px-1.5 font-medium">
                      Active
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">
                    Last Sync:{" "}
                    {sport.last_synced_at
                      ? format(new Date(sport.last_synced_at), "MMM d, h:mm a")
                      : "Never"}
                  </p>
                </div>
                <Button
                  onClick={() => handleSyncSport(sport)}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full text-xs font-medium border-slate-200 hover:bg-slate-50 text-slate-700"
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
                  {isLoading ? "Fetching Data..." : "Manual Sync Data"}
                </Button>
              </div>
            );
          })}
          {activeSports.length === 0 && (
            <div className="col-span-full border border-dashed border-slate-200 rounded-xl bg-white p-8 text-center text-slate-400 text-sm">
              No active ingestion pipelines configured. Go to Settings to activate sports.
            </div>
          )}
        </div>
      </div>

      {/* Real-time Data Preview Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800 tracking-tight">Latest Ingested Matches</h3>
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider bg-slate-100 px-2 py-1 rounded">
            Live Cache Preview (Last 10)
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50/75 border-b border-slate-200">
              <TableRow>
                <TableHead className="font-semibold text-slate-600 text-xs w-[140px]">Match ID</TableHead>
                <TableHead className="font-semibold text-slate-600 text-xs w-[120px]">Sport Category</TableHead>
                <TableHead className="font-semibold text-slate-600 text-xs">Fixture Title / Event</TableHead>
                <TableHead className="font-semibold text-slate-600 text-xs w-[200px]">Kick-off Time</TableHead>
                <TableHead className="font-semibold text-slate-600 text-xs text-right w-[100px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialMatches.length > 0 ? (
                initialMatches.map((m) => {
                  const sportCategory = m.leagues?.sport_category || "football";
                  const fixtureTitle = `${m.competitor_a || "TBD"} vs ${m.competitor_b || "TBD"}`;

                  return (
                    <TableRow key={m.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-0">
                      <TableCell className="font-mono text-xs text-slate-500 select-all">
                        {m.id}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`capitalize text-[10px] font-medium px-2 py-0.5 ${getSportBadgeColor(sportCategory)}`}
                        >
                          {sportCategory}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-slate-800">
                        {fixtureTitle}
                      </TableCell>
                      <TableCell className="text-slate-500 text-xs">
                        {format(new Date(m.kickoff_time), "eee, MMM d, yyyy • h:mm a")}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="capitalize text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          {m.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-32 text-center text-slate-400 text-sm bg-white"
                  >
                    No matches cached in the database. Trigger a Manual Sync above to pull fixtures.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
