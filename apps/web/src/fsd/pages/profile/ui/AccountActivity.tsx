"use client";
import { useId, useState } from "react";
import { WorkspaceIcon } from "@/shared/ui/workspace";
import {
  useAccountResource,
  type Account,
  type Affiliate,
  type Ledger,
  type Usage,
} from "../model/account";
import { Action, Section, State, useAccountText } from "./account-ui";
import styles from "./ProfilePage.module.css";

export function AccountBilling({ account }: { account: Account }) {
  const { text, lang } = useAccountText();
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const history = useAccountResource<Ledger>(
    `profile/transactions?page=${page}&limit=10${filter ? `&type=${filter}` : ""}`,
  );
  const number = (value: number) =>
    new Intl.NumberFormat(lang, { maximumFractionDigits: 2 }).format(value);
  const date = (value: string) =>
    new Intl.DateTimeFormat(lang, { dateStyle: "medium" }).format(
      new Date(value),
    );
  return (
    <>
      <div className={styles.balanceCard}>
        <div>
          <span className={styles.eyebrow}>
            {text("available_balance", "AVAILABLE BALANCE")}
          </span>
          <div className={styles.balanceValue}>
            {number(Number(account.credits))}
            <span>{text("credits", "credits")}</span>
          </div>
          <p>
            {text(
              "balance_help",
              "One balance. Every model. Ready when you are.",
            )}
          </p>
        </div>
        <a className={`${styles.button} ${styles.primary}`} href="/#products">
          <WorkspaceIcon name="plus" size={17} />
          {text("buy_credits", "Buy credits")}
        </a>
        <span className={styles.balanceDecoration} aria-hidden="true">
          <WorkspaceIcon name="gem" size={112} />
        </span>
      </div>
      <Section
        title={text("transaction_history", "Transaction history")}
        description={text(
          "history_help",
          "Your credit purchases, AI usage and refunds.",
        )}
        action={
          <select
            aria-label={text("filter_history", "Filter transactions")}
            value={filter}
            onChange={(event) => {
              setFilter(event.target.value);
              setPage(1);
            }}
          >
            <option value="">{text("all_activity", "All activity")}</option>
            <option value="PURCHASE">{text("purchases", "Purchases")}</option>
            <option value="SPEND">{text("usage", "Usage")}</option>
            <option value="REFUND">{text("refunds", "Refunds")}</option>
          </select>
        }
      >
        <div className={styles.group}>
          <State
            loading={history.loading}
            error={history.error}
            retry={history.refresh}
            empty={
              history.data?.items.length === 0
                ? text(
                    "no_transactions",
                    "No transactions here yet. Your activity will appear here as you use Genyxo.",
                  )
                : undefined
            }
          >
            {history.data && history.data.items.length > 0 && (
              <>
                <div className={styles.tableScroll}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>{text("activity", "Activity")}</th>
                        <th>{text("credits", "Credits")}</th>
                        <th>{text("status", "Status")}</th>
                        <th>{text("date", "Date")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.data.items.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <div className={styles.transactionName}>
                              <span className={styles.transactionIcon}>
                                <WorkspaceIcon
                                  name={
                                    item.type === "PURCHASE"
                                      ? "wallet"
                                      : item.type === "REFUND"
                                        ? "arrow-left"
                                        : "bolt"
                                  }
                                  size={18}
                                />
                              </span>
                              <span>
                                <strong>
                                  {item.description ||
                                    text(
                                      item.type.toLowerCase(),
                                      item.type === "PURCHASE"
                                        ? "Credit purchase"
                                        : item.type === "SPEND"
                                          ? "AI usage"
                                          : "Refund",
                                    )}
                                </strong>
                                <small>
                                  {item.amount > 0
                                    ? new Intl.NumberFormat(lang, {
                                        style: "currency",
                                        currency: "USD",
                                      }).format(item.amount)
                                    : `#${item.id}`}
                                </small>
                              </span>
                            </div>
                          </td>
                          <td
                            className={`${styles.numeric} ${item.type !== "SPEND" ? styles.positive : ""}`}
                          >
                            {item.type === "SPEND" ? "−" : "+"}
                            {number(Math.abs(item.creditsAmount))}
                          </td>
                          <td>
                            <span
                              className={`${styles.status} ${item.status === "APPROVED" ? styles.approved : ""}`}
                            >
                              {text(
                                `status_${item.status.toLowerCase()}`,
                                item.status.replaceAll("_", " ").toLowerCase(),
                              )}
                            </span>
                          </td>
                          <td className={styles.dateCell}>
                            {date(item.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className={styles.pagination}>
                  <span>
                    {number(history.data.meta.totalItems)}{" "}
                    {text("transactions", "transactions")}
                  </span>
                  <div>
                    <Action
                      disabled={page <= 1}
                      onClick={() => setPage((value) => Math.max(1, value - 1))}
                    >
                      <WorkspaceIcon name="arrow-left" size={16} />
                      <span className={styles.srOnly}>
                        {text("previous", "Previous page")}
                      </span>
                    </Action>
                    <span>
                      {page} / {Math.max(1, history.data.meta.totalPages)}
                    </span>
                    <Action
                      disabled={page >= history.data.meta.totalPages}
                      onClick={() => setPage((value) => value + 1)}
                    >
                      <WorkspaceIcon name="arrow" size={16} />
                      <span className={styles.srOnly}>
                        {text("next", "Next page")}
                      </span>
                    </Action>
                  </div>
                </div>
              </>
            )}
          </State>
        </div>
      </Section>
      <p className={styles.footnote}>
        <WorkspaceIcon name="lock" size={16} />
        {text(
          "payment_help",
          "Payment details are handled at checkout. Genyxo doesn’t store your card details.",
        )}
      </p>
    </>
  );
}

export function AccountUsage({ account }: { account: Account }) {
  const { text, lang } = useAccountText();
  const [period, setPeriod] = useState(30);
  const usage = useAccountResource<Usage>(`profile/usage?period=${period}`);
  const number = (value: number) =>
    new Intl.NumberFormat(lang, { maximumFractionDigits: 2 }).format(value);
  function download() {
    if (!usage.data) return;
    const lines = [
      "date_utc,credits,requests",
      ...usage.data.days.map(
        (day) => `${day.date},${day.credits},${day.requests}`,
      ),
    ].join("\r\n");
    const url = URL.createObjectURL(
      new Blob([lines], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `genyxo-usage-${usage.data.days.at(-1)?.date}-${period}d.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <div className={styles.activityToolbar}>
        <span>{text("last_period", "Reporting period")}</span>
        <div
          className={styles.segmented}
          aria-label={text("last_period", "Reporting period")}
        >
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              aria-pressed={period === days}
              onClick={() => setPeriod(days)}
            >
              {days}
              {text("day_abbr", "d")}
            </button>
          ))}
        </div>
      </div>
      <State loading={usage.loading} error={usage.error} retry={usage.refresh}>
        {usage.data && (
          <>
            <div className={styles.usageStats}>
              <div>
                <span>{text("credits_used", "Credits used")}</span>
                <strong key={period}>{number(usage.data.totalCredits)}</strong>
              </div>
              <div>
                <span>{text("ai_requests", "AI requests")}</span>
                <strong>{number(usage.data.requests)}</strong>
              </div>
              <div>
                <span>{text("remaining_balance", "Available now")}</span>
                <strong>{number(Number(account.credits))}</strong>
              </div>
            </div>
            <Section
              title={text("credit_usage", "Credit usage")}
              description={text(
                "usage_timezone",
                "Daily activity, shown in UTC.",
              )}
              action={
                <Action onClick={download}>
                  <WorkspaceIcon name="download" size={16} />
                  {text("export_csv", "Export CSV")}
                </Action>
              }
            >
              <div className={styles.group}>
                {usage.data.requests ? (
                  <UsageChart key={period} usage={usage.data} />
                ) : (
                  <State
                    empty={text(
                      "no_usage",
                      "No activity in this period. Start a conversation to see your activity.",
                    )}
                  >
                    <a className={styles.button} href="/chat">
                      {text("back_chat", "Back to chat")}
                      <WorkspaceIcon name="arrow" size={16} />
                    </a>
                  </State>
                )}
              </div>
            </Section>
            <Section
              title={text("model_usage", "Usage by model")}
              description={text(
                "model_usage_help",
                "Based on completed charges in your credit history.",
              )}
            >
              <div className={styles.group}>
                {usage.data.models.length === 0 ? (
                  <State
                    empty={text(
                      "no_model_usage",
                      "Your model breakdown will appear after your first request.",
                    )}
                  />
                ) : (
                  usage.data.models.map((model) => (
                    <div className={styles.modelRow} key={model.name}>
                      <div>
                        <span className={styles.transactionIcon}>
                          <WorkspaceIcon name="sparkles" size={17} />
                        </span>
                        <strong>{model.name}</strong>
                        <span className={styles.modelTotal}>
                          {number(model.credits)}{" "}
                          <small>{text("credits", "credits")}</small>
                        </span>
                      </div>
                      <span className={styles.modelTrack}>
                        <span
                          style={{
                            width: `${(usage.data!.totalCredits ? model.credits / usage.data!.totalCredits : 0) * 100}%`,
                          }}
                        />
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Section>
          </>
        )}
      </State>
    </>
  );
}

function UsageChart({ usage }: { usage: Usage }) {
  const { text, lang } = useAccountText();
  const id = useId();
  const [active, setActive] = useState(usage.days.length - 1);
  const [metric, setMetric] = useState<"credits" | "requests">(
    usage.totalCredits ? "credits" : "requests",
  );
  const unit =
    metric === "credits"
      ? text("credits", "credits")
      : text("requests", "requests");
  const max = Math.max(1, ...usage.days.map((day) => day[metric]));
  const x = (index: number) =>
    12 + (index / Math.max(1, usage.days.length - 1)) * 776;
  const y = (credits: number) => 184 - (credits / max) * 160;
  const line = usage.days
    .map((day, index) => `${index ? "L" : "M"} ${x(index)} ${y(day[metric])}`)
    .join(" ");
  const selected = usage.days[active];
  const date = (value: string) =>
    new Intl.DateTimeFormat(lang, {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${value}T00:00:00Z`));
  return (
    <div className={styles.chart}>
      <div className={styles.chartMetric}>
        <select
          aria-label={text("chart_metric", "Chart metric")}
          value={metric}
          onChange={(event) =>
            setMetric(event.target.value as "credits" | "requests")
          }
        >
          <option value="credits">{text("credits", "Credits")}</option>
          <option value="requests">{text("ai_requests", "AI requests")}</option>
        </select>
      </div>
      <div className={styles.chartReadout} aria-live="polite">
        <span>{date(selected.date)}</span>
        <strong>
          {new Intl.NumberFormat(lang).format(selected[metric])}{" "}
          <small>{unit}</small>
        </strong>
      </div>
      <svg
        viewBox="0 0 800 210"
        role="img"
        aria-label={text("credit_usage", "Credit usage")}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity=".22" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[24, 104, 184].map((position) => (
          <line
            key={position}
            x1="12"
            x2="788"
            y1={position}
            y2={position}
            className={styles.chartGrid}
          />
        ))}
        <path d={`${line} L 788 184 L 12 184 Z`} fill={`url(#${id})`} />
        <path
          d={line}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          vectorEffect="non-scaling-stroke"
          className={styles.chartLine}
        />
        <line
          x1={x(active)}
          x2={x(active)}
          y1="20"
          y2="184"
          stroke="currentColor"
          strokeOpacity=".3"
          strokeDasharray="3 4"
        />
        <circle
          cx={x(active)}
          cy={y(selected[metric])}
          r="4"
          fill="currentColor"
        />
        {usage.days.map((day, index) => (
          <rect
            key={day.date}
            x={x(index) - 388 / Math.max(1, usage.days.length - 1)}
            y="0"
            width={776 / Math.max(1, usage.days.length - 1)}
            height="210"
            fill="transparent"
            onPointerEnter={() => setActive(index)}
          />
        ))}
      </svg>
      <div className={styles.chartDates}>
        <span>{date(usage.days[0].date)}</span>
        <span>{date(usage.days.at(-1)!.date)}</span>
      </div>
      <label className={styles.chartScrubber}>
        <span className={styles.srOnly}>
          {text("chart_day", "Explore daily usage")}
        </span>
        <input
          type="range"
          min="0"
          max={usage.days.length - 1}
          value={active}
          aria-valuetext={`${date(selected.date)}: ${selected[metric]} ${unit}`}
          onChange={(event) => setActive(Number(event.target.value))}
        />
      </label>
    </div>
  );
}

export function AccountReferrals() {
  const { text, lang } = useAccountText();
  const resource = useAccountResource<Affiliate>("profile/affiliate");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  async function copy() {
    if (!resource.data) return;
    try {
      await navigator.clipboard.writeText(resource.data.referralLink);
      setCopied(true);
      setError("");
    } catch {
      setError(text("copy_error", "Select the link and copy it manually."));
    }
  }
  return (
    <State
      loading={resource.loading}
      error={resource.error}
      retry={resource.refresh}
    >
      {resource.data && (
        <>
          <div className={styles.referralHero}>
            <span className={styles.referralArt} aria-hidden="true">
              <WorkspaceIcon name="branch" size={42} />
            </span>
            <h2>
              {text("referral_heading", "Good things are better shared.")}
            </h2>
            <p>
              {text(
                "referral_intro",
                "Invite someone to Genyxo with your personal link.",
              )}
            </p>
          </div>
          <div className={styles.referralStats}>
            <div>
              <span>{text("referral_balance", "Referral balance")}</span>
              <strong>
                {new Intl.NumberFormat(lang, {
                  style: "currency",
                  currency: "USD",
                }).format(resource.data.balance)}
              </strong>
            </div>
            <div>
              <span>{text("people_invited", "People invited")}</span>
              <strong>
                {new Intl.NumberFormat(lang).format(resource.data.invitedCount)}
              </strong>
            </div>
          </div>
          <Section
            title={text("your_link", "Your invitation link")}
            description={text(
              "your_link_help",
              "People who register through this link are credited to you.",
            )}
          >
            <div className={styles.referralLink}>
              <input
                aria-label={text("your_link", "Your invitation link")}
                readOnly
                value={resource.data.referralLink}
                onFocus={(event) => event.currentTarget.select()}
              />
              <Action onClick={() => void copy()}>
                <WorkspaceIcon name={copied ? "check" : "copy"} size={17} />
                {copied
                  ? text("copied", "Copied")
                  : text("copy_link", "Copy link")}
              </Action>
            </div>
            <span className={styles.srOnly} role="status">
              {copied && text("copied", "Copied")}
            </span>
            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
          </Section>
          <Section title={text("referral_rewards", "Referral rewards")}>
            <div className={styles.group}>
              <div className={styles.note}>
                <WorkspaceIcon name="info" />
                <p>
                  {text(
                    "referral_reward_help",
                    "Rewards apply to your referral’s first qualifying credit purchase. Your balance updates after payment approval.",
                  )}
                </p>
              </div>
              <div className={styles.note}>
                <WorkspaceIcon name="help" />
                <p>
                  {text(
                    "payout_help",
                    "For payout options and eligibility, contact our support team.",
                  )}{" "}
                  <a href="/support">
                    {text("contact_support", "Contact support")}
                    <WorkspaceIcon name="external" size={14} />
                  </a>
                </p>
              </div>
            </div>
          </Section>
        </>
      )}
    </State>
  );
}
