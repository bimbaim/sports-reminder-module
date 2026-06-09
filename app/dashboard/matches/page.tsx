import { createAdminClient } from "@/lib/supabase/admin";
import { MatchesClient } from "./matches-client";
import { Suspense } from "react";

async function MatchesData() {
  const supabase = createAdminClient();
  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .order("kickoff_time", { ascending: true });

  return <MatchesClient matches={matches || []} />;
}

export default function MatchesPage() {
  return (
    <div className="h-full w-full">
      <Suspense fallback={<div className="flex h-full items-center justify-center animate-pulse text-muted-foreground">Loading Matches...</div>}>
        <MatchesData />
      </Suspense>
    </div>
  );
}
