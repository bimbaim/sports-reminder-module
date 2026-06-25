import { Resend } from 'resend';
import { IEmailService, SendEmailParams, EmailSendResult, BulkEmailParams, BulkEmailResult } from './email-service';

const resendApiKey = process.env.RESEND_API_KEY;
if (!resendApiKey) {
  console.error('[Resend] API key not found in environment');
}
const resend = new Resend(resendApiKey);

const DEFAULT_FROM = process.env.RESEND_FROM_EMAIL || 'noreply@sportsreminder.com';

export class ResendEmailService implements IEmailService {
  async sendEmail(params: SendEmailParams): Promise<EmailSendResult> {
    try {
      const { to, subject, htmlContent, from = DEFAULT_FROM } = params;

      if (!this.isValidEmail(to)) {
        return {
          success: false,
          error: `Invalid recipient email: ${to}`,
        };
      }

      const response = await resend.emails.send({
        from,
        to,
        subject,
        html: htmlContent,
      });

      if (response.error) {
        return {
          success: false,
          error: response.error.message,
        };
      }

      return {
        success: true,
        messageId: response.data?.id || 'unknown',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown Resend error';
      console.error('[Resend] Send email failed:', errorMessage);
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

      const results = await Promise.allSettled(
        validRecipients.map((recipient) =>
          resend.emails.send({
            from,
            to: recipient.email,
            subject,
            html: htmlContent,
          })
        )
      );

      const successCount = results.filter(
        (r) => r.status === 'fulfilled' && (r.value as any).data?.id
      ).length;
      const failedCount = results.filter(
        (r) => r.status === 'rejected' || (r.status === 'fulfilled' && (r.value as any).error)
      ).length + invalidEmails.length;

      if (failedCount > 0) {
        console.warn(
          `[Resend] Bulk send completed with ${failedCount} failures`,
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown Resend error';
      console.error('[Resend] Bulk send failed:', errorMessage);
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
