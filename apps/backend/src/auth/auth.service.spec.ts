import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "./auth.service";

import { UsersService } from "../users/users.service";
import { JwtService } from "@nestjs/jwt";
import { EmailService } from "../email/email.service";

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
});
