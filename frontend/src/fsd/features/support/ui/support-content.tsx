"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useLanguage } from "@/shared/i18n";
import { isTicketPriority } from "../model/support-api";
import type { TicketPriority } from "../model/support-api";
import { useSupport } from "../model/use-support";

interface TicketForm {
  subject: string;
  message: string;
  priority: TicketPriority;
}

const emptyForm: TicketForm = { subject: "", message: "", priority: "MEDIUM" };

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
    <div className="support-container">
      <h1 className="title" data-i18n="support.title">
        <span>{t("support.title", "Support Requests")}</span>
      </h1>
      <div className="ticket-form">
        <h2 style={{ marginBottom: "20px" }} data-i18n="support.create_title">
          {t("support.create_title", "Create new ticket")}
        </h2>
        <form
          id="createTicketForm"
          className="form"
          onSubmit={(event) => {
            void submit(event);
          }}
        >
          <label htmlFor="ticketSubject" data-i18n="support.form_subject">
            {t("support.form_subject", "Subject")}
          </label>
          <input
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
          <label
            htmlFor="ticketMessage"
            style={{ marginTop: "15px" }}
            data-i18n="support.form_message"
          >
            {t("support.form_message", "Message")}
          </label>
          <textarea
            id="ticketMessage"
            rows={5}
            data-i18n="support.form_message_placeholder"
            placeholder={t(
              "support.form_message_placeholder",
              "Describe your problem...",
            )}
            style={{
              width: "100%",
              padding: "10px",
              background: "#1a1a1a",
              border: "1px solid #333",
              color: "white",
              borderRadius: "8px",
            }}
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
          <div className="ticket-form">
            <label htmlFor="ticketPriority" data-i18n="support.label_priority">
              {t("support.label_priority", "Priority:")}
            </label>{" "}
            <select
              id="ticketPriority"
              value={form.priority}
              onChange={(event) => {
                const priority = event.target.value;
                if (isTicketPriority(priority))
                  setForm((current) => ({ ...current, priority }));
              }}
            >
              <option value="MEDIUM" data-i18n="support.priority_medium">
                {t("support.priority_medium", "Medium (Default)")}
              </option>
              <option value="LOW" data-i18n="support.priority_low">
                {t("support.priority_low", "Low")}
              </option>
              <option value="HIGH" data-i18n="support.priority_high">
                {t("support.priority_high", "High")}
              </option>
            </select>
          </div>
          <button
            type="submit"
            className="save-btn"
            style={{ marginTop: "20px" }}
            data-i18n="support.submit_btn"
            aria-label="Submit Ticket"
            disabled={submitting}
            aria-busy={submitting}
          >
            {t("support.submit_btn", "Submit Ticket")}
          </button>
          {formError && (
            <p role="alert" style={{ color: "red" }}>
              {formError === "validation"
                ? t(
                    "support.validation_error",
                    "Subject must contain 5–100 characters and message 10–2000 characters.",
                  )
                : t("support.toast_error", "Error creating ticket.")}
            </p>
          )}
        </form>
      </div>
      <h2 style={{ marginBottom: "20px" }} data-i18n="support.history_title">
        {t("support.history_title", "Your History")}
      </h2>
      <div id="ticketList" className="ticket-list" aria-live="polite">
        {status === "loading" && (
          <p
            style={{ color: "gray", textAlign: "center" }}
            data-i18n="support.loading"
          >
            {t("support.loading", "Loading tickets...")}
          </p>
        )}
        {status === "error" && (
          <p role="alert" style={{ color: "red" }}>
            {t("support.error_loading", "Error loading tickets.")}
          </p>
        )}
        {status === "ready" && tickets.length === 0 && (
          <p style={{ color: "gray", textAlign: "center" }}>
            {t("support.no_tickets", "No tickets found.")}
          </p>
        )}
        {status === "ready" &&
          tickets.map((ticket) => (
            <div
              key={ticket.id}
              className={
                ticket.status === "CLOSED"
                  ? "ticket-card resolved"
                  : "ticket-card"
              }
            >
              <div className="ticket-header">
                <h3>
                  Ticket #{ticket.id}: {ticket.subject}
                </h3>
                <div>
                  <span
                    className={`status-badge priority-${ticket.priority.toLowerCase()}`}
                    style={{ marginRight: "5px" }}
                  >
                    {ticket.priority}
                  </span>{" "}
                  <span
                    className={`status-badge status-${ticket.status.toLowerCase()}`}
                  >
                    {ticket.status}
                  </span>
                </div>
              </div>
              <div className="ticket-card">
                <p style={{ margin: "5px 0" }}>
                  <strong>{t("support.created_at", "Opened:")}</strong>{" "}
                  {new Date(ticket.createdAt).toLocaleDateString("uk-UA", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <p style={{ color: "#ccc" }}>{ticket.message}</p>
              </div>
              {ticket.adminResponse ? (
                <div className="admin-response admin-reply">
                  <span className="reply-label">
                    <i className="fas fa-user-shield" />{" "}
                    {t("support.admin_reply", "Support Team Replied:")}
                  </span>
                  <div style={{ marginTop: "5px" }}>{ticket.adminResponse}</div>
                </div>
              ) : (
                <p
                  style={{
                    opacity: 0.6,
                    marginTop: "15px",
                    fontStyle: "italic",
                    fontSize: "0.9em",
                  }}
                >
                  {t("support.awaiting", "Awaiting response from admin...")}
                </p>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
