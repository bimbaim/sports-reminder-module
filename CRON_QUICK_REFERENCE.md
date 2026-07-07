# Quick Reference - Sports Reminder Cron Jobs

## 🚀 Quick Setup (5 Minutes)

### 1. Create `vercel.json`
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

### 2. Set Environment Variables (Vercel Dashboard)
```
CRON_SECRET=<random-32-chars>
SENDGRID_API_KEY=<key>
RESEND_API_KEY=<key>
```

### 3. Deploy
```bash
git add vercel.json
git commit -m "Setup cron jobs"
git push
```

---

## 📊 Cron Jobs Overview

| Route | Purpose | Schedule | Payload |
|-------|---------|----------|---------|
| `/api/cron/sync-matches` | Sync API matches & send notifications | Every hour | matches, subscribers |
| `/api/cron/send-match-reminders` | Email reminder 24h before kickoff | Every hour | matches, subscribers |

---

## 🔄 Data Flow

```
Cron Trigger (Vercel)
    ↓
Next.js API Route
    ↓
Supabase Query
  - Fetch matches (upcoming)
  - Fetch subscribers (interested)
    ↓
Match Logic
  - Filter by sport/team
  - Check duplicate logs
    ↓
Send Notifications
  - Email (SendGrid/Resend)
  - WhatsApp (Meta)
    ↓
Log Result
  - Status: sent/failed
  - Error details
```

---

## 📝 Database Schema Quick Reference

```sql
-- Matches
SELECT id, competitor_a, competitor_b, kickoff_time, status
FROM matches
WHERE status = 'scheduled' AND kickoff_time > now()
ORDER BY kickoff_time;

-- Subscribers
SELECT id, email, whatsapp_number, favorite_teams, is_consented
FROM subscribers
WHERE is_consented = true;

-- Notification Logs (for debugging)
SELECT * FROM notification_logs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 20;

-- Stats
SELECT 
  DATE(created_at) as date,
  channel,
  status,
  COUNT(*) as count
FROM notification_logs
GROUP BY 1, 2, 3
ORDER BY 1 DESC;
```

---

## 🔐 Security Checklist

- [ ] `CRON_SECRET` set (min 32 chars, random)
- [ ] `CRON_SECRET` added to Vercel env vars
- [ ] API routes verify `x-cron-secret` header
- [ ] Service Role Key (not public anon key) used
- [ ] Email/WhatsApp API keys kept secret
- [ ] No secrets in `vercel.json`

---

## 🧪 Manual Testing

### Test Endpoint
```bash
# Local development
curl -X GET "http://localhost:3000/api/cron/send-match-reminders" \
  -H "x-cron-secret: YOUR_CRON_SECRET"

# Production
curl -X GET "https://yourdomain.com/api/cron/send-match-reminders" \
  -H "x-cron-secret: YOUR_CRON_SECRET"

# Expected response
{
  "status": "success",
  "message": "Processed 5 matches, sent 42 emails",
  "matchesFound": 5,
  "emailsSent": 42,
  "emailsFailed": 2,
  "timestamp": "2025-01-01T10:30:00.000Z"
}
```

### Test Email Template
```
http://localhost:3000/api/test/preview-email
```

---

## 📈 Monitoring

### Check Vercel Logs
```
Dashboard → Project → Functions → Cron Logs
```

### Check Database
```sql
-- Recent notifications
SELECT * FROM notification_logs 
ORDER BY created_at DESC LIMIT 20;

-- Failed only
SELECT * FROM notification_logs
WHERE status = 'failed'
ORDER BY created_at DESC;

-- Resend count (retries)
SELECT subscriber_id, match_id, COUNT(*) as attempts
FROM notification_logs
GROUP BY subscriber_id, match_id
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;
```

### Common Logs to Check
```
[Cron] Starting sync...
[Cron] Found X matches
[Cron] Processing match ID: ...
[Email Sync] Email sent to subscriber...
[Email Sync] Failed: reason...
[WhatsApp Sync] Message sent. ID: ...
[Cron] Processed X notifications
```

---

## ❌ Common Issues & Fixes

### Issue 1: Cron Not Running
**Signs:**
- No logs in Vercel dashboard
- Functions → Crons shows "Never"

**Fixes:**
1. Check `vercel.json` syntax (JSON lint)
2. Verify `CRON_SECRET` is set
3. Redeploy: `git push`
4. Wait 5 minutes for first execution

### Issue 2: 401 Unauthorized
**Error:** `{"error": "Unauthorized"}`

**Causes:**
- Missing `x-cron-secret` header (Vercel auto-adds)
- Wrong `CRON_SECRET` value
- Using external cron without header

**Fixes:**
- If Vercel: Check env var `CRON_SECRET` is set
- If external cron: Add header `x-cron-secret: <value>`

### Issue 3: Emails Not Sending
**Signs:**
- Status in DB: "failed"
- error_message contains SendGrid/Resend error

**Fixes:**
```bash
# Check API keys
echo $SENDGRID_API_KEY  # Should be set
echo $RESEND_API_KEY    # Should be set

# Check email format in DB
SELECT DISTINCT email FROM subscribers LIMIT 5;

# View error details
SELECT error_message, COUNT(*) FROM notification_logs 
WHERE status = 'failed' 
GROUP BY error_message;
```

### Issue 4: Duplicate Notifications
**Signs:**
- Same subscriber gets 2+ notifications per match
- Multiple log entries with same subscriber_id + match_id

**Fixes:**
- Verify log exists before sending:
```typescript
const existingLog = await supabase
  .from("notification_logs")
  .select("id")
  .match({ subscriber_id, match_id, channel })
  .single();

if (!existingLog) {
  // Safe to send
}
```

### Issue 5: Rate Limit Errors
**Errors:**
- "SendGrid: 429 Too Many Requests"
- "Rate limit exceeded"

**Fixes:**
- Add batch processing:
```typescript
const BATCH_SIZE = 50;
for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
  const batch = subscribers.slice(i, i + BATCH_SIZE);
  await Promise.allSettled(batch.map(send));
  await delay(2000);
}
```

### Issue 6: WhatsApp Template Not Found
**Error:** `Template not found`

**Fixes:**
1. Check template name matches Meta Business Manager
2. Verify phone number ID is correct
3. Verify access token has permissions
4. Template status must be "APPROVED"

```bash
# Check template in Meta
https://business.facebook.com/apps/
→ WhatsApp → Message Templates
→ Look for "sports_reminder_alert"
```

---

## ⏱️ Cron Expression Cheat Sheet

```
┌─── minute       (0-59)
│ ┌─ hour         (0-23)
│ │ ┌─ day        (1-31)
│ │ │ ┌─ month    (1-12)
│ │ │ │ ┌─ dow    (0-7, 0=Sun)
│ │ │ │ │
* * * * *

# Every hour
0 * * * *

# Every 30 minutes
*/30 * * * *

# 6 AM daily
0 6 * * *

# Every Monday at 6 AM
0 6 * * 1

# Every 4 hours
0 */4 * * *

# 9 AM - 5 PM (business hours)
0 9-17 * * *

# Every 5 minutes
*/5 * * * *
```

**Vercel Limitations:**
- Hobby: 1 execution/day
- Pro: 24 executions/day

---

## 🛠️ Environment Variables Checklist

```env
# REQUIRED - Supabase
✓ NEXT_PUBLIC_SPORTS_REMINDER_SUPABASE_URL
✓ NEXT_PUBLIC_SPORTS_REMINDER_SUPABASE_ANON_KEY  
✓ SPORTS_REMINDER_SUPABASE_SERVICE_ROLE_KEY

# REQUIRED - Security
✓ CRON_SECRET  # Min 32 chars, random

# REQUIRED - Email (at least one)
○ SENDGRID_API_KEY     # OR
○ RESEND_API_KEY       # OR both

# OPTIONAL - WhatsApp
○ SPORTS_REMINDER_META_WHATSAPP_ACCESS_TOKEN
○ SPORTS_REMINDER_META_PHONE_NUMBER_ID
○ SPORTS_REMINDER_META_WEBHOOK_VERIFY_TOKEN
○ SPORTS_REMINDER_WHATSAPP_TEMPLATE_NAME

# OPTIONAL - App
○ APP_URL  # For email links
```

---

## 📞 Support Queries

### Find subscribers for a match
```sql
SELECT s.* FROM subscribers s
WHERE s.favorite_teams @> ARRAY['Arsenal']
AND s.is_consented = true;
```

### Find matches without notifications
```sql
SELECT m.* FROM matches m
WHERE m.id NOT IN (
  SELECT DISTINCT match_id FROM notification_logs
)
AND m.status = 'scheduled'
AND m.kickoff_time > now();
```

### Resend failed notifications
```sql
SELECT nl.* FROM notification_logs nl
WHERE nl.status = 'failed'
AND nl.created_at > now() - interval '24 hours'
ORDER BY nl.created_at DESC;
```

---

## 🚨 Alerts Setup (Optional)

### Slack Integration
```typescript
async function notifySlack(message: string, errors: string[]) {
  const slackWebhook = process.env.SLACK_WEBHOOK_URL;
  
  await fetch(slackWebhook, {
    method: "POST",
    body: JSON.stringify({
      text: message,
      blocks: [
        {
          type: "section",
          text: { type: "mrkdwn", text: `*${message}*` },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: errors.map(e => `• ${e}`).join("\n"),
          },
        },
      ],
    }),
  });
}
```

### Discord Integration
```typescript
async function notifyDiscord(message: string, errors: string[]) {
  const discordWebhook = process.env.DISCORD_WEBHOOK_URL;
  
  await fetch(discordWebhook, {
    method: "POST",
    body: JSON.stringify({
      content: `🚨 ${message}`,
      embeds: [{
        title: "Cron Job Alert",
        description: errors.join("\n"),
        color: 16711680, // Red
      }],
    }),
  });
}
```

---

## 📊 Performance Tips

| Action | Benefit |
|--------|---------|
| Add `index on kickoff_time` | Faster match queries |
| Batch send (50 emails at once) | Better throughput |
| Add 100ms delay between sends | Lower rate limit risk |
| Use exponential backoff retry | Resilient error handling |
| Group by tenant for parallel sends | Multi-tenant scale |
| Check existence before insert | Prevent duplicates |

---

## 🔄 Deployment Checklist

Before going to production:

- [ ] Test locally: `npm run dev`
- [ ] Test cron endpoint with secret
- [ ] Database has test data (matches, subscribers)
- [ ] Email provider API key works
- [ ] WhatsApp template approved (if using)
- [ ] `vercel.json` syntax validated
- [ ] `CRON_SECRET` generated & secure
- [ ] All env vars in Vercel dashboard
- [ ] Deploy to staging first
- [ ] Monitor logs for 24 hours
- [ ] Check notification_logs for success rate
- [ ] Deploy to production
- [ ] Set up monitoring/alerts (optional)

---

## 📚 Useful Links

- [Vercel Cron Docs](https://vercel.com/docs/cron-jobs)
- [Cron Expression Generator](https://crontab.guru/)
- [Supabase Console](https://app.supabase.io/)
- [Vercel Dashboard](https://vercel.com/dashboard)
- [SendGrid API](https://sendgrid.com/docs/API_Reference/)
- [Resend API](https://resend.com/docs/api/send-email)
- [Meta WhatsApp Docs](https://developers.facebook.com/docs/whatsapp)

