import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger, Optional } from "@nestjs/common";
import { Job } from "bullmq";
import { MailerService } from "@nestjs-modules/mailer";
import {
  EMAIL_JOBS,
  QUEUE_NAMES,
  SupportReplyEmailJobData,
  VerificationEmailJobData,
} from "../queue.constants";
import { frontendUrl } from "../../common/frontend-url";
import { MetricsService } from "../../metrics/metrics.service";

@Processor(QUEUE_NAMES.EMAIL)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private readonly mailerService: MailerService,
    @Optional() private readonly metricsService?: MetricsService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(
      `Processing job ${job.id} (${job.name}) on queue ${QUEUE_NAMES.EMAIL}`,
    );

    switch (job.name) {
      case EMAIL_JOBS.VERIFICATION:
        return this.handleVerificationEmail(
          job.data as VerificationEmailJobData,
        );

      case EMAIL_JOBS.SUPPORT_REPLY:
        return this.handleSupportReplyEmail(
          job.data as SupportReplyEmailJobData,
        );

      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
        throw new Error(`Unsupported email job: ${job.name}`);
    }
  }

  private async handleVerificationEmail(
    data: VerificationEmailJobData,
  ): Promise<void> {
    const { email, token } = data;
    const target = frontendUrl("/auth/verify");
    target.searchParams.set("token", token);
    const url = target.href;

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

    this.logger.log(`Verification email sent to ${email}`);
  }

  private async handleSupportReplyEmail(
    data: SupportReplyEmailJobData,
  ): Promise<void> {
    const { email, userName, ticketSubject, adminReply } = data;
    const safeName = this.escapeHtml(userName);
    const safeSubject = this.escapeHtml(ticketSubject);
    const safeReply = this.escapeHtml(adminReply);

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

    this.logger.log(`Support reply email sent to ${email}`);
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

  @OnWorkerEvent("completed")
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} (${job.name}) completed successfully.`);
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Job ${job.id} (${job.name}) failed with attempt ${job.attemptsMade}: ${error.message}`,
      error.stack,
    );
    this.metricsService?.queueJobsFailed.inc({ queue: QUEUE_NAMES.EMAIL });

    if (job.attemptsMade >= (job.opts?.attempts || 3)) {
      this.logger.error(
        `Job ${job.id} (${job.name}) moved to Dead-Letter Queue (exhausted all ${job.attemptsMade} attempts).`,
      );
    }
  }
}
