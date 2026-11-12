"use client";
import { AnimatedNumber } from "@/shared/ui/AnimatedNumber";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  WorkspaceDialog,
  WorkspaceIcon,
  WorkspaceTooltip,
} from "@/shared/ui/workspace";
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
  const [editing, setEditing] = useState<"name" | "photo" | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<File | undefined>();
  const photoInput = useRef<HTMLInputElement>(null);
  const usage = useAccountResource<Usage>("profile/usage?period=30");
  return (
    <>
      <div className={styles.identity}>
        <div className="gx:flex gx:items-center gx:gap-5 gx:min-w-0">
          <button
            className={styles.avatarEdit}
            aria-label={text("upload_photo", "Upload photo")}
            title={text("upload_photo", "Upload photo")}
            onClick={() => photoInput.current?.click()}
          >
            <Avatar
              large
              name={account.name || account.email}
              src={account.avatar}
            />
            <span className={styles.avatarOverlay}>
              <WorkspaceIcon name="image" size={24} />
            </span>
          </button>
          <input
            ref={photoInput}
            type="file"
            hidden
            accept="image/png,image/jpeg,image/webp,image/gif"
            className={styles.srOnly}
            tabIndex={-1}
            aria-label={text("upload_photo", "Upload photo")}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                setSelectedPhoto(file);
                setEditing("photo");
              }
              event.target.value = "";
            }}
          />
          <div className={styles.identityText}>
            <h2>{account.name || account.email.split("@")[0]}</h2>
            <p>{account.email}</p>
          </div>
        </div>
      </div>
      <div className={styles.overviewStats}>
        <button onClick={() => navigate("billing")}>
          <span>{text("available_credits", "Available credits")}</span>
          <strong>
            <AnimatedNumber value={Number(account.credits)} locale={lang} />
            <WorkspaceIcon name="chevron" size={17} />
          </strong>
        </button>
        <button onClick={() => navigate("usage")}>
          <span>{text("used_30", "Credits used · 30 days")}</span>
          <strong>
            {usage.data ? (
              <AnimatedNumber value={usage.data.totalCredits} locale={lang} />
            ) : (
              "—"
            )}
            <WorkspaceIcon name="chevron" size={17} />
          </strong>
        </button>
        <button onClick={() => navigate("usage")}>
          <span>{text("requests_30", "AI requests · 30 days")}</span>
          <strong>
            {usage.data ? (
              <AnimatedNumber value={usage.data.requests} locale={lang} />
            ) : (
              "—"
            )}
            <WorkspaceIcon name="chevron" size={17} />
          </strong>
        </button>
      </div>
      <Section title={text("account_details", "Account details")}>
        <div className={styles.group}>
          <Row title={text("name", "Display name")}>
            <span className={styles.editableValue}>
              {account.name || "—"}
              <WorkspaceTooltip
                label={text("edit_name", "Edit name")}
                side="bottom"
              >
                <button
                  className={styles.iconButton}
                  aria-label={text("edit_name", "Edit name")}
                  onClick={() => setEditing("name")}
                >
                  <WorkspaceIcon name="edit" size={18} />
                </button>
              </WorkspaceTooltip>
            </span>
          </Row>
          <Row
            title={text("email", "Email address")}
            description={text("email_help", "Used to sign in to your account.")}
          >
            <span className={styles.breakText}>{account.email}</span>
          </Row>
        </div>
      </Section>
      {editing && (
        <ProfileEditor
          account={account}
          mode={editing}
          initialFile={selectedPhoto}
          onClose={() => {
            setEditing(null);
            setSelectedPhoto(undefined);
          }}
          onSaved={() => {
            onUpdated();
            setEditing(null);
            setSelectedPhoto(undefined);
          }}
        />
      )}
    </>
  );
}

function ProfileEditor({
  account,
  mode,
  initialFile,
  onClose,
  onSaved,
}: {
  account: Account;
  mode: "name" | "photo";
  initialFile?: File;
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

  const initialRead = useRef(false);
  useEffect(() => {
    if (initialFile && !initialRead.current) {
      initialRead.current = true;
      void readImage(initialFile);
    }
    // The selected file belongs to this editor instance; subsequent uploads use the input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
    if (
      mode === "name" &&
      (name.trim().length < 2 || name.trim().length > 50)
    ) {
      setError(text("name_error", "Use 2–50 characters for your name."));
      nameInput.current?.focus();
      return;
    }
    setBusy(true);
    setError("");
    try {
      await accountRequest("profile/update", {
        method: "POST",
        body: JSON.stringify(
          mode === "name" ? { name: name.trim() } : { avatar },
        ),
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
      title={
        mode === "name"
          ? text("edit_name", "Edit name")
          : text("profile_photo", "Profile photo")
      }
      onClose={close}
      className={styles.dialog}
    >
      <form onSubmit={save} noValidate className={styles.form}>
        {mode === "photo" && (
          <>
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
                <p>
                  {text("photo_help", "Drop an image here, or choose a file.")}
                </p>
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
                hidden
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
          </>
        )}
        {mode === "name" && (
          <label className={styles.field}>
            {text("name", "Display name")}
            <input
              ref={nameInput}
              autoFocus
              value={name}
              maxLength={50}
              autoComplete="name"
              disabled={busy}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "profile-edit-error" : undefined}
            />
          </label>
        )}
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
