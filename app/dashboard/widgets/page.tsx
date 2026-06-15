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

  // 2. Fetch ALL sports to debug status
  const { data: allSports, error: sportsError } = await supabase
    .from("sport_settings")
    .select("*")
    .order("sport_name", { ascending: true });

  if (sportsError) console.error("WidgetsData: Error fetching sports:", sportsError);
  
  console.log("WidgetsData Debug: All rows from DB:", JSON.stringify(allSports?.slice(0, 3), null, 2));

  const sports = (allSports || []).filter(s => {
    const isActive = Boolean(s.is_active);
    console.log(`Checking sport: ${s.sport_name}, is_active: ${s.is_active}, evaluated as: ${isActive}`);
    return isActive;
  });

  const mappedSports = sports.map((s) => ({
    id: s.sport_name.toLowerCase().includes("football") ? "football" : 
        s.sport_name.toLowerCase().includes("nba") ? "nba" : 
        s.sport_name.toLowerCase().includes("rugby") ? "rugby" : 
        s.sport_name.toLowerCase().includes("ufc") ? "ufc" : 
        s.sport_name.toLowerCase().includes("f1") ? "f1" : s.id,
    label: s.sport_name,
    realId: s.id // Keep the real UUID for reference
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
