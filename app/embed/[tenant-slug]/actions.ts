"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function subscribeToTenant(tenantId: string, formData: FormData) {
  try {
    const email = formData.get("email")?.toString();
    const whatsapp_number = formData.get("whatsapp_number")?.toString();
    const favorite_sports = formData.getAll("favorite_sports") as string[];
    const favorite_teams_str = formData.get("favorite_teams")?.toString() || "";
    
    // Parse teams string (e.g. from a comma separated hidden input or tag input)
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
