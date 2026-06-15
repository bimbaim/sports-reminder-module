import { createAdminClient } from "@/lib/supabase/admin";
import { WidgetStudio } from "./widget-studio";
import { Suspense } from "react";

async function WidgetsData() {
  const supabase = createAdminClient();
  
  // 1. Fetch tenants
  const { data: tenants } = await supabase
    .from("tenants")
    .select("*")
    .order("name", { ascending: true });

  // 2. Fetch active sports
  const { data: sports } = await supabase
    .from("sport_settings")
    .select("sport_key, sport_name")
    .eq("is_active", true)
    .order("sport_name", { ascending: true });

  const mappedSports = (sports || []).map((s) => ({
    id: s.sport_key,
    label: s.sport_name,
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
