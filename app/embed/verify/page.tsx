import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { WidgetForm } from "../[tenant-slug]/widget-form";
import { Suspense } from "react";

type PageProps = {
  searchParams: Promise<{ token?: string; sports?: string }>;
};

async function VerifyContent({ searchParams }: { searchParams: Promise<{ token?: string; sports?: string }> }) {
  const { token, sports } = await searchParams;

  if (!token) return notFound();

  const supabase = createAdminClient();

  // Find tenant by public token
  const { data: tenant } = await supabase
    .from("tenants")
    .select("*")
    .eq("public_token", token)
    .eq("is_active", true)
    .single();

  if (!tenant) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-md border border-red-200 p-6 max-w-sm text-center">
          <p className="text-red-600 font-bold text-sm">Invalid Widget Token</p>
          <p className="text-slate-500 text-xs mt-1">
            This widget connection has been revoked or configured incorrectly. Please contact the administrator.
          </p>
        </div>
      </div>
    );
  }

  // 1. Fetch active sports from database
  const { data: activeSportsData } = await supabase
    .from("sport_settings")
    .select("sport_name")
    .eq("is_active", true);

  const ALL_ACTIVE = (activeSportsData || []).map(s => {
    const nameLower = s.sport_name.toLowerCase();
    if (nameLower.includes("football")) return "football";
    if (nameLower.includes("nba")) return "nba";
    if (nameLower.includes("rugby")) return "rugby";
    if (nameLower.includes("ufc")) return "ufc";
    if (nameLower.includes("f1")) return "f1";
    return nameLower;
  });

  // Parse allowed sports from query param; fallback = all active sports
  const allowedSports: string[] =
    sports && sports.trim()
      ? sports
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter((s) => ALL_ACTIVE.includes(s))
      : ALL_ACTIVE;

  // Fetch leagues matching the allowed sports categories
  const { data: leagues } = await supabase
    .from("leagues")
    .select("id, name, sport_category, logo_url")
    .in("sport_category", allowedSports)
    .order("name", { ascending: true });

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <WidgetForm
        tenant={tenant}
        allowedSports={allowedSports}
        leagues={leagues || []}
      />
    </div>
  );
}

export default function VerifyEmbedPage({ searchParams }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
            <p className="text-xs font-medium text-slate-400">Loading widget...</p>
          </div>
        </div>
      }
    >
      <VerifyContent searchParams={searchParams} />
    </Suspense>
  );
}
