"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function updateWidgetSettings(id: string, formData: FormData) {
  const settings = {
    primary_color: formData.get("primary_color")?.toString(),
    secondary_color: formData.get("secondary_color")?.toString(),
    custom_cta_text: formData.get("custom_cta_text")?.toString() || "Remind Me",
    theme_mode: formData.get("theme_mode")?.toString() || "light",
    font_family: formData.get("font_family")?.toString() || "var(--font-inter), sans-serif",
    font_size: formData.get("font_size")?.toString() || "14px",
    logo_url: formData.get("logo_url")?.toString() || null,
  };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("tenants")
    .update({ 
      widget_settings: settings
    })
    .eq("id", id);

  if (error) {
    console.error("Update Widget Error:", error);
    return { success: false, error: "Failed to update widget settings." };
  }

  revalidatePath("/dashboard/widgets");
  revalidatePath("/dashboard/tenants");

  return { success: true };
}
