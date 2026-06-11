export interface WhatsAppApiError extends Error {
  status?: number;
  code?: number;
  subcode?: number;
  fbError?: any;
}

/**
 * Sends a request to the Meta WhatsApp Cloud API v20.0.
 *
 * @param endpoint The API endpoint path, e.g. "/{PHONE_NUMBER_ID}/messages"
 * @param options Custom request initialization parameters (method, body, headers, etc.)
 */
export async function sendWhatsAppRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = process.env.SPORTS_REMINDER_META_WHATSAPP_ACCESS_TOKEN;

  if (!token) {
    throw new Error(
      "Missing SPORTS_REMINDER_META_WHATSAPP_ACCESS_TOKEN environment variable."
    );
  }

  const baseUrl = "https://graph.facebook.com/v20.0";
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${normalizedEndpoint}`;

  const defaultHeaders = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    
    let data: any;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = { message: await response.text() };
    }

    if (!response.ok) {
      const errorMsg =
        data?.error?.message || `HTTP error! status: ${response.status}`;
      const errorCode = data?.error?.code;
      const errorSubcode = data?.error?.error_subcode;

      const structuredError = new Error(errorMsg) as WhatsAppApiError;
      structuredError.status = response.status;
      structuredError.code = errorCode;
      structuredError.subcode = errorSubcode;
      structuredError.fbError = data?.error;
      throw structuredError;
    }

    return data as T;
  } catch (error: any) {
    if (error.fbError || error.status) {
      throw error;
    }
    const wrapError = new Error(
      `Failed to send request to WhatsApp API: ${error.message}`
    ) as WhatsAppApiError;
    throw wrapError;
  }
}
