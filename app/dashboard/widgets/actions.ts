"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function updateWidgetSettings(id: string, formData: FormData) {
  const primary_color = formData.get("primary_color")?.toString();
  const secondary_color = formData.get("secondary_color")?.toString();
  const custom_cta_text = formData.get("custom_cta_text")?.toString() || "Remind Me";
  const theme_mode = formData.get("theme_mode")?.toString() || "light";

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("tenants")
    .update({ primary_color, secondary_color, custom_cta_text, theme_mode })
    .eq("id", id);

  if (error) {
    console.error("Update Widget Error:", error);
    return { success: false, error: "Failed to update widget settings." };
  }

  revalidatePath("/dashboard/widgets");
  revalidatePath("/dashboard/tenants");

  return { success: true };
}
