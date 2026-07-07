# Dokumentasi Cron Jobs - Sports Reminder Module

## 📋 Daftar Isi
1. [Overview](#overview)
2. [Setup di Vercel](#setup-di-vercel)
3. [Sync API Match Cron](#1-sync-api-match-cron)
4. [Auto Send Email Notif Reminder](#2-auto-send-email-notif-reminder)
5. [WhatsApp Notification Cron](#3-whatsapp-notification-cron)
6. [Monitoring & Debugging](#monitoring--debugging)
7. [Environment Variables](#environment-variables)
8. [Best Practices](#best-practices)

---

## Overview

Sports Reminder Module menggunakan **Next.js API Routes** sebagai cron jobs yang dijalankan melalui:
- **Vercel Cron** (built-in, gratis)
- **External Cron Services** (untuk backup/redundancy)
- **Database event triggers** (optional future enhancement)

### Arsitektur Current
```
Vercel Cron / External Service
    ↓
Next.js API Route (/api/cron/*)
    ↓
Supabase Admin Client
    ↓
Database (PostgreSQL)
    ↓
Email Service (SendGrid/Resend)
    ↓
User Notifications
```

---

## Setup di Vercel

### Option 1: Vercel Cron (Recommended)

**Keuntungan:**
- ✅ Built-in di Vercel
- ✅ Gratis (limited to 1/hari untuk hobby plan)
- ✅ No additional configuration needed
- ✅ Automatic retries
- ✅ Logs di Vercel dashboard

**Kekurangan:**
- ⚠️ Hobby plan hanya 1x/hari
- ⚠️ Pro plan: 24 cron executions/hari

**Setup:**

1. **Buat file `vercel.json`** di root project:

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

2. **Cron Expression Format** (CRON standard):
```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 7) (Sunday = 0 atau 7)
│ │ │ │ │
│ │ │ │ │
* * * * *
```

**Common Examples:**
```
0 * * * *       → Setiap jam (00:00, 01:00, 02:00, etc)
*/30 * * * *    → Setiap 30 menit
0 6 * * *       → Setiap hari jam 6:00 pagi
0 6 * * 1       → Setiap Senin jam 6:00 pagi
0 */4 * * *     → Setiap 4 jam
```

3. **Set Environment Variables** di Vercel Dashboard:
   - Settings → Environment Variables
   - Tambahkan `CRON_SECRET` (kuat & random)
   - Tambahkan email provider keys: `SENDGRID_API_KEY`, `RESEND_API_KEY`

4. **Deploy ke Vercel:**
```bash
git add vercel.json .env
git commit -m "Setup cron jobs"
git push
```

---

### Option 2: External Cron Service (Backup/Advanced)

Jika ingin lebih control atau backup, gunakan:

**Services yang direkomendasikan:**
1. **EasyCron** (easycron.com)
   - Free tier: 10 cron jobs
   - No credit card needed

2. **AWS EventBridge**
   - Highly scalable
   - Pay-per-invocation

3. **Google Cloud Scheduler**
   - Gratis tier: 3 jobs
   - Built-in retry logic

**Setup EasyCron Example:**

1. Daftar di easycron.com
2. Buat job baru:
   - **URL:** `https://yourdomain.com/api/cron/sync-matches`
   - **HTTP Method:** GET
   - **Cron Expression:** `0 * * * *` (setiap jam)
   - **Headers:** 
     ```
     x-cron-secret: YOUR_CRON_SECRET
     ```

3. Test run untuk memastikan berjalan

---

## 1. Sync API Match Cron

**File:** `app/api/cron/sync-matches/route.ts`

**Fungsi:** 
- Fetch upcoming matches dari database
- Kirim WhatsApp + Email notifications ke subscribers yang cocok
- Log semua notification attempts

**Implementasi Detail:**

### Database Schema
```sql
-- Matches table
CREATE TABLE matches (
    id VARCHAR(100) PRIMARY KEY,
    competitor_a VARCHAR(100) NOT NULL,        -- Team/Player A
    competitor_b VARCHAR(100) NOT NULL,        -- Team/Player B
    event_title VARCHAR(255),                  -- League/Tournament name
    kickoff_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) DEFAULT 'scheduled',    -- scheduled, live, finished
    league_id NUMBER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscribers table
CREATE TABLE subscribers (
    id UUID PRIMARY KEY,
    tenant_id UUID,
    email VARCHAR(255) NOT NULL,
    whatsapp_number VARCHAR(50),
    favorite_sports VARCHAR(50)[],             -- ['football', 'basketball']
    favorite_teams VARCHAR(100)[],             -- ['Arsenal', 'Liverpool']
    is_consented BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification logs
CREATE TABLE notification_logs (
    id UUID PRIMARY KEY,
    subscriber_id UUID,
    match_id VARCHAR(100),
    channel VARCHAR(50),                       -- 'email' or 'whatsapp'
    status VARCHAR(50),                        -- 'pending', 'sent', 'failed'
    provider_message_id VARCHAR(255),
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Alur Kerja

**Step 1: Fetch Upcoming Matches**
```typescript
// Query matches yang akan kickoff dalam 24 jam
const now = new Date().toISOString();
const oneDayFromNow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

const { data: upcomingMatches } = await supabase
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
  .lte("kickoff_time", oneDayFromNow);
```

**Step 2: Fetch Subscribers (Consented Only)**
```typescript
const { data: subscribers } = await supabase
  .from("subscribers")
  .select("id, tenant_id, email, whatsapp_number, favorite_sports, favorite_teams, is_consented, tenants(name)")
  .eq("is_consented", true);
```

**Step 3: Match Subscribers ke Matches**
```typescript
// Filter subscribers yang interested di specific match
for (const match of upcomingMatches) {
  const sport = match.leagues?.sport_category || "football";
  
  for (const sub of subscribers) {
    // Check sport interest OR team interest
    const likesSport = sub.favorite_sports?.includes(sport);
    const likesTeam = sub.favorite_teams?.some(
      t => t.toLowerCase() === match.competitor_a.toLowerCase() ||
           t.toLowerCase() === match.competitor_b.toLowerCase()
    );
    
    if (likesSport || likesTeam) {
      // Create notification tasks
      notificationTasks.push({
        subscriber: sub,
        match: match,
        channel: "whatsapp", // or "email"
      });
    }
  }
}
```

**Step 4: Avoid Duplicates**
```typescript
// Check existing logs untuk prevent double notifications
const { data: existingLogs } = await supabase
  .from("notification_logs")
  .select("subscriber_id, match_id, channel")
  .in("match_id", matchIds);

const existingLogKeys = new Set(
  (existingLogs || []).map(l => `${l.subscriber_id}_${l.match_id}_${l.channel}`)
);

// Filter out duplicates
const key = `${sub.id}_${match.id}_whatsapp`;
if (!existingLogKeys.has(key)) {
  notificationTasks.push({ subscriber: sub, match, channel: "whatsapp" });
}
```

**Step 5: Send Notifications**

**WhatsApp:**
```typescript
import { WhatsAppService } from "@/lib/whatsapp/service";

const templateName = process.env.SPORTS_REMINDER_WHATSAPP_TEMPLATE_NAME;

const templateParameters = [
  { type: "text", text: sub.email || "Subscriber" },
  { type: "text", text: match.competitor_a || "TBD" },
  { type: "text", text: match.competitor_b || "TBD" },
  { type: "text", text: new Date(match.kickoff_time).toLocaleString() },
  { type: "text", text: sub.tenants?.name || "Sports Reminder" },
];

const result = await WhatsAppService.sendTemplate(
  sub.whatsapp_number,
  templateName,
  "en",
  templateParameters
);

if (result.success) {
  // Update log: sent
  await supabase
    .from("notification_logs")
    .update({
      status: "sent",
      provider_message_id: result.messageId,
      sent_at: new Date().toISOString(),
    })
    .eq("id", log.id);
} else {
  // Update log: failed
  await supabase
    .from("notification_logs")
    .update({
      status: "failed",
      error_message: result.error,
      retry_count: 1,
    })
    .eq("id", log.id);
}
```

**Email:**
```typescript
import { getEmailService, isValidEmailProvider } from "@/lib/email/email-service-factory";

// Get tenant config untuk email provider
const { data: tenant } = await supabase
  .from("tenants")
  .select("id, email_provider, email_from_address")
  .eq("id", sub.tenant_id)
  .single();

// Get service instance (SendGrid, Resend, dll)
const emailService = getEmailService(tenant.email_provider);

const htmlContent = `
  <h2>Match Alert from ${sub.tenants?.name}</h2>
  <p>Hi,</p>
  <p>Your favorite teams are playing!</p>
  <p><strong>${match.competitor_a} vs ${match.competitor_b}</strong></p>
  <p>Kickoff: ${new Date(match.kickoff_time).toLocaleString()}</p>
  <p>Don't miss the match!</p>
`;

const sendResult = await emailService.sendEmail({
  to: sub.email,
  subject: `${match.competitor_a} vs ${match.competitor_b} - Match Alert`,
  htmlContent,
  from: tenant.email_from_address || undefined,
});

// Log result
const { error } = await supabase
  .from("notification_logs")
  .insert({
    subscriber_id: sub.id,
    match_id: match.id,
    channel: "email",
    status: sendResult.success ? "sent" : "failed",
    provider: tenant.email_provider,
    provider_message_id: sendResult.messageId,
    error_message: sendResult.error || null,
    sent_at: new Date().toISOString(),
  });
```

### Security

**Authentication:**
```typescript
// Verify CRON_SECRET from headers
const cronSecret = process.env.CRON_SECRET;
const providedSecret = req.headers.get("x-cron-secret");

if (cronSecret && providedSecret !== cronSecret) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

**vercel.json Setup:**
```json
{
  "crons": [
    {
      "path": "/api/cron/sync-matches",
      "schedule": "0 * * * *"
    }
  ]
}
```

Vercel automatically adds `x-cron-secret` header dengan value dari `CRON_SECRET` env var.

---

## 2. Auto Send Email Notif Reminder

**File:** `app/api/cron/send-match-reminders/route.ts`

**Fungsi:**
- Kirim email reminder 24 jam sebelum match kickoff
- Support multi-tenant dengan different email providers
- Retry logic dan detailed logging

**Perbedaan dengan Sync Matches:**
- ✅ Sync Matches: Kirim notif SEBELUM match dimulai
- ✅ Send Reminders: Email reminder dalam 24 jam ke kickoff

### Implementasi

**Scheduling:**
```
Setiap jam → Check matches yang akan kickoff dalam 24 jam
    ↓
Filter subscribers yang interested
    ↓
Group by tenant (untuk multi-tenant support)
    ↓
Send email per tenant dengan provider-nya
    ↓
Log hasil
```

**Schedule Definition:**
```json
{
  "path": "/api/cron/send-match-reminders",
  "schedule": "0 * * * *"  // Setiap jam
}
```

**Kode Detail:**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEmailService } from "@/lib/email/email-service-factory";
import { generateMatchAlertTemplate } from "@/lib/email/templates/match-alert-template";

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

  // 1. Verify cron secret
  const cronSecret = process.env.CRON_SECRET;
  const providedSecret = request.headers.get("x-cron-secret");

  if (cronSecret && providedSecret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  try {
    // 2. Fetch matches dalam 24 jam ke depan
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
      cronLog.errors.push(`Database error: ${matchError.message}`);
      return NextResponse.json(cronLog, { status: 500 });
    }

    cronLog.matchesFound = matches?.length || 0;

    if (!matches || matches.length === 0) {
      return NextResponse.json({
        status: "success",
        message: "No matches found",
        ...cronLog,
      });
    }

    // 3. Process setiap match
    for (const match of matches) {
      // Fetch subscribers interested di match ini
      const { data: subscribers } = await supabase
        .from("subscribers")
        .select("id, email, tenant_id, favorite_teams")
        .eq("is_consented", true);

      // Filter local: check favorite_teams
      const interestedSubscribers = (subscribers || []).filter((sub) => {
        const favoriteTeams = sub.favorite_teams || [];
        return (
          favoriteTeams.includes(match.competitor_a) ||
          favoriteTeams.includes(match.competitor_b)
        );
      });

      if (interestedSubscribers.length === 0) {
        continue;
      }

      // 4. Group subscribers by tenant
      const subscribersByTenant = interestedSubscribers.reduce(
        (acc, sub) => {
          if (!acc[sub.tenant_id]) {
            acc[sub.tenant_id] = [];
          }
          acc[sub.tenant_id].push(sub);
          return acc;
        },
        {} as Record<string, any[]>
      );

      // 5. Send per tenant (dengan provider masing-masing)
      for (const [tenantId, tenantSubscribers] of Object.entries(subscribersByTenant)) {
        try {
          const { data: tenant } = await supabase
            .from("tenants")
            .select("id, name, primary_color, email_provider")
            .eq("id", tenantId)
            .single();

          if (!tenant) {
            cronLog.errors.push(`Tenant not found: ${tenantId}`);
            continue;
          }

          // Get email service
          const emailService = getEmailService(tenant.email_provider);

          // Generate template
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

              if (sendResult.success) {
                cronLog.emailsSent++;
              } else {
                cronLog.emailsFailed++;
                cronLog.errors.push(
                  `Failed to send to ${subscriber.email}: ${sendResult.error}`
                );
              }
            } catch (error) {
              cronLog.emailsFailed++;
              cronLog.errors.push(
                `Exception sending to ${subscriber.email}: ${error instanceof Error ? error.message : "Unknown"}`
              );
            }
          }
        } catch (error) {
          cronLog.errors.push(
            `Error processing tenant ${tenantId}: ${error instanceof Error ? error.message : "Unknown"}`
          );
        }
      }
    }

    return NextResponse.json({
      status: "success",
      message: `Processed ${cronLog.matchesFound} matches, sent ${cronLog.emailsSent} emails`,
      ...cronLog,
    });
  } catch (error) {
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
```

### Email Template Factory

**File:** `lib/email/templates/match-alert-template.ts`

```typescript
interface MatchAlertTemplateProps {
  competitorA: string;
  competitorB: string;
  kickoffTime: Date;
  leagueName: string;
  tenantName: string;
  tenantColor: string;
}

export function generateMatchAlertTemplate(props: MatchAlertTemplateProps): string {
  const { competitorA, competitorB, kickoffTime, leagueName, tenantName, tenantColor } = props;

  const formattedTime = kickoffTime.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .header { background-color: ${tenantColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { padding: 20px; }
        .match-info { background: #f9f9f9; padding: 15px; border-left: 4px solid ${tenantColor}; margin: 20px 0; }
        .teams { font-size: 24px; font-weight: bold; margin: 15px 0; }
        .kickoff { color: #666; font-size: 14px; }
        .cta-button { 
          display: inline-block; 
          background-color: ${tenantColor}; 
          color: white; 
          padding: 12px 24px; 
          text-decoration: none; 
          border-radius: 4px; 
          margin: 20px 0;
        }
        .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${tenantName}</h1>
          <p>Match Reminder</p>
        </div>
        
        <div class="content">
          <p>Hi there,</p>
          
          <p>Your favorite teams are playing soon!</p>
          
          <div class="match-info">
            <div class="teams">${competitorA} <strong>vs</strong> ${competitorB}</div>
            <p>${leagueName}</p>
            <div class="kickoff">⏰ ${formattedTime}</div>
          </div>
          
          <p>Get ready! Don't miss this match.</p>
          
          <center>
            <a href="${process.env.APP_URL}/embed" class="cta-button">View on Widget</a>
          </center>
          
          <p>Regards,<br>${tenantName}</p>
        </div>
        
        <div class="footer">
          <p>You're receiving this because you subscribed to match reminders.</p>
          <p><a href="${process.env.APP_URL}/unsubscribe" style="color: #999;">Unsubscribe</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}
```

---

## 3. WhatsApp Notification Cron

**Integrated dalam:** `send-match-reminders` route

**Setup Meta WhatsApp:**

1. **Environment Variables:**
```
SPORTS_REMINDER_META_WHATSAPP_ACCESS_TOKEN=your_token
SPORTS_REMINDER_META_PHONE_NUMBER_ID=your_phone_id
SPORTS_REMINDER_META_WEBHOOK_VERIFY_TOKEN=your_verify_token
SPORTS_REMINDER_WHATSAPP_TEMPLATE_NAME=sports_reminder_alert
```

2. **Create Template di Meta Business Manager:**
   - Template name: `sports_reminder_alert`
   - Template body:
   ```
   Hi {{1}},

   Your favorite teams {{2}} vs {{3}} are playing!

   📅 {{4}}
   🏟️ {{5}}

   Don't miss it!
   ```

3. **WhatsApp Service:**

**File:** `lib/whatsapp/service.ts`

```typescript
export class WhatsAppService {
  static async sendTemplate(
    phoneNumber: string,
    templateName: string,
    language: string,
    parameters: Array<{ type: string; text: string }>
  ) {
    const phoneId = process.env.SPORTS_REMINDER_META_PHONE_NUMBER_ID;
    const accessToken = process.env.SPORTS_REMINDER_META_WHATSAPP_ACCESS_TOKEN;

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

      if (data.messages && data.messages.length > 0) {
        return {
          success: true,
          messageId: data.messages[0].id,
        };
      }

      return {
        success: false,
        error: data.error?.message || "Failed to send WhatsApp message",
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

## Monitoring & Debugging

### 1. **Vercel Logs**

Access at: Vercel Dashboard → Project → Functions → Crons

```bash
# Check recent cron logs
# Dashboard → Deployments → [Latest] → Functions → Cron Logs
```

### 2. **Database Logs**

**Query notification_logs:**
```sql
-- Check all notifications
SELECT 
  nl.id,
  nl.subscriber_id,
  nl.match_id,
  nl.channel,
  nl.status,
  nl.error_message,
  nl.sent_at,
  nl.created_at
FROM notification_logs nl
ORDER BY nl.created_at DESC
LIMIT 50;

-- Check failed notifications
SELECT * FROM notification_logs 
WHERE status = 'failed'
ORDER BY created_at DESC;

-- Check pending retries
SELECT * FROM notification_logs 
WHERE status IN ('pending', 'retrying')
ORDER BY created_at ASC;

-- Get stats
SELECT 
  DATE(created_at) as date,
  channel,
  status,
  COUNT(*) as count
FROM notification_logs
GROUP BY DATE(created_at), channel, status
ORDER BY date DESC;
```

### 3. **Manual Testing**

**Test cron endpoint:**
```bash
# Test without auth
curl -X GET "http://localhost:3000/api/cron/send-match-reminders"

# Test with auth (production)
curl -X GET "https://yourdomain.com/api/cron/send-match-reminders" \
  -H "x-cron-secret: YOUR_CRON_SECRET"
```

**Test dengan dummy data:**
```typescript
// app/api/test/preview-email/route.ts
import { generateMatchAlertTemplate } from "@/lib/email/templates/match-alert-template";

export async function GET() {
  const html = generateMatchAlertTemplate({
    competitorA: "Arsenal",
    competitorB: "Liverpool",
    kickoffTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
    leagueName: "Premier League",
    tenantName: "Sports Bar XYZ",
    tenantColor: "#dc2626",
  });

  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
}
```

---

## Environment Variables

**Required (.env.local or Vercel):**

```env
# Supabase
NEXT_PUBLIC_SPORTS_REMINDER_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SPORTS_REMINDER_SUPABASE_ANON_KEY=your_anon_key
SPORTS_REMINDER_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Cron Security
CRON_SECRET=your_highly_secure_random_string

# Email Providers (choose one or both)
SENDGRID_API_KEY=your_sendgrid_key
RESEND_API_KEY=your_resend_key

# WhatsApp (Meta Cloud API)
SPORTS_REMINDER_META_WHATSAPP_ACCESS_TOKEN=your_token
SPORTS_REMINDER_META_PHONE_NUMBER_ID=your_phone_id
SPORTS_REMINDER_META_WEBHOOK_VERIFY_TOKEN=your_verify_token
SPORTS_REMINDER_WHATSAPP_TEMPLATE_NAME=sports_reminder_alert

# App
APP_URL=https://yourdomain.com
```

**Generate CRON_SECRET:**
```bash
# Linux/Mac
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))

# Online
https://www.random.org/strings/?num=1&len=32&digits=on&upperalpha=on&loweralpha=on&unique=on
```

---

## Best Practices

### 1. **Rate Limiting & Throttling**

Untuk menghindari API limits:

```typescript
// Add delay antara requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

for (const subscriber of subscribers) {
  try {
    await emailService.sendEmail(emailData);
    await delay(100); // 100ms delay antara emails
  } catch (error) {
    // Handle error
  }
}
```

### 2. **Batch Processing**

Untuk large datasets:

```typescript
const BATCH_SIZE = 100;

for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
  const batch = subscribers.slice(i, i + BATCH_SIZE);
  
  await Promise.all(
    batch.map(sub => emailService.sendEmail({...}))
  );
  
  // Wait antara batches
  if (i + BATCH_SIZE < subscribers.length) {
    await delay(1000);
  }
}
```

### 3. **Idempotency (Prevent Duplicates)**

```typescript
// Use composite key untuk prevent duplicates
const logKey = `${subscriberId}_${matchId}_${channel}`;

// Check existing sebelum send
const existingLog = await supabase
  .from("notification_logs")
  .select("id")
  .eq("subscriber_id", subscriberId)
  .eq("match_id", matchId)
  .eq("channel", channel)
  .single();

if (!existingLog) {
  // Safe to send
  await sendNotification();
}
```

### 4. **Retry Logic**

```typescript
async function sendWithRetry(
  sendFn: () => Promise<any>,
  maxRetries = 3,
  delay = 1000
) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await sendFn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(r => setTimeout(r, delay * Math.pow(2, i)));
    }
  }
}
```

### 5. **Error Handling & Alerts**

```typescript
// Log semua errors
if (cronLog.errors.length > 0) {
  console.error("[Cron] Errors:", cronLog.errors);
  
  // Optional: Send alert ke Slack/Discord
  if (cronLog.emailsFailed > cronLog.emailsSent) {
    await sendAlertToSlack({
      text: `⚠️ High email failure rate: ${cronLog.emailsFailed}/${cronLog.emailsSent}`,
      errors: cronLog.errors,
    });
  }
}
```

### 6. **Scheduled Maintenance**

```typescript
// Skip jika dalam maintenance window
const hour = new Date().getHours();
if (hour >= 2 && hour <= 4) { // 2-4 AM
  return NextResponse.json({
    status: "maintenance",
    message: "Maintenance window - skipped",
  });
}
```

### 7. **Logging Standards**

```typescript
// Consistent logging format
console.log(`[${new Date().toISOString()}] [Cron] Step: Result`);
console.error(`[${new Date().toISOString()}] [Cron] Error: Details`);

// Examples:
console.log(`[2025-01-01T10:30:00.000Z] [Cron] Fetched 50 matches`);
console.log(`[2025-01-01T10:30:15.000Z] [Cron] Sent 150 emails, 5 failed`);
console.error(`[2025-01-01T10:30:20.000Z] [Cron] Error: SendGrid API rate limit`);
```

---

## Summary: Step-by-Step Setup Checklist

**1. Environment Setup:**
- [ ] Generate `CRON_SECRET`
- [ ] Set email provider keys (SendGrid/Resend)
- [ ] Set WhatsApp credentials (if using)
- [ ] Add to Vercel Environment Variables

**2. Vercel Configuration:**
- [ ] Create `vercel.json` dengan cron schedules
- [ ] Set `CRON_SECRET` di Vercel dashboard
- [ ] Deploy dan test

**3. Database:**
- [ ] Run migrations (tables: `matches`, `subscribers`, `notification_logs`)
- [ ] Add test data
- [ ] Verify indexes on `kickoff_time`, `tenant_id`

**4. Email Templates:**
- [ ] Create/test email templates
- [ ] Verify template parameters
- [ ] Test rendering

**5. Monitoring:**
- [ ] Check Vercel logs
- [ ] Monitor notification_logs table
- [ ] Set up alerts (optional)

**6. Testing:**
- [ ] Test cron endpoints manually
- [ ] Verify notifications sent
- [ ] Check notification_logs
- [ ] Monitor production for 24 hours

---

## Troubleshooting

**Problem:** Cron tidak jalan di Vercel
- ✅ Check vercel.json syntax
- ✅ Check CRON_SECRET environment variable
- ✅ Check Vercel deployment status
- ✅ View Vercel Function Logs

**Problem:** Email tidak terkirim
- ✅ Check email provider keys
- ✅ Verify subscriber email addresses
- ✅ Check notification_logs untuk error message
- ✅ Test email service directly

**Problem:** WhatsApp tidak terkirim
- ✅ Verify phone number format (include country code)
- ✅ Check Meta template name
- ✅ Verify access token
- ✅ Check Meta Business logs

**Problem:** High failure rate
- ✅ Check API rate limits
- ✅ Add batch processing + delays
- ✅ Implement retry logic
- ✅ Scale email service tier

---

## References

- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript)
- [SendGrid API](https://sendgrid.com/docs)
- [Resend API](https://resend.com/docs)
- [Meta WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Next.js API Routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes)

