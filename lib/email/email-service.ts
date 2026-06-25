export interface SendEmailParams {
  to: string;
  subject: string;
  htmlContent: string;
  from?: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface BulkEmailParams {
  recipients: Array<{ email: string }>;
  subject: string;
  htmlContent: string;
  from?: string;
}

export interface BulkEmailResult {
  success: boolean;
  successCount: number;
  failedCount: number;
  failedEmails?: string[];
  error?: string;
}

export interface IEmailService {
  sendEmail(params: SendEmailParams): Promise<EmailSendResult>;
  sendBulk(params: BulkEmailParams): Promise<BulkEmailResult>;
}
