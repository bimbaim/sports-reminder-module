import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// In a real scenario, protect this with a secret key
export async function GET(req: NextRequest) {
  // const authHeader = req.headers.get('authorization');
  // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return new Response('Unauthorized', { status: 401 });
  // }

  try {
    const supabase = createAdminClient();

    // 1. Upsert a mock match into the `matches` table
    const mockMatchId = `match_${Date.now()}`;
    const { error: matchError } = await supabase.from("matches").upsert({
      id: mockMatchId,
      sport_type: "football",
      team_a: "Real Madrid",
      team_b: "Barcelona",
      match_time: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      status: "scheduled",
    });

    if (matchError) {
      console.error("Error upserting match:", matchError);
      return NextResponse.json({ success: false, error: "Failed to sync match" }, { status: 500 });
    }

    // 2. Query subscribers that care about this match
    // For MVP, we fetch all subscribers and filter in memory, or use a complex PostgREST query.
    // In production, we should write an optimized SQL function or precise OR query.
    // Let's use a broad query and filter just to simulate the business logic:
    const { data: subscribers, error: subError } = await supabase
      .from("subscribers")
      .select("id, email, whatsapp_number, favorite_sports, favorite_teams");

    if (subError) {
      return NextResponse.json({ success: false, error: "Failed to fetch subscribers" }, { status: 500 });
    }

    // Filter subscribers who like 'football' or either team
    const targetSubscribers = subscribers?.filter((sub) => {
      const likesSport = sub.favorite_sports?.includes("football");
      const likesTeam = sub.favorite_teams?.some(
        (t: string) => t.toLowerCase() === "real madrid" || t.toLowerCase() === "barcelona"
      );
      return likesSport || likesTeam;
    }) || [];

    if (targetSubscribers.length === 0) {
      return NextResponse.json({ success: true, message: "Sync complete. No subscribers to notify." });
    }

    // 3. Create transaction rows in `notification_logs` with 'pending' state
    const pendingLogs = targetSubscribers.flatMap((sub) => {
      const logs = [];
      if (sub.whatsapp_number) {
        logs.push({
          subscriber_id: sub.id,
          match_id: mockMatchId,
          channel: "whatsapp",
          status: "pending",
        });
      }
      if (sub.email) {
        logs.push({
          subscriber_id: sub.id,
          match_id: mockMatchId,
          channel: "email",
          status: "pending",
        });
      }
      return logs;
    });

    const { data: insertedLogs, error: logError } = await supabase
      .from("notification_logs")
      .insert(pendingLogs)
      .select("id");

    if (logError) {
      console.error("Error creating logs:", logError);
      return NextResponse.json({ success: false, error: "Failed to create notification logs" }, { status: 500 });
    }

    // 4. Simulate dispatching triggers and updating to success/failed
    // In reality, this would be a BullMQ worker job. Here we mock the processing:
    const logIds = insertedLogs.map((l) => l.id);
    
    // Simulate some async processing time
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Update all to success to simulate delivery
    const { error: updateError } = await supabase
      .from("notification_logs")
      .update({
        status: "success",
        sent_at: new Date().toISOString(),
      })
      .in("id", logIds);

    if (updateError) {
      console.error("Error updating logs:", updateError);
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${logIds.length} notifications for ${targetSubscribers.length} subscribers.`,
    });
  } catch (error) {
    console.error("Unexpected cron error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
