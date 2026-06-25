import { IEmailService } from './email-service';
import { SendgridEmailService } from './sendgrid-service';
import { ResendEmailService } from './resend-service';

export type EmailProvider = 'sendgrid' | 'resend';

/**
 * Factory function untuk mendapatkan email service instance berdasarkan provider
 * @param provider - 'sendgrid' atau 'resend'
 * @returns Email service instance yang sesuai
 * @throws Error jika provider tidak valid
 */
export function getEmailService(provider: EmailProvider): IEmailService {
  switch (provider) {
    case 'sendgrid':
      return new SendgridEmailService();
    case 'resend':
      return new ResendEmailService();
    default:
      throw new Error(`Invalid email provider: ${provider}`);
  }
}

/**
 * Helper function untuk validate provider string
 * Gunakan ini ketika ambil value dari database yang bisa berisi data unexpected
 * @param value - value dari database atau user input
 * @returns true jika value adalah valid EmailProvider
 */
export function isValidEmailProvider(value: unknown): value is EmailProvider {
  return value === 'sendgrid' || value === 'resend';
}
