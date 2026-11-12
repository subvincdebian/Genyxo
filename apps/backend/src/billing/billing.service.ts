import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import Stripe from "stripe";
import { BillingProfile } from "./billing-profile.entity";
import { BillingProfileDto } from "./billing.dto";
import {
  COUNTRY_CODES,
  UNSAFE_TEXT,
  clean,
  postalRequired,
  validPostal,
} from "./billing-rules";
import { open, seal } from "./field-crypto";
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from "../transactions/transaction.entity";
import { User } from "../users/user.entity";
import { PACKS } from "../payment/payment.service";
import { AuditService } from "../audit/audit.service";

export type BillingDetails = {
  invoiceEmail: string;
  fullName: string;
  country: string;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postalCode: string;
  taxId: string;
};
const EMAIL =
  /^[^\s@<>()[\]\\,;:"]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;
const TAX_ID = /^[A-Za-z0-9][A-Za-z0-9 .\-/]{1,31}$/;
const CARD_PROCESSOR_ID = /^pm_[A-Za-z0-9]{6,64}$/;
const SETUP_INTENT_ID = /^seti_[A-Za-z0-9]{6,64}$/;

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly stripe: Stripe | null;

  constructor(
    @InjectRepository(BillingProfile)
    private readonly profiles: Repository<BillingProfile>,
    @InjectRepository(Transaction)
    private readonly transactions: Repository<Transaction>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @Optional() private readonly audit?: AuditService,
  ) {
    const secret = process.env.STRIPE_SECRET_KEY?.trim();
    this.stripe = secret ? new Stripe(secret, { maxNetworkRetries: 2 }) : null;
  }

  private context = (userId: number) => `billing-profile:${userId}`;

  /* ---------------------------- Billing details ---------------------------- */

  async details(userId: number) {
    const row = await this.profiles.findOne({ where: { userId } });
    if (!row?.payload) return { details: null };
    try {
      return {
        details: open<BillingDetails>(row.payload, this.context(userId)),
        updatedAt: row.updatedAt,
      };
    } catch {
      this.logger.error(`Billing profile ${userId} could not be decrypted`);
      throw new ServiceUnavailableException(
        "Billing details are temporarily unavailable",
      );
    }
  }

  validate(input: BillingProfileDto): BillingDetails {
    const value: BillingDetails = {
      invoiceEmail: clean(input.invoiceEmail).toLowerCase(),
      fullName: clean(input.fullName),
      country: clean(input.country).toUpperCase(),
      line1: clean(input.line1),
      line2: clean(input.line2),
      city: clean(input.city),
      region: clean(input.region),
      postalCode: clean(input.postalCode).toUpperCase(),
      taxId: clean(input.taxId).toUpperCase(),
    };
    const fail = (field: keyof BillingDetails, message: string) => {
      throw new BadRequestException({ field, message });
    };
    for (const [field, text] of Object.entries(value))
      if (UNSAFE_TEXT.test(text))
        fail(field as keyof BillingDetails, "Remove special characters.");
    if (!EMAIL.test(value.invoiceEmail) || value.invoiceEmail.length > 254)
      fail("invoiceEmail", "Enter a valid email address.");
    if (value.fullName.length < 2 || !/\p{L}/u.test(value.fullName))
      fail("fullName", "Enter your full name.");
    if (!COUNTRY_CODES.includes(value.country))
      fail("country", "Choose a country or region.");
    if (value.line1.length < 3) fail("line1", "Enter a street address.");
    if (value.city.length < 2) fail("city", "Enter a city.");
    if (value.postalCode) {
      if (!validPostal(value.country, value.postalCode))
        fail("postalCode", "Enter a valid postal code.");
    } else if (postalRequired(value.country))
      fail("postalCode", "Enter a postal code.");
    if (value.taxId && !TAX_ID.test(value.taxId))
      fail("taxId", "Enter a valid tax number.");
    return value;
  }

  async saveDetails(userId: number, input: BillingProfileDto, ip?: string) {
    const details = this.validate(input);
    const existing = await this.profiles.findOne({ where: { userId } });
    await this.profiles.save({
      userId,
      payload: seal(details, this.context(userId)),
      stripeCustomerId: existing?.stripeCustomerId ?? null,
    });
    // Personal data never reaches the audit log; only that it changed.
    void this.audit?.record({
      actorId: userId,
      userId,
      action: "BILLING_PROFILE_UPDATED",
      resource: "billing_profile",
      resourceId: String(userId),
      ipAddress: ip?.slice(0, 64) || null,
    });
    if (existing?.stripeCustomerId && this.stripe)
      await this.stripe.customers
        .update(existing.stripeCustomerId, this.customerFields(details))
        .catch(() =>
          this.logger.warn("Billing details could not sync to the processor"),
        );
    return { details, updatedAt: new Date() };
  }

  private customerFields(details: BillingDetails) {
    return {
      name: details.fullName,
      email: details.invoiceEmail,
      address: {
        line1: details.line1,
        line2: details.line2 || undefined,
        city: details.city,
        state: details.region || undefined,
        postal_code: details.postalCode || undefined,
        country: details.country,
      },
    };
  }

  /* ---------------------------- Credit purchases --------------------------- */

  async purchases(userId: number) {
    const rows = await this.transactions.find({
      where: { userId, type: TransactionType.PURCHASE },
      order: { createdAt: "DESC", id: "DESC" },
      take: 50,
    });
    const items = rows
      .filter((row) => row.packId && PACKS[row.packId])
      .map((row) => ({
        id: row.id,
        pack: PACKS[row.packId!].name,
        packId: row.packId,
        credits: Number(row.creditsAmount),
        amount: Number(row.amount),
        currency: "USD",
        status:
          row.status === TransactionStatus.APPROVED
            ? "paid"
            : row.status === TransactionStatus.DECLINED
              ? "failed"
              : row.status === TransactionStatus.PARTIALLY_PAID
                ? "partial"
                : "pending",
        method: row.provider === "NOWPAYMENTS" ? "crypto" : "card",
        reference: `GX-${String(row.id).padStart(6, "0")}`,
        createdAt: row.createdAt,
      }));
    return { items, hasPaid: items.some((item) => item.status === "paid") };
  }

  /* ----------------------------- Payment methods --------------------------- */

  private requireStripe() {
    if (!this.stripe)
      throw new ServiceUnavailableException("Card payments are not enabled");
    return this.stripe;
  }

  private async customerId(userId: number, create: boolean) {
    const row = await this.profiles.findOne({ where: { userId } });
    if (row?.stripeCustomerId || !create) return row?.stripeCustomerId || null;
    const stripe = this.requireStripe();
    const user = await this.users.findOne({
      where: { id: userId },
      select: ["id", "email", "name"],
    });
    if (!user) throw new NotFoundException("Account not found");
    let details: BillingDetails | null = null;
    try {
      details = row?.payload
        ? open<BillingDetails>(row.payload, this.context(userId))
        : null;
    } catch {
      details = null;
    }
    const customer = await stripe.customers.create(
      {
        email: details?.invoiceEmail || user.email,
        name: details?.fullName || user.name || undefined,
        ...(details ? { address: this.customerFields(details).address } : {}),
        metadata: { genyxoUserId: String(userId) },
      },
      // One customer per account even when two tabs ask at once.
      { idempotencyKey: `genyxo-customer-${userId}` },
    );
    await this.profiles.save({
      userId,
      payload: row?.payload ?? null,
      stripeCustomerId: customer.id,
    });
    return customer.id;
  }

  async paymentMethods(userId: number) {
    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY?.trim() || "";
    if (!this.stripe || !publishableKey) return { enabled: false, methods: [] };
    const customer = await this.customerId(userId, false);
    if (!customer) return { enabled: true, publishableKey, methods: [] };
    const [list, record] = await Promise.all([
      this.stripe.customers.listPaymentMethods(customer, {
        type: "card",
        limit: 20,
      }),
      this.stripe.customers.retrieve(customer),
    ]);
    const preferred =
      !record.deleted && record.invoice_settings?.default_payment_method;
    const defaultId =
      typeof preferred === "string"
        ? preferred
        : preferred
          ? preferred.id
          : null;
    return {
      enabled: true,
      publishableKey,
      methods: list.data.map((method) => ({
        id: method.id,
        brand: method.card?.brand || "card",
        last4: method.card?.last4 || "",
        expMonth: method.card?.exp_month || null,
        expYear: method.card?.exp_year || null,
        wallet: method.card?.wallet?.type || null,
        isDefault: method.id === defaultId,
      })),
    };
  }

  async startSetup(userId: number) {
    const stripe = this.requireStripe();
    const customer = await this.customerId(userId, true);
    const intent = await stripe.setupIntents.create({
      customer: customer!,
      usage: "off_session",
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      metadata: { genyxoUserId: String(userId) },
    });
    return {
      clientSecret: intent.client_secret,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY?.trim() || "",
    };
  }

  async confirmSetup(userId: number, setupIntentId: string) {
    if (!SETUP_INTENT_ID.test(setupIntentId))
      throw new BadRequestException("Invalid setup reference");
    const stripe = this.requireStripe();
    const customer = await this.customerId(userId, false);
    const intent = await stripe.setupIntents.retrieve(setupIntentId);
    if (!customer || intent.customer !== customer)
      throw new ForbiddenException("This card belongs to another account");
    if (intent.status !== "succeeded")
      throw new BadRequestException("The card was not confirmed");
    const record = await stripe.customers.retrieve(customer);
    const method =
      typeof intent.payment_method === "string"
        ? intent.payment_method
        : intent.payment_method?.id;
    if (
      method &&
      !record.deleted &&
      !record.invoice_settings?.default_payment_method
    )
      await stripe.customers.update(customer, {
        invoice_settings: { default_payment_method: method },
      });
    return this.paymentMethods(userId);
  }

  /** Every change re-checks that the card belongs to this account's customer. */
  private async ownedMethod(userId: number, id: string) {
    if (!CARD_PROCESSOR_ID.test(id))
      throw new BadRequestException("Invalid payment method");
    const stripe = this.requireStripe();
    const customer = await this.customerId(userId, false);
    const method = await stripe.paymentMethods.retrieve(id).catch(() => null);
    if (!customer || !method || method.customer !== customer)
      throw new NotFoundException("Payment method not found");
    return { stripe, customer, method };
  }

  async makeDefault(userId: number, id: string) {
    const { stripe, customer } = await this.ownedMethod(userId, id);
    await stripe.customers.update(customer, {
      invoice_settings: { default_payment_method: id },
    });
    return this.paymentMethods(userId);
  }

  async remove(userId: number, id: string) {
    const { stripe } = await this.ownedMethod(userId, id);
    await stripe.paymentMethods.detach(id);
    void this.audit?.record({
      actorId: userId,
      userId,
      action: "PAYMENT_METHOD_REMOVED",
      resource: "payment_method",
      resourceId: id,
    });
    return this.paymentMethods(userId);
  }
}
