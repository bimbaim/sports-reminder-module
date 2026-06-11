export interface MetaTemplateComponentParameter {
  type: "text" | "currency" | "date_time" | "image" | "document" | "video";
  text?: string;
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

export interface MetaTemplateMessageRequest {
  messaging_product: "whatsapp";
  recipient_type?: "individual";
  to: string;
  type: "template";
  template: MetaTemplate;
}

export interface MetaMessageContact {
  input: string;
  wa_id: string;
}

export interface MetaMessageCreated {
  id: string;
}

export interface MetaTemplateMessageResponse {
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
  messages?: Array<{
    from: string;
    id: string;
    timestamp: string;
    text?: {
      body: string;
    };
    type: string;
  }>;
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
