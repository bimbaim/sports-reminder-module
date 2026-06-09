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

  const { data: tenant } = await supabase
    .from("tenants")
    .select("*")
    .eq("slug", tenantSlug)
    .eq("is_active", true)
    .single();

  if (!tenant) return notFound();

  // Parse allowed sports from query param; fallback = all four
  const ALL = ["football", "ufc", "nba", "f1"];
  const allowedSports: string[] =
    sports && sports.trim()
      ? sports
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter((s) => ALL.includes(s))
      : ALL;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <WidgetForm tenant={tenant} allowedSports={allowedSports} />
    </div>
  );
}
