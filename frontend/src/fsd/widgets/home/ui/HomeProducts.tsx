"use client";
import type { SyntheticEvent } from "react";

import { Localized } from "@/shared/i18n";
export function HomeProducts({}: {
  dispatch: (name: string, event: SyntheticEvent<Element>) => unknown;
  ready: boolean;
}) {
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
          className="products-grid animate-on-scroll"
          id="productsGrid"
        ></div>
        {"\n        "}
      </div>
      {"\n    "}
    </section>
  );
}
