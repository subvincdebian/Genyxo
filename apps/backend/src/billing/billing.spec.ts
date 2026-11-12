import { BadRequestException, NotFoundException } from "@nestjs/common";
import { BillingService } from "./billing.service";
import { open, seal } from "./field-crypto";
import { TransactionStatus } from "../transactions/transaction.entity";

const valid = {
  invoiceEmail: " Billing@Example.COM ",
  fullName: "  Olena   Kovalenko ",
  country: "ua",
  line1: "Shevchenka 10",
  line2: "",
  city: "Kyiv",
  region: "Kyiv",
  postalCode: "01001",
  taxId: "",
};

function service(overrides: Record<string, unknown> = {}) {
  const profiles = {
    findOne: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockImplementation(async (row) => row),
  };
  const transactions = { find: jest.fn().mockResolvedValue([]) };
  const users = { findOne: jest.fn() };
  const instance = new BillingService(
    profiles as never,
    transactions as never,
    users as never,
  );
  Object.assign(instance, overrides);
  return { instance, profiles, transactions };
}

describe("billing", () => {
  const secret = process.env.JWT_SECRET;
  beforeAll(() => {
    process.env.JWT_SECRET = "test-secret-for-billing-encryption";
  });
  afterAll(() => {
    process.env.JWT_SECRET = secret;
  });

  it("normalizes and accepts a valid address", () => {
    const { instance } = service();
    expect(instance.validate(valid)).toEqual({
      ...valid,
      invoiceEmail: "billing@example.com",
      fullName: "Olena Kovalenko",
      country: "UA",
    });
  });

  it.each([
    [{ invoiceEmail: "not-an-email" }, "invoiceEmail"],
    [{ fullName: "<script>alert(1)</script>" }, "fullName"],
    [{ line1: "Main‮Street 1" }, "line1"],
    [{ city: "Kyiv\u0000" }, "city"],
    [{ country: "XX" }, "country"],
    [{ postalCode: "ABC" }, "postalCode"],
    [{ country: "US", postalCode: "" }, "postalCode"],
    [{ taxId: "{bad}" }, "taxId"],
  ])("rejects %j", (patch, field) => {
    const { instance } = service();
    try {
      instance.validate({ ...valid, ...patch });
      throw new Error("accepted");
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toMatchObject({
        field,
      });
    }
  });

  it("stores details encrypted and bound to their owner", async () => {
    const { instance, profiles } = service();
    await instance.saveDetails(7, valid);
    const saved = profiles.save.mock.calls[0][0];
    expect(saved.payload).not.toContain("Kovalenko");
    expect(saved.payload).not.toContain("Shevchenka");
    expect(open(saved.payload, "billing-profile:7")).toMatchObject({
      city: "Kyiv",
    });
    expect(() => open(saved.payload, "billing-profile:8")).toThrow();
    const tampered = saved.payload.slice(0, -2) + "AA";
    expect(() => open(tampered, "billing-profile:7")).toThrow();
  });

  it("lists credit packs with a readable status", async () => {
    const { instance, transactions } = service();
    transactions.find.mockResolvedValue([
      {
        id: 4,
        packId: 2,
        creditsAmount: "2000",
        amount: "9.99",
        status: TransactionStatus.APPROVED,
        provider: "NOWPAYMENTS",
        createdAt: new Date("2026-10-15"),
      },
      {
        id: 5,
        packId: 99,
        status: TransactionStatus.APPROVED,
        createdAt: new Date(),
      },
    ]);
    const result = await instance.purchases(1);
    expect(result.hasPaid).toBe(true);
    expect(result.items).toEqual([
      expect.objectContaining({
        pack: "AI Explorer",
        credits: 2000,
        amount: 9.99,
        status: "paid",
        reference: "GX-000004",
      }),
    ]);
  });

  it("never touches a card that belongs to another customer", async () => {
    const stripe = {
      paymentMethods: {
        retrieve: jest
          .fn()
          .mockResolvedValue({ id: "pm_foreign123", customer: "cus_other" }),
        detach: jest.fn(),
      },
    };
    const { instance, profiles } = service({ stripe });
    profiles.findOne.mockResolvedValue({
      userId: 1,
      stripeCustomerId: "cus_mine",
    });
    await expect(instance.remove(1, "pm_foreign123")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(stripe.paymentMethods.detach).not.toHaveBeenCalled();
    await expect(instance.remove(1, "../../etc")).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("reports card payments as disabled without processor keys", async () => {
    const { instance } = service({ stripe: null });
    await expect(instance.paymentMethods(1)).resolves.toEqual({
      enabled: false,
      methods: [],
    });
  });

  it("seals with a fresh nonce every time", () => {
    expect(seal({ a: 1 }, "x")).not.toBe(seal({ a: 1 }, "x"));
  });
});
