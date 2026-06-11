import { sendWhatsAppRequest } from "./client";
import {
  MetaTemplateMessageRequest,
  MetaTemplateMessageResponse,
  MetaTemplateComponentParameter,
} from "./types";

export interface SendTemplateResponse {
  success: boolean;
  providerMessageId?: string;
  error?: string;
}

/**
 * Sends a WhatsApp template message using the Meta Cloud API.
 *
 * @param phoneNumber Subscriber's phone number (already normalized with country code, e.g. "628123456789")
 * @param templateName The name of the registered WhatsApp template
 * @param languageCode The language code for the template (e.g. "en" or "id")
 * @param templateParameters Parameters to fill the placeholder variables in the template body
 */
export async function sendTemplateMessage(
  phoneNumber: string,
  templateName: string,
  languageCode: string,
  templateParameters: MetaTemplateComponentParameter[] = []
): Promise<SendTemplateResponse> {
  const phoneNumberId = process.env.SPORTS_REMINDER_META_PHONE_NUMBER_ID;

  if (!phoneNumberId) {
    return {
      success: false,
      error: "Missing SPORTS_REMINDER_META_PHONE_NUMBER_ID environment variable.",
    };
  }

  // Construct the template payload conforming to MetaTemplateMessageRequest
  const payload: MetaTemplateMessageRequest = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: phoneNumber,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: languageCode,
      },
    },
  };

  // If parameters are provided, map them into a body component
  if (templateParameters && templateParameters.length > 0) {
    payload.template.components = [
      {
        type: "body",
        parameters: templateParameters,
      },
    ];
  }

  try {
    const endpoint = `/${phoneNumberId}/messages`;
    
    const response = await sendWhatsAppRequest<MetaTemplateMessageResponse>(
      endpoint,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );

    const providerMessageId = response.messages?.[0]?.id;

    if (!providerMessageId) {
      return {
        success: false,
        error: "Response from WhatsApp API did not contain a message ID.",
      };
    }

    return {
      success: true,
      providerMessageId,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "An error occurred while sending the template message.",
    };
  }
}
