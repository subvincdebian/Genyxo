import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EmailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendSupportReply(email: string, userName: string, ticketSubject: string, adminReply: string) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `Reply to your ticket: ${ticketSubject}`,
        html: `
          <div style="font-family: Arial, sans-serif; color: #333;">
            <h2 style="color: #10e6cc;">Support Update</h2>
            <p>Hi <strong>${userName}</strong>,</p>
            <p>The support team has replied to your ticket "<strong>${ticketSubject}</strong>".</p>
            <hr style="border: 0; border-top: 1px solid #eee;">
            <p><strong>Admin Reply:</strong></p>
            <blockquote style="background: #f9f9f9; padding: 10px; border-left: 4px solid #10e6cc;">
              ${adminReply}
            </blockquote>
            <hr style="border: 0; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #888;">Genyxo Team</p>
          </div>
        `,
      });
      console.log(`Email sent to ${email}`);
    } catch (error) {
      console.error('Error sending email:', error);
    }
  }
}
