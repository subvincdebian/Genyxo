"use client";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { WorkspaceIcon } from "@/shared/ui/workspace";
import {
  PET_MODELS,
  PROVIDER_ORDER,
  findPetModel,
  modelIcon,
  readFavorites,
  toggleFavorite,
  type PetModelKind,
} from "../model/pet-models";
import styles from "./PetComposer.module.css";

const TABS: { kind: PetModelKind; label: string }[] = [
  { kind: "chat", label: "Chat" },
  { kind: "image", label: "Image" },
  { kind: "video", label: "Video" },
];

export function PetModelPicker({
  value,
  onPick,
  onClose,
}: {
  value: string;
  onPick: (value: string) => void;
  onClose: () => void;
}) {
  const current = findPetModel(value);
  const [kind, setKind] = useState<PetModelKind>(current.kind);
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>(() => readFavorites());
  const [expanded, setExpanded] = useState<string | null>(current.provider);
  const [active, setActive] = useState("");
  const search = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const needle = query.trim().toLowerCase();

  useEffect(() => {
    const frame = requestAnimationFrame(() => search.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, []);

  const groups = PROVIDER_ORDER.map((provider) => ({
    provider,
    models: PET_MODELS.filter(
      (model) => model.kind === kind && model.provider === provider && (!needle || `${model.label} ${model.provider}`.toLowerCase().includes(needle)),
    ).sort((a, b) => Number(favorites.includes(b.value)) - Number(favorites.includes(a.value))),
  })).filter((group) => group.models.length);
  const favoriteModels = !needle ? PET_MODELS.filter((model) => model.kind === kind && favorites.includes(model.value)) : [];
  // Image and video have one provider each, so they are always open.
  const isOpen = (provider: string) => Boolean(needle) || kind !== "chat" || expanded === provider;
  // Keys, not values: a favourite also appears in its provider's group.
  const visible = [
    ...favoriteModels.map((model) => `fav-${model.value}`),
    ...groups.flatMap((group) => (isOpen(group.provider) ? group.models.map((model) => model.value) : [])),
  ];
  const valueOf = (key: string) => key.replace(/^fav-/, "");

  useLayoutEffect(() => {
    list.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function keys(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!visible.length) return;
      const index = visible.indexOf(active);
      const next = index < 0 ? (event.key === "ArrowDown" ? 0 : visible.length - 1) : (index + (event.key === "ArrowDown" ? 1 : -1) + visible.length) % visible.length;
      setActive(visible[next]);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const pick = visible.includes(active) ? active : needle ? visible[0] : "";
      if (pick) onPick(valueOf(pick));
    } else if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  }

  const option = (model: (typeof PET_MODELS)[number], key: string) => {
    const favorite = favorites.includes(model.value);
    return (
      <div
        key={key}
        role="option"
        aria-selected={model.value === value}
        data-active={key === active}
        className={styles.model}
        onMouseDown={(event) => event.preventDefault()}
        onMouseMove={() => key !== active && setActive(key)}
        onClick={() => onPick(model.value)}
      >
        <img src={modelIcon(model.value)} alt="" width={18} height={18} />
        <span className={styles.modelName}>{model.label}</span>
        {model.credits ? <small className={styles.credits}>{model.credits} cr</small> : null}
        <button
          type="button"
          className={styles.star}
          data-on={favorite}
          aria-label={favorite ? `Remove ${model.label} from favorites` : `Add ${model.label} to favorites`}
          aria-pressed={favorite}
          onMouseDown={(event) => event.preventDefault()}
          onClick={(event) => {
            event.stopPropagation();
            setFavorites(toggleFavorite(model.value));
          }}
        >
          <WorkspaceIcon name={favorite ? "star-filled" : "star"} size={14} />
        </button>
        <span className={styles.rowEnd} data-hidden={model.value !== value}>
          <WorkspaceIcon name="check" size={15} />
        </span>
      </div>
    );
  };

  return (
    <div className={styles.palette}>
      <div className={styles.tabs} role="tablist" aria-label="What to create" style={{ "--tab": TABS.findIndex((tab) => tab.kind === kind) } as CSSProperties}>
        <span className={styles.tabGlider} aria-hidden="true" />
        {TABS.map((tab) => (
          <button
            key={tab.kind}
            type="button"
            role="tab"
            aria-selected={tab.kind === kind}
            onClick={() => {
              setKind(tab.kind);
              setActive("");
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <label className={styles.search}>
        <WorkspaceIcon name="search" size={15} />
        <input
          ref={search}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive("");
          }}
          onKeyDown={keys}
          placeholder="Search models"
          aria-label="Search models"
        />
      </label>
      <div ref={list} key={kind} className={styles.list} role="listbox" aria-label="Models">
        {favoriteModels.length > 0 && (
          <div className={styles.section} role="group" aria-label="Favorites">
            <p className={styles.label}>Favorites</p>
            {favoriteModels.map((model) => option(model, `fav-${model.value}`))}
          </div>
        )}
        {groups.map((group) => {
          const open = isOpen(group.provider);
          return (
            <div key={group.provider} className={styles.provider} role="group" aria-label={`${group.provider} models`}>
              {kind === "chat" && !needle && (
                <button
                  type="button"
                  className={styles.providerHead}
                  aria-expanded={open}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => setExpanded(open ? null : group.provider)}
                >
                  <img src={modelIcon(group.models[0].value)} alt="" width={18} height={18} />
                  <span>{group.provider}</span>
                  <small>{group.models.length}</small>
                  <WorkspaceIcon name="chevron" size={14} />
                </button>
              )}
              <div className={styles.providerBody} data-open={open}>
                <div>{group.models.map((model) => option(model, model.value))}</div>
              </div>
            </div>
          );
        })}
        {!groups.length && <p className={styles.empty}>No compatible models found</p>}
      </div>
    </div>
  );
}
