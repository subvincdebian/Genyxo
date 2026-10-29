import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "./auth.service";

import { UsersService } from "../users/users.service";
import { JwtService } from "@nestjs/jwt";
import { EmailService } from "../email/email.service";
import { createHash } from "crypto";
import * as bcrypt from "bcrypt";

describe("AuthService", () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: {} },
        { provide: JwtService, useValue: {} },
        { provide: EmailService, useValue: {} },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("does not finish registration before verification delivery settles", async () => {
    let finish!: () => void;
    const users = {
      findRegistrationConflict: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ email: "test@example.com" }),
    };
    const email = {
      sendVerificationEmail: jest.fn().mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            finish = resolve;
          }),
      ),
    };
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: users },
        { provide: JwtService, useValue: {} },
        { provide: EmailService, useValue: email },
      ],
    }).compile();
    let completed = false;
    const registration = module
      .get(AuthService)
      .register({
        email: "test@example.com",
        password: "test-password",
        name: "Test",
      })
      .then(() => {
        completed = true;
      });
    // Wait until the mocked transport has started, without timing assumptions.
    for (
      let i = 0;
      i < 5 && !email.sendVerificationEmail.mock.calls.length;
      i++
    ) {
      await Promise.resolve();
    }
    expect(email.sendVerificationEmail).toHaveBeenCalled();
    expect(completed).toBe(false);
    finish();
    await registration;
    expect(completed).toBe(true);
  });

  it("reports that the account exists when verification delivery fails", async () => {
    const users = {
      findRegistrationConflict: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 7, email: "test@example.com" }),
    };
    const email = {
      sendVerificationEmail: jest
        .fn()
        .mockRejectedValue(new Error("SMTP offline")),
    };
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: users },
        { provide: JwtService, useValue: {} },
        { provide: EmailService, useValue: email },
      ],
    }).compile();
    await expect(
      module.get(AuthService).register({
        name: "Test User",
        email: "test@example.com",
        password: "long-password",
      }),
    ).rejects.toThrow(
      "Account created, but the verification email could not be sent",
    );
    expect(users.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Test User",
        email: "test@example.com",
        isEmailVerified: false,
      }),
    );
    expect(email.sendVerificationEmail).toHaveBeenCalledTimes(1);
  });

  it("verifies a saved account once and permits login with its password", async () => {
    const rawToken = "verification-secret";
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const account = {
      id: 7,
      email: "test@example.com",
      name: "Test User",
      password: await bcrypt.hash("valid-password", 10),
      role: "user",
      credits: 0,
      isEmailVerified: false,
      verificationToken: tokenHash,
      verificationExpires: new Date(Date.now() + 60000),
    };
    const users = {
      findByVerificationToken: jest
        .fn()
        .mockImplementation(async (token) =>
          token === account.verificationToken ? account : null,
        ),
      findOneByEmail: jest.fn().mockResolvedValue(account),
      getSessionVersion: jest.fn().mockResolvedValue(0),
      save: jest.fn().mockImplementation(async (value) => value),
    };
    const jwt = { sign: jest.fn().mockReturnValue("signed-token") };
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: users },
        { provide: JwtService, useValue: jwt },
        { provide: EmailService, useValue: {} },
      ],
    }).compile();
    const auth = module.get(AuthService);
    await expect(
      auth.validateUser(account.email, "valid-password"),
    ).rejects.toThrow("Please verify your email first.");
    const verified = await auth.verifyEmail(rawToken);
    expect(verified.access_token).toBe("signed-token");
    expect(account.verificationToken).toBeNull();
    expect(account.verificationExpires).toBeNull();
    expect(users.save).toHaveBeenCalledTimes(1);
    expect(
      await auth.validateUser(account.email, "valid-password"),
    ).toMatchObject({
      id: 7,
      email: "test@example.com",
      name: "Test User",
    });
    expect(await auth.validateUser(account.email, "wrong-password")).toBeNull();
  });

  it("uses a one-time hashed reset token and saves a new password", async () => {
    const token = "reset-secret";
    const hash = createHash("sha256").update(token).digest("hex");
    const account = {
      id: 7,
      email: "test@example.com",
      resetPasswordToken: hash,
      resetPasswordExpires: new Date(Date.now() + 60000),
      password: "old-hash",
    };
    const users = {
      findByResetToken: jest.fn().mockResolvedValue(account),
      save: jest.fn().mockImplementation(async (value) => value),
    };
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: users },
        { provide: JwtService, useValue: {} },
        { provide: EmailService, useValue: {} },
      ],
    }).compile();
    await module.get(AuthService).resetPassword(token, "new-long-password");
    expect(users.findByResetToken).toHaveBeenCalledWith(hash);
    expect(account.resetPasswordToken).toBeNull();
    expect(account.resetPasswordExpires).toBeNull();
    expect(account.password).not.toBe("old-hash");
    expect(users.save).toHaveBeenCalledTimes(1);
  });
});
