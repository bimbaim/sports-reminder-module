import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { WidgetForm } from "./widget-form";
import { Suspense } from "react";

export default async function EmbedWidgetPage({
  params,
}: {
  params: Promise<{ "tenant-slug": string }>;
}) {
  const { "tenant-slug": tenantSlug } = await params;
  
  const supabase = await createClient();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("*")
    .eq("slug", tenantSlug)
    .eq("is_active", true)
    .single();

  if (!tenant) {
    return notFound();
  }

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
      <WidgetForm tenant={tenant} />
    </div>
  );
}
