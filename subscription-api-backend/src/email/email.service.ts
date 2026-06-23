import { Injectable } from "@nestjs/common";
import { MailerService } from "@nestjs-modules/mailer";

@Injectable()
export class EmailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendVerificationEmail(email: string, token: string) {
    const url = `https://genyxo.com/auth/verify?token=${token}`;

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: "Verify your Genyxo Email",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #10e6cc; text-align: center;">Welcome to Genyxo!</h2>
            <p>Hi there,</p>
            <p>Thank you for registering. Please click the button below to verify your email address and activate your account:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${url}" style="background-color: #10e6cc; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email</a>
            </div>
            <p style="color: #888; font-size: 12px;">If you did not create an account, please ignore this email.</p>
          </div>
        `,
      });
      console.log(`Verification email sent to ${email}`);
    } catch (error) {
      console.error("Error sending verification email:", error);
    }
  }

  async sendSupportReply(
    email: string,
    userName: string,
    ticketSubject: string,
    adminReply: string,
  ) {
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
      console.error("Error sending email:", error);
    }
  }
}
