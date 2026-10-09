import { Test, TestingModule } from "@nestjs/testing";
import { EmailService } from "./email.service";
import { MailerService } from "@nestjs-modules/mailer";
import { getQueueToken } from "@nestjs/bullmq";
import { EMAIL_JOBS, QUEUE_NAMES } from "../queues/queue.constants";

describe("EmailService", () => {
  let service: EmailService;
  let mockQueue: any;
  let mockMailer: any;

  beforeEach(async () => {
    mockQueue = {
      add: jest.fn().mockResolvedValue({ id: "job-123" }),
    };

    mockMailer = {
      sendMail: jest.fn().mockResolvedValue({ messageId: "email-123" }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: MailerService, useValue: mockMailer },
        { provide: getQueueToken(QUEUE_NAMES.EMAIL), useValue: mockQueue },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should enqueue verification email when queue is available", async () => {
    await service.sendVerificationEmail("test@example.com", "tok123");

    expect(mockQueue.add).toHaveBeenCalledWith(
      EMAIL_JOBS.VERIFICATION,
      { email: "test@example.com", token: "tok123" },
      expect.objectContaining({ attempts: 3 }),
    );
    expect(mockMailer.sendMail).not.toHaveBeenCalled();
  });

  it("should enqueue support reply email when queue is available", async () => {
    await service.sendSupportReply(
      "test@example.com",
      "Bob",
      "Issue 1",
      "Fixed",
    );

    expect(mockQueue.add).toHaveBeenCalledWith(
      EMAIL_JOBS.SUPPORT_REPLY,
      {
        email: "test@example.com",
        userName: "Bob",
        ticketSubject: "Issue 1",
        adminReply: "Fixed",
      },
      expect.objectContaining({ attempts: 3 }),
    );
    expect(mockMailer.sendMail).not.toHaveBeenCalled();
  });

  it("should fallback to direct send if queue enqueue throws error", async () => {
    mockQueue.add.mockRejectedValue(new Error("Redis connection closed"));

    await service.sendVerificationEmail("test@example.com", "tok123");

    expect(mockMailer.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "test@example.com",
        subject: "Verify your Genyxo Email",
      }),
    );
  });
});
