export interface MetaTemplateComponentParameter {
  type: "text" | "currency" | "date_time" | "image" | "document" | "video";
  text?: string;
  image?: { link: string; caption?: string };
  document?: { link: string; filename?: string; caption?: string };
  video?: { link: string; caption?: string };
}

export interface MetaTemplateComponent {
  type: "header" | "body" | "button";
  sub_type?: string;
  index?: string;
  parameters: MetaTemplateComponentParameter[];
}

export interface MetaTemplateLanguage {
  code: string;
}

export interface MetaTemplate {
  name: string;
  language: MetaTemplateLanguage;
  components?: MetaTemplateComponent[];
}

export interface MetaTextMessage {
  body: string;
  preview_url?: boolean;
}

export interface MetaMediaMessage {
  link: string;
  caption?: string;
  filename?: string;
}

export interface MetaMessageRequest {
  messaging_product: "whatsapp";
  recipient_type?: "individual";
  to: string;
  type: "template" | "text" | "image" | "document" | "video" | "audio";
  template?: MetaTemplate;
  text?: MetaTextMessage;
  image?: MetaMediaMessage;
  document?: MetaMediaMessage;
  video?: MetaMediaMessage;
  audio?: MetaMediaMessage;
}

export interface MetaMessageContact {
  input: string;
  wa_id: string;
}

export interface MetaMessageCreated {
  id: string;
}

export interface MetaMessageResponse {
  messaging_product: "whatsapp";
  contacts: MetaMessageContact[];
  messages: MetaMessageCreated[];
}

export interface MetaWebhookError {
  code: number;
  title: string;
  message?: string;
  error_data?: {
    details?: string;
  };
}

export interface MetaWebhookStatus {
  id: string;
  recipient_id: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  errors?: MetaWebhookError[];
}

export interface MetaIncomingMessage {
  from: string;
  id: string;
  timestamp: string;
  type: "text" | "image" | "document" | "video" | "audio" | "sticker" | "button" | "unknown";
  text?: {
    body: string;
  };
  image?: {
    id: string;
    mime_type: string;
    sha256: string;
    caption?: string;
  };
  document?: {
    id: string;
    mime_type: string;
    sha256: string;
    filename?: string;
    caption?: string;
  };
  audio?: {
    id: string;
    mime_type: string;
    sha256: string;
    voice: boolean;
  };
  video?: {
    id: string;
    mime_type: string;
    sha256: string;
    caption?: string;
  };
}

export interface MetaWebhookChangeValue {
  messaging_product: "whatsapp";
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: Array<{
    profile: {
      name: string;
    };
    wa_id: string;
  }>;
  messages?: MetaIncomingMessage[];
  statuses?: MetaWebhookStatus[];
}

export interface MetaWebhookChange {
  value: MetaWebhookChangeValue;
  field: "messages";
}

export interface MetaWebhookEntry {
  id: string;
  changes: MetaWebhookChange[];
}

export interface MetaWebhookPayload {
  object: "whatsapp_business_account";
  entry: MetaWebhookEntry[];
}

export interface NormalizedWebhookStatus {
  messageId: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: Date;
  error?: string;
}

export interface NormalizedIncomingMessage {
  from: string;
  messageId: string;
  timestamp: Date;
  type: string;
  body?: string;
  mediaId?: string;
  caption?: string;
}
