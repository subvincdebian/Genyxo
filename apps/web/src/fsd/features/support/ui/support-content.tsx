"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useLanguage } from "@/shared/i18n";
import type { TicketPriority, TicketStatus } from "../model/support-api";
import { useSupport } from "../model/use-support";
import styles from "./support-content.module.css";

interface TicketForm {
  subject: string;
  message: string;
  priority: TicketPriority;
}

const emptyForm: TicketForm = { subject: "", message: "", priority: "MEDIUM" };

const priorities: { value: TicketPriority; key: string; label: string }[] = [
  { value: "LOW", key: "support.priority_low", label: "Low" },
  { value: "MEDIUM", key: "support.priority_medium", label: "Medium" },
  { value: "HIGH", key: "support.priority_high", label: "High" },
];

const statusTone: Record<TicketStatus, string> = {
  OPEN: styles.toneOpen,
  IN_PROGRESS: styles.toneProgress,
  CLOSED: styles.toneClosed,
};

const priorityTone: Record<TicketPriority, string> = {
  LOW: styles.toneMuted,
  MEDIUM: styles.toneMuted,
  HIGH: styles.toneHigh,
};

export function SupportContent() {
  const { t } = useLanguage();
  const { tickets, status, submitting, formError, createTicket } = useSupport();
  const [form, setForm] = useState<TicketForm>(emptyForm);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitted = form;
    const created = await createTicket(
      submitted.subject,
      submitted.message,
      submitted.priority,
      t("support.toast_success", "Ticket created successfully!"),
    );
    if (created)
      setForm((current) => (current === submitted ? emptyForm : current));
  }

  return (
    <main className={styles.content}>
      <header className={styles.intro}>
        <p className={styles.eyebrow}>{t("menu.help", "Help Center")}</p>
        <h1 className={styles.title} data-i18n="support.title">
          {t("support.title", "Support Requests")}
        </h1>
        <p className={styles.lead}>
          {t(
            "support.subtitle",
            "Tell us what went wrong or what you need. Our team replies here, usually within a day.",
          )}
        </p>
        {/* features/support/model/support-inline1.js opens #faqWindow from it. */}
        <button type="button" id="openFaqBtn" className={styles.faqButton}>
          <i className="fas fa-circle-question" aria-hidden="true" />
          <span data-i18n="faq.title">{t("faq.title", "Help & FAQ")}</span>
        </button>
      </header>

      <section className={styles.card} aria-labelledby="supportCreateTitle">
        <h2
          id="supportCreateTitle"
          className={styles.sectionTitle}
          data-i18n="support.create_title"
        >
          {t("support.create_title", "Create new ticket")}
        </h2>
        <form
          id="createTicketForm"
          className={styles.form}
          onSubmit={(event) => {
            void submit(event);
          }}
        >
          <div className={styles.field}>
            <label
              className={styles.label}
              htmlFor="ticketSubject"
              data-i18n="support.form_subject"
            >
              {t("support.form_subject", "Subject")}
            </label>
            <input
              className={styles.input}
              type="text"
              id="ticketSubject"
              data-i18n="support.form_subject_placeholder"
              placeholder={t(
                "support.form_subject_placeholder",
                "e.g., Payment issue",
              )}
              required
              minLength={5}
              maxLength={100}
              value={form.subject}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  subject: event.target.value,
                }))
              }
            />
          </div>
          <div className={styles.field}>
            <label
              className={styles.label}
              htmlFor="ticketMessage"
              data-i18n="support.form_message"
            >
              {t("support.form_message", "Message")}
            </label>
            <textarea
              className={`${styles.input} ${styles.textarea}`}
              id="ticketMessage"
              rows={5}
              data-i18n="support.form_message_placeholder"
              placeholder={t(
                "support.form_message_placeholder",
                "Describe your problem...",
              )}
              required
              minLength={10}
              maxLength={2000}
              value={form.message}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  message: event.target.value,
                }))
              }
            />
          </div>
          <div className={styles.formFooter}>
            <fieldset className={styles.priority}>
              <legend className={styles.label} data-i18n="support.label_priority">
                {t("support.label_priority", "Priority:")}
              </legend>
              <div className={styles.segmented}>
                {priorities.map((option) => (
                  <label key={option.value} className={styles.segment}>
                    <input
                      type="radio"
                      name="ticketPriority"
                      value={option.value}
                      checked={form.priority === option.value}
                      onChange={() =>
                        setForm((current) => ({
                          ...current,
                          priority: option.value,
                        }))
                      }
                    />
                    <span data-i18n={option.key}>
                      {t(option.key, option.label)}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <button
              type="submit"
              className={styles.submit}
              data-i18n="support.submit_btn"
              disabled={submitting}
              aria-busy={submitting}
            >
              {t("support.submit_btn", "Submit Ticket")}
            </button>
          </div>
          {formError && (
            <p role="alert" className={styles.error}>
              {formError === "validation"
                ? t(
                    "support.validation_error",
                    "Subject must contain 5–100 characters and message 10–2000 characters.",
                  )
                : t("support.toast_error", "Error creating ticket.")}
            </p>
          )}
        </form>
      </section>

      <section aria-labelledby="supportHistoryTitle">
        <h2
          id="supportHistoryTitle"
          className={styles.sectionTitle}
          data-i18n="support.history_title"
        >
          {t("support.history_title", "Your History")}
        </h2>
        <div id="ticketList" className={styles.list} aria-live="polite">
          {status === "loading" && (
            <p className={styles.empty} data-i18n="support.loading">
              {t("support.loading", "Loading tickets...")}
            </p>
          )}
          {status === "error" && (
            <p role="alert" className={styles.error}>
              {t("support.error_loading", "Error loading tickets.")}
            </p>
          )}
          {status === "ready" && tickets.length === 0 && (
            <p className={styles.empty}>
              {t("support.no_tickets", "No tickets found.")}
            </p>
          )}
          {status === "ready" &&
            tickets.map((ticket) => (
              <article key={ticket.id} className={styles.ticket}>
                <header className={styles.ticketHeader}>
                  <h3 className={styles.ticketTitle}>
                    <span className={styles.ticketId}>#{ticket.id}</span>
                    {ticket.subject}
                  </h3>
                  <div className={styles.badges}>
                    <span
                      className={`${styles.badge} ${priorityTone[ticket.priority]}`}
                    >
                      {ticket.priority}
                    </span>
                    <span
                      className={`${styles.badge} ${statusTone[ticket.status]}`}
                    >
                      {ticket.status.replace("_", " ")}
                    </span>
                  </div>
                </header>
                <p className={styles.meta}>
                  {t("support.created_at", "Opened:")}{" "}
                  <time dateTime={ticket.createdAt}>
                    {new Date(ticket.createdAt).toLocaleDateString("uk-UA", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </p>
                <p className={styles.message}>{ticket.message}</p>
                {ticket.adminResponse ? (
                  <div className={styles.reply}>
                    <span className={styles.replyLabel}>
                      <i className="fas fa-user-shield" aria-hidden="true" />{" "}
                      {t("support.admin_reply", "Support Team Replied:")}
                    </span>
                    <p className={styles.message}>{ticket.adminResponse}</p>
                  </div>
                ) : (
                  <p className={styles.awaiting}>
                    {t("support.awaiting", "Awaiting response from admin...")}
                  </p>
                )}
              </article>
            ))}
        </div>
      </section>
    </main>
  );
}
