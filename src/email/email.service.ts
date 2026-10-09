import { Injectable, Logger, Optional } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { MailerService } from "@nestjs-modules/mailer";
import { frontendUrl } from "../common/frontend-url";
import { EMAIL_JOBS, QUEUE_NAMES } from "../queues/queue.constants";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly mailerService: MailerService,
    @Optional()
    @InjectQueue(QUEUE_NAMES.EMAIL)
    private readonly emailQueue?: Queue,
  ) {}

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    if (this.emailQueue) {
      try {
        await this.emailQueue.add(
          EMAIL_JOBS.VERIFICATION,
          { email, token },
          {
            attempts: 3,
            backoff: { type: "exponential", delay: 2000 },
            removeOnComplete: 100,
            removeOnFail: 500,
          },
        );
        this.logger.log(`Verification email job enqueued for ${email}`);
        return;
      } catch (error: any) {
        this.logger.warn(
          `Failed to enqueue verification email to BullMQ, falling back to direct send: ${error?.message}`,
        );
      }
    }

    // Direct synchronous fallback (used in test mode or when Redis queue is offline)
    await this.sendVerificationEmailDirect(email, token);
  }

  public async sendVerificationEmailDirect(
    email: string,
    token: string,
  ): Promise<void> {
    const target = frontendUrl("/auth/verify");
    target.searchParams.set("token", token);
    const url = target.href;

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
      this.logger.log(`Verification email sent directly to ${email}`);
    } catch (error) {
      this.logger.error("Error sending verification email:", error);
    }
  }

  async sendSupportReply(
    email: string,
    userName: string,
    ticketSubject: string,
    adminReply: string,
  ): Promise<void> {
    if (this.emailQueue) {
      try {
        await this.emailQueue.add(
          EMAIL_JOBS.SUPPORT_REPLY,
          {
            email,
            userName,
            ticketSubject,
            adminReply,
          },
          {
            attempts: 3,
            backoff: { type: "exponential", delay: 2000 },
            removeOnComplete: 100,
            removeOnFail: 500,
          },
        );
        this.logger.log(`Support reply email job enqueued for ${email}`);
        return;
      } catch (error: any) {
        this.logger.warn(
          `Failed to enqueue support reply email to BullMQ, falling back to direct send: ${error?.message}`,
        );
      }
    }

    // Direct synchronous fallback
    await this.sendSupportReplyDirect(
      email,
      userName,
      ticketSubject,
      adminReply,
    );
  }

  public async sendSupportReplyDirect(
    email: string,
    userName: string,
    ticketSubject: string,
    adminReply: string,
  ): Promise<void> {
    const safeName = this.escapeHtml(userName);
    const safeSubject = this.escapeHtml(ticketSubject);
    const safeReply = this.escapeHtml(adminReply);

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `Reply to your ticket: ${ticketSubject}`,
        html: `
          <div style="font-family: Arial, sans-serif; color: #333;">
            <h2 style="color: #10e6cc;">Support Update</h2>
            <p>Hi <strong>${safeName}</strong>,</p>
            <p>The support team has replied to your ticket "<strong>${safeSubject}</strong>".</p>
            <hr style="border: 0; border-top: 1px solid #eee;">
            <p><strong>Admin Reply:</strong></p>
            <blockquote style="background: #f9f9f9; padding: 10px; border-left: 4px solid #10e6cc; white-space: pre-wrap;">
              ${safeReply}
            </blockquote>
            <hr style="border: 0; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #888;">Genyxo Team</p>
          </div>
        `,
      });
      this.logger.log(`Support reply email sent directly to ${email}`);
    } catch (error) {
      this.logger.error("Error sending support reply email:", error);
    }
  }

  private escapeHtml(str: string): string {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
