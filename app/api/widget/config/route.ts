import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tenantSlug = searchParams.get("tenant");
  const token = searchParams.get("token");
  const sportsParam = searchParams.get("sports");

  const supabase = createAdminClient();

  let tenant;
  if (token) {
    const { data } = await supabase
      .from("tenants")
      .select("*")
      .eq("public_token", token)
      .eq("is_active", true)
      .single();
    tenant = data;
  } else if (tenantSlug) {
    const { data } = await supabase
      .from("tenants")
      .select("*")
      .eq("slug", tenantSlug)
      .eq("is_active", true)
      .single();
    tenant = data;
  }

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  // Fetch active sports
  const { data: activeSportsData } = await supabase
    .from("sport_settings")
    .select("sport_slug, sport_name, have_leagues")
    .eq("is_active", true);

  const ALL_ACTIVE_SLUGS = (activeSportsData || []).map(s => s.sport_slug);

  // Parse allowed sports
  const allowedSportSlugs: string[] =
    sportsParam && sportsParam.trim()
      ? sportsParam
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter((s) => ALL_ACTIVE_SLUGS.includes(s))
      : ALL_ACTIVE_SLUGS;

  const allowedSports = (activeSportsData || []).filter(s => allowedSportSlugs.includes(s.sport_slug));

  // Fetch all leagues then filter case-insensitively to handle sport_category
  // values that may not exactly match sport_slug casing in the DB.
  const { data: allLeagues } = await supabase
    .from("leagues")
    .select("id, name, sport_category, logo_url")
    .order("name", { ascending: true });

  const allowedSlugsLower = allowedSportSlugs.map(s => s.toLowerCase());
  const leagues = (allLeagues || []).filter(
    l => l.sport_category && allowedSlugsLower.includes(l.sport_category.toLowerCase())
  );

  // Normalise sport_category to lowercase so client-side filtering is reliable
  const normalisedLeagues = leagues.map(l => ({
    ...l,
    sport_category: l.sport_category.toLowerCase(),
  }));

  return NextResponse.json({
    tenant,
    allowedSports,
    leagues: normalisedLeagues,
  });
}
