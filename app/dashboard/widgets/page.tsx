import { createAdminClient } from "@/lib/supabase/admin";
import { WidgetStudio } from "./widget-studio";
import { Suspense } from "react";

async function WidgetsData() {
  const supabase = createAdminClient();
  const { data: tenants } = await supabase
    .from("tenants")
    .select("*")
    .order("name", { ascending: true });

  return <WidgetStudio tenants={tenants || []} />;
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
