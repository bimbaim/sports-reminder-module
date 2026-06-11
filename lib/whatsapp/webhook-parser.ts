import { MetaWebhookPayload } from "./types";

export interface NormalizedWebhookStatus {
  messageId: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: Date;
  error?: string;
}

/**
 * Parses and normalizes incoming status events from the Meta WhatsApp webhook payload.
 * Safely handles missing, unexpected, or malformed data to avoid runtime crashes.
 *
 * @param payload The raw parsed JSON body from Meta Webhook POST request
 */
export function parseWebhookStatuses(payload: any): NormalizedWebhookStatus[] {
  const normalized: NormalizedWebhookStatus[] = [];

  try {
    if (!payload || typeof payload !== "object") {
      return normalized;
    }

    const entries = payload.entry;
    if (!Array.isArray(entries)) {
      return normalized;
    }

    for (const entry of entries) {
      const changes = entry?.changes;
      if (!Array.isArray(changes)) {
        continue;
      }

      for (const change of changes) {
        const value = change?.value;
        if (!value || typeof value !== "object") {
          continue;
        }

        const statuses = value?.statuses;
        if (!Array.isArray(statuses)) {
          continue;
        }

        for (const rawStatus of statuses) {
          const messageId = rawStatus?.id;
          const status = rawStatus?.status;
          const timestampStr = rawStatus?.timestamp;

          // Validate crucial fields exist
          if (!messageId || !status) {
            continue;
          }

          // Validate status matches our expected enum values
          if (
            status !== "sent" &&
            status !== "delivered" &&
            status !== "read" &&
            status !== "failed"
          ) {
            continue;
          }

          // Parse timestamp safely
          let timestamp = new Date();
          if (timestampStr) {
            const unixTime = parseInt(timestampStr, 10);
            if (!isNaN(unixTime)) {
              // Meta webhook timestamps are in seconds
              timestamp = new Date(unixTime * 1000);
            }
          }

          // Format error if status is failed
          let error: string | undefined;
          if (
            status === "failed" &&
            rawStatus?.errors &&
            Array.isArray(rawStatus.errors)
          ) {
            const firstError = rawStatus.errors[0];
            error = firstError
              ? `Code ${firstError.code}: ${firstError.message || firstError.title}`
              : "Unknown webhook status error";
          }

          normalized.push({
            messageId,
            status,
            timestamp,
            error,
          });
        }
      }
    }
  } catch (err) {
    console.error("Critical error in parseWebhookStatuses:", err);
  }

  return normalized;
}
