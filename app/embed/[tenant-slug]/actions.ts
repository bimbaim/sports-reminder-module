"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function getTeamsForLeagues(leagueIds: number[]) {
  if (!leagueIds || leagueIds.length === 0) return [];

  const supabase = createAdminClient();
  const { data: matches, error } = await supabase
    .from("matches")
    .select("competitor_a, competitor_b")
    .in("league_id", leagueIds);

  if (error) {
    console.error("Error fetching teams for leagues:", error);
    return [];
  }

  const teams = new Set<string>();
  matches?.forEach((m) => {
    if (m.competitor_a && m.competitor_a.trim()) teams.add(m.competitor_a.trim());
    if (m.competitor_b && m.competitor_b.trim()) teams.add(m.competitor_b.trim());
  });

  return Array.from(teams).sort();
}

export async function subscribeToTenant(tenantId: string, formData: FormData) {
  try {
    const email = formData.get("email")?.toString();
    const whatsapp_number = formData.get("whatsapp_number")?.toString();
    const favorite_sports = formData.getAll("favorite_sports") as string[];
    const favorite_teams_str = formData.get("favorite_teams")?.toString() || "";
    
    const favorite_teams = favorite_teams_str
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    if (!email || !whatsapp_number) {
      return { success: false, error: "Email and WhatsApp number are required." };
    }

    const supabase = createAdminClient();

    const { error } = await supabase.from("subscribers").insert({
      tenant_id: tenantId,
      email,
      whatsapp_number,
      favorite_sports: favorite_sports.length > 0 ? favorite_sports : ["football"],
      favorite_teams,
    });

    if (error) {
      if (error.code === "23505") { // unique violation
        return { success: false, error: "You are already subscribed to this pub's reminders." };
      }
      console.error("Subscription Error:", error);
      return { success: false, error: "Failed to subscribe. Please try again." };
    }

    return { success: true };
  } catch (err) {
    console.error("Unexpected error during subscription:", err);
    return { success: false, error: "An unexpected error occurred." };
  }
}
