"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SportSetting = {
  id: string;
  sport_name: string;
  sport_slug: string;
  api_url: string;
  api_key: string;
  is_active: boolean;
  have_leagues: boolean;
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
  revalidatePath("/dashboard/widgets");
  revalidatePath("/dashboard/matches");
  return { success: true };
}

// ─── Update Credentials ─────────────────────────────────────────────────────

export async function updateSportCredentials(id: string, formData: FormData) {
  const api_url = formData.get("api_url")?.toString().trim() || "";
  const api_key = formData.get("api_key")?.toString().trim() || "";

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("sport_settings")
    .update({ api_url, api_key })
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

  if (!setting.api_url || !setting.api_key) {
    return { success: false, error: "API URL and Key must be configured before syncing." };
  }

  if (!setting.is_active) {
    return { success: false, error: "This sport is currently disabled. Activate it first." };
  }

  try {
    // 2. Call the external API to verify credentials & fetch leagues
    const headers: Record<string, string> = {
      "Accept": "application/json",
    };

    try {
      const urlObj = new URL(setting.api_url);
      if (urlObj.hostname.includes("rapidapi.com")) {
        headers["x-rapidapi-key"] = setting.api_key;
        headers["x-rapidapi-host"] = urlObj.hostname;
      } else {
        headers["x-apisports-key"] = setting.api_key;
      }
    } catch (e) {
      headers["x-apisports-key"] = setting.api_key;
      headers["x-rapidapi-key"] = setting.api_key;
    }

    // If the sport doesn't use a separate league structure (have_leagues = false), skip metadata sync
    if (!setting.have_leagues) {
      return {
        success: true,
        message: `${setting.sport_name} metadata is managed automatically during match sync.`
      };
    }

    const isFreeLiveFootballApi = setting.api_url.includes("free-api-live-football-data") || setting.sport_slug === "football";

    let leaguesUrl = `${setting.api_url}/leagues`;
    if (isFreeLiveFootballApi) {
      leaguesUrl = `${setting.api_url}/football-popular-leagues`;
    } else if (setting.sport_slug === "f1") {
      leaguesUrl = `${setting.api_url}/competitions`;
    }

    const response = await fetch(leaguesUrl, {
      method: "GET",
      headers,
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
    let leagues: any[] = [];

    // FIX UTAMA: Ekstrak data dari json.response.popular sesuai dengan struktur API Anda
    if (isFreeLiveFootballApi && json.response?.popular) {
      leagues = json.response.popular;
    } else if (json.response) {
      leagues = Array.isArray(json.response) ? json.response : (json.response.list || []);
    }

    if (leagues.length === 0) {
      return { success: false, error: "No leagues returned from the API response structure." };
    }

    // 3. Upsert leagues into DB
    const dynamicSportCategory = setting.sport_slug;

    const rows = leagues.slice(0, 50).map((item: any) => {
      const hasLeagueObject = !!item.league;
      const leagueId = hasLeagueObject ? item.league.id : (item.id ?? item.league_id);
      const leagueName = hasLeagueObject ? item.league.name : (item.name ?? item.league_name ?? "Unknown");
      const leagueLogo = hasLeagueObject ? item.league.logo : (item.logo || item.logo_url || null);
      const countryCode = hasLeagueObject ? (item.country?.code ?? "INT") : (item.ccode ?? item.country_code ?? "INT");

      return {
        id: Number(leagueId),
        sport_category: dynamicSportCategory, // Menggunakan variabel dinamis hasil deteksi database
        name: leagueName,
        localized_name: item.localizedName || leagueName,
        country_code: countryCode,
        logo_url: leagueLogo,
        is_popular: true,
      };
    });

    const { error: upsertError } = await supabase
      .from("leagues")
      .upsert(rows, { onConflict: "id" });

    if (upsertError) {
      console.error("Upsert leagues error:", upsertError);
      return { success: false, error: `Database Error: ${upsertError.message}` };
    }

    // 4. Update last_synced_at timestamp
    await supabase
      .from("sport_settings")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", id);

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/matches");

    return {
      success: true,
      message: `Synced ${rows.length} league(s) for ${setting.sport_name}.`,
    };
  } catch (err: any) {
    console.error("Sync error:", err);
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      return { success: false, error: "Request timed out. The API may be unreachable." };
    }
    return { success: false, error: err.message || "An unexpected error occurred during sync." };
  }
}
