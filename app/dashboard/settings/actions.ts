"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SportSetting = {
  id: string;
  sport_key: string;
  sport_name: string;
  api_base_url: string;
  api_key: string;
  is_active: boolean;
  last_synced_at: string | null;
  created_at: string;
};

// ─── Toggle Active ──────────────────────────────────────────────────────────

export async function toggleSportActive(id: string, currentState: boolean) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("sport_settings")
    .update({ is_active: !currentState })
    .eq("id", id);

  if (error) {
    console.error("Toggle sport error:", error);
    return { success: false, error: "Failed to toggle sport status." };
  }

  revalidatePath("/dashboard/settings");
  return { success: true };
}

// ─── Update Credentials ─────────────────────────────────────────────────────

export async function updateSportCredentials(id: string, formData: FormData) {
  const api_base_url = formData.get("api_base_url")?.toString().trim() || "";
  const api_key = formData.get("api_key")?.toString().trim() || "";

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("sport_settings")
    .update({ api_base_url, api_key })
    .eq("id", id);

  if (error) {
    console.error("Update credentials error:", error);
    return { success: false, error: "Failed to update credentials." };
  }

  revalidatePath("/dashboard/settings");
  return { success: true };
}

// ─── Sync Now ────────────────────────────────────────────────────────────────

export async function syncSportData(id: string) {
  const supabase = createAdminClient();

  // 1. Read this sport's credentials from the DB
  const { data: setting, error: fetchError } = await supabase
    .from("sport_settings")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !setting) {
    console.error("Fetch setting error:", fetchError);
    return { success: false, error: "Could not find sport settings." };
  }

  if (!setting.api_base_url || !setting.api_key) {
    return { success: false, error: "API URL and Key must be configured before syncing." };
  }

  if (!setting.is_active) {
    return { success: false, error: "This sport is currently disabled. Activate it first." };
  }

  try {
    // 2. Call the external API to verify credentials & fetch leagues
    const leaguesUrl = `${setting.api_base_url}/leagues`;
    const response = await fetch(leaguesUrl, {
      method: "GET",
      headers: {
        "x-apisports-key": setting.api_key,
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`API ${response.status}:`, text);
      return {
        success: false,
        error: `API returned ${response.status}. Check your credentials.`,
      };
    }

    const json = await response.json();
    const leagues = json.response ?? [];

    // 3. Upsert leagues into DB
    if (leagues.length > 0) {
      const rows = leagues.slice(0, 50).map((item: any) => ({
        id: item.league?.id ?? item.id,
        sport_category: setting.sport_key,
        name: item.league?.name ?? item.name ?? "Unknown",
        localized_name: item.league?.name ?? null,
        country_code: item.country?.code ?? null,
        logo_url: item.league?.logo ?? item.logo ?? null,
        is_popular: true,
      }));

      const { error: upsertError } = await supabase
        .from("leagues")
        .upsert(rows, { onConflict: "id" });

      if (upsertError) {
        console.error("Upsert leagues error:", upsertError);
        return { success: false, error: "Fetched data but failed to save to database." };
      }
    }

    // 4. Update last_synced_at timestamp
    await supabase
      .from("sport_settings")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", id);

    revalidatePath("/dashboard/settings");

    return {
      success: true,
      message: `Synced ${leagues.length} league(s) for ${setting.sport_name}.`,
    };
  } catch (err: any) {
    console.error("Sync error:", err);
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      return { success: false, error: "Request timed out. The API may be unreachable." };
    }
    return { success: false, error: "An unexpected error occurred during sync." };
  }
}
