import { createAdminClient } from "@/lib/supabase/admin";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const supabase = createAdminClient();

  const { data: settings, error } = await supabase
    .from("sport_settings")
    .select("*")
    .order("sport_name", { ascending: true });

  if (error) {
    console.error("Error fetching sport settings:", error);
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Global Sport Settings
          </h2>
          <p className="text-muted-foreground">
            Manage API credentials, configurations, and status for each sport category.
          </p>
        </div>
      </div>
      <SettingsClient initialSettings={settings || []} />
    </div>
  );
}