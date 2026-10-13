import { Test, TestingModule } from "@nestjs/testing";
import { EmailProcessor } from "./email.processor";
import { MailerService } from "@nestjs-modules/mailer";
import { MetricsService } from "../../metrics/metrics.service";
import { EMAIL_JOBS } from "../queue.constants";
import { Job } from "bullmq";

describe("EmailProcessor", () => {
  let processor: EmailProcessor;
  let mockMailer: { sendMail: jest.Mock };

  beforeEach(async () => {
    mockMailer = {
      sendMail: jest.fn().mockResolvedValue({ messageId: "test-id" }),
    };

    const mockMetrics = {
      queueJobsFailed: { inc: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailProcessor,
        { provide: MailerService, useValue: mockMailer },
        { provide: MetricsService, useValue: mockMetrics },
      ],
    }).compile();

    processor = module.get<EmailProcessor>(EmailProcessor);
  });

  it("should be defined", () => {
    expect(processor).toBeDefined();
  });

  it("should process verification email job", async () => {
    const job = {
      id: "1",
      name: EMAIL_JOBS.VERIFICATION,
      data: { email: "user@example.com", token: "token123" },
    } as unknown as Job;

    await processor.process(job);

    expect(mockMailer.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user@example.com",
        subject: "Verify your Genyxo Email",
      }),
    );
  });

  it("should process support reply job", async () => {
    const job = {
      id: "2",
      name: EMAIL_JOBS.SUPPORT_REPLY,
      data: {
        email: "support@example.com",
        userName: "Alice",
        ticketSubject: "Billing inquiry",
        adminReply: "Resolved!",
      },
    } as unknown as Job;

    await processor.process(job);

    expect(mockMailer.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "support@example.com",
        subject: "Reply to your ticket: Billing inquiry",
      }),
    );
  });

  it("should throw error on unknown job name", async () => {
    const job = {
      id: "3",
      name: "unknown-job",
      data: {},
    } as unknown as Job;

    await expect(processor.process(job)).rejects.toThrow(
      "Unsupported email job: unknown-job",
    );
  });
});
