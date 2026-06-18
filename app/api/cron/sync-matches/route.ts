import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { headers } from "next/headers";
import { WhatsAppService } from "@/lib/whatsapp/service";

interface SubscriberWithTenant {
  id: string;
  email: string;
  whatsapp_number: string;
  favorite_sports: string[];
  favorite_teams: string[];
  is_consented: boolean;
  tenants: { name: string } | null;
}

export async function GET(req: NextRequest) {
  await headers(); // Force dynamic route execution

  // --- Scheduler Authentication ---
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const providedSecret = req.headers.get("x-cron-secret");
    if (providedSecret !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    console.warn(
      "[sync-matches] WARNING: Scheduler protection disabled. Set CRON_SECRET to secure this endpoint."
    );
  }
  // ---------------------------------

  try {
    const supabase = createAdminClient();

    // 1. Query upcoming scheduled matches in the next 24 hours
    const now = new Date().toISOString();
    const oneDayFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    interface MatchWithLeague {
      id: string;
      competitor_a: string | null;
      competitor_b: string | null;
      event_title: string | null;
      kickoff_time: string;
      status: string;
      league_id: number;
      leagues: {
        sport_category: string;
      } | null;
    }

    const { data: upcomingMatches, error: matchError } = await supabase
      .from("matches")
      .select(`
        id,
        competitor_a,
        competitor_b,
        event_title,
        kickoff_time,
        status,
        league_id,
        leagues (
          sport_category
        )
      `)
      .eq("status", "scheduled")
      .gte("kickoff_time", now)
      .lte("kickoff_time", oneDayFromNow);

    if (matchError) {
      console.error("Error fetching upcoming matches:", matchError);
      return NextResponse.json({ success: false, error: "Failed to fetch matches" }, { status: 500 });
    }

    if (!upcomingMatches || upcomingMatches.length === 0) {
      return NextResponse.json({ success: true, message: "Sync complete. No upcoming matches to process." });
    }

    // 2. Query subscribers that are consented
    const { data: rawSubscribers, error: subError } = await supabase
      .from("subscribers")
      .select("id, email, whatsapp_number, favorite_sports, favorite_teams, is_consented, tenants(name)")
      .eq("is_consented", true);

    if (subError) {
      console.error("Error fetching subscribers:", subError);
      return NextResponse.json({ success: false, error: "Failed to fetch subscribers" }, { status: 500 });
    }

    const subscribers = (rawSubscribers || []) as unknown as SubscriberWithTenant[];

    // 3. Query existing logs to avoid duplicate notifications
    const matchIds = upcomingMatches.map((m) => m.id);
    const { data: existingLogs, error: logsQueryError } = await supabase
      .from("notification_logs")
      .select("subscriber_id, match_id, channel")
      .in("match_id", matchIds);

    if (logsQueryError) {
      console.error("Error fetching existing notification logs:", logsQueryError);
    }

    const existingLogKeys = new Set(
      (existingLogs || []).map((l) => `${l.subscriber_id}_${l.match_id}_${l.channel}`)
    );

    // 4. Match subscribers to upcoming matches
    interface NotificationTask {
      subscriber: SubscriberWithTenant;
      match: MatchWithLeague;
      channel: "whatsapp" | "email";
    }

    const notificationTasks: NotificationTask[] = [];

    for (const match of upcomingMatches as unknown as MatchWithLeague[]) {
      const sport = match.leagues?.sport_category || "football";
      const compA = match.competitor_a || "";
      const compB = match.competitor_b || "";

      for (const sub of subscribers) {
        const likesSport = sub.favorite_sports?.includes(sport);
        const likesTeam = sub.favorite_teams?.some(
          (t: string) =>
            (compA && t.toLowerCase() === compA.toLowerCase()) ||
            (compB && t.toLowerCase() === compB.toLowerCase())
        );

        if (likesSport || likesTeam) {
          if (sub.whatsapp_number) {
            const key = `${sub.id}_${match.id}_whatsapp`;
            if (!existingLogKeys.has(key)) {
              notificationTasks.push({ subscriber: sub, match, channel: "whatsapp" });
            }
          }
          if (sub.email) {
            const key = `${sub.id}_${match.id}_email`;
            if (!existingLogKeys.has(key)) {
              notificationTasks.push({ subscriber: sub, match, channel: "email" });
            }
          }
        }
      }
    }

    if (notificationTasks.length === 0) {
      return NextResponse.json({ success: true, message: "Sync complete. No new notifications to send." });
    }

    // 5. Create transaction rows in `notification_logs` with 'pending' state
    const pendingLogs = notificationTasks.map((task) => ({
      subscriber_id: task.subscriber.id,
      match_id: task.match.id,
      channel: task.channel,
      status: "pending",
    }));

    const { data: insertedLogs, error: logError } = await supabase
      .from("notification_logs")
      .insert(pendingLogs)
      .select("id, subscriber_id, match_id, channel");

    if (logError) {
      console.error("Error creating logs:", logError);
      return NextResponse.json({ success: false, error: "Failed to create notification logs" }, { status: 500 });
    }

    // 6. Real Message Dispatch Loop
    const templateName = process.env.SPORTS_REMINDER_WHATSAPP_TEMPLATE_NAME || "sports_reminder_alert";

    for (const log of insertedLogs || []) {
      const task = notificationTasks.find(
        (t) =>
          t.subscriber.id === log.subscriber_id &&
          t.match.id === log.match_id &&
          t.channel === log.channel
      );
      if (!task) continue;

      const { subscriber: sub, match } = task;

      if (log.channel === "whatsapp") {
        if (!sub.whatsapp_number) continue;

        try {
          const tenantName = sub.tenants?.name || "Sports Reminder Pub";
          const competitorA = match.competitor_a || "TBD";
          const competitorB = match.competitor_b || "TBD";
          const kickoffFormatted = new Date(match.kickoff_time).toLocaleString("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
          });

          // Construct parameters: [subscriber email/name, competitor_a, competitor_b, kickoff_time, tenant_name]
          const templateParameters = [
            { type: "text" as const, text: sub.email || "Subscriber" },
            { type: "text" as const, text: competitorA },
            { type: "text" as const, text: competitorB },
            { type: "text" as const, text: kickoffFormatted },
            { type: "text" as const, text: tenantName },
          ];

          const result = await WhatsAppService.sendTemplate(
            sub.whatsapp_number,
            templateName,
            "en",
            templateParameters
          );

          if (result.success && result.messageId) {
            await supabase
              .from("notification_logs")
              .update({
                status: "sent",
                provider_message_id: result.messageId,
                sent_at: new Date().toISOString(),
              })
              .eq("id", log.id);

            console.log(`[WhatsApp Sync] Notification log ID ${log.id} successfully sent. Provider Message ID: ${result.messageId}`);
          } else {
            await supabase
              .from("notification_logs")
              .update({
                status: "failed",
                error_message: result.error || "Failed to dispatch WhatsApp template.",
                retry_count: 1,
              })
              .eq("id", log.id);

            console.error(`[WhatsApp Sync] Failed to dispatch log ID ${log.id}: ${result.error}`);
          }
        } catch (err: any) {
          await supabase
            .from("notification_logs")
            .update({
              status: "failed",
              error_message: err.message || "An unexpected error occurred during dispatch.",
              retry_count: 1,
            })
            .eq("id", log.id);

          console.error(`[WhatsApp Sync] Unexpected error for log ID ${log.id}:`, err);
        }
      } else if (log.channel === "email") {
        // Simple fallback success update for simulated email channel
        await supabase
          .from("notification_logs")
          .update({
            status: "success",
            sent_at: new Date().toISOString(),
          })
          .eq("id", log.id);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${insertedLogs.length} notifications.`,
    });
  } catch (error) {
    console.error("Unexpected cron error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
