# Production Deployment Guide

## 1. Pre-Deployment Checklist
- [ ] Rename `proxy.ts` to `middleware.ts` (Required for security).
- [ ] Environment variables registered in Production Host.
- [ ] Database migrations applied to Production Supabase instance.
- [ ] Meta WhatsApp Template approved by Meta.

## 2. Supabase Configuration
- Enable Email Auth.
- Ensure `service_role` is used only in server actions.
- Verify Site URL in Auth Settings matches `APP_URL`.

## 3. Meta WhatsApp Configuration
- Add `APP_URL/api/whatsapp/webhook` to the Meta App dashboard.
- Verify the `x-hub-signature` validation is active in the webhook route.

## 4. Scheduler Configuration
- Set up a daily trigger for `GET /api/cron/sync-matches`.
- Header `x-cron-secret` must match `CRON_SECRET`.

## 5. Environment Verification
| Name | Priority | Risk |
|---|---|---|
| `NEXT_PUBLIC_...` | High | Client failure if missing |
| `SERVICE_ROLE_KEY` | Critical | Database access failure |
| `CRON_SECRET` | Medium | Unauthorized data sync |

## 6. Rollback Plan
1. **Code:** Revert to previous git tag/commit.
2. **Database:** Supabase provides point-in-time recovery (PITR).
3. **API:** Disable the Sync CRON if data ingestion becomes corrupted.

## 7. Verification Steps
- Login to Dashboard.
- Create a test tenant.
- Submit a subscription via the widget.
- Manually trigger `/api/cron/sync-matches`.
- Check `notification_logs` for a 'success' entry.