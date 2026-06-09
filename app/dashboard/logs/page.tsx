import { createAdminClient } from "@/lib/supabase/admin";
import { LogsClient } from "./logs-client";
import { Suspense } from "react";

async function LogsData() {
  const supabase = createAdminClient();
  const { data: logs } = await supabase
    .from("notification_logs")
    .select(`
      *,
      subscribers (
        email,
        whatsapp_number,
        tenants (
          name
        )
      ),
      matches (
        home_team,
        away_team
      )
    `)
    .order("created_at", { ascending: false });

  return <LogsClient logs={logs || []} />;
}

export default function LogsPage() {
  return (
    <div className="h-full w-full">
      <Suspense fallback={<div className="flex h-full items-center justify-center animate-pulse text-muted-foreground">Loading Logs...</div>}>
        <LogsData />
      </Suspense>
    </div>
  );
}
