import { generateMatchAlertTemplate } from "@/lib/email/templates/match-alert-template";

export async function GET() {
  const html = generateMatchAlertTemplate({
    competitorA: "Manchester United",
    competitorB: "Liverpool",
    kickoffTime: new Date("2026-06-26T20:00:00Z"),
    leagueName: "Premier League",
    tenantName: "Sports Reminder",
    tenantColor: "#6366f1",
  });

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
