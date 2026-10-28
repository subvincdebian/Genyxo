"use client";
import { useRef, useState, type FormEvent } from "react";
import { WorkspaceDialog, WorkspaceIcon } from "@/shared/ui/workspace";
import {
  accountRequest,
  cacheAccount,
  useAccountResource,
  type Account,
  type Usage,
} from "../model/account";
import { Action, Avatar, Row, Section, useAccountText } from "./account-ui";
import styles from "./ProfilePage.module.css";

export function AccountOverview({
  account,
  onUpdated,
  navigate,
}: {
  account: Account;
  onUpdated: () => void;
  navigate: (section: string) => void;
}) {
  const { text, lang } = useAccountText();
  const [editing, setEditing] = useState(false);
  const usage = useAccountResource<Usage>("profile/usage?period=30");
  const number = (value: number) =>
    new Intl.NumberFormat(lang, { maximumFractionDigits: 2 }).format(value);
  return (
    <>
      <div className={styles.identity}>
        <div className="gx:flex gx:items-center gx:gap-5 gx:min-w-0">
          <Avatar
            large
            name={account.name || account.email}
            src={account.avatar}
          />
          <div className={styles.identityText}>
            <h2>{account.name || account.email.split("@")[0]}</h2>
            <p>{account.email}</p>
            <span className={styles.identityTag}>
              <span />
              {text("personal_account", "Personal account")}
            </span>
          </div>
        </div>
        <Action primary onClick={() => setEditing(true)}>
          <WorkspaceIcon name="edit" size={16} />
          {text("edit_profile", "Edit profile")}
        </Action>
      </div>
      <div className={styles.overviewStats}>
        <button onClick={() => navigate("billing")}>
          <span>{text("available_credits", "Available credits")}</span>
          <strong>
            {number(Number(account.credits))}
            <WorkspaceIcon name="chevron" size={17} />
          </strong>
        </button>
        <button onClick={() => navigate("usage")}>
          <span>{text("used_30", "Credits used · 30 days")}</span>
          <strong>
            {usage.data ? number(usage.data.totalCredits) : "—"}
            <WorkspaceIcon name="chevron" size={17} />
          </strong>
        </button>
        <button onClick={() => navigate("usage")}>
          <span>{text("requests_30", "AI requests · 30 days")}</span>
          <strong>
            {usage.data ? number(usage.data.requests) : "—"}
            <WorkspaceIcon name="chevron" size={17} />
          </strong>
        </button>
      </div>
      <Section title={text("account_details", "Account details")}>
        <div className={styles.group}>
          <Row title={text("name", "Display name")}>
            <span>{account.name || "—"}</span>
          </Row>
          <Row
            title={text("email", "Email address")}
            description={text("email_help", "Used to sign in to your account.")}
          >
            <span className={styles.breakText}>{account.email}</span>
          </Row>
          <Row title={text("account_id", "Account ID")}>
            <span className={styles.mono}>#{account.id}</span>
          </Row>
        </div>
      </Section>
      {editing && (
        <ProfileEditor
          account={account}
          onClose={() => setEditing(false)}
          onSaved={() => {
            onUpdated();
            setEditing(false);
          }}
        />
      )}
    </>
  );
}

function ProfileEditor({
  account,
  onClose,
  onSaved,
}: {
  account: Account;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { text } = useAccountText();
  const [name, setName] = useState(account.name || "");
  const [avatar, setAvatar] = useState(account.avatar || "");
  const [busy, setBusy] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [discard, setDiscard] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const dirty =
    name !== (account.name || "") || avatar !== (account.avatar || "");
  const close = () => {
    if (busy || processing) return;
    if (dirty) setDiscard(true);
    else onClose();
  };

  async function readImage(file?: File) {
    if (!file || processing || busy) return;
    setError("");
    if (
      !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(
        file.type,
      ) ||
      file.size > 5 * 1024 * 1024
    ) {
      setError(
        text("image_error", "Choose a PNG, JPG, WebP or GIF under 5 MB."),
      );
      return;
    }
    setProcessing(true);
    const source = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = source;
      await image.decode();
      if (!image.naturalWidth || !image.naturalHeight) throw new Error();
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const context = canvas.getContext("2d");
      if (!context) throw new Error();
      const side = Math.min(image.naturalWidth, image.naturalHeight);
      context.drawImage(
        image,
        (image.naturalWidth - side) / 2,
        (image.naturalHeight - side) / 2,
        side,
        side,
        0,
        0,
        512,
        512,
      );
      setAvatar(canvas.toDataURL("image/webp", 0.88));
    } catch {
      setError(
        text(
          "image_decode_error",
          "This image couldn’t be opened. Try another file.",
        ),
      );
    } finally {
      URL.revokeObjectURL(source);
      setProcessing(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy || processing) return;
    if (name.trim().length < 2 || name.trim().length > 50) {
      setError(text("name_error", "Use 2–50 characters for your name."));
      nameInput.current?.focus();
      return;
    }
    setBusy(true);
    setError("");
    try {
      await accountRequest("profile/update", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), avatar }),
      });
      cacheAccount({ ...account, name: name.trim(), avatar });
      onSaved();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : text("save_error", "Your changes couldn’t be saved. Try again."),
      );
      setBusy(false);
    }
  }
  return (
    <WorkspaceDialog
      title={text("edit_profile", "Edit profile")}
      onClose={close}
      className={styles.dialog}
    >
      <form onSubmit={save} noValidate className={styles.form}>
        <div
          className={`${styles.dropzone} ${dragging ? styles.dragging : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void readImage(event.dataTransfer.files[0]);
          }}
        >
          <Avatar large name={name || account.email} src={avatar} />
          <div>
            <strong>{text("profile_photo", "Profile photo")}</strong>
            <p>{text("photo_help", "Drop an image here, or choose a file.")}</p>
            <div className="gx:flex gx:flex-wrap gx:gap-2">
              <Action
                onClick={() => fileInput.current?.click()}
                disabled={processing || busy}
                busy={processing}
              >
                <WorkspaceIcon name="upload" size={16} />
                {text("upload_photo", "Upload photo")}
              </Action>
              {avatar && (
                <button
                  type="button"
                  className={styles.textButton}
                  disabled={busy || processing}
                  onClick={() => setAvatar("")}
                >
                  {text("remove", "Remove")}
                </button>
              )}
            </div>
          </div>
          <input
            ref={fileInput}
            type="file"
            className={styles.srOnly}
            accept="image/png,image/jpeg,image/webp,image/gif"
            aria-label={text("upload_photo", "Upload photo")}
            tabIndex={-1}
            onChange={(event) => void readImage(event.target.files?.[0])}
          />
        </div>
        <p className={styles.hint}>
          {text(
            "photo_limit",
            "PNG, JPG, WebP or GIF. Up to 5 MB. Cropped to a square.",
          )}
        </p>
        <label className={styles.field}>
          {text("name", "Display name")}
          <input
            ref={nameInput}
            value={name}
            maxLength={50}
            autoComplete="name"
            disabled={busy}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "profile-edit-error" : undefined}
          />
        </label>
        {error && (
          <p id="profile-edit-error" className={styles.error} role="alert">
            {error}
          </p>
        )}
        {discard ? (
          <div className={styles.discard}>
            <p>{text("discard_question", "Discard your unsaved changes?")}</p>
            <Action onClick={() => setDiscard(false)}>
              {text("keep_editing", "Keep editing")}
            </Action>
            <Action danger onClick={onClose}>
              {text("discard", "Discard changes")}
            </Action>
          </div>
        ) : (
          <div className={styles.formFooter}>
            <Action onClick={close} disabled={busy || processing}>
              {text("cancel", "Cancel")}
            </Action>
            <Action
              primary
              type="submit"
              disabled={!dirty || processing}
              busy={busy}
            >
              {text("save_changes", "Save changes")}
            </Action>
          </div>
        )}
      </form>
    </WorkspaceDialog>
  );
}
