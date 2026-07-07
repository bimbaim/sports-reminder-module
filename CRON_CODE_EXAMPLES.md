# Cron Implementation Code Examples

Copy-paste ready code snippets untuk berbagai use cases.

---

## 1. Complete Cron Route Template

### Basic Structure
```typescript
// app/api/cron/[name]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { headers } from "next/headers";

interface CronLog {
  timestamp: string;
  itemsProcessed: number;
  successCount: number;
  failureCount: number;
  errors: string[];
}

export async function GET(request: NextRequest) {
  const cronLog: CronLog = {
    timestamp: new Date().toISOString(),
    itemsProcessed: 0,
    successCount: 0,
    failureCount: 0,
    errors: [],
  };

  try {
    // 1. Verify cron secret
    await headers(); // Force dynamic route
    const cronSecret = process.env.CRON_SECRET;
    const providedSecret = request.headers.get("x-cron-secret");

    if (cronSecret && providedSecret !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    } else if (!cronSecret) {
      console.warn("[Cron] CRON_SECRET not set - security disabled");
    }

    // 2. Initialize client
    const supabase = createAdminClient();

    // 3. Main logic here
    console.log(`[Cron] Starting job at ${cronLog.timestamp}`);

    // 4. Return results
    return NextResponse.json({
      status: "success",
      message: `Processed ${cronLog.itemsProcessed} items`,
      ...cronLog,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    cronLog.errors.push(errorMsg);

    console.error("[Cron] Error:", errorMsg);

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
```

---

## 2. Match Fetching Patterns

### Fetch Upcoming Matches (24h window)
```typescript
const now = new Date().toISOString();
const in24Hours = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

const { data: matches, error } = await supabase
  .from("matches")
  .select(`
    id,
    competitor_a,
    competitor_b,
    event_title,
    kickoff_time,
    status,
    league_id,
    leagues(sport_category)
  `)
  .eq("status", "scheduled")
  .gte("kickoff_time", now)
  .lte("kickoff_time", in24Hours)
  .order("kickoff_time", { ascending: true });

if (error) {
  console.error("Error fetching matches:", error);
  cronLog.errors.push(`Match query error: ${error.message}`);
}

cronLog.itemsProcessed = matches?.length || 0;
```

### Fetch Matches with Custom Window
```typescript
// Next 12 hours
const windowHours = 12;
const start = new Date();
const end = new Date(start.getTime() + windowHours * 60 * 60 * 1000);

const { data: matches } = await supabase
  .from("matches")
  .select("*")
  .gte("kickoff_time", start.toISOString())
  .lt("kickoff_time", end.toISOString())
  .eq("status", "scheduled")
  .order("kickoff_time", { ascending: true });
```

### Fetch Specific Match
```typescript
const { data: match, error } = await supabase
  .from("matches")
  .select("*")
  .eq("id", matchId)
  .single();

if (error || !match) {
  throw new Error(`Match not found: ${matchId}`);
}
```

---

## 3. Subscriber Fetching & Filtering

### Get All Consented Subscribers
```typescript
const { data: subscribers, error } = await supabase
  .from("subscribers")
  .select(`
    id,
    tenant_id,
    email,
    whatsapp_number,
    favorite_sports,
    favorite_teams,
    is_consented,
    tenants(name, primary_color, email_provider)
  `)
  .eq("is_consented", true);

if (error) {
  throw new Error(`Failed to fetch subscribers: ${error.message}`);
}
```

### Get Subscribers for Specific Team
```typescript
// Array contains check
const { data: subscribers } = await supabase
  .from("subscribers")
  .select("*")
  .contains("favorite_teams", ["Arsenal"])
  .eq("is_consented", true);
```

### Filter Subscribers Locally
```typescript
const interestedSubscribers = (subscribers || []).filter((sub) => {
  const teams = sub.favorite_teams || [];
  const sports = sub.favorite_sports || [];

  const likesSport = sports.includes(match.sport_category);
  const likesTeam =
    teams.includes(match.competitor_a) ||
    teams.includes(match.competitor_b);

  return likesSport || likesTeam;
});
```

### Group Subscribers by Tenant
```typescript
const subscribersByTenant = subscribers.reduce(
  (acc, sub) => {
    if (!acc[sub.tenant_id]) {
      acc[sub.tenant_id] = [];
    }
    acc[sub.tenant_id].push(sub);
    return acc;
  },
  {} as Record<string, typeof subscribers>
);

for (const [tenantId, subs] of Object.entries(subscribersByTenant)) {
  // Process each tenant's subscribers
  console.log(`Processing ${subs.length} subscribers for tenant ${tenantId}`);
}
```

---

## 4. Duplicate Prevention

### Check Existing Notification
```typescript
const { data: existingLog } = await supabase
  .from("notification_logs")
  .select("id")
  .eq("subscriber_id", subscriberId)
  .eq("match_id", matchId)
  .eq("channel", "email")
  .single();

if (existingLog) {
  console.log(`Notification already sent for subscriber ${subscriberId}`);
  continue;
}
```

### Batch Check Multiple Notifications
```typescript
const matchIds = matches.map(m => m.id);

const { data: existingLogs } = await supabase
  .from("notification_logs")
  .select("subscriber_id, match_id, channel")
  .in("match_id", matchIds);

const existingLogKeys = new Set(
  (existingLogs || []).map(l => 
    `${l.subscriber_id}_${l.match_id}_${l.channel}`
  )
);

// Use when deciding to send
if (!existingLogKeys.has(`${subId}_${matchId}_email`)) {
  // Safe to send
}
```

### Create Log Entry First (Atomicity)
```typescript
const { data: insertedLogs, error: logError } = await supabase
  .from("notification_logs")
  .insert([
    {
      subscriber_id: subId,
      match_id: matchId,
      channel: "email",
      status: "pending",
    },
  ])
  .select("id");

if (logError) {
  throw new Error(`Failed to create log: ${logError.message}`);
}

const logId = insertedLogs[0].id;

try {
  // Send notification
  const result = await emailService.sendEmail({...});

  // Update log status
  await supabase
    .from("notification_logs")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", logId);
} catch (error) {
  // Update log status
  await supabase
    .from("notification_logs")
    .update({ status: "failed", error_message: error.message })
    .eq("id", logId);
}
```

---

## 5. Email Service Integration

### Send via Email Service Factory
```typescript
import { getEmailService, isValidEmailProvider } from "@/lib/email/email-service-factory";

// Get tenant email config
const { data: tenant } = await supabase
  .from("tenants")
  .select("id, email_provider, email_from_address, name, primary_color")
  .eq("id", tenantId)
  .single();

if (!isValidEmailProvider(tenant.email_provider)) {
  throw new Error(`Invalid provider: ${tenant.email_provider}`);
}

// Get service instance
const emailService = getEmailService(tenant.email_provider);

// Generate HTML
const htmlContent = `
  <h1>Match Alert</h1>
  <p>${match.competitor_a} vs ${match.competitor_b}</p>
  <p>Kickoff: ${new Date(match.kickoff_time).toLocaleString()}</p>
`;

// Send
const result = await emailService.sendEmail({
  to: subscriber.email,
  subject: `Match Reminder: ${match.competitor_a} vs ${match.competitor_b}`,
  htmlContent,
  from: tenant.email_from_address || undefined,
});

if (!result.success) {
  throw new Error(`Send failed: ${result.error}`);
}

// result.messageId available for logging
cronLog.successCount++;
```

### Direct SendGrid Integration
```typescript
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

try {
  const response = await sgMail.send({
    to: subscriber.email,
    from: "noreply@yourdomain.com",
    subject: `Match Alert: ${match.competitor_a} vs ${match.competitor_b}`,
    html: htmlContent,
    replyTo: "support@yourdomain.com",
    trackingSettings: {
      clickTracking: { enabled: true },
      openTracking: { enabled: true },
    },
  });

  console.log(`Email sent to ${subscriber.email}`);
  cronLog.successCount++;
} catch (error) {
  console.error(`Failed to send to ${subscriber.email}:`, error);
  cronLog.failureCount++;
  cronLog.errors.push(`SendGrid: ${error.message}`);
}
```

### Direct Resend Integration
```typescript
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

try {
  const { data, error } = await resend.emails.send({
    from: "noreply@yourdomain.com",
    to: subscriber.email,
    subject: `Match Alert: ${match.competitor_a} vs ${match.competitor_b}`,
    html: htmlContent,
  });

  if (error) {
    throw new Error(error.message);
  }

  console.log(`Email sent: ${data.id}`);
  cronLog.successCount++;
} catch (error) {
  console.error(`Failed to send:`, error);
  cronLog.failureCount++;
}
```

---

## 6. WhatsApp Integration

### Send WhatsApp Template
```typescript
import { WhatsAppService } from "@/lib/whatsapp/service";

const templateName = process.env.SPORTS_REMINDER_WHATSAPP_TEMPLATE_NAME;

const templateParameters = [
  { type: "text", text: subscriber.email || "Subscriber" },
  { type: "text", text: match.competitor_a || "TBD" },
  { type: "text", text: match.competitor_b || "TBD" },
  {
    type: "text",
    text: new Date(match.kickoff_time).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
  },
  { type: "text", text: subscriber.tenants?.name || "Sports Reminder" },
];

const result = await WhatsAppService.sendTemplate(
  subscriber.whatsapp_number,
  templateName,
  "en",
  templateParameters
);

if (result.success) {
  console.log(`WhatsApp sent. Message ID: ${result.messageId}`);
  cronLog.successCount++;
} else {
  console.error(`WhatsApp failed: ${result.error}`);
  cronLog.failureCount++;
  cronLog.errors.push(result.error);
}
```

### WhatsApp Service Implementation
```typescript
// lib/whatsapp/service.ts
export class WhatsAppService {
  static async sendTemplate(
    phoneNumber: string,
    templateName: string,
    language: string = "en",
    parameters: Array<{ type: string; text: string }>
  ) {
    const phoneId = process.env.SPORTS_REMINDER_META_PHONE_NUMBER_ID;
    const accessToken = process.env.SPORTS_REMINDER_META_WHATSAPP_ACCESS_TOKEN;

    if (!phoneId || !accessToken) {
      return {
        success: false,
        error: "WhatsApp credentials not configured",
      };
    }

    try {
      const response = await fetch(
        `https://graph.instagram.com/v18.0/${phoneId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: phoneNumber,
            type: "template",
            template: {
              name: templateName,
              language: { code: language },
              components: [
                {
                  type: "body",
                  parameters: parameters,
                },
              ],
            },
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error?.message || "Failed to send WhatsApp message"
        );
      }

      return {
        success: true,
        messageId: data.messages?.[0]?.id || "unknown",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
```

---

## 7. Batch Processing

### Send in Batches with Delay
```typescript
const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 2000;

for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
  const batch = subscribers.slice(i, i + BATCH_SIZE);
  console.log(`Processing batch ${i / BATCH_SIZE + 1}/${Math.ceil(subscribers.length / BATCH_SIZE)}`);

  const results = await Promise.allSettled(
    batch.map(async (sub) => {
      try {
        const result = await emailService.sendEmail({
          to: sub.email,
          subject,
          htmlContent,
        });

        await supabase.from("notification_logs").insert({
          subscriber_id: sub.id,
          match_id: match.id,
          channel: "email",
          status: result.success ? "sent" : "failed",
          error_message: result.error || null,
          sent_at: new Date().toISOString(),
        });

        return result;
      } catch (error) {
        console.error(`Error for ${sub.email}:`, error);
        return { success: false };
      }
    })
  );

  const succeeded = results.filter(r => r.status === "fulfilled").length;
  const failed = results.filter(r => r.status === "rejected").length;

  cronLog.successCount += succeeded;
  cronLog.failureCount += failed;

  console.log(`Batch complete: ${succeeded} sent, ${failed} failed`);

  // Delay between batches (except last)
  if (i + BATCH_SIZE < subscribers.length) {
    await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
  }
}
```

### Parallel Processing with Concurrency Limit
```typescript
async function processConcurrently<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number = 5
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const promise = Promise.resolve()
      .then(() => fn(item))
      .then(result => {
        results.push(result);
      });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      executing.splice(
        executing.findIndex(p => p === promise),
        1
      );
    }
  }

  await Promise.all(executing);
  return results;
}

// Usage
await processConcurrently(
  subscribers,
  async (sub) => emailService.sendEmail({ to: sub.email, ... }),
  10 // 10 concurrent sends
);
```

---

## 8. Retry Logic

### Simple Retry with Exponential Backoff
```typescript
async function sendWithRetry(
  fn: () => Promise<any>,
  maxRetries: number = 3,
  initialDelay: number = 1000
) {
  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(`Retry in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// Usage
await sendWithRetry(() =>
  emailService.sendEmail({
    to: subscriber.email,
    subject,
    htmlContent,
  })
);
```

### Update Retry Count in Database
```typescript
let retryCount = 0;

try {
  await sendWithRetry(() => emailService.sendEmail({...}));
  
  await supabase
    .from("notification_logs")
    .update({ 
      status: "sent",
      sent_at: new Date().toISOString(),
    })
    .eq("id", logId);
} catch (error) {
  retryCount++;
  
  if (retryCount < 3) {
    // Mark as retrying
    await supabase
      .from("notification_logs")
      .update({
        status: "retrying",
        retry_count: retryCount,
        error_message: error.message,
      })
      .eq("id", logId);
  } else {
    // Mark as failed
    await supabase
      .from("notification_logs")
      .update({
        status: "failed",
        retry_count: retryCount,
        error_message: `Max retries exceeded: ${error.message}`,
      })
      .eq("id", logId);
  }
}
```

---

## 9. Error Handling & Logging

### Structured Error Logging
```typescript
interface ErrorLog {
  timestamp: string;
  level: "info" | "warning" | "error" | "critical";
  component: string;
  action: string;
  details: string;
  subscriberId?: string;
  matchId?: string;
  error?: string;
}

function logEvent(log: ErrorLog) {
  const prefix = `[${log.timestamp}] [${log.component}] [${log.level.toUpperCase()}]`;
  
  switch (log.level) {
    case "info":
      console.log(`${prefix} ${log.action}: ${log.details}`);
      break;
    case "warning":
      console.warn(`${prefix} ${log.action}: ${log.details}`);
      break;
    case "error":
    case "critical":
      console.error(`${prefix} ${log.action}: ${log.details}`);
      if (log.error) {
        console.error(`${prefix} Error Details: ${log.error}`);
      }
      break;
  }
}

// Usage
logEvent({
  timestamp: new Date().toISOString(),
  level: "error",
  component: "Cron",
  action: "Email Send Failed",
  details: `Failed to send email to subscriber`,
  subscriberId: sub.id,
  matchId: match.id,
  error: error.message,
});
```

### Send Alert on Failures
```typescript
async function sendAlertIfFailed(cronLog: CronLog) {
  const failureRate = cronLog.failureCount / cronLog.successCount;

  if (failureRate > 0.1 || cronLog.errors.length > 10) {
    // Send alert
    if (process.env.SLACK_WEBHOOK_URL) {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: "POST",
        body: JSON.stringify({
          text: "🚨 Cron Job High Failure Rate",
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*Cron Job Alert*\nSuccess: ${cronLog.successCount}\nFailed: ${cronLog.failureCount}\nFailure Rate: ${(failureRate * 100).toFixed(2)}%`,
              },
            },
          ],
        }),
      });
    }
  }
}
```

---

## 10. Vercel JSON Configuration

### Basic Setup
```json
{
  "crons": [
    {
      "path": "/api/cron/sync-matches",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/send-match-reminders",
      "schedule": "0 * * * *"
    }
  ]
}
```

### Advanced Configuration
```json
{
  "crons": [
    {
      "path": "/api/cron/sync-matches",
      "schedule": "0 * * * *",
      "method": "GET",
      "headers": {
        "x-custom-header": "value"
      }
    },
    {
      "path": "/api/cron/send-match-reminders",
      "schedule": "*/30 * * * *",
      "description": "Send email reminders every 30 minutes"
    }
  ]
}
```

---

## 11. Testing

### Local Test Endpoint
```typescript
// app/api/test/cron-sync/route.ts
import { NextRequest, NextResponse } from "next/server";
import GET from "@/app/api/cron/sync-matches/route";

export async function GET(request: NextRequest) {
  // Mock the cron secret header
  const mockRequest = new NextRequest(request, {
    headers: new Headers([
      ...Array.from(request.headers),
      ["x-cron-secret", process.env.CRON_SECRET || "test-secret"],
    ]),
  });

  return GET(mockRequest);
}
```

### Database Seeding for Testing
```typescript
// lib/test-data.ts
export async function seedTestData(supabase: any) {
  // Add test tenant
  const { data: tenant } = await supabase
    .from("tenants")
    .insert({
      name: "Test Pub",
      slug: "test-pub",
      contact_email: "test@example.com",
      address: "123 Test St",
      city: "Test City",
      email_provider: "sendgrid",
      email_from_address: "test@example.com",
    })
    .select()
    .single();

  // Add test subscriber
  const { data: subscriber } = await supabase
    .from("subscribers")
    .insert({
      tenant_id: tenant.id,
      email: "subscriber@example.com",
      whatsapp_number: "+1234567890",
      favorite_sports: ["football"],
      favorite_teams: ["Arsenal", "Liverpool"],
      is_consented: true,
    })
    .select()
    .single();

  // Add test match
  const { data: match } = await supabase
    .from("matches")
    .insert({
      id: "match-test-001",
      competitor_a: "Arsenal",
      competitor_b: "Liverpool",
      kickoff_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      status: "scheduled",
      league_id: 1,
    })
    .select()
    .single();

  return { tenant, subscriber, match };
}
```

