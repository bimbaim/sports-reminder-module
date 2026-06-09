"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function createTenant(formData: FormData) {
  const name = formData.get("name")?.toString().trim();
  const slug = formData.get("slug")?.toString().trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const address = formData.get("address")?.toString().trim();
  const city = formData.get("city")?.toString().trim();

  if (!name || !slug || !address || !city) {
    return { success: false, error: "Name, slug, address, and city are required." };
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("tenants")
    .insert({
      name,
      slug,
      address,
      city,
      state: formData.get("state")?.toString().trim() || null,
      postal_code: formData.get("postal_code")?.toString().trim() || null,
      contact_email: formData.get("contact_email")?.toString().trim() || null,
      phone_number: formData.get("phone_number")?.toString().trim() || null,
      maps_url: formData.get("maps_url")?.toString().trim() || null,
      logo_url: formData.get("logo_url")?.toString().trim() || null,
      primary_color: formData.get("primary_color")?.toString() || "#6366f1",
      secondary_color: formData.get("secondary_color")?.toString() || "#ffffff",
      theme_mode: formData.get("theme_mode")?.toString() || "light",
      custom_cta_text: formData.get("custom_cta_text")?.toString().trim() || "Remind Me",
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error("Create Tenant Error:", error);
    if (error.code === "23505") {
      return { success: false, error: `Slug "${slug}" is already taken. Try a different one.` };
    }
    return { success: false, error: "Failed to create tenant." };
  }

  revalidatePath("/dashboard/tenants");
  revalidatePath("/dashboard/widgets");
  return { success: true, tenant: data };
}

export async function deleteTenant(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("tenants").delete().eq("id", id);

  if (error) {
    console.error("Delete Tenant Error:", error);
    return { success: false, error: "Failed to delete tenant." };
  }

  revalidatePath("/dashboard/tenants");
  revalidatePath("/dashboard/widgets");
  return { success: true };
}

export async function toggleTenantStatus(id: string, currentStatus: boolean) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("tenants")
    .update({ is_active: !currentStatus })
    .eq("id", id);

  if (error) {
    console.error("Toggle Error:", error);
    return { success: false, error: "Failed to update tenant status." };
  }

  revalidatePath("/dashboard/tenants");
  return { success: true };
}

export async function updateTenantBranding(id: string, formData: FormData) {
  const primary_color = formData.get("primary_color")?.toString() || "#6366f1";
  const secondary_color = formData.get("secondary_color")?.toString() || "#ffffff";
  const logo_url = formData.get("logo_url")?.toString() || "";
  const theme_mode = formData.get("theme_mode")?.toString() || "light";
  const custom_cta_text = formData.get("custom_cta_text")?.toString() || "Remind Me";

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("tenants")
    .update({ primary_color, secondary_color, logo_url, theme_mode, custom_cta_text })
    .eq("id", id);

  if (error) {
    console.error("Update Branding Error:", error);
    return { success: false, error: "Failed to update branding." };
  }

  revalidatePath("/dashboard/tenants");
  revalidatePath("/dashboard/widgets");
  return { success: true };
}
