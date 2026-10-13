"use client";

import { useEffect } from "react";
import { useLanguage } from "./language-provider";
export function useLocalizedMetadata(
  titleKey?: string,
  descriptionKey?: string,
) {
  const { t } = useLanguage();
  const title = titleKey ? t(titleKey, "") : "";
  const description = descriptionKey ? t(descriptionKey, "") : "";
  useEffect(() => {
    if (title) document.title = title;
    if (description)
      document
        .querySelector('meta[name="description"]')
        ?.setAttribute("content", description);
  }, [title, description]);
}
