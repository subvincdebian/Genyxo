"use client";

import { createElement } from "react";
import type { ReactNode } from "react";
import { LANGUAGE_NAMES, useLanguage } from "../model/language-provider";

interface LocalizedProps {
  as: string;
  translationKey: string;
  placeholderKey?: string;
  children?: ReactNode;
  [property: string]: unknown;
}

export function Localized({
  as,
  translationKey,
  placeholderKey,
  children,
  ...props
}: LocalizedProps) {
  const { lang, t } = useLanguage();
  const tag = as.toLowerCase();
  const text = t(translationKey, "");
  const elementProps: Record<string, unknown> = {
    ...props,
    "data-i18n": translationKey,
  };

  if (
    placeholderKey ||
    ((tag === "input" || tag === "textarea") &&
      typeof props.placeholder === "string")
  ) {
    const fallback =
      typeof props.placeholder === "string" ? props.placeholder : "";
    elementProps.placeholder = t(placeholderKey ?? translationKey, fallback);
  }
  if (tag === "meta") {
    if (text) elementProps.content = text;
    return createElement(as, elementProps);
  }
  if (tag === "input" || tag === "textarea") {
    // The translation belongs to the placeholder, never the user's field value.
    return createElement(as, elementProps, children);
  }
  const content =
    props.id === "currentLangDisplay"
      ? `${LANGUAGE_NAMES[lang]} >`
      : text || children;
  return createElement(as, elementProps, content);
}
