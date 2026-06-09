"use client";

import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw, CalendarDays } from "lucide-react";
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
import { useRouter } from "next/navigation";

export function MatchesClient({ matches }: { matches: any[] }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const router = useRouter();

  const handleSync = async () => {
    setIsSyncing(true);
    const promise = fetch("/api/cron/sync-matches", { method: "GET" })
      .then((res) => {
        if (!res.ok) throw new Error("Sync failed");
        return res.json();
      })
      .then(() => {
        router.refresh();
      });

    toast.promise(promise, {
      loading: "Triggering ingestion pipeline...",
      success: "API sync completed successfully. Matches updated.",
      error: "Failed to sync matches.",
    });

    promise.finally(() => setIsSyncing(false));
  };

  const getStatusBadge = (kickoff: string) => {
    const kickoffTime = new Date(kickoff).getTime();
    const now = new Date().getTime();
    
    // Simulate game states
    if (kickoffTime < now - 2 * 60 * 60 * 1000) {
      return <Badge variant="secondary">Finished</Badge>;
    } else if (kickoffTime < now) {
      return <Badge className="bg-red-500 hover:bg-red-600 animate-pulse">Live</Badge>;
    } else {
      return <Badge variant="outline" className="border-primary text-primary bg-primary/5">Scheduled</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CalendarDays className="h-8 w-8 text-primary" />
            Match Fixtures
          </h1>
          <p className="text-muted-foreground mt-1">
            View cached matches and trigger upstream API synchronization.
          </p>
        </div>
        
        <Button onClick={handleSync} disabled={isSyncing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
          Sync Now
        </Button>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden flex-1">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Match</TableHead>
              <TableHead>Sport</TableHead>
              <TableHead>Tournament</TableHead>
              <TableHead>Kickoff Time</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {matches.length > 0 ? (
              matches.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">
                    {m.home_team} vs {m.away_team}
                  </TableCell>
                  <TableCell className="text-muted-foreground capitalize">
                    {m.sport_category}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {m.tournament_name || "-"}
                  </TableCell>
                  <TableCell>
                    {format(new Date(m.kickoff_time), "MMM d, yyyy • h:mm a")}
                  </TableCell>
                  <TableCell className="text-right">
                    {getStatusBadge(m.kickoff_time)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  No matches in cache. Click "Sync Now" to ingest data.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
