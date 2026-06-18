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

  // Fetch leagues
  const { data: leagues } = await supabase
    .from("leagues")
    .select("id, name, sport_category, logo_url")
    .in("sport_category", allowedSportSlugs)
    .order("name", { ascending: true });

  return NextResponse.json({
    tenant,
    allowedSports,
    leagues: leagues || []
  });
}
