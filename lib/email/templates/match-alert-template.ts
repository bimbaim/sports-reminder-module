export interface MatchAlertData {
  competitorA: string;
  competitorB: string;
  kickoffTime: Date;
  leagueName: string;
  tenantName: string;
  tenantColor?: string;
}

/**
 * Generate match alert email HTML
 * @param data - Match and tenant information
 * @returns HTML string ready for email send
 */
export function generateMatchAlertTemplate(data: MatchAlertData): string {
  const {
    competitorA,
    competitorB,
    kickoffTime,
    leagueName,
    tenantName,
    tenantColor = "#6366f1",
  } = data;

  const formattedTime = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(kickoffTime);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Match Alert</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <div style="background-color: ${tenantColor}; padding: 24px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 600;">${tenantName}</h1>
            <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Match Alert Notification</p>
        </div>

        <!-- Main Content -->
        <div style="padding: 32px 24px;">
            <!-- Event/Tournament Info -->
            <div style="margin-bottom: 24px;">
                <p style="margin: 0; font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                    ${leagueName}
                </p>
            </div>

            <!-- Match Card -->
            <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                <!-- Teams -->
                <div style="display: table; width: 100%; margin-bottom: 20px;">
                    <div style="display: table-cell; width: 45%; text-align: center;">
                        <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1f2937;">
                            ${competitorA}
                        </p>
                        <p style="margin: 0; font-size: 12px; color: #6b7280;">Competitor A</p>
                    </div>
                    <div style="display: table-cell; width: 10%; text-align: center; vertical-align: middle;">
                        <p style="margin: 0; font-size: 18px; font-weight: 600; color: #d1d5db;">vs</p>
                    </div>
                    <div style="display: table-cell; width: 45%; text-align: center;">
                        <p style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1f2937;">
                            ${competitorB}
                        </p>
                        <p style="margin: 0; font-size: 12px; color: #6b7280;">Competitor B</p>
                    </div>
                </div>

                <!-- Divider -->
                <div style="height: 1px; background-color: #e5e7eb; margin: 20px 0;"></div>

                <!-- Kickoff Time -->
                <div style="text-align: center;">
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                        Kickoff Time
                    </p>
                    <p style="margin: 0; font-size: 16px; font-weight: 600; color: ${tenantColor};">
                        ${formattedTime}
                    </p>
                </div>
            </div>

            <!-- Info Box -->
            <div style="background-color: #f0f9ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 13px; color: #1e40af; line-height: 1.5;">
                    <strong>📌 Reminder:</strong> This match starts in 1 day. Make sure to tune in!
                </p>
            </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 24px; text-align: center; font-size: 12px; color: #6b7280;">
            <p style="margin: 0 0 12px 0;">
                You're receiving this email because you're subscribed to match alerts on <strong>${tenantName}</strong>.
            </p>
            <p style="margin: 0;">
                <a href="#" style="color: ${tenantColor}; text-decoration: none;">Manage Preferences</a> •
                <a href="#" style="color: ${tenantColor}; text-decoration: none;">Unsubscribe</a>
            </p>
            <p style="margin: 12px 0 0 0; font-size: 11px; color: #9ca3af;">
                © ${new Date().getFullYear()} ${tenantName}. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
  `.trim();
}

/**
 * Alternative: Simple template for quick send
 */
export function generateSimpleMatchAlertTemplate(data: MatchAlertData): string {
  const { competitorA, competitorB, kickoffTime, leagueName } = data;

  const formattedTime = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(kickoffTime);

  return `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2>Match Alert: ${competitorA} vs ${competitorB}</h2>
    <p><strong>League:</strong> ${leagueName}</p>
    <p><strong>Kickoff:</strong> ${formattedTime}</p>
    <p>Don't miss this match!</p>
</div>
  `.trim();
}
