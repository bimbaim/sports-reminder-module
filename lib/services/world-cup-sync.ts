import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Service to sync FIFA World Cup 2026 data from RapidAPI.
 * Handles both Group and Knockout stages.
 */
export class WorldCupSyncService {
  private supabase: SupabaseClient;
  private apiKey: string;
  private apiUrl: string;
  private sportCategory: string;
  private leagueId = 77; 
  // We'll use 2026 for specifically "FIFA World Cup 2026" sport category.
  private customLeagueId = 2026; 

  constructor(supabase: SupabaseClient, apiKey: string, apiUrl: string, sportCategory: string = "fifa-world-cup-2026") {
    this.supabase = supabase;
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
    this.sportCategory = sportCategory;
  }

  /**
   * Main execution flow for syncing all match data.
   */
  async syncAllStages(): Promise<number> {
    console.log("=== STARTING FIFA WORLD CUP 2026 SYNC ===");
    
    // 1. Ensure the league entry exists for this specific sport category
    await this.ensureLeagueExists();

    const stages = ["group", "ko"];
    let totalProcessed = 0;

    for (const stage of stages) {
      console.log(`Syncing stage: ${stage}...`);
      try {
        const matches = await this.fetchStageData(stage);
        if (matches && matches.length > 0) {
          await this.upsertMatches(matches, stage);
          totalProcessed += matches.length;
          console.log(`Successfully processed ${matches.length} matches for ${stage} stage.`);
        } else {
          console.log(`No matches found for stage: ${stage}.`);
        }
      } catch (err) {
        console.error(`Error syncing stage ${stage}:`, err);
        // Continue to next stage even if one fails
      }
    }

    return totalProcessed;
  }

  /**
   * Ensures the FIFA World Cup 2026 league exists in the database.
   * This is critical for the widget to display the "Favorite Teams" list.
   */
  private async ensureLeagueExists() {
    const { error } = await this.supabase.from("leagues").upsert({
      id: this.customLeagueId,
      sport_category: this.sportCategory,
      name: "FIFA World Cup 2026",
      country_code: "USA",
      is_popular: true,
      logo_url: "https://upload.wikimedia.org/wikipedia/en/a/a7/2026_FIFA_World_Cup_logo.svg",
    }, { onConflict: "id" });

    if (error) {
      console.error("Error creating World Cup league:", error);
      throw new Error(`Failed to ensure league exists: ${error.message}`);
    }
  }

  /**
   * Fetches match data from the external API for a specific stage.
   */
  private async fetchStageData(stage: string): Promise<any[]> {
    const cleanApiUrl = this.apiUrl.replace(/\/+$/, "");
    const url = `${cleanApiUrl}/wc/draw?stage=${stage}`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-rapidapi-key": this.apiKey,
        "x-rapidapi-host": new URL(cleanApiUrl).hostname,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error ${response.status}: ${errorText || response.statusText}`);
    }

    const json = await response.json();
    
    // Support various common JSON response structures
    return json.response || json.matches || (Array.isArray(json) ? json : []);
  }

  /**
   * Maps and upserts API data into the local Supabase database.
   */
  private async upsertMatches(apiMatches: any[], stage: string) {
    const mappedMatches = apiMatches.map((item: any) => {
      // Extract data with fallbacks based on suggested API fields
      const kickoff = item.kickoff || item.date || item.timestamp || new Date().toISOString();
      const round = item.round || "";
      const group = item.group || "";
      const home = item.home || item.homeTeam || "TBD";
      const away = item.away || item.awayTeam || "TBD";
      const statusText = item.statusText || item.status || "scheduled";
      
      // Map API status to local status schema: scheduled, live, finished
      let status = "scheduled";
      const s = statusText.toLowerCase();
      if (s.includes("finish") || s.includes("ft") || s.includes("end") || s.includes("completed")) {
        status = "finished";
      } else if (s.includes("live") || s.includes("playing") || s.includes("1h") || s.includes("2h")) {
        status = "live";
      }

      // Construct a meaningful event title combining Group and Round
      let eventTitle = "";
      if (group && round) eventTitle = `${group} - ${round}`;
      else if (group) eventTitle = group;
      else if (round) eventTitle = round;
      else eventTitle = stage === "ko" ? "Knockout Stage" : "Group Stage";

      const matchData: any = {
        id: item.matchId || `wc26-${stage}-${home}-${away}-${new Date(kickoff).getTime()}`.toLowerCase().replace(/\s+/g, '-'),
        league_id: this.customLeagueId,
        sport_category: this.sportCategory,
        competitor_a: home,
        competitor_b: away,
        event_title: eventTitle,
        kickoff_time: kickoff,
        status: status,
      };

      // Add score fields if available in API response
      // Note: These require 'score_home' and 'score_away' columns in the 'matches' table
      if (item.scoreHome !== undefined && item.scoreHome !== null) {
        matchData.score_home = item.scoreHome;
      }
      if (item.scoreAway !== undefined && item.scoreAway !== null) {
        matchData.score_away = item.scoreAway;
      }

      return matchData;
    });

    if (mappedMatches.length === 0) return;

    const { error } = await this.supabase.from("matches").upsert(mappedMatches, { onConflict: "id" });
    
    if (error) {
      console.error("Supabase upsert error:", error);
      throw new Error(`Failed to upsert matches: ${error.message}`);
    }
  }
}
