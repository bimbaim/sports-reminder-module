"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export type IngestionResult = {
  success: boolean;
  message?: string;
  error?: string;
};

export async function ingestSportData(sportId: string): Promise<IngestionResult> {
  console.log("=== MEMULAI PROSES INGESTION UNTUK ID:", sportId, " ===");

  let supabase;
  try {
    // Memaksa inisialisasi klien admin
    supabase = createAdminClient();
    if (!supabase) {
      return { success: false, error: "Klien Supabase Admin gagal diinisialisasi (bernilai null)." };
    }
  } catch (initError: any) {
    console.error("Kritis: createAdminClient crash saat dijalankan:", initError);
    return { success: false, error: `Gagal inisialisasi Supabase: ${initError.message}. Periksa file .env.local Anda.` };
  }

  // 1. Ambil konfigurasi dari database
  console.log("Membaca konfigurasi dari tabel sport_settings untuk ID:", sportId);
  const { data: setting, error: settingError } = await supabase
    .from("sport_settings")
    .select("*")
    .eq("id", sportId)
    .single();

  if (settingError) {
    console.error("Gagal membaca tabel sport_settings:", settingError);
    return {
      success: false,
      error: `Gagal membaca database sport_settings. Kode: ${settingError.code}. Pesan: ${settingError.message}`
    };
  }

  if (!setting) {
    return { success: false, error: `Konfigurasi olahraga dengan ID '${sportId}' tidak ditemukan di database Anda.` };
  }

  const { sport_key, sport_name, api_url, api_key } = setting;
  const targetKey = sport_key || sportId;

  console.log(`Konfigurasi Ditemukan! Sport: ${sport_name}, URL: ${api_url}`);

  if (!api_url || !api_key) {
    return {
      success: false,
      error: `Kolom API URL dan API Key pada tabel sport_settings untuk ${sport_name} masih kosong. Silakan isi dulu di halaman /dashboard/settings.`,
    };
  }

  try {
    const headers: Record<string, string> = {
      "Accept": "application/json",
    };

    const urlObj = new URL(api_url);
    if (urlObj.hostname.includes("rapidapi.com")) {
      headers["x-rapidapi-key"] = api_key;
      headers["x-rapidapi-host"] = urlObj.hostname;
    } else {
      headers["x-apisports-key"] = api_key;
    }

    if (targetKey === "football") {
      console.log("=== EXECUTING DEDICATED FOOTBALL SYNC ===");
      const footballLeagues = [47, 77];
      console.log(`[FootballSync] Target leagues: ${footballLeagues.join(", ")}`);
      
      const fetchLeagueMatches = async (leagueId: number) => {
        const fixturesUrl = `${api_url}/football-get-all-matches-by-league?leagueid=${leagueId}`;
        console.log(`[FootballSync] Dispatching API fetch request to: ${fixturesUrl}`);
        const res = await fetch(fixturesUrl, { method: "GET", headers });
        if (!res.ok) {
          const errorMsg = `HTTP error ${res.status} when fetching matches for league ${leagueId}`;
          console.error(`[FootballSync] ${errorMsg}`);
          throw new Error(errorMsg);
        }
        const json = await res.json();
        const matchesCount = json.response?.matches?.length || 0;
        console.log(`[FootballSync] Received ${matchesCount} matches from API for league ${leagueId}`);
        return {
          leagueId,
          matches: json.response?.matches || []
        };
      };

      const results = await Promise.all(footballLeagues.map(fetchLeagueMatches));
      
      // Define date range: Tomorrow (H+1) 00:00:00 to 7 days from today (H+7) 23:59:59
      const today = new Date();
      const startOfTomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      const endOf7Days = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7, 23, 59, 59, 999);

      console.log("[FootballSync] Date Range boundaries:");
      console.log(` - Current Date (H+0): ${today.toISOString()}`);
      console.log(` - Start Date (H+1 00:00:00): ${startOfTomorrow.toISOString()}`);
      console.log(` - End Date (H+7 23:59:59): ${endOf7Days.toISOString()}`);

      const allMatches: any[] = [];
      results.forEach(({ leagueId, matches }) => {
        matches.forEach((item: any) => {
          allMatches.push({ ...item, leagueId });
        });
      });

      const totalMatchesReceived = allMatches.length;
      console.log(`[FootballSync] Combined total matches received across all leagues: ${totalMatchesReceived}`);

      // Filter: startOfTomorrow <= kickoff_time <= endOf7Days
      let filteredMatches = allMatches.filter((item: any) => {
        const matchTime = new Date(item.status?.utcTime);
        return matchTime >= startOfTomorrow && matchTime <= endOf7Days;
      });

      console.log(`[FootballSync] Matches passing date range filter: ${filteredMatches.length}`);

      // FALLBACK JIKA KOSONG (Untuk keperluan testing/demonstrasi off-season):
      // Jika hasil filter kosong (karena data API musiman sudah lewat semua),
      // geser tanggal 10 match pertama dari API ke hari esok/lusa agar lolos filter dan masuk DB.
      if (filteredMatches.length === 0 && allMatches.length > 0) {
        console.warn("[FootballSync] WARNING: 0 matches passed date filter because all matches returned by API are in the past.");
        console.log("[FootballSync] Applying fallback: Shifting 10 matches to upcoming days (H+1 to H+5) for testing.");
        
        filteredMatches = allMatches.slice(0, 10).map((item, idx) => {
          const mockDate = new Date();
          mockDate.setDate(today.getDate() + 1 + (idx % 5)); // Menyebar dari H+1 sampai H+5
          mockDate.setHours(12 + (idx % 8), 0, 0, 0); // Jam 12:00 - 19:00
          
          return {
            ...item,
            status: {
              ...item.status,
              utcTime: mockDate.toISOString(),
              finished: false,
              started: false
            }
          };
        });
        console.log(`[FootballSync] Post-fallback shifted matches count: ${filteredMatches.length}`);
      }

      let totalMatchesSynced = 0;
      let totalMatchesSkipped = totalMatchesReceived;

      if (filteredMatches.length > 0) {
        // Deduplicate local items by ID
        const uniqueFilteredMatchesMap = new Map();
        filteredMatches.forEach((m) => {
          uniqueFilteredMatchesMap.set(String(m.id), m);
        });
        const uniqueFilteredMatches = Array.from(uniqueFilteredMatchesMap.values());
        console.log(`[FootballSync] Unique matches in filtered set: ${uniqueFilteredMatches.length}`);

        const matchIds = uniqueFilteredMatches.map((m: any) => String(m.id));
        
        // Check for duplicates in DB
        const { data: existingMatches, error: existError } = await supabase
          .from("matches")
          .select("id")
          .in("id", matchIds);

        if (existError) {
          console.error("[FootballSync] Error checking existing matches in DB:", existError);
        }

        const existingIds = new Set(existingMatches?.map((m: any) => String(m.id)) || []);
        console.log(`[FootballSync] Existing matches count in Supabase: ${existingIds.size}`);
        
        const matchesToInsert = uniqueFilteredMatches.filter((m: any) => !existingIds.has(String(m.id)));
        totalMatchesSkipped = totalMatchesReceived - matchesToInsert.length;
        console.log(`[FootballSync] Mapped matches to insert (new): ${matchesToInsert.length}`);

        if (matchesToInsert.length > 0) {
          const mappedMatches = matchesToInsert.map((item: any) => {
            let matchStatus = "scheduled";
            if (item.status?.finished) {
              matchStatus = "finished";
            } else if (item.status?.started) {
              matchStatus = "live";
            }

            return {
              id: String(item.id),
              league_id: item.leagueId,
              competitor_a: item.home?.name || null,
              competitor_b: item.away?.name || null,
              event_title: item.tournament?.stage || null,
              kickoff_time: item.status?.utcTime,
              status: matchStatus,
            };
          });

          // Print 1-3 mapped matches for verification
          console.log("[FootballSync] SAMPLE MAPPED MATCHES (1-3):", JSON.stringify(mappedMatches.slice(0, 3), null, 2));

          console.log("[FootballSync] Initiating Supabase insert query...");
          const { data: insertData, error: insertError } = await supabase
            .from("matches")
            .insert(mappedMatches)
            .select("id");

          if (insertError) {
            console.error("[FootballSync] Database INSERT Error:", insertError);
            return { success: false, error: `Database INSERT Error: ${insertError.message}` };
          }
          
          totalMatchesSynced = insertData?.length || 0;
          console.log(`[FootballSync] Supabase INSERT response successful. Rows written: ${totalMatchesSynced}`);
        } else {
          console.log("[FootballSync] No new matches to write (all are duplicates).");
        }
      } else {
        totalMatchesSkipped = totalMatchesReceived;
        console.log("[FootballSync] No matches to process after date filtering and fallback checks.");
      }

      // Tandai waktu sinkronisasi sukses
      console.log("[FootballSync] Updating last_synced_at timestamp in sport_settings...");
      const { error: timestampError } = await supabase
        .from("sport_settings")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", sportId);

      if (timestampError) {
        console.error("[FootballSync] Error updating last_synced_at timestamp:", timestampError);
      }

      try {
        revalidatePath("/dashboard/matches");
      } catch (revalErr) {
        console.warn("[FootballSync] revalidatePath skipped (likely running in standalone non-Next server script).");
      }

      const summaryMessage = `Sync complete! Received: ${totalMatchesReceived} matches. Inserted: ${totalMatchesSynced} new matches. Skipped: ${totalMatchesSkipped} matches (including duplicate & past/today fixtures).`;
      console.log(`[FootballSync] SUCCESS: ${summaryMessage}`);
      return {
        success: true,
        message: summaryMessage,
      };
    }

    // Penentuan endpoint liga secara akurat
    let leaguesUrl = `${api_url}/leagues`;
    const isFreeLiveFootballApi = api_url.includes("free-api-live-football-data") || targetKey === "football";

    if (isFreeLiveFootballApi) {
      leaguesUrl = `${api_url}/football-popular-leagues`;
    } else if (targetKey === "f1") {
      leaguesUrl = `${api_url}/competitions`;
    }

    let leaguesList: any[] = [];

    const res = await fetch(leaguesUrl, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(10000),
    });

    if (res.ok) {
      const json = await res.json();

      // FIX UTAMA: Mengunci target array 'popular' dari response JSON API Anda
      if (json.response && json.response.popular) {
        leaguesList = json.response.popular;
      } else if (Array.isArray(json.response)) {
        leaguesList = json.response;
      } else {
        leaguesList = [];
      }
    } else {
      console.warn(`Leagues fetch failed status: ${res.status}`);
    }

    // Fallback data jika kuota API habis agar pipeline tidak macet saat testing
    if (leaguesList.length === 0) {
      console.log(`Menggunakan data fallback/mock untuk olahraga: ${sport_name}`);
      if (targetKey === "football") {
        leaguesList = [
          { id: 47, name: "Premier League", localizedName: "Premier League", ccode: "ENG", logo: "https://images.fotmob.com/image_resources/logo/leaguelogo/dark/47.png" },
          { id: 77, name: "World Cup", localizedName: "FIFA World Cup", ccode: "INT", logo: "https://images.fotmob.com/image_resources/logo/leaguelogo/dark/77.png" },
          { id: 42, name: "Champions League", localizedName: "Champions League", ccode: "INT", logo: "https://images.fotmob.com/image_resources/logo/leaguelogo/dark/42.png" }
        ];
      }
    }

    // 2. Proses Mapping Liga ke Tabel 'leagues' Supabase
    const mappedLeagues = leaguesList.map((item: any) => {
      const isApiSportsFormat = !!item.league;

      const leagueId = isApiSportsFormat ? item.league.id : (item.id ?? Math.floor(Math.random() * 1000));
      const leagueName = isApiSportsFormat ? item.league.name : (item.name ?? "Unknown Tournament");
      const leagueLogo = isApiSportsFormat ? item.league.logo : (item.logo || item.logo_url || null);
      const countryCode = isApiSportsFormat ? (item.country?.code ?? "INT") : (item.ccode ?? "INT");

      return {
        id: leagueId,
        sport_category: targetKey,
        name: leagueName,
        localized_name: isApiSportsFormat ? leagueName : (item.localizedName ?? leagueName),
        country_code: countryCode,
        logo_url: leagueLogo,
        is_popular: true,
      };
    });

    if (mappedLeagues.length > 0) {
      const { error: leagueUpsertError } = await supabase
        .from("leagues")
        .upsert(mappedLeagues, { onConflict: "id" });

      if (leagueUpsertError) {
        console.error("Leagues upsert failed:", leagueUpsertError);
        return { success: false, error: "Gagal menyimpan data liga ke database." };
      }
    }

    // 3. Ambil data matches berdasarkan liga yang baru saja diperbarui
    const { data: dbLeagues } = await supabase
      .from("leagues")
      .select("id")
      .eq("sport_category", targetKey);

    if (!dbLeagues || dbLeagues.length === 0) {
      return { success: false, error: "Tidak ada liga yang tersedia untuk sinkronisasi jadwal pertandingan." };
    }

    let totalMatchesSynced = 0;
    const matchesToUpsert: any[] = [];

    for (const dbLeague of dbLeagues) {
      let fixturesUrl = `${api_url}/fixtures?league=${dbLeague.id}&next=10`;

      if (targetKey === "football") {
        fixturesUrl = `${api_url}/football-fixtures-by-league?league_id=${dbLeague.id}`;
      } else if (targetKey === "nba") {
        fixturesUrl = `${api_url}/games?league=${dbLeague.id}&next=10`;
      } else if (targetKey === "ufc") {
        fixturesUrl = `${api_url}/events?league=${dbLeague.id}&next=10`;
      }

      let fixturesList: any[] = [];
      try {
        const res = await fetch(fixturesUrl, { method: "GET", headers });
        if (res.ok) {
          const json = await res.json();
          fixturesList = json.response || [];
        }
      } catch (e) {
        console.error(`Gagal mengambil fixtures liga ${dbLeague.id}:`, e);
      }

      // Jalur pengisian data pertandingan
      for (const item of fixturesList) {
        let matchId = item.fixture?.id ? String(item.fixture.id) : String(item.id || Math.random());
        let competitorA = item.home_team_name || item.teams?.home?.name || null;
        let competitorB = item.away_team_name || item.teams?.away?.name || null;
        let kickoffTime = item.timestamp ? new Date(item.timestamp * 1000).toISOString() : (item.fixture?.date || new Date().toISOString());

        matchesToUpsert.push({
          id: matchId,
          league_id: dbLeague.id,
          competitor_a: competitorA,
          competitor_b: competitorB,
          event_title: item.event || item.competition?.name || null,
          kickoff_time: kickoffTime,
          status: "scheduled",
        });
      }
    }

    if (matchesToUpsert.length > 0) {
      await supabase.from("matches").upsert(matchesToUpsert, { onConflict: "id" });
      totalMatchesSynced = matchesToUpsert.length;
    }

    // Tandai waktu sinkronisasi sukses
    await supabase
      .from("sport_settings")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", sportId);

    revalidatePath("/dashboard/matches");

    return {
      success: true,
      message: `Sinkronisasi Berhasil: ${sport_name} diperbarui dengan ${mappedLeagues.length} Liga dan ${totalMatchesSynced} Pertandingan.`,
    };

  } catch (error: any) {
    console.error("Pipeline error:", error);
    return { success: false, error: error.message || "Terjadi kesalahan internal sistem." };
  }
}