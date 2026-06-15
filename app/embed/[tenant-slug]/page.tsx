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
    .select("sport_slug")
    .eq("is_active", true);

  const ALL_ACTIVE = (activeSportsData || []).map(s => s.sport_slug);

  const { data: tenant } = await supabase
    .from("tenants")
    .select("*")
    .eq("slug", tenantSlug)
    .eq("is_active", true)
    .single();

  if (!tenant) return notFound();

  // Parse allowed sports from query param; fallback = all active sports
  const allowedSports: string[] =
    sports && sports.trim()
      ? sports
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter((s) => ALL_ACTIVE.includes(s))
      : ALL_ACTIVE;

  // Fetch leagues matching the allowed sports categories
  const { data: leagues } = await supabase
    .from("leagues")
    .select("id, name, sport_category, logo_url")
    .in("sport_category", allowedSports)
    .order("name", { ascending: true });

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <WidgetForm
        tenant={tenant}
        allowedSports={allowedSports}
        leagues={leagues || []}
      />
    </div>
  );
}
