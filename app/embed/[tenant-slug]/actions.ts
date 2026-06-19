"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const subscribeSchema = z.object({
  email: z
    .string({ message: "Email is required." })
    .min(1, "Email is required.")
    .email("Enter a valid email address."),
  whatsapp_number: z
    .string({ message: "WhatsApp number is required." })
    .min(1, "WhatsApp number is required.")
    .transform((val) => val.replace(/[\s\-\(\)]/g, "")) // normalize spaces, dashes, parentheses
    .refine((val) => /^\+?\d+$/.test(val), {
      message: "WhatsApp number must contain digits only.",
    })
    .transform((val) => val.replace(/^\+/, "")) // Strip leading + if present
    .transform((val) => {
      // Convert Indonesian local mobile number format (08...) to international (628...)
      if (val.startsWith("08")) {
        return "62" + val.slice(1);
      }
      return val;
    })
    .refine((val) => !val.startsWith("0"), {
      message: "WhatsApp number must not start with 0.",
    })
    .refine((val) => val.length >= 10, {
      message: "WhatsApp number must be at least 10 digits.",
    })
    .refine((val) => val.length <= 15, {
      message: "WhatsApp number must be at most 15 digits.",
    }),
  is_consented: z
    .preprocess((val) => val === "true" || val === true, z.boolean())
    .refine((val) => val === true, {
      message: "You must agree to receive WhatsApp notifications to subscribe.",
    }),
  favorite_sports: z
    .array(z.string())
    .min(1, "Please select at least one sport/league."),
  favorite_teams: z.array(z.string()).optional(),
});

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

  return Array.from(teams).sort((a, b) => a.localeCompare(b));
}

export async function getEventsForSport(sportCategory: string) {
  if (!sportCategory) return [];

  const supabase = createAdminClient();
  const { data: matches, error } = await supabase
    .from("matches")
    .select("id, competitor_a, competitor_b, tournament_name, kickoff_time")
    .eq("sport_category", sportCategory)
    .gte("kickoff_time", new Date().toISOString())
    .order("kickoff_time", { ascending: true })
    .limit(50);

  if (error) {
    console.error("Error fetching events for sport:", error);
    return [];
  }

  return matches || [];
}

export async function subscribeToTenant(tenantId: string, formData: FormData) {
  try {
    const email = formData.get("email")?.toString();
    const whatsapp_number = formData.get("whatsapp_number")?.toString();
    const is_consented = formData.get("is_consented")?.toString();
    const favorite_sports = formData.getAll("favorite_sports") as string[];
    const favorite_teams_str = formData.get("favorite_teams")?.toString() || "";
    
    const favorite_teams = favorite_teams_str
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const validationResult = subscribeSchema.safeParse({
      email,
      whatsapp_number,
      is_consented,
      favorite_sports,
      favorite_teams,
    });

    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]?.message || "Validation failed.";
      return { success: false, error: firstError };
    }

    const {
      email: validatedEmail,
      whatsapp_number: validatedWhatsapp,
      is_consented: validatedConsent,
      favorite_sports: validatedSports,
      favorite_teams: validatedTeams = [],
    } = validationResult.data;

    const supabase = createAdminClient();

    const { error } = await supabase.from("subscribers").insert({
      tenant_id: tenantId,
      email: validatedEmail,
      whatsapp_number: validatedWhatsapp,
      favorite_sports: validatedSports,
      favorite_teams: validatedTeams,
      is_consented: validatedConsent,
      consented_at: new Date().toISOString(),
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

