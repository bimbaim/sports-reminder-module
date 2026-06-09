import { createAdminClient } from "@/lib/supabase/admin";
import { TenantClient } from "./tenant-client";
import { Suspense } from "react";

async function TenantsData() {
  const supabase = createAdminClient();
  const { data: tenants } = await supabase
    .from("tenants")
    .select("*")
    .order("created_at", { ascending: false });

  return <TenantClient initialTenants={tenants || []} />;
}

export default function TenantsPage() {
  return (
    <div className="h-full w-full">
      <Suspense fallback={<div className="flex h-full items-center justify-center animate-pulse text-muted-foreground">Loading Tenants...</div>}>
        <TenantsData />
      </Suspense>
    </div>
  );
}
