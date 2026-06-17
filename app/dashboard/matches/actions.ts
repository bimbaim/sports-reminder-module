"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { WorldCupSyncService } from "@/lib/services/world-cup-sync";

export type IngestionResult = {
  success: boolean;
  message?: string;
  error?: string;
};

export async function ingestSportData(sportId: string): Promise<IngestionResult> {
  console.log("=== MEMULAI PROSES INGESTION UNTUK ID:", sportId, " ===");

  let supabase;
  try {
    supabase = createAdminClient();
    if (!supabase) {
      return { success: false, error: "Klien Supabase Admin gagal diinisialisasi." };
    }
  } catch (initError: any) {
    console.error("Kritis: createAdminClient crash:", initError);
    return { success: false, error: `Gagal inisialisasi Supabase: ${initError.message}` };
  }

  // 1. Ambil konfigurasi dari database
  const { data: setting, error: settingError } = await supabase
    .from("sport_settings")
    .select("*")
    .eq("id", sportId)
    .single();

  if (settingError || !setting) {
    return { success: false, error: "Konfigurasi olahraga tidak ditemukan." };
  }

  const { sport_name, api_url, api_key, have_leagues, sport_slug, sport_category } = setting;
  const targetKey = sport_slug;
  const dynamicSportCategory = sport_category || targetKey;

  console.log(`Konfigurasi Ditemukan! Sport: ${sport_name}, URL: ${api_url}, Detected Type: ${targetKey}`);

  if (!api_url || !api_key) {
    return { success: false, error: `API URL dan Key untuk ${sport_name} masih kosong.` };
  }

  try {
    const headers: Record<string, string> = { "Accept": "application/json" };
    const cleanApiUrl = api_url.replace(/\/+$/, "");

    try {
      const urlObj = new URL(cleanApiUrl);
      if (urlObj.hostname.includes("rapidapi.com")) {
        headers["x-rapidapi-key"] = api_key;
        headers["x-rapidapi-host"] = urlObj.hostname;
      } else {
        headers["x-apisports-key"] = api_key;
      }
    } catch (e) {
      headers["x-apisports-key"] = api_key;
    }

    // --- FIFA WORLD CUP 2026 SYNC ---
    if (targetKey === "fifa-world-cup-2026") {
      const wcService = new WorldCupSyncService(supabase, api_key, api_url, dynamicSportCategory);
      const processedCount = await wcService.syncAllStages();
      
      await supabase.from("sport_settings").update({ last_synced_at: new Date().toISOString() }).eq("id", sportId);
      revalidatePath("/dashboard/matches");
      
      return { 
        success: true, 
        message: `FIFA World Cup 2026 Sync complete. Processed ${processedCount} matches.` 
      };
    }

    // --- FOOTBALL SYNC ---
    if (targetKey === "football") {
      console.log("=== EXECUTING DEDICATED FOOTBALL SYNC ===");
      const footballLeagues = [47, 77]; // Premier League, World Cup
      const fetchLeagueMatches = async (leagueId: number) => {
        const fixturesUrl = `${cleanApiUrl}/football-get-all-matches-by-league?leagueid=${leagueId}`;
        const res = await fetch(fixturesUrl, { method: "GET", headers });
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const json = await res.json();
        const matches = json.response?.matches || json.response || json.matches || [];
        return { leagueId, matches };
      };

      const results = await Promise.all(footballLeagues.map(fetchLeagueMatches));
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate()); 
      const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30, 23, 59, 59, 999);

      const allMatches: any[] = [];
      results.forEach(({ leagueId, matches }) => {
        matches.forEach((item: any) => allMatches.push({ ...item, leagueId }));
      });

      let filteredMatches = allMatches.filter((item: any) => {
        const rawDate = item.status?.utcTime || item.fixture?.date || item.timestamp || item.date;
        if (!rawDate) return false;
        const matchTime = new Date(rawDate);
        return matchTime >= startDate && matchTime <= endDate;
      });

      if (filteredMatches.length > 0) {
        const mappedMatches = filteredMatches.map((item: any) => {
          let status = "scheduled";
          if (item.status?.finished || item.fixture?.status?.short === "FT") status = "finished";
          else if (item.status?.started || item.fixture?.status?.short === "1H") status = "live";

          return {
            id: String(item.id || item.fixture?.id),
            league_id: item.leagueId,
            sport_category: dynamicSportCategory,
            competitor_a: item.home?.name || item.teams?.home?.name || null,
            competitor_b: item.away?.name || item.teams?.away?.name || null,
            event_title: item.tournament?.stage || item.league?.round || null,
            kickoff_time: item.status?.utcTime || item.fixture?.date || new Date().toISOString(),
            status,
          };
        });

        await supabase.from("matches").upsert(mappedMatches, { onConflict: "id" });
      }

      await supabase.from("sport_settings").update({ last_synced_at: new Date().toISOString() }).eq("id", sportId);
      revalidatePath("/dashboard/matches");
      return { success: true, message: `Sync Football complete. Processed ${filteredMatches.length} matches.` };
    }

    // --- NBA SYNC ---
    if (targetKey === "nba") {
      console.log("=== EXECUTING DEDICATED NBA SYNC ===");
      let { data: nbaLeague } = await supabase.from("leagues").select("id").eq("sport_category", "nba").limit(1).single();
      let leagueId = nbaLeague?.id || 1;
      if (!nbaLeague) {
        await supabase.from("leagues").upsert({ id: 1, sport_category: "nba", name: "NBA", country_code: "USA", is_popular: true });
      }

      const allEvents: any[] = [];
      const today = new Date();
      for (let i = 0; i < 31; i++) {
        const d = new Date(today); d.setDate(today.getDate() + i);
        const dateStr = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
        const res = await fetch(`${cleanApiUrl}/nba-schedule-by-date?date=${dateStr}`, { method: "GET", headers });
        if (res.ok) {
          const json = await res.json();
          allEvents.push(...(json.response?.Events || []));
        }
      }

      if (allEvents.length > 0) {
        const mappedMatches = allEvents.map((item: any) => ({
          id: String(item.id),
          league_id: leagueId,
          sport_category: dynamicSportCategory,
          competitor_a: item.competitors?.find((c: any) => c.isHome)?.displayName || "Home",
          competitor_b: item.competitors?.find((c: any) => !c.isHome)?.displayName || "Away",
          event_title: item.status?.detail || "NBA Regular Season",
          kickoff_time: item.date || new Date().toISOString(),
          status: item.completed ? "finished" : "scheduled",
        }));
        await supabase.from("matches").upsert(mappedMatches);
      }
      await supabase.from("sport_settings").update({ last_synced_at: new Date().toISOString() }).eq("id", sportId);
      revalidatePath("/dashboard/matches");
      return { success: true, message: `Sync NBA complete. Processed ${allEvents.length} events.` };
    }

    // --- RUGBY / NRL SYNC (TODAY ONLY) ---
    if (targetKey === "rugby" || targetKey === "nrl") {
      console.log("=== EXECUTING DEDICATED RUGBY (NRL) SYNC ===");
      let { data: rugbyLeague } = await supabase.from("leagues").select("id").eq("sport_category", "rugby").limit(1).single();
      let leagueId = rugbyLeague?.id || 294;
      if (!rugbyLeague) {
        await supabase.from("leagues").upsert({ id: 294, sport_category: "rugby", name: "NRL", country_code: "AUS", is_popular: true });
      }

      const d = new Date();
      const scheduleUrl = `${cleanApiUrl}/api/rugby/matches/${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
      const res = await fetch(scheduleUrl, { method: "GET", headers: { ...headers, "Content-Type": "application/json" } });
      let events = [];
      if (res.ok) {
        const json = await res.json();
        events = json.events || [];
        const mapped = events.map((item: any) => ({
          id: String(item.id),
          league_id: leagueId,
          sport_category: dynamicSportCategory,
          competitor_a: item.homeTeam?.name || "Home",
          competitor_b: item.awayTeam?.name || "Away",
          event_title: item.tournament?.name || "NRL Premiership",
          kickoff_time: item.startTimestamp ? new Date(item.startTimestamp * 1000).toISOString() : new Date().toISOString(),
          status: item.status?.type === "finished" ? "finished" : "scheduled",
        }));
        if (mapped.length > 0) await supabase.from("matches").upsert(mapped);
      }
      await supabase.from("sport_settings").update({ last_synced_at: new Date().toISOString() }).eq("id", sportId);
      revalidatePath("/dashboard/matches");
      return { success: true, message: `Sync NRL complete. Processed ${events.length} events.` };
    }

    // --- UFC SYNC ---
    if (targetKey === "ufc") {
      console.log("=== EXECUTING DEDICATED UFC SYNC ===");
      const res = await fetch(`${cleanApiUrl}/leagues`, { method: "GET", headers });
      const json = await res.json();
      const ufcLeague = (json.response || []).find((l: any) => l.league?.name?.includes("UFC")) || json.response?.[0];
      if (!ufcLeague) return { success: false, error: "UFC League not found." };
      
      const leagueId = ufcLeague.league.id;
      await supabase.from("leagues").upsert({ id: leagueId, sport_category: "ufc", name: ufcLeague.league.name, country_code: "INT", is_popular: true });

      const fRes = await fetch(`${cleanApiUrl}/events?league=${leagueId}&next=20`, { method: "GET", headers });
      const fJson = await fRes.json();
      const events = fJson.response || [];
      const mapped = events.map((item: any) => ({
        id: String(item.id),
        league_id: leagueId,
        sport_category: dynamicSportCategory,
        competitor_a: item.teams?.home?.name || "TBD",
        competitor_b: item.teams?.away?.name || "TBD",
        event_title: item.league?.round || "UFC Event",
        kickoff_time: item.fixture?.date || new Date().toISOString(),
        status: item.fixture?.status?.short === "FT" ? "finished" : "scheduled",
      }));
      if (mapped.length > 0) await supabase.from("matches").upsert(mapped);
      await supabase.from("sport_settings").update({ last_synced_at: new Date().toISOString() }).eq("id", sportId);
      revalidatePath("/dashboard/matches");
      return { success: true, message: `UFC Sync complete. Processed ${mapped.length} events.` };
    }

    // --- F1 SYNC ---
    if (targetKey === "f1") {
      console.log("=== EXECUTING DEDICATED F1 SYNC ===");
      const res = await fetch(`${cleanApiUrl}/competitions`, { method: "GET", headers });
      const json = await res.json();
      const currentSeason = json.response?.[0];
      if (!currentSeason) return { success: false, error: "F1 Season not found." };

      const competitionId = currentSeason.id;
      await supabase.from("leagues").upsert({ id: competitionId, sport_category: "f1", name: currentSeason.name, country_code: "INT", is_popular: true });

      const fRes = await fetch(`${cleanApiUrl}/races?competition=${competitionId}&next=10`, { method: "GET", headers });
      const fJson = await fRes.json();
      const races = fJson.response || [];
      const mapped = races.map((item: any) => ({
        id: String(item.id || Math.random()),
        league_id: competitionId,
        sport_category: dynamicSportCategory,
        competitor_a: null,
        competitor_b: null,
        event_title: item.competition?.location?.city ? `${item.competition.name} - ${item.competition.location.city}` : item.competition?.name,
        kickoff_time: item.date || new Date().toISOString(),
        status: item.status === "Completed" ? "finished" : "scheduled",
      }));
      if (mapped.length > 0) await supabase.from("matches").upsert(mapped);
      await supabase.from("sport_settings").update({ last_synced_at: new Date().toISOString() }).eq("id", sportId);
      revalidatePath("/dashboard/matches");
      return { success: true, message: `F1 Sync complete. Processed ${mapped.length} races.` };
    }

    // --- GENERAL FALLBACK SYNC ---
    let leaguesUrl = `${api_url}/leagues`;
    if (targetKey === "football") leaguesUrl = `${api_url}/football-popular-leagues`;

    const res = await fetch(leaguesUrl, { method: "GET", headers, signal: AbortSignal.timeout(10000) });
    let leaguesList = [];
    if (res.ok) {
      const json = await res.json();
      leaguesList = json.response?.popular || json.response || [];
    }

    const mappedLeagues = leaguesList.map((item: any) => {
      const isApiSports = !!item.league;
      return {
        id: isApiSports ? item.league.id : (item.id ?? Math.floor(Math.random() * 1000)),
        sport_category: targetKey,
        name: isApiSports ? item.league.name : (item.name ?? "Unknown"),
        localized_name: item.localizedName || (isApiSports ? item.league.name : item.name),
        country_code: isApiSports ? (item.country?.code ?? "INT") : (item.ccode ?? "INT"),
        logo_url: isApiSports ? item.league.logo : (item.logo || null),
        is_popular: true,
      };
    });

    if (mappedLeagues.length > 0) await supabase.from("leagues").upsert(mappedLeagues, { onConflict: "id" });

    if (have_leagues && mappedLeagues.length === 0) {
      return { success: false, error: "Tidak ada liga yang tersedia untuk sinkronisasi." };
    }

    const matchesToUpsert: any[] = [];
    if (!have_leagues) {
      const fRes = await fetch(`${api_url}/fixtures?next=50`, { method: "GET", headers });
      if (fRes.ok) {
        const fJson = await fRes.json();
        const list = fJson.response || fJson.matches || [];
        for (const item of list) {
          matchesToUpsert.push({
            id: String(item.id || item.fixture?.id || Math.random()),
            league_id: null,
            sport_category: dynamicSportCategory,
            competitor_a: item.home_team_name || item.teams?.home?.name || null,
            competitor_b: item.away_team_name || item.teams?.away?.name || null,
            kickoff_time: item.fixture?.date || item.status?.utcTime || new Date().toISOString(),
            status: "scheduled",
          });
        }
      }
    } else {
      for (const league of mappedLeagues) {
        const fRes = await fetch(`${api_url}/fixtures?league=${league.id}&next=50`, { method: "GET", headers });
        if (fRes.ok) {
          const fJson = await fRes.json();
          const list = fJson.response || fJson.matches || [];
          for (const item of list) {
            matchesToUpsert.push({
              id: String(item.id || item.fixture?.id || Math.random()),
              league_id: league.id,
              sport_category: dynamicSportCategory,
              competitor_a: item.home_team_name || item.teams?.home?.name || null,
              competitor_b: item.away_team_name || item.teams?.away?.name || null,
              kickoff_time: item.fixture?.date || item.status?.utcTime || new Date().toISOString(),
              status: "scheduled",
            });
          }
        }
      }
    }

    if (matchesToUpsert.length > 0) await supabase.from("matches").upsert(matchesToUpsert, { onConflict: "id" });
    await supabase.from("sport_settings").update({ last_synced_at: new Date().toISOString() }).eq("id", sportId);
    revalidatePath("/dashboard/matches");

    return { success: true, message: `Sinkronisasi Berhasil. Memproses ${matchesToUpsert.length} pertandingan.` };

  } catch (error: any) {
    console.error("Pipeline error:", error);
    return { success: false, error: error.message || "Terjadi kesalahan sistem." };
  }
}
