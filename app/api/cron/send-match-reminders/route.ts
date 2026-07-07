import { createAdminClient } from "@/lib/supabase/admin";
import { getEmailService, isValidEmailProvider } from "@/lib/email/email-service-factory";
import { generateMatchAlertTemplate } from "@/lib/email/templates/match-alert-template";
import { NextRequest, NextResponse } from "next/server";

/**
 * Cron job para enviar match reminder emails 1 dia antes do kickoff
 *
 * Chamar este endpoint a cada hora para verificar matches que precisam de lembretes
 * Exemplo setup em Vercel Cron: 0 * * * * (a cada hora)
 *
 * Setup:
 * 1. Vercel: Adicionar em vercel.json ou dashboard
 * 2. External: Usar serviço como EasyCron, AWS EventBridge, ou Google Cloud Scheduler
 * 3. Self-hosted: Usar node-cron ou similar
 */

interface CronLog {
  timestamp: string;
  matchesFound: number;
  emailsSent: number;
  emailsFailed: number;
  errors: string[];
}

export async function GET(request: NextRequest) {
  const cronLog: CronLog = {
    timestamp: new Date().toISOString(),
    matchesFound: 0,
    emailsSent: 0,
    emailsFailed: 0,
    errors: [],
  };

  // Verify cron secret from environment (security)
  const cronSecret = process.env.CRON_SECRET;
  const providedSecret = request.headers.get("x-cron-secret");

  if (cronSecret && providedSecret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  } else if (!cronSecret) {
    console.warn("[Cron] CRON_SECRET not set - security disabled");
  }

  const supabase = createAdminClient();

  try {
    // 1. Fetch matches que vão kickoff dentro de 24 horas
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    console.log(
      `[Cron] Searching matches between ${now.toISOString()} and ${in24Hours.toISOString()}`
    );

    const { data: matches, error: matchError } = await supabase
      .from("matches")
      .select("*")
      .gte("kickoff_time", now.toISOString())
      .lte("kickoff_time", in24Hours.toISOString())
      .eq("status", "scheduled");

    if (matchError) {
      console.error("[Cron] Error fetching matches:", matchError);
      cronLog.errors.push(`Database error fetching matches: ${matchError.message}`);
      return NextResponse.json(cronLog, { status: 500 });
    }

    console.log(`[Cron] Found ${matches?.length || 0} matches for reminders`);
    cronLog.matchesFound = matches?.length || 0;

    if (!matches || matches.length === 0) {
      return NextResponse.json({
        status: "success",
        message: "No matches found for reminders",
        ...cronLog,
      });
    }

    // 2. Process cada match
    for (const match of matches) {
      try {
        console.log(
          `[Cron] Processing match ${match.id}: ${match.competitor_a} vs ${match.competitor_b}`
        );

        // Get subscribers para este match
        // Filter by favorite_teams que contenham competitor_a ou competitor_b
        const { data: subscribers, error: subError } = await supabase
          .from("subscribers")
          .select("id, email, tenant_id, favorite_teams");

        if (subError) {
          console.error(
            `[Cron] Error fetching subscribers for match ${match.id}:`,
            subError
          );
          cronLog.errors.push(`Error fetching subscribers for match ${match.id}`);
          continue;
        }

        // Filter subscribers localmente (por favorite_teams)
        const interestedSubscribers = (subscribers || []).filter((sub) => {
          const favoriteTeams = sub.favorite_teams || [];
          return (
            favoriteTeams.includes(match.competitor_a) ||
            favoriteTeams.includes(match.competitor_b)
          );
        });

        console.log(
          `[Cron] Found ${interestedSubscribers.length} interested subscribers for match ${match.id}`
        );

        if (interestedSubscribers.length === 0) {
          continue;
        }

        // Group subscribers by tenant
        const subscribersByTenant = interestedSubscribers.reduce(
          (acc, sub) => {
            if (!acc[sub.tenant_id]) {
              acc[sub.tenant_id] = [];
            }
            acc[sub.tenant_id].push(sub);
            return acc;
          },
          {} as Record<string, (typeof interestedSubscribers)[0][]>
        );

        // 3. Send emails per tenant (com seu provider)
        for (const [tenantId, tenantSubscribers] of Object.entries(subscribersByTenant)) {
          try {
            // Get tenant & email provider
            const { data: tenant, error: tenantError } = await supabase
              .from("tenants")
              .select("id, name, primary_color, email_provider")
              .eq("id", tenantId)
              .single();

            if (tenantError || !tenant) {
              console.error(`[Cron] Tenant not found: ${tenantId}`);
              cronLog.errors.push(`Tenant not found: ${tenantId}`);
              continue;
            }

            // Validate provider
            if (!isValidEmailProvider(tenant.email_provider)) {
              console.error(`[Cron] Invalid provider for tenant ${tenantId}`);
              cronLog.errors.push(`Invalid provider for tenant ${tenantId}`);
              continue;
            }

            // Get email service
            const emailService = getEmailService(tenant.email_provider);

            // Generate email content
            const htmlContent = generateMatchAlertTemplate({
              competitorA: match.competitor_a,
              competitorB: match.competitor_b,
              kickoffTime: new Date(match.kickoff_time),
              leagueName: match.event_title || "Match Alert",
              tenantName: tenant.name,
              tenantColor: tenant.primary_color || "#6366f1",
            });

            const subject = `Match Reminder: ${match.competitor_a} vs ${match.competitor_b}`;

            // Send to each subscriber
            for (const subscriber of tenantSubscribers) {
              try {
                const sendResult = await emailService.sendEmail({
                  to: subscriber.email,
                  subject,
                  htmlContent,
                });

                // Log notification
                const { error: logError } = await supabase
                  .from("notification_logs")
                  .insert({
                    subscriber_id: subscriber.id,
                    match_id: match.id,
                    channel: "email",
                    status: sendResult.success ? "sent" : "failed",
                    error_message: sendResult.error || null,
                    sent_at: new Date().toISOString(),
                  });

                if (logError) {
                  console.error("[Cron] Error logging notification:", logError);
                  cronLog.emailsFailed++;
                } else if (sendResult.success) {
                  cronLog.emailsSent++;
                  console.log(
                    `[Cron] Email sent to ${subscriber.email}, messageId: ${sendResult.messageId}`
                  );
                } else {
                  cronLog.emailsFailed++;
                  console.error(
                    `[Cron] Failed to send to ${subscriber.email}: ${sendResult.error}`
                  );
                  cronLog.errors.push(
                    `Failed to send to ${subscriber.email}: ${sendResult.error}`
                  );
                }
              } catch (error) {
                cronLog.emailsFailed++;
                const errorMsg = error instanceof Error ? error.message : "Unknown error";
                console.error(`[Cron] Error sending to ${subscriber.email}:`, errorMsg);
                cronLog.errors.push(`Exception sending to ${subscriber.email}: ${errorMsg}`);
              }
            }
          } catch (error) {
            console.error(`[Cron] Error processing tenant ${tenantId}:`, error);
            const errorMsg = error instanceof Error ? error.message : "Unknown error";
            cronLog.errors.push(`Error processing tenant ${tenantId}: ${errorMsg}`);
          }
        }
      } catch (error) {
        console.error(`[Cron] Error processing match ${match.id}:`, error);
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        cronLog.errors.push(`Error processing match ${match.id}: ${errorMsg}`);
      }
    }

    // Return summary
    return NextResponse.json({
      status: "success",
      message: `Processed ${cronLog.matchesFound} matches, sent ${cronLog.emailsSent} emails`,
      ...cronLog,
    });
  } catch (error) {
    console.error("[Cron] Unexpected error:", error);
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    cronLog.errors.push(`Unexpected error: ${errorMsg}`);

    return NextResponse.json(
      {
        status: "error",
        message: "Cron job failed",
        ...cronLog,
      },
      { status: 500 }
    );
  }
}
