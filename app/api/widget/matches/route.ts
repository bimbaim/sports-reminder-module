import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const leagueIdsParam = searchParams.get("leagues");
  const sportCategory = searchParams.get("sport");

  const supabase = createAdminClient();

  if (leagueIdsParam) {
    const leagueIds = leagueIdsParam.split(",").map(id => parseInt(id, 10));
    const { data: matches, error } = await supabase
      .from("matches")
      .select("competitor_a, competitor_b")
      .in("league_id", leagueIds);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const teams = new Set<string>();
    matches?.forEach((m) => {
      if (m.competitor_a && m.competitor_a.trim()) teams.add(m.competitor_a.trim());
      if (m.competitor_b && m.competitor_b.trim()) teams.add(m.competitor_b.trim());
    });

    return NextResponse.json({ teams: Array.from(teams).sort() });
  }

  if (sportCategory) {
    const { data: matches, error } = await supabase
      .from("matches")
      .select("id, home_team, away_team, tournament_name, kickoff_time")
      .eq("sport_category", sportCategory)
      .gte("kickoff_time", new Date().toISOString())
      .order("kickoff_time", { ascending: true })
      .limit(50);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ matches: matches || [] });
  }

  return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
}
