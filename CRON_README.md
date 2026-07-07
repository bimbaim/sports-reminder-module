# Sports Reminder Module - Cron Implementation Guide

## 📚 Documentation Overview

Panduan lengkap implementasi cron jobs untuk sync API matches dan auto-send email notifications menggunakan **Vercel + Supabase**.

### Files:
1. **[CRON_IMPLEMENTATION.md](./CRON_IMPLEMENTATION.md)** - Dokumentasi lengkap (16 sections)
2. **[CRON_QUICK_REFERENCE.md](./CRON_QUICK_REFERENCE.md)** - Cheat sheet & quick access
3. **[CRON_CODE_EXAMPLES.md](./CRON_CODE_EXAMPLES.md)** - Copy-paste code snippets

---

## 🚀 Start Here (5 Minutes)

### 1. Generate Secret
```bash
# Mac/Linux
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))

# Save this value as CRON_SECRET
```

### 2. Create `vercel.json`
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

### 3. Add Environment Variables (Vercel Dashboard)
```
CRON_SECRET=<your-generated-secret>
SENDGRID_API_KEY=<key>
RESEND_API_KEY=<key>
```

### 4. Deploy
```bash
git add vercel.json .env.local
git commit -m "Setup cron jobs"
git push
```

### 5. Monitor
```
Vercel Dashboard → Functions → Cron Logs
```

---

## 🎯 What Each Cron Does

### `/api/cron/sync-matches`
**Purpose:** Sync upcoming matches dan kirim notifications

**Workflow:**
1. Fetch matches dalam 24 jam ke depan
2. Fetch all consented subscribers
3. Filter subscribers yang interested (by sport/team)
4. Check duplicate logs
5. Send WhatsApp + Email notifications
6. Log hasil (sent/failed)

**Schedule:** Setiap jam (default: `0 * * * *`)

**File:** `app/api/cron/sync-matches/route.ts`

### `/api/cron/send-match-reminders`
**Purpose:** Email reminder 24 jam sebelum kickoff

**Workflow:**
1. Fetch matches dalam 24 jam
2. Group subscribers by tenant
3. Generate email template per tenant
4. Send via tenant's email provider (SendGrid/Resend)
5. Log notification + store message ID

**Schedule:** Setiap jam (default: `0 * * * *`)

**File:** `app/api/cron/send-match-reminders/route.ts`

---

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                   Vercel Cron Trigger                        │
│           (Automatic every hour via crons config)           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ├──→ /api/cron/sync-matches
                     │    ├─ Fetch upcoming matches
                     │    ├─ Fetch consented subscribers
                     │    ├─ Match subscribers to matches
                     │    ├─ Send WhatsApp notifications
                     │    ├─ Send Email notifications
                     │    └─ Log results
                     │
                     └──→ /api/cron/send-match-reminders
                          ├─ Fetch matches (24h window)
                          ├─ Group by tenant
                          ├─ Generate email templates
                          ├─ Send via email provider
                          └─ Log + store message IDs

┌─────────────────────────────────────────────────────────────┐
│                    External Services                         │
├──────────────────┬──────────────────┬──────────────────────┤
│  Supabase/Postgres  │  SendGrid/Resend  │  Meta WhatsApp      │
│  - matches          │  - Email delivery │  - WhatsApp delivery│
│  - subscribers      │  - Template       │  - Message queue    │
│  - notification_logs│    rendering      │                     │
└────────────────────┴──────────────────┴──────────────────────┘
```

---

## 🔄 Data Flow Example

**Scenario:** Arsenal vs Liverpool di Premier League, kick off dalam 18 jam

```
1. Cron triggers at /api/cron/send-match-reminders

2. Fetch matches:
   - SELECT * FROM matches
   - WHERE kickoff_time BETWEEN now AND now+24h
   - AND status = 'scheduled'
   → Found: Arsenal vs Liverpool match

3. Fetch subscribers:
   - SELECT * FROM subscribers WHERE is_consented = true
   → Found: 150 subscribers

4. Filter interested:
   - Check favorite_teams contains 'Arsenal' OR 'Liverpool'
   → Interested: 42 subscribers

5. Group by tenant:
   - Subscriber 1-20 → Tenant A (SendGrid)
   - Subscriber 21-42 → Tenant B (Resend)

6. Send emails:
   - For Tenant A: Get SendGrid credentials
   - Generate HTML template with match details
   - Send to subscribers
   - Log results in notification_logs

   - For Tenant B: Get Resend credentials
   - Generate HTML template with match details
   - Send to subscribers
   - Log results in notification_logs

7. Response:
   {
     "status": "success",
     "message": "Processed 1 match, sent 42 emails",
     "matchesFound": 1,
     "emailsSent": 42,
     "emailsFailed": 0
   }
```

---

## 📋 Full Checklist for Production

### Pre-Setup
- [ ] Vercel project created
- [ ] Supabase project created
- [ ] Database schema initialized
- [ ] SendGrid account setup (or Resend)
- [ ] Meta WhatsApp business account setup

### Environment Variables
- [ ] `CRON_SECRET` generated & secure
- [ ] `NEXT_PUBLIC_SPORTS_REMINDER_SUPABASE_URL` set
- [ ] `SPORTS_REMINDER_SUPABASE_SERVICE_ROLE_KEY` set
- [ ] `SENDGRID_API_KEY` (or `RESEND_API_KEY`) set
- [ ] `SPORTS_REMINDER_META_WHATSAPP_ACCESS_TOKEN` set
- [ ] `SPORTS_REMINDER_META_PHONE_NUMBER_ID` set

### Code
- [ ] `vercel.json` created with cron schedules
- [ ] Cron routes tested locally
- [ ] Email templates created
- [ ] WhatsApp template approved in Meta

### Testing
- [ ] Test cron endpoint with curl
- [ ] Test email send
- [ ] Test WhatsApp send
- [ ] Add test data to database
- [ ] Monitor logs for 24 hours
- [ ] Check notification_logs table
- [ ] Verify success rate > 95%

### Monitoring
- [ ] Set up Vercel logs access
- [ ] Create database queries for troubleshooting
- [ ] Optional: Slack/Discord alerts
- [ ] Document runbook for common issues

---

## 🔐 Security Considerations

### CRON_SECRET
```
✅ DO:
- Generate random 32+ character string
- Store in Vercel environment variables
- Keep secret - don't commit to git
- Rotate periodically

❌ DON'T:
- Use simple strings like "password123"
- Hardcode in code
- Expose in client-side code
- Use same secret for multiple projects
```

### API Keys
```
✅ DO:
- Use environment variables only
- Restrict API key permissions to minimum
- Rotate periodically
- Monitor usage

❌ DON'T:
- Commit to git
- Expose in error messages
- Use test keys in production
- Share across teams without tracking
```

### Database Access
```
✅ DO:
- Use Service Role Key only for server/cron
- Use RLS policies
- Log all mutations
- Audit notification dispatch

❌ DON'T:
- Expose Service Role Key to client
- Skip RLS in development
- Use super-user privileges unnecessarily
```

---

## 🐛 Common Issues & Solutions

### Issue: "Cron job did not run"
**Symptoms:** No logs in Vercel, cron never triggers

**Solutions:**
1. Check `vercel.json` syntax (JSON lint)
2. Verify `CRON_SECRET` environment variable exists
3. Check branch is deployed (not in preview)
4. Redeploy: `git push`
5. Wait 5 minutes for first run

→ See: [CRON_QUICK_REFERENCE.md - Common Issues](./CRON_QUICK_REFERENCE.md#❌-common-issues--fixes)

### Issue: "401 Unauthorized"
**Error Response:** `{"error": "Unauthorized"}`

**Solutions:**
1. Verify `CRON_SECRET` matches between Vercel and code
2. For external cron: Add header `x-cron-secret: YOUR_SECRET`
3. Check header case-sensitivity (should be lowercase)

### Issue: "Email/WhatsApp not sending"
**Symptoms:** Status in notification_logs = "failed"

**Solutions:**
1. Check API keys in Vercel environment
2. Check subscriber email format
3. Check WhatsApp phone number format (with country code)
4. View error_message in notification_logs table
5. Check email provider rate limits

### Issue: "Duplicate notifications sent"
**Symptoms:** Same subscriber gets same notification multiple times

**Solutions:**
1. Verify duplicate check logic in code
2. Check notification_logs for existing entries
3. Ensure transaction/atomicity when creating logs
4. Add unique constraint if needed

→ See full troubleshooting: [CRON_QUICK_REFERENCE.md](./CRON_QUICK_REFERENCE.md)

---

## 📈 Monitoring & Maintenance

### Daily Check
```sql
-- Email delivery rate
SELECT 
  DATE(created_at) as date,
  status,
  COUNT(*) as count
FROM notification_logs
WHERE created_at > now() - interval '24 hours'
GROUP BY DATE(created_at), status;

-- Failed notifications
SELECT * FROM notification_logs
WHERE status = 'failed'
AND created_at > now() - interval '24 hours'
ORDER BY created_at DESC;
```

### Weekly Review
```sql
-- Top error types
SELECT 
  error_message,
  COUNT(*) as count
FROM notification_logs
WHERE status = 'failed'
AND created_at > now() - interval '7 days'
GROUP BY error_message
ORDER BY count DESC;

-- Delivery by channel
SELECT 
  channel,
  status,
  COUNT(*) as count
FROM notification_logs
WHERE created_at > now() - interval '7 days'
GROUP BY channel, status;
```

### Vercel Logs
```
Dashboard → Project → Functions → Cron Logs
```

---

## 🛠️ Development Workflow

### Local Testing
```bash
# Start dev server
npm run dev

# Test cron endpoint
curl -X GET "http://localhost:3000/api/cron/send-match-reminders" \
  -H "x-cron-secret: test-secret"

# Check response
# Should return: { "status": "success", ... }
```

### Preview Email
```
http://localhost:3000/api/test/preview-email
```

### Add Test Data
```typescript
// lib/test-data.ts
import { seedTestData } from "@/lib/test-data";

const { tenant, subscriber, match } = await seedTestData(supabase);
// Now run cron - should send 1 email
```

### Monitor Logs
```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Watch database logs
supabase functions logs

# Terminal 3: Make request
curl -X GET "http://localhost:3000/api/cron/send-match-reminders" \
  -H "x-cron-secret: test"
```

---

## 📞 Support & Resources

### Documentation Links
- **[Complete Implementation Guide](./CRON_IMPLEMENTATION.md)** - 16 sections with detailed explanations
- **[Quick Reference Sheet](./CRON_QUICK_REFERENCE.md)** - Cheat sheet for quick lookups
- **[Code Examples](./CRON_CODE_EXAMPLES.md)** - 11 copy-paste code snippets

### External Resources
- [Vercel Cron Jobs Docs](https://vercel.com/docs/cron-jobs)
- [Supabase Documentation](https://supabase.com/docs)
- [SendGrid API Reference](https://sendgrid.com/docs/API_Reference/)
- [Resend API Reference](https://resend.com/docs)
- [Meta WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Cron Expression Generator](https://crontab.guru/)

---

## 📝 Logs & Debugging

### Example: Successful Cron Run
```
[2025-01-01T10:00:00.000Z] [Cron] Starting send-match-reminders
[2025-01-01T10:00:02.000Z] [Cron] Found 3 matches for reminders
[2025-01-01T10:00:05.000Z] [Cron] Processing match 1: Arsenal vs Liverpool
[2025-01-01T10:00:08.000Z] [Cron] Found 42 interested subscribers
[2025-01-01T10:00:10.000Z] [Cron] Grouping by tenant...
[2025-01-01T10:00:12.000Z] [Email Sync] Tenant A: Sending 25 emails
[2025-01-01T10:00:18.000Z] [Email Sync] Tenant A: 25 emails sent successfully
[2025-01-01T10:00:20.000Z] [Email Sync] Tenant B: Sending 17 emails
[2025-01-01T10:00:25.000Z] [Email Sync] Tenant B: 17 emails sent successfully
[2025-01-01T10:00:27.000Z] [Cron] Job completed successfully
```

### Example: Error Logs
```
[2025-01-01T10:00:15.000Z] [Cron] Error fetching matches: connection timeout
[2025-01-01T10:00:16.000Z] [Cron] Retrying in 2000ms...
[2025-01-01T10:00:18.000Z] [Cron] Email Sync] Failed to send to user@example.com: Invalid email
[2025-01-01T10:00:19.000Z] [Cron] Error: SendGrid rate limit exceeded
```

---

## ✅ Next Steps

1. **Read the full guide:** [CRON_IMPLEMENTATION.md](./CRON_IMPLEMENTATION.md)
2. **Use quick reference:** [CRON_QUICK_REFERENCE.md](./CRON_QUICK_REFERENCE.md)
3. **Copy code examples:** [CRON_CODE_EXAMPLES.md](./CRON_CODE_EXAMPLES.md)
4. **Setup step by step:**
   - Create `vercel.json`
   - Generate `CRON_SECRET`
   - Set environment variables
   - Deploy to Vercel
   - Monitor logs
5. **Test in production:**
   - Check Vercel function logs
   - Monitor notification_logs table
   - Verify emails are sent
   - Set up alerts (optional)

---

## 📊 Key Metrics to Track

| Metric | Target | Formula |
|--------|--------|---------|
| Success Rate | > 95% | sent / (sent + failed) |
| Response Time | < 30s | request_end - request_start |
| Latency | < 2s per email | total_time / email_count |
| Error Rate | < 5% | failed / total |
| Retry Success | > 80% | retried_succeeded / retried |

---

## 🎓 Learning Path

**Beginner:**
- Read [CRON_QUICK_REFERENCE.md](./CRON_QUICK_REFERENCE.md)
- Follow the 5-minute setup
- Deploy and test

**Intermediate:**
- Read [CRON_IMPLEMENTATION.md sections 1-5](./CRON_IMPLEMENTATION.md)
- Understand data flow and security
- Customize schedules and templates

**Advanced:**
- Read [CRON_IMPLEMENTATION.md sections 6-9](./CRON_IMPLEMENTATION.md)
- Implement retry logic and batching
- Set up monitoring and alerts
- Review [CRON_CODE_EXAMPLES.md](./CRON_CODE_EXAMPLES.md)

---

**Last Updated:** 2025-01-07
**Version:** 1.0.0
**Status:** Ready for Production

