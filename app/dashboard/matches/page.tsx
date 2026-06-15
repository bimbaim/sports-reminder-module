import { createAdminClient } from "@/lib/supabase/admin";
import { MatchesClient } from "./matches-client";
import { Suspense } from "react";



async function MatchesData() {
  const supabase = createAdminClient();

  // 1. Fetch statistics
  const { count: totalLeagues } = await supabase
    .from("leagues")
    .select("*", { count: "exact", head: true });

  const { count: totalMatches } = await supabase
    .from("matches")
    .select("*", { count: "exact", head: true });

  const { count: activePipelines } = await supabase
    .from("sport_settings")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  // 2. Fetch active sports configurations
  const { data: activeSports } = await supabase
    .from("sport_settings")
    .select("id, sport_name, is_active, last_synced_at")
    .eq("is_active", true)
    .order("sport_name", { ascending: true });

  // 3. Fetch latest 10 matches with sport category info
  const { data: matches } = await supabase
    .from("matches")
    .select(`
      id,
      competitor_a,
      competitor_b,
      event_title,
      kickoff_time,
      status,
      leagues (
        sport_category,
        name
      )
    `)
    .order("created_at", { ascending: false })
    .limit(10);

  const formattedMatches = (matches || []).map((m: any) => ({
    id: m.id,
    competitor_a: m.competitor_a,
    competitor_b: m.competitor_b,
    event_title: m.event_title,
    kickoff_time: m.kickoff_time,
    status: m.status,
    leagues: m.leagues ? {
      sport_category: m.leagues.sport_category,
      name: m.leagues.name,
    } : null,
  }));

  return (
    <MatchesClient
      initialMatches={formattedMatches}
      activeSports={activeSports || []}
      stats={{
        totalLeagues: totalLeagues || 0,
        totalMatches: totalMatches || 0,
        activePipelines: activePipelines || 0,
      }}
    />
  );
}

export default function MatchesPage() {
  return (
    <div className="h-full w-full">
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center bg-slate-50/50">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-indigo-600" />
              <p className="text-sm font-medium text-slate-500">Loading Ingestion Dashboard...</p>
            </div>
          </div>
        }
      >
        <MatchesData />
      </Suspense>
    </div>
  );
}
