import { createAdminClient } from "@/lib/supabase/admin";
import { TenantSettingsClient } from "./tenant-settings-client";
import { notFound } from "next/navigation";

interface TenantSettingsPageProps {
  params: {
    id: string;
  };
}

export async function generateStaticParams() {
  try {
    const supabase = createAdminClient();
    const { data: tenants } = await supabase
      .from("tenants")
      .select("id");

    return (tenants || []).map((tenant) => ({
      id: tenant.id,
    }));
  } catch (error) {
    console.error("Error generating static params:", error);
    return [];
  }
}

export default async function TenantSettingsPage({ params }: TenantSettingsPageProps) {
  const supabase = createAdminClient();
  const { data: tenant, error } = await supabase
    .from("tenants")
    .select("id, name, email_provider, email_from_address")
    .eq("id", params.id)
    .single();

  if (error || !tenant) {
    notFound();
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <TenantSettingsClient initialTenant={tenant} />
    </div>
  );
}
