import { sendWhatsAppRequest } from "./client";
import {
  MetaMessageRequest,
  MetaMessageResponse,
  MetaTemplateComponentParameter,
  NormalizedIncomingMessage,
  NormalizedWebhookStatus,
} from "./types";
import crypto from "crypto";
import { parseIncomingMessages, parseWebhookStatuses } from "./webhook-parser";

export interface WhatsAppResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class WhatsAppService {
  private static phoneNumberId = process.env.SPORTS_REMINDER_META_PHONE_NUMBER_ID;
  private static appSecret = process.env.SPORTS_REMINDER_META_APP_SECRET;

  /**
   * Verifies the X-Hub-Signature-256 header from Meta.
   */
  static verifySignature(rawBody: string, signatureWithPrefix: string): boolean {
    if (!this.appSecret) {
      console.warn("SPORTS_REMINDER_META_APP_SECRET not set. Skipping verification.");
      return true;
    }

    const signature = signatureWithPrefix.startsWith("sha256=")
      ? signatureWithPrefix.split("=")[1]
      : signatureWithPrefix;

    const expectedSignature = crypto
      .createHmac("sha256", this.appSecret)
      .update(rawBody)
      .digest("hex");

    return signature === expectedSignature;
  }

  /**
   * Processes the webhook payload and returns normalized statuses and messages.
   */
  static processWebhook(payload: any): {
    statuses: NormalizedWebhookStatus[];
    messages: NormalizedIncomingMessage[];
  } {
    return {
      statuses: parseWebhookStatuses(payload),
      messages: parseIncomingMessages(payload),
    };
  }

  private static async send(payload: MetaMessageRequest): Promise<WhatsAppResponse> {
    if (!this.phoneNumberId) {
      return {
        success: false,
        error: "Missing SPORTS_REMINDER_META_PHONE_NUMBER_ID environment variable.",
      };
    }

    try {
      const endpoint = `/${this.phoneNumberId}/messages`;
      const response = await sendWhatsAppRequest<MetaMessageResponse>(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      return {
        success: true,
        messageId: response.messages?.[0]?.id,
      };
    } catch (error: any) {
      console.error("WhatsApp API Error:", error);
      return {
        success: false,
        error: error.message || "An unexpected error occurred.",
      };
    }
  }

  /**
   * Sends a text message.
   */
  static async sendText(to: string, body: string, previewUrl = false): Promise<WhatsAppResponse> {
    return this.send({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { body, preview_url: previewUrl },
    });
  }

  /**
   * Sends a template message.
   */
  static async sendTemplate(
    to: string,
    templateName: string,
    languageCode: string,
    parameters: MetaTemplateComponentParameter[] = []
  ): Promise<WhatsAppResponse> {
    const payload: MetaMessageRequest = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
      },
    };

    if (parameters.length > 0) {
      payload.template!.components = [
        {
          type: "body",
          parameters,
        },
      ];
    }

    return this.send(payload);
  }

  /**
   * Sends an image message.
   */
  static async sendImage(to: string, link: string, caption?: string): Promise<WhatsAppResponse> {
    return this.send({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "image",
      image: { link, caption },
    });
  }

  /**
   * Sends a document message.
   */
  static async sendDocument(
    to: string,
    link: string,
    filename?: string,
    caption?: string
  ): Promise<WhatsAppResponse> {
    return this.send({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "document",
      document: { link, filename, caption },
    });
  }

  /**
   * Sends a video message.
   */
  static async sendVideo(to: string, link: string, caption?: string): Promise<WhatsAppResponse> {
    return this.send({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "video",
      video: { link, caption },
    });
  }
}
