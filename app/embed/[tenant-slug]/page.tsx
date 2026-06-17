import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { WidgetForm } from "./widget-form";



export default async function EmbedWidgetPage({
  params,
  searchParams,
}: {
  params: Promise<{ "tenant-slug": string }>;
  searchParams: Promise<{ sports?: string }>;
}) {
  const { "tenant-slug": tenantSlug } = await params;
  const { sports } = await searchParams;

  const supabase = createAdminClient();

  // 1. Fetch active sports from database
  const { data: activeSportsData } = await supabase
    .from("sport_settings")
    .select("sport_slug, sport_name, have_leagues")
    .eq("is_active", true);

  const ALL_ACTIVE_SLUGS = (activeSportsData || []).map(s => s.sport_slug);

  const { data: tenant } = await supabase
    .from("tenants")
    .select("*")
    .eq("slug", tenantSlug)
    .eq("is_active", true)
    .single();

  if (!tenant) return notFound();

  // Parse allowed sports from query param; fallback = all active sports
  const allowedSportSlugs: string[] =
    sports && sports.trim()
      ? sports
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter((s) => ALL_ACTIVE_SLUGS.includes(s))
      : ALL_ACTIVE_SLUGS;

  // Filter the full sport settings based on allowed slugs
  const allowedSports = (activeSportsData || []).filter(s => allowedSportSlugs.includes(s.sport_slug));

  // Fetch leagues matching the allowed sports categories
  const { data: leagues } = await supabase
    .from("leagues")
    .select("id, name, sport_category, logo_url")
    .in("sport_category", allowedSportSlugs)
    .order("name", { ascending: true });

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-transparent">
      <WidgetForm
        tenant={tenant}
        allowedSports={allowedSports}
        leagues={leagues || []}
      />
    </div>
  );
}
