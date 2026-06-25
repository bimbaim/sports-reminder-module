import sgMail from '@sendgrid/mail';
import { IEmailService, SendEmailParams, EmailSendResult, BulkEmailParams, BulkEmailResult } from './email-service';

const sendgridApiKey = process.env.SENDGRID_API_KEY;
if (!sendgridApiKey) {
  console.error('[Sendgrid] API key not found in environment');
}
sgMail.setApiKey(sendgridApiKey || '');

const DEFAULT_FROM = process.env.SENDGRID_FROM_EMAIL || 'noreply@sportsreminder.com';

export class SendgridEmailService implements IEmailService {
  async sendEmail(params: SendEmailParams): Promise<EmailSendResult> {
    try {
      const { to, subject, htmlContent, from = DEFAULT_FROM } = params;

      if (!this.isValidEmail(to)) {
        return {
          success: false,
          error: `Invalid recipient email: ${to}`,
        };
      }

      const msg = {
        to,
        from,
        subject,
        html: htmlContent,
      };

      const [response] = await sgMail.send(msg);

      return {
        success: true,
        messageId: response.headers['x-message-id'] || 'unknown',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown Sendgrid error';
      console.error('[Sendgrid] Send email failed:', errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async sendBulk(params: BulkEmailParams): Promise<BulkEmailResult> {
    try {
      const { recipients, subject, htmlContent, from = DEFAULT_FROM } = params;

      if (recipients.length === 0) {
        return {
          success: false,
          successCount: 0,
          failedCount: 0,
          error: 'No recipients provided',
        };
      }

      const validRecipients = recipients.filter((r) => this.isValidEmail(r.email));
      const invalidEmails = recipients
        .filter((r) => !this.isValidEmail(r.email))
        .map((r) => r.email);

      const messages = validRecipients.map((recipient) => ({
        to: recipient.email,
        from,
        subject,
        html: htmlContent,
      }));

      const results = await Promise.allSettled(
        messages.map((msg) => sgMail.send(msg))
      );

      const successCount = results.filter((r) => r.status === 'fulfilled').length;
      const failedCount = results.filter((r) => r.status === 'rejected').length + invalidEmails.length;

      if (failedCount > 0) {
        console.warn(
          `[Sendgrid] Bulk send completed with ${failedCount} failures`,
          invalidEmails
        );
      }

      return {
        success: failedCount === 0,
        successCount,
        failedCount,
        failedEmails: invalidEmails,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown Sendgrid error';
      console.error('[Sendgrid] Bulk send failed:', errorMessage);
      return {
        success: false,
        successCount: 0,
        failedCount: params.recipients.length,
        error: errorMessage,
      };
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
