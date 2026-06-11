-- Migration: Add WhatsApp tracking columns to notification_logs
ALTER TABLE notification_logs
ADD COLUMN IF NOT EXISTS provider_message_id VARCHAR(255);

ALTER TABLE notification_logs
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0 NOT NULL;

ALTER TABLE notification_logs
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

ALTER TABLE notification_logs
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
