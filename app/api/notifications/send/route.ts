import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEmailService, isValidEmailProvider } from "@/lib/email/email-service-factory";
import { generateMatchAlertTemplate } from "@/lib/email/templates/match-alert-template";

interface SendNotificationBody {
  matchId: string;
  tenantId: string;
}

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();

  try {
    const body: SendNotificationBody = await request.json();
    const { matchId, tenantId } = body;

    // Validate inputs
    if (!matchId || !tenantId) {
      return NextResponse.json(
        { error: "Missing matchId or tenantId" },
        { status: 400 }
      );
    }

    // 1. Get match data
    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("*")
      .eq("id", matchId)
      .single();

    if (matchError || !match) {
      console.error("[Notification] Match not found:", matchError);
      return NextResponse.json(
        { error: "Match not found" },
        { status: 404 }
      );
    }

    // 2. Get tenant & email provider
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("id, name, primary_color, email_provider")
      .eq("id", tenantId)
      .single();

    if (tenantError || !tenant) {
      console.error("[Notification] Tenant not found:", tenantError);
      return NextResponse.json(
        { error: "Tenant not found" },
        { status: 404 }
      );
    }

    // Validate email provider
    if (!isValidEmailProvider(tenant.email_provider)) {
      return NextResponse.json(
        {
          error: `Invalid email provider configured for tenant: ${tenant.email_provider}`,
        },
        { status: 400 }
      );
    }

    // 3. Get email service instance
    const emailService = getEmailService(tenant.email_provider);

    // 4. Get subscribers interested in this match
    // Match subscribers berdasarkan competitor_a atau competitor_b di favorite_teams array
    const { data: subscribers, error: subscriberError } = await supabase
      .from("subscribers")
      .select("id, email")
      .eq("tenant_id", tenantId)
      .filter("favorite_teams", "cs", `{${match.competitor_a}}`);

    if (subscriberError) {
      console.error("[Notification] Error fetching subscribers:", subscriberError);
      return NextResponse.json(
        { error: "Failed to fetch subscribers" },
        { status: 500 }
      );
    }

    // Try second filter for competitor_b if first didn't return results
    let allSubscribers = subscribers || [];

    if (allSubscribers.length === 0 && match.competitor_b) {
      const { data: subscribersB } = await supabase
        .from("subscribers")
        .select("id, email")
        .eq("tenant_id", tenantId)
        .filter("favorite_teams", "cs", `{${match.competitor_b}}`);

      allSubscribers = subscribersB || [];
    }

    // If no subscribers interested, return success (nothing to send)
    if (!allSubscribers || allSubscribers.length === 0) {
      return NextResponse.json({
        message: "No subscribers interested in this match",
        emailsSent: 0,
      });
    }

    // 5. Generate email content
    const htmlContent = generateMatchAlertTemplate({
      competitorA: match.competitor_a,
      competitorB: match.competitor_b,
      kickoffTime: new Date(match.kickoff_time),
      leagueName: match.event_title || "Match Alert",
      tenantName: tenant.name,
      tenantColor: tenant.primary_color,
    });

    const subject = `Match Reminder: ${match.competitor_a} vs ${match.competitor_b}`;

    // 6. Send emails to each subscriber
    let successCount = 0;
    let failedCount = 0;
    const notificationLogs: Array<{
      subscriber_id: string;
      match_id: string;
      channel: string;
      status: string;
      error_message: string | null;
      sent_at: string;
    }> = [];

    for (const subscriber of allSubscribers) {
      try {
        // Send email
        const sendResult = await emailService.sendEmail({
          to: subscriber.email,
          subject,
          htmlContent,
        });

        // Prepare log entry
        const logEntry = {
          subscriber_id: subscriber.id,
          match_id: matchId,
          channel: "email",
          status: sendResult.success ? "sent" : "failed",
          error_message: sendResult.error || null,
          sent_at: new Date().toISOString(),
        };

        notificationLogs.push(logEntry);

        if (sendResult.success) {
          successCount++;
          console.log(
            `[Notification] Email sent to ${subscriber.email}, messageId: ${sendResult.messageId}`
          );
        } else {
          failedCount++;
          console.error(
            `[Notification] Failed to send to ${subscriber.email}: ${sendResult.error}`
          );
        }
      } catch (error) {
        failedCount++;
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        console.error(
          `[Notification] Exception sending to ${subscriber.email}:`,
          errorMsg
        );

        notificationLogs.push({
          subscriber_id: subscriber.id,
          match_id: matchId,
          channel: "email",
          status: "failed",
          error_message: errorMsg,
          sent_at: new Date().toISOString(),
        });
      }
    }

    // 7. Bulk insert notification logs
    if (notificationLogs.length > 0) {
      const { error: logError } = await supabase
        .from("notification_logs")
        .insert(notificationLogs);

      if (logError) {
        console.error("[Notification] Error logging notifications:", logError);
        // Don't fail the request if logging fails, emails already sent
      }
    }

    // 8. Return summary
    return NextResponse.json({
      status: "success",
      message: `Sent ${successCount} emails, ${failedCount} failed`,
      stats: {
        totalSubscribers: allSubscribers.length,
        successCount,
        failedCount,
        emailProvider: tenant.email_provider,
      },
    });
  } catch (error) {
    console.error("[Notification] Unexpected error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
