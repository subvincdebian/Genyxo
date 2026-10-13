import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { Logger } from "@nestjs/common";
import { createHmac } from "node:crypto";
import axios from "axios";
import { Not } from "typeorm";
import { PaymentService } from "./payment.service";
import {
  Transaction,
  TransactionStatus,
} from "../transactions/transaction.entity";
import { UsersService } from "../users/users.service";
import { NotificationsService } from "../notifications/notifications.service";
import { AuditService } from "../audit/audit.service";

describe("PaymentService invoice and IPN contracts", () => {
  let service: PaymentService;
  let status: TransactionStatus;
  const originalFrontend = process.env.FRONTEND_URL;
  const originalApi = process.env.NOWPAYMENTS_API_URL;
  const secret = "isolated-test-ipn-secret";
  const repo = {
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    findOne: jest.fn(),
    manager: { transaction: jest.fn() },
  };
  const manager = {
    findOne: jest.fn(),
    update: jest.fn(),
    increment: jest.fn(),
  };
  const users = {
    invalidateUserCache: jest.fn(),
    processReferralBonus: jest.fn(),
  };
  const notifications = { create: jest.fn() };
  const payload = {
    payment_status: "finished",
    order_id: "21",
    payment_id: 91,
    price_currency: "usd",
    price_amount: 9.99,
  };
  function signature(body: Record<string, unknown>) {
    // Independent flat provider fixture, not the service's signing helper.
    return createHmac("sha512", secret)
      .update(JSON.stringify(body, Object.keys(body).sort()))
      .digest("hex");
  }
  function send(body = payload) {
    return service.handleWebhook(
      { "x-nowpayments-sig": signature(body) },
      body,
    );
  }
  beforeEach(async () => {
    jest.clearAllMocks();
    status = TransactionStatus.PENDING;
    process.env.FRONTEND_URL = "http://localhost:3001";
    process.env.NOWPAYMENTS_API_URL = "https://payments.example.test/invoice";
    repo.create.mockImplementation((value) => value);
    repo.save.mockImplementation((value) => ({ ...value, id: 21 }));
    repo.findOne.mockImplementation(async () => ({ id: 21, status }));
    repo.update.mockImplementation(async (where, change) => {
      if (typeof where === "number" || status !== TransactionStatus.APPROVED)
        status = change.status || status;
      return { affected: 1 };
    });
    manager.findOne.mockImplementation(async () => ({
      id: 21,
      status,
      userId: 7,
      creditsAmount: 2000,
      packId: 2,
      user: { id: 7 },
    }));
    manager.update.mockImplementation(async (_entity, _id, change) => {
      status = change.status;
    });
    manager.increment.mockResolvedValue({ affected: 1 });
    repo.manager.transaction.mockImplementation((callback) =>
      callback(manager),
    );
    const config: Record<string, string> = {
      NOWPAYMENTS_API_KEY: "isolated-test-api-key",
      NOWPAYMENTS_IPN_SECRET: secret,
      NOWPAYMENTS_IPN_URL: "https://api.example.test/payment/webhook",
    };
    const module = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: getRepositoryToken(Transaction), useValue: repo },
        { provide: UsersService, useValue: users },
        { provide: NotificationsService, useValue: notifications },
        {
          provide: ConfigService,
          useValue: { get: (key: string) => config[key] },
        },
        { provide: AuditService, useValue: { record: jest.fn() } },
      ],
    }).compile();
    service = module.get(PaymentService);
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
  });
  afterEach(() => {
    jest.restoreAllMocks();
    if (originalFrontend === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = originalFrontend;
    if (originalApi === undefined) delete process.env.NOWPAYMENTS_API_URL;
    else process.env.NOWPAYMENTS_API_URL = originalApi;
  });
  it("creates the selected pack with Next returns and a separate backend IPN URL", async () => {
    const post = jest.spyOn(axios, "post").mockResolvedValue({
      data: {
        id: 91,
        invoice_url: "https://payments.example.test/checkout/91",
      },
    });
    await expect(service.createPayment(7, 2)).resolves.toEqual({
      url: "https://payments.example.test/checkout/91",
    });
    expect(post).toHaveBeenCalledWith(
      "https://payments.example.test/invoice",
      expect.objectContaining({
        price_amount: 9.99,
        price_currency: "usd",
        order_id: "21",
        success_url: "http://localhost:3001/#success",
        cancel_url: "http://localhost:3001/#cancel",
        ipn_callback_url: "https://api.example.test/payment/webhook",
      }),
      expect.objectContaining({ timeout: 15000 }),
    );
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 7, packId: 2, creditsAmount: 2000 }),
    );
    expect(repo.update).toHaveBeenCalledWith(21, { externalId: 91 });
  });
  it("rejects an unknown pack before database or provider writes", async () => {
    const post = jest.spyOn(axios, "post");
    await expect(service.createPayment(7, 999)).rejects.toThrow(
      "Package not found",
    );
    expect(repo.save).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
  });
  it("returns a gateway error without claiming success", async () => {
    jest
      .spyOn(axios, "post")
      .mockRejectedValue(new Error("Provider unavailable"));
    await expect(service.createPayment(7, 2)).rejects.toThrow(
      "Payment gateway error",
    );
    expect(manager.increment).not.toHaveBeenCalled();
  });
  it("accepts recursively sorted provider JSON and credits under a database lock", async () => {
    const body = { ...payload, metadata: { z: null, a: { z: 2, a: 1 } } };
    const canonical =
      '{"metadata":{"a":{"a":1,"z":2},"z":null},"order_id":"21","payment_id":91,"payment_status":"finished","price_amount":9.99,"price_currency":"usd"}';
    const signed = createHmac("sha512", secret).update(canonical).digest("hex");
    await expect(
      service.handleWebhook({ "x-nowpayments-sig": signed }, body),
    ).resolves.toEqual({ status: "ok" });
    expect(status).toBe(TransactionStatus.APPROVED);
    expect(manager.findOne).toHaveBeenCalledWith(
      Transaction,
      expect.objectContaining({ lock: { mode: "pessimistic_write" } }),
    );
    expect(manager.increment).toHaveBeenCalledTimes(1);
    expect(users.invalidateUserCache).toHaveBeenCalledWith(7);
  });
  it.each([undefined, "not-hex", "f".repeat(128), ["f".repeat(128)]])(
    "rejects an invalid signature before database lookup",
    async (supplied) => {
      await expect(
        service.handleWebhook({ "x-nowpayments-sig": supplied }, payload),
      ).rejects.toThrow();
      expect(repo.findOne).not.toHaveBeenCalled();
      expect(manager.increment).not.toHaveBeenCalled();
    },
  );
  it("rejects tampering and a signed invalid order before lookup", async () => {
    await expect(
      service.handleWebhook(
        { "x-nowpayments-sig": signature(payload) },
        { ...payload, price_amount: 0.01 },
      ),
    ).rejects.toThrow("Invalid signature");
    await expect(send({ ...payload, order_id: "21.5" })).rejects.toThrow(
      "Invalid payment notification",
    );
    expect(repo.findOne).not.toHaveBeenCalled();
  });
  it("preserves approval across duplicate and sequential delayed callbacks", async () => {
    await send();
    for (const payment_status of ["waiting", "failed", "finished"])
      await send({ ...payload, payment_status });
    expect(status).toBe(TransactionStatus.APPROVED);
    expect(manager.increment).toHaveBeenCalledTimes(1);
    expect(notifications.create).toHaveBeenCalledTimes(1);
  });
  it("cannot reopen a payment when a delayed update overlaps successful crediting", async () => {
    let release: () => void = () => undefined;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    repo.findOne.mockImplementationOnce(async () => {
      const snapshot = { id: 21, status };
      await blocked;
      return snapshot;
    });
    const delayed = send({ ...payload, payment_status: "waiting" });
    await send();
    release();
    await delayed;
    await send();
    expect(repo.update).toHaveBeenCalledWith(
      { id: 21, status: Not(TransactionStatus.APPROVED) },
      { status: TransactionStatus.WAITING },
    );
    expect(status).toBe(TransactionStatus.APPROVED);
    expect(manager.increment).toHaveBeenCalledTimes(1);
  });
});
