import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SPORTS_REMINDER_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.SPORTS_REMINDER_SUPABASE_SERVICE_ROLE_KEY || "placeholder-key",
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
