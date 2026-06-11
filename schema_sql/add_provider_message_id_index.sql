-- Migration: Add index on notification_logs(provider_message_id)
-- to optimize webhook lookups.
CREATE INDEX IF NOT EXISTS idx_notification_logs_provider_message_id 
ON notification_logs(provider_message_id);
