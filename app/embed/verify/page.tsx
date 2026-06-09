import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { WidgetForm } from "../[tenant-slug]/widget-form";

export const dynamic = "force-dynamic";

export default async function VerifyEmbedPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; sports?: string }>;
}) {
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

  // Parse allowed sports from query param; fallback = all four
  const ALL = ["football", "ufc", "nba", "f1"];
  const allowedSports: string[] =
    sports && sports.trim()
      ? sports
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter((s) => ALL.includes(s))
      : ALL;

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
