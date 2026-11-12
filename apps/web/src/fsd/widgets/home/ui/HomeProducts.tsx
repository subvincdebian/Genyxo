"use client";
import { useState, type SyntheticEvent } from "react";

import { Localized, useLanguage } from "@/shared/i18n";
export function HomeProducts({}: {
  dispatch: (name: string, event: SyntheticEvent<Element>) => unknown;
  ready: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useLanguage();
  return (
    <section className="products" id="products">
      {"\n        "}
      <div className="container">
        {"\n            "}
        <Localized
          as="h2"
          translationKey="products_title"
          className="section-title"
          data-i18n="products_title"
        >
          {"Credits packages"}
        </Localized>
        {"\n            "}
        <div
          className={`products-grid${expanded ? " gx-packs-expanded" : ""}`}
          id="productsGrid"
        ></div>
        <button className="gx-view-packs" type="button" aria-expanded={expanded} aria-controls="productsGrid" onClick={() => setExpanded(value => !value)}>
          {t(expanded ? "landing.fewer_packs" : "landing.all_packs")}
          <span aria-hidden="true">{expanded ? "−" : "+"}</span>
        </button>
        {"\n        "}
      </div>
      {"\n    "}
    </section>
  );
}
