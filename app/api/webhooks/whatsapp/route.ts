import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { WhatsAppService } from "@/lib/whatsapp/service";

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
 * POST - Handles Webhook Status Events and Incoming Messages.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256");

    if (signature && !WhatsAppService.verifySignature(rawBody, signature)) {
      console.error("Signature verification failed on WhatsApp webhook.");
      return new Response("Unauthorized", { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const { statuses, messages } = WhatsAppService.processWebhook(payload);

    // Handle Incoming Messages (Log them or reply)
    for (const msg of messages) {
      console.log(`Incoming message from ${msg.from}: ${msg.body || "[Media]"}`);
      // Here you could trigger a bot response or save to DB
    }

    if (statuses.length === 0) {
      return NextResponse.json({ success: true, processed: 0 });
    }

    const supabase = createAdminClient();

    for (const statusUpdate of statuses) {
      const { messageId, status, timestamp, error } = statusUpdate;

      const { data: existingLog, error: fetchError } = await supabase
        .from("notification_logs")
        .select("id, retry_count")
        .eq("provider_message_id", messageId)
        .maybeSingle();

      if (fetchError || !existingLog) {
        if (fetchError) console.error(`Error querying log for ${messageId}:`, fetchError);
        continue;
      }

      const updatePayload: Record<string, any> = { status };

      if (status === "delivered") updatePayload.delivered_at = timestamp.toISOString();
      else if (status === "read") updatePayload.read_at = timestamp.toISOString();
      else if (status === "failed") {
        updatePayload.error_message = error || "Meta delivery failed.";
        updatePayload.retry_count = (existingLog.retry_count || 0) + 1;
      }

      await supabase
        .from("notification_logs")
        .update(updatePayload)
        .eq("id", existingLog.id);
    }

    return NextResponse.json({ success: true, processed: statuses.length });
  } catch (err: any) {
    console.error("Error handling WhatsApp webhook POST:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
