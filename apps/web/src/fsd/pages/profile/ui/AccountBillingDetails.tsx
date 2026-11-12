"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  COUNTRY_CODES,
  cleanText,
  postalLabel,
  postalRequired,
  regionLabel,
  unsafeText,
  validPostal,
} from "@/shared/lib/billing-rules";
import { loadStripe, type StripeElement } from "@/shared/lib/stripe";
import { Select } from "@/shared/ui/Select";
import {
  WorkspaceDialog,
  WorkspaceIcon,
  WorkspaceMenu,
  WorkspaceTooltip,
} from "@/shared/ui/workspace";
import {
  AccountError,
  accountRequest,
  useAccountResource,
  type Account,
} from "../model/account";
import { Action, Section, State, useAccountText } from "./account-ui";
import page from "./ProfilePage.module.css";
import styles from "./AccountBillingDetails.module.css";

type Purchase = {
  id: number;
  pack: string;
  packId: number;
  credits: number;
  amount: number;
  currency: string;
  status: "paid" | "pending" | "failed" | "partial";
  method: "crypto" | "card";
  reference: string;
  createdAt: string;
};
type Details = {
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
type Card = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number | null;
  expYear: number | null;
  wallet: string | null;
  isDefault: boolean;
};
type Methods = { enabled: boolean; publishableKey?: string; methods: Card[] };

const BRANDS: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  discover: "Discover",
  jcb: "JCB",
  diners: "Diners Club",
  unionpay: "UnionPay",
  cartes_bancaires: "Cartes Bancaires",
};

function useFormat() {
  const { lang } = useAccountText();
  return useMemo(
    () => ({
      date: (value: string) =>
        new Intl.DateTimeFormat(lang, { dateStyle: "medium" }).format(
          new Date(value),
        ),
      money: (value: number, currency = "USD") =>
        new Intl.NumberFormat(lang, { style: "currency", currency }).format(
          value,
        ),
      number: (value: number) => new Intl.NumberFormat(lang).format(value),
      country: (code: string) => {
        try {
          return (
            new Intl.DisplayNames([lang], { type: "region" }).of(code) || code
          );
        } catch {
          return code;
        }
      },
    }),
    [lang],
  );
}

/* ------------------------------- Credit packs ------------------------------ */

export function CreditPurchases() {
  const { text } = useAccountText();
  const format = useFormat();
  const purchases = useAccountResource<{ items: Purchase[]; hasPaid: boolean }>(
    "billing/purchases",
  );
  const [open, setOpen] = useState<Purchase | null>(null);
  // The section exists only after the first completed purchase.
  if (!purchases.data?.hasPaid) return null;
  const statusLabel = (status: Purchase["status"]) =>
    ({
      paid: text("purchase_paid", "Paid"),
      pending: text("purchase_pending", "Pending"),
      failed: text("purchase_failed", "Failed"),
      partial: text("purchase_partial", "Partially paid"),
    })[status];
  return (
    <Section
      title={text("credit_packs", "Credit packs")}
      description={text(
        "credit_packs_help",
        "Every credit pack you have bought, with its receipt.",
      )}
    >
      <div className={`${page.group} ${styles.purchases}`}>
        {purchases.data.items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            className={styles.purchase}
            style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
            onClick={() => setOpen(item)}
            aria-label={`${item.pack}, ${format.date(item.createdAt)}, ${statusLabel(item.status)}, ${format.money(item.amount, item.currency)}`}
          >
            <span className={styles.purchaseName}>
              <span className={styles.packIcon} aria-hidden="true">
                <WorkspaceIcon name="gem" size={17} />
              </span>
              <span>
                <strong>{item.pack}</strong>
                <small>
                  {format.number(item.credits)} {text("credits_unit", "credits")}
                </small>
              </span>
            </span>
            <span className={styles.purchaseDate}>
              {format.date(item.createdAt)}
            </span>
            <span className={styles.status} data-status={item.status}>
              {statusLabel(item.status)}
            </span>
            <span className={styles.purchaseAmount}>
              {format.money(item.amount, item.currency)}
            </span>
            <WorkspaceIcon name="chevron" size={16} />
          </button>
        ))}
      </div>
      {open && (
        <Receipt
          purchase={open}
          status={statusLabel(open.status)}
          onClose={() => setOpen(null)}
        />
      )}
    </Section>
  );
}

function Receipt({
  purchase,
  status,
  onClose,
}: {
  purchase: Purchase;
  status: string;
  onClose: () => void;
}) {
  const { text } = useAccountText();
  const format = useFormat();
  const rows: [string, ReactNode][] = [
    [text("receipt_number", "Receipt number"), purchase.reference],
    [text("date", "Date"), format.date(purchase.createdAt)],
    [text("credit_pack", "Credit pack"), purchase.pack],
    [
      text("credits", "Credits"),
      `${format.number(purchase.credits)} ${text("credits_unit", "credits")}`,
    ],
    [
      text("payment_method", "Payment method"),
      purchase.method === "crypto"
        ? text("method_crypto", "Cryptocurrency")
        : text("method_card", "Card"),
    ],
    [text("status", "Status"), status],
  ];
  return (
    <WorkspaceDialog
      title={text("receipt", "Receipt")}
      onClose={onClose}
      className={`${page.dialog} ${styles.receiptDialog}`}
    >
      <div className={styles.receipt} id="genyxo-receipt">
        <div className={styles.receiptTotal}>
          <span>{text("amount_paid", "Amount")}</span>
          <strong>{format.money(purchase.amount, purchase.currency)}</strong>
        </div>
        <dl>
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className={page.formFooter}>
        <Action onClick={() => window.print()}>
          <WorkspaceIcon name="download" size={16} />
          {text("print_receipt", "Print or save PDF")}
        </Action>
        <Action primary onClick={onClose}>
          {text("done", "Done")}
        </Action>
      </div>
    </WorkspaceDialog>
  );
}

/* ---------------------------- Billing information -------------------------- */

const EMPTY: Details = {
  invoiceEmail: "",
  fullName: "",
  country: "",
  line1: "",
  line2: "",
  city: "",
  region: "",
  postalCode: "",
  taxId: "",
};
const EMAIL =
  /^[^\s@<>()[\]\\,;:"]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

export function BillingInformation({ account }: { account: Account }) {
  const { text } = useAccountText();
  const format = useFormat();
  const resource = useAccountResource<{
    details: Details | null;
    updatedAt?: string;
  }>("billing/details");
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const details = resource.data?.details;
  const address = details
    ? [
        details.line1,
        details.line2,
        [details.city, details.region, details.postalCode]
          .filter(Boolean)
          .join(", "),
        format.country(details.country),
      ]
        .filter(Boolean)
        .join(", ")
    : "";
  return (
    <Section
      title={text("billing_information", "Billing and payment information")}
      action={
        details ? (
          <Action onClick={() => setEditing(true)}>{text("edit", "Edit")}</Action>
        ) : undefined
      }
    >
      <State
        loading={resource.loading}
        error={resource.error}
        retry={resource.refresh}
      >
        {details ? (
          <div
            className={`${page.group} ${styles.details}`}
            data-saved={saved || undefined}
          >
            <DetailRow
              label={text("invoice_email", "Email for invoices")}
              value={details.invoiceEmail}
            />
            <DetailRow
              label={text("full_name", "Name")}
              value={details.fullName}
            />
            <DetailRow
              label={text("billing_address", "Billing address")}
              value={address}
            />
            {details.taxId && (
              <DetailRow
                label={text("tax_number", "Tax number")}
                value={details.taxId}
              />
            )}
          </div>
        ) : (
          <div className={`${page.group} ${styles.emptyDetails}`}>
            <span className={styles.packIcon} aria-hidden="true">
              <WorkspaceIcon name="file" size={18} />
            </span>
            <div>
              <strong>{text("no_billing_title", "Add billing details")}</strong>
              <p>
                {text(
                  "no_billing_body",
                  "Your name and address appear on receipts and invoices. They are encrypted and never shared.",
                )}
              </p>
            </div>
            <Action primary onClick={() => setEditing(true)}>
              {text("add_details", "Add details")}
            </Action>
          </div>
        )}
      </State>
      {editing && (
        <BillingEditor
          initial={details || { ...EMPTY, invoiceEmail: account.email || "" }}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            resource.refresh();
            setSaved(true);
            setTimeout(() => setSaved(false), 1600);
          }}
        />
      )}
    </Section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.detailRow}>
      <span>{label}</span>
      <p>{value}</p>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  error,
  onChange,
  children,
  ...input
}: {
  id: keyof Details;
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  children?: ReactNode;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "id">) {
  return (
    <div className={styles.field} data-invalid={error ? "" : undefined}>
      <label className={styles.floating}>
        <input
          id={`billing-${id}`}
          name={id}
          value={value}
          placeholder=" "
          aria-invalid={!!error}
          aria-describedby={error ? `billing-${id}-error` : undefined}
          spellCheck={false}
          onChange={(event) => onChange(event.target.value)}
          {...input}
        />
        <span>{label}</span>
        {children}
      </label>
      {error && (
        <p id={`billing-${id}-error`} className={styles.fieldError} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function BillingEditor({
  initial,
  onClose,
  onSaved,
}: {
  initial: Details;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { text } = useAccountText();
  const format = useFormat();
  const [value, setValue] = useState<Details>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof Details, string>>>(
    {},
  );
  const [showTax, setShowTax] = useState(!!initial.taxId);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState("");
  const form = useRef<HTMLFormElement>(null);
  const countries = useMemo(
    () =>
      COUNTRY_CODES.map((code) => ({ code, name: format.country(code) })).sort(
        (a, b) => a.name.localeCompare(b.name),
      ),
    [format],
  );
  const set = (field: keyof Details) => (next: string) => {
    setValue((old) => ({ ...old, [field]: next }));
    setErrors((old) => ({ ...old, [field]: undefined }));
  };
  function validate() {
    const v = Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cleanText(item)]),
    ) as Details;
    const next: Partial<Record<keyof Details, string>> = {};
    for (const [key, item] of Object.entries(v))
      if (unsafeText(item))
        next[key as keyof Details] = text(
          "field_unsafe",
          "Remove special characters.",
        );
    if (!EMAIL.test(v.invoiceEmail))
      next.invoiceEmail = text("field_email", "Enter a valid email address.");
    if (v.fullName.length < 2)
      next.fullName = text("field_name", "Enter your full name.");
    if (!v.country) next.country = text("field_country", "Choose a country or region.");
    if (v.line1.length < 3)
      next.line1 = text("field_line1", "Enter a street address.");
    if (v.city.length < 2) next.city = text("field_city", "Enter a city.");
    if (v.postalCode && v.country && !validPostal(v.country, v.postalCode.toUpperCase()))
      next.postalCode = text("field_postal", "Enter a valid postal code.");
    if (!v.postalCode && v.country && postalRequired(v.country))
      next.postalCode = text("field_postal_required", "Enter a postal code.");
    setErrors(next);
    return { valid: Object.values(next).every((item) => !item), v };
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setProblem("");
    const { valid, v } = validate();
    if (!valid) {
      requestAnimationFrame(() =>
        form.current
          ?.querySelector<HTMLElement>("[aria-invalid='true']")
          ?.focus(),
      );
      return;
    }
    setSaving(true);
    try {
      await accountRequest("billing/details", {
        method: "PUT",
        body: JSON.stringify({ ...v, taxId: showTax ? v.taxId : "" }),
      });
      onSaved();
    } catch (error) {
      if (error instanceof AccountError && Object.keys(error.fields).length) {
        // Show the server's reason next to the field it concerns.
        setErrors(error.fields as Partial<Record<keyof Details, string>>);
        requestAnimationFrame(() =>
          form.current
            ?.querySelector<HTMLElement>("[aria-invalid='true']")
            ?.focus(),
        );
      } else
        setProblem(
          error instanceof AccountError ? error.message : String(error),
        );
    } finally {
      setSaving(false);
    }
  }
  return (
    <WorkspaceDialog
      title={text("edit_billing", "Edit billing and payment information")}
      onClose={onClose}
      className={`${page.dialog} ${styles.editor}`}
    >
      <form ref={form} noValidate onSubmit={(event) => void submit(event)}>
        <Field
          id="invoiceEmail"
          label={text("invoice_email", "Email for invoices")}
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={254}
          value={value.invoiceEmail}
          error={errors.invoiceEmail}
          onChange={set("invoiceEmail")}
        />
        <Field
          id="fullName"
          label={text("full_name_input", "Full name")}
          autoComplete="name"
          maxLength={100}
          value={value.fullName}
          error={errors.fullName}
          onChange={set("fullName")}
        />
        <div className={styles.field} data-invalid={errors.country ? "" : undefined}>
          <div className={styles.selectField}>
            <span>{text("country_region", "Country or region")}</span>
            <Select
              aria-label={text("country_region", "Country or region")}
              value={value.country}
              onChange={(event) => set("country")(event.target.value)}
            >
              {!value.country && (
                <option value="">{text("choose_country", "Choose…")}</option>
              )}
              {countries.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </Select>
          </div>
          {errors.country && (
            <p className={styles.fieldError} role="alert">
              {errors.country}
            </p>
          )}
        </div>
        <Field
          id="line1"
          label={text("address_line1", "Address line 1")}
          autoComplete="address-line1"
          maxLength={120}
          value={value.line1}
          error={errors.line1}
          onChange={set("line1")}
        />
        <Field
          id="line2"
          label={text("address_line2", "Address line 2 (optional)")}
          autoComplete="address-line2"
          maxLength={120}
          value={value.line2}
          error={errors.line2}
          onChange={set("line2")}
        />
        <Field
          id="city"
          label={text("city", "City")}
          autoComplete="address-level2"
          maxLength={80}
          value={value.city}
          error={errors.city}
          onChange={set("city")}
        />
        <div className={styles.pair}>
          <Field
            id="region"
            label={text(
              `region_${value.country || "default"}`,
              regionLabel(value.country),
            )}
            autoComplete="address-level1"
            maxLength={80}
            value={value.region}
            error={errors.region}
            onChange={set("region")}
          />
          <Field
            id="postalCode"
            label={text(
              value.country === "US" ? "zip_code" : "postal_code",
              postalLabel(value.country),
            )}
            autoComplete="postal-code"
            autoCapitalize="characters"
            maxLength={16}
            value={value.postalCode}
            error={errors.postalCode}
            onChange={set("postalCode")}
          />
        </div>
        {showTax ? (
          <Field
            id="taxId"
            label={text("tax_number_input", "Tax number (VAT, EIN…)")}
            autoCapitalize="characters"
            maxLength={32}
            value={value.taxId}
            error={errors.taxId}
            onChange={set("taxId")}
            autoFocus={!initial.taxId}
          />
        ) : (
          <button
            type="button"
            className={styles.addTax}
            onClick={() => setShowTax(true)}
          >
            <WorkspaceIcon name="plus" size={15} />
            {text("add_tax_number", "Add tax number")}
          </button>
        )}
        {problem && (
          <p className={page.error} role="alert">
            {problem}
          </p>
        )}
        <p className={styles.privacy}>
          <WorkspaceIcon name="lock" size={14} />
          {text(
            "billing_privacy",
            "Encrypted at rest and used only for receipts, invoices and tax compliance.",
          )}
        </p>
        <Action primary type="submit" busy={saving} disabled={saving}>
          {text("save", "Save")}
        </Action>
      </form>
    </WorkspaceDialog>
  );
}

/* ------------------------------ Payment methods ---------------------------- */

export function PaymentMethods() {
  const { text } = useAccountText();
  const resource = useAccountResource<Methods>("billing/payment-methods");
  const [adding, setAdding] = useState(false);
  const [menu, setMenu] = useState<{ card: Card; trigger: HTMLElement } | null>(
    null,
  );
  const [removing, setRemoving] = useState<Card | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const data = resource.data;
  async function change(path: string, method: "POST" | "DELETE") {
    setBusy(true);
    setProblem("");
    try {
      await accountRequest(path, { method });
      resource.refresh();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Section
      title={text("payment_methods", "Payment methods")}
      action={
        data?.enabled ? (
          <Action onClick={() => setAdding(true)}>
            {text("add_new", "Add new")}
          </Action>
        ) : undefined
      }
    >
      <State
        loading={resource.loading}
        error={resource.error}
        retry={resource.refresh}
      >
        {data && !data.enabled && (
          <div className={`${page.group} ${styles.emptyDetails}`}>
            <span className={styles.packIcon} aria-hidden="true">
              <WorkspaceIcon name="wallet" size={18} />
            </span>
            <div>
              <strong>
                {text("cards_unavailable_title", "Saved cards aren’t available yet")}
              </strong>
              <p>
                {text(
                  "cards_unavailable_body",
                  "Credit packs are paid securely at checkout. Card details are never stored by Genyxo.",
                )}
              </p>
            </div>
          </div>
        )}
        {data?.enabled && data.methods.length === 0 && (
          <div className={`${page.group} ${styles.emptyDetails}`}>
            <span className={styles.packIcon} aria-hidden="true">
              <WorkspaceIcon name="wallet" size={18} />
            </span>
            <div>
              <strong>{text("no_cards_title", "No saved cards")}</strong>
              <p>
                {text(
                  "no_cards_body",
                  "Add a card for faster checkout. It is stored by our payment processor, not by Genyxo.",
                )}
              </p>
            </div>
          </div>
        )}
        {data?.enabled && data.methods.length > 0 && (
          <div className={page.group} aria-busy={busy}>
            {data.methods.map((card) => (
              <div key={card.id} className={styles.card}>
                <span className={styles.cardIcon} aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                    <rect x="3" y="5" width="18" height="14" rx="3" />
                    <path d="M3 10h18M7 15h4" />
                  </svg>
                </span>
                <div className={styles.cardText}>
                  <strong>{BRANDS[card.brand] || card.brand}</strong>
                  <span>
                    •••• {card.last4}
                    {card.expMonth && card.expYear
                      ? ` · ${text("expires", "Expires")} ${String(card.expMonth).padStart(2, "0")}/${String(card.expYear).slice(-2)}`
                      : ""}
                  </span>
                </div>
                {card.isDefault && (
                  <span className={styles.defaultBadge}>
                    {text("default_card", "Default")}
                  </span>
                )}
                <WorkspaceTooltip label={text("card_actions", "Card actions")} side="top">
                  <button
                    type="button"
                    className={styles.more}
                    aria-label={`${text("card_actions", "Card actions")}: ${BRANDS[card.brand] || card.brand} ${card.last4}`}
                    aria-haspopup="menu"
                    onClick={(event) =>
                      setMenu({ card, trigger: event.currentTarget })
                    }
                  >
                    <WorkspaceIcon name="more" size={18} />
                  </button>
                </WorkspaceTooltip>
              </div>
            ))}
          </div>
        )}
        {problem && (
          <p className={page.error} role="alert">
            {problem}
          </p>
        )}
      </State>
      {menu && (
        <WorkspaceMenu trigger={menu.trigger} onClose={() => setMenu(null)}>
          {!menu.card.isDefault && (
            <button
              type="button"
              role="menuitem"
              className="ws-menu-item"
              onClick={() => {
                const id = menu.card.id;
                setMenu(null);
                void change(`billing/payment-methods/${encodeURIComponent(id)}/default`, "POST");
              }}
            >
              <WorkspaceIcon name="check" size={16} />
              {text("make_default", "Make default")}
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            className="ws-menu-item ws-danger"
            onClick={() => {
              setRemoving(menu.card);
              setMenu(null);
            }}
          >
            <WorkspaceIcon name="trash" size={16} />
            {text("remove_card", "Remove")}
          </button>
        </WorkspaceMenu>
      )}
      {removing && (
        <WorkspaceDialog
          title={text("remove_card_title", "Remove this card?")}
          onClose={() => setRemoving(null)}
          className={page.dialog}
        >
          <p className={page.dialogDescription}>
            {`${BRANDS[removing.brand] || removing.brand} •••• ${removing.last4}`}{" "}
            {text(
              "remove_card_body",
              "will be removed from your account. You can add it again at any time.",
            )}
          </p>
          <div className={page.formFooter}>
            <Action onClick={() => setRemoving(null)}>
              {text("cancel", "Cancel")}
            </Action>
            <Action
              danger
              onClick={() => {
                const id = removing.id;
                setRemoving(null);
                void change(`billing/payment-methods/${encodeURIComponent(id)}`, "DELETE");
              }}
            >
              {text("remove_card", "Remove")}
            </Action>
          </div>
        </WorkspaceDialog>
      )}
      {adding && (
        <AddCard
          onClose={() => setAdding(false)}
          onAdded={() => {
            setAdding(false);
            resource.refresh();
          }}
        />
      )}
    </Section>
  );
}

function AddCard({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: () => void;
}) {
  const { text } = useAccountText();
  const mount = useRef<HTMLDivElement>(null);
  const session = useRef<{
    confirm: () => Promise<void>;
  } | null>(null);
  const [ready, setReady] = useState(false);
  const [complete, setComplete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState("");
  useEffect(() => {
    let element: StripeElement | null = null;
    let cancelled = false;
    (async () => {
      try {
        const setup = await accountRequest<{
          clientSecret: string;
          publishableKey: string;
        }>("billing/payment-methods/setup", { method: "POST" });
        const stripe = await loadStripe(setup.publishableKey);
        if (cancelled || !mount.current) return;
        const css = getComputedStyle(document.documentElement);
        const token = (name: string, fallback: string) =>
          css.getPropertyValue(name).trim() || fallback;
        const elements = stripe.elements({
          clientSecret: setup.clientSecret,
          appearance: {
            theme:
              document.documentElement.dataset.theme === "light"
                ? "stripe"
                : "night",
            variables: {
              colorPrimary: token("--gx-accent", "#39a994"),
              colorBackground: token("--gx-surface-2", "#1a1b1b"),
              colorText: token("--gx-text", "#f3f5f4"),
              borderRadius: "12px",
              fontFamily: "Inter, system-ui, sans-serif",
            },
          },
        });
        element = elements.create("payment", {
          layout: "tabs",
          fields: { billingDetails: { address: "auto" } },
        });
        element.on("ready", () => setReady(true));
        element.on("change", (event) => setComplete(!!event.complete));
        element.mount(mount.current);
        session.current = {
          confirm: async () => {
            const result = await stripe.confirmSetup({
              elements,
              redirect: "if_required",
            });
            if (result.error)
              throw new Error(
                result.error.message ||
                  text("card_failed", "The card could not be saved."),
              );
            if (!result.setupIntent)
              throw new Error(text("card_failed", "The card could not be saved."));
            await accountRequest("billing/payment-methods/confirm", {
              method: "POST",
              body: JSON.stringify({ setupIntentId: result.setupIntent.id }),
            });
          },
        };
      } catch (error) {
        if (!cancelled)
          setProblem(error instanceof Error ? error.message : String(error));
      }
    })();
    return () => {
      cancelled = true;
      element?.destroy();
    };
  }, [text]);
  return (
    <WorkspaceDialog
      title={text("add_card", "Add a payment method")}
      onClose={onClose}
      className={`${page.dialog} ${styles.editor}`}
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!session.current) return;
          setSaving(true);
          setProblem("");
          try {
            await session.current.confirm();
            onAdded();
          } catch (error) {
            setProblem(error instanceof Error ? error.message : String(error));
          } finally {
            setSaving(false);
          }
        }}
      >
        <div className={styles.stripeMount} data-ready={ready || undefined}>
          {!ready && !problem && (
            <div className={styles.stripeLoading} aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
          )}
          <div ref={mount} />
        </div>
        {problem && (
          <p className={page.error} role="alert">
            {problem}
          </p>
        )}
        <p className={styles.privacy}>
          <WorkspaceIcon name="lock" size={14} />
          {text(
            "card_privacy",
            "Card details are encrypted and sent directly to our PCI DSS certified payment processor. Genyxo never sees or stores your full card number or security code.",
          )}
        </p>
        <Action primary type="submit" busy={saving} disabled={!ready || !complete || saving}>
          {text("save_card", "Save card")}
        </Action>
      </form>
    </WorkspaceDialog>
  );
}
