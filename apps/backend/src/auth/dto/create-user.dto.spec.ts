import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { CreateUserDto } from "./create-user.dto";
import { LoginDto } from "./login.dto";

function errors(input: Record<string, unknown>) {
  return validateSync(plainToInstance(CreateUserDto, input)).map(
    (error) => error.property,
  );
}

describe("auth input validation", () => {
  it("accepts and normalizes a valid registration", () => {
    const dto = plainToInstance(CreateUserDto, {
      name: "  Ada Lovelace  ",
      email: "  ADA@Example.com  ",
      password: "long-password",
    });
    expect(validateSync(dto)).toHaveLength(0);
    expect(dto.name).toBe("Ada Lovelace");
    expect(dto.email).toBe("ada@example.com");
    expect(
      errors({
        name: "李",
        email: "li@example.com",
        password: "long-password",
      }),
    ).toHaveLength(0);
  });

  it.each([
    [{ name: "", email: "ada@example.com", password: "long-password" }, "name"],
    [{ name: "Ada", email: "bad-email", password: "long-password" }, "email"],
    [{ name: "Ada", email: "ada@example.com", password: "short" }, "password"],
    [
      { name: "Ada", email: "ada@example.com", password: "x".repeat(129) },
      "password",
    ],
  ])("rejects invalid registration data for %s", (input, field) => {
    expect(errors(input)).toContain(field);
  });

  it("rejects malformed login email and accepts an existing long password", () => {
    expect(
      validateSync(
        plainToInstance(LoginDto, { email: "bad-email", password: "password" }),
      ).map((error) => error.property),
    ).toContain("email");
    expect(
      validateSync(
        plainToInstance(LoginDto, {
          email: "ada@example.com",
          password: "x".repeat(150),
        }),
      ),
    ).toHaveLength(0);
  });
});
