import { createAdminClient } from "@/lib/supabase/admin";
import { WidgetStudio } from "./widget-studio";
import { Suspense } from "react";
import { headers } from "next/headers";

async function WidgetsData() {
  await headers(); // Force dynamic rendering
  const supabase = createAdminClient();
  
  // 1. Fetch tenants
  const { data: tenants, error: tenantsError } = await supabase
    .from("tenants")
    .select("*")
    .order("name", { ascending: true });

  if (tenantsError) console.error("WidgetsData: Error fetching tenants:", tenantsError);

  // 2. Fetch ALL sport categories
  const { data: categories, error: sportsError } = await supabase
    .from("sport_categories")
    .select("*")
    .order("name", { ascending: true });

  if (sportsError) console.error("WidgetsData: Error fetching categories:", sportsError);
  
  const mappedSports = (categories || []).map((s) => ({
    id: s.slug,
    label: s.name,
    have_leagues: s.have_leagues,
  }));

  return <WidgetStudio tenants={tenants || []} availableSports={mappedSports} />;
}

export default function WidgetsPage() {
  return (
    <div className="h-full w-full">
      <Suspense fallback={<div className="flex h-full items-center justify-center animate-pulse text-muted-foreground">Loading Widget Studio...</div>}>
        <WidgetsData />
      </Suspense>
    </div>
  );
}
