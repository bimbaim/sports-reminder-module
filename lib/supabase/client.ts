import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SPORTS_REMINDER_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SPORTS_REMINDER_SUPABASE_ANON_KEY!,
  );
}
