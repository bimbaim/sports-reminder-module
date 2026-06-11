import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseWebhookStatuses } from "@/lib/whatsapp/webhook-parser";
import crypto from "crypto";

/**
 * GET - Handles Webhook Verification Flow from Meta WhatsApp Cloud API.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.SPORTS_REMINDER_META_WEBHOOK_VERIFY_TOKEN;

  if (!verifyToken) {
    console.error("Missing SPORTS_REMINDER_META_WEBHOOK_VERIFY_TOKEN environment variable.");
    return new Response("Internal Server Error", { status: 500 });
  }

  if (mode === "subscribe" && token === verifyToken) {
    console.log("WhatsApp Webhook successfully verified.");
    return new Response(challenge, { status: 200 });
  }

  console.warn("WhatsApp Webhook verification failed due to token mismatch.");
  return new Response("Forbidden", { status: 403 });
}

/**
 * POST - Handles Webhook Status Events (sent, delivered, read, failed).
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    const appSecret = process.env.SPORTS_REMINDER_META_APP_SECRET;
    if (appSecret) {
      const signatureHeader = req.headers.get("x-hub-signature-256");
      if (!signatureHeader) {
        console.error("Missing x-hub-signature-256 header when secret is configured.");
        return new Response("Unauthorized", { status: 401 });
      }

      const parts = signatureHeader.split("=");
      const signature = parts[1];
      const expectedSignature = crypto
        .createHmac("sha256", appSecret)
        .update(rawBody)
        .digest("hex");

      if (signature !== expectedSignature) {
        console.error("Signature verification failed on WhatsApp webhook.");
        return new Response("Unauthorized", { status: 401 });
      }
    } else {
      console.warn(
        "[whatsapp-webhook] WARNING: SPORTS_REMINDER_META_APP_SECRET not set. Skipping HMAC verification."
      );
    }

    const payload = JSON.parse(rawBody);
    const statuses = parseWebhookStatuses(payload);

    if (statuses.length === 0) {
      // Return 200 OK to Meta even if we don't find statuses to avoid retries on unhandled events
      return NextResponse.json({ success: true, processed: 0 });
    }

    const supabase = createAdminClient();

    for (const statusUpdate of statuses) {
      const { messageId, status, timestamp, error } = statusUpdate;

      // Find the log entry matching provider_message_id
      const { data: existingLog, error: fetchError } = await supabase
        .from("notification_logs")
        .select("id, retry_count")
        .eq("provider_message_id", messageId)
        .maybeSingle();

      if (fetchError) {
        console.error(`Error querying notification log for messageId ${messageId}:`, fetchError);
        continue;
      }

      if (!existingLog) {
        console.warn(`No notification log found matching provider_message_id: ${messageId}`);
        continue;
      }

      // Prepare fields to update based on status type
      const updatePayload: Record<string, any> = {
        status: status,
      };

      if (status === "delivered") {
        updatePayload.delivered_at = timestamp.toISOString();
      } else if (status === "read") {
        updatePayload.read_at = timestamp.toISOString();
      } else if (status === "failed") {
        updatePayload.error_message = error || "Meta delivery failed.";
        updatePayload.retry_count = (existingLog.retry_count || 0) + 1;
      }

      const { error: updateError } = await supabase
        .from("notification_logs")
        .update(updatePayload)
        .eq("id", existingLog.id);

      if (updateError) {
        console.error(`Failed to update notification log ID ${existingLog.id}:`, updateError);
      } else {
        console.log(`Notification log ID ${existingLog.id} status updated to: ${status}`);
      }
    }

    return NextResponse.json({ success: true, processed: statuses.length });
  } catch (err: any) {
    console.error("Error handling WhatsApp webhook POST:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
