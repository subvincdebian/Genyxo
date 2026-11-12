"use client";
import { useEffect, useState, type SyntheticEvent } from "react";

import { Localized, useLanguage } from "@/shared/i18n";
export function HomeCheckoutModal({
  dispatch,
  ready,
}: {
  dispatch: (name: string, event: SyntheticEvent<Element>) => unknown;
  ready: boolean;
}) {
  const { t } = useLanguage();
  const [cardEnabled, setCardEnabled] = useState(false);
  const [method, setMethod] = useState<"card" | "crypto">("crypto");
  useEffect(() => {
    const request = new AbortController();
    fetch("/api/payment/methods", { signal: request.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { card?: boolean } | null) => {
        if (!data?.card) return;
        setCardEnabled(true);
        setMethod("card");
      })
      .catch(() => undefined);
    return () => request.abort();
  }, []);
  const options = [
    ...(cardEnabled
      ? [
          {
            id: "card" as const,
            icon: "fas fa-credit-card",
            label: t("order.method_card", "Card"),
            hint: t(
              "order.method_card_hint",
              "Visa, Mastercard, Apple Pay or Google Pay. On the next page choose “Pay with card”.",
            ),
          },
        ]
      : []),
    {
      id: "crypto" as const,
      icon: "fab fa-bitcoin",
      label: t("order.method_crypto", "Crypto"),
      hint: t(
        "order.method_crypto_hint",
        "Bitcoin, Ethereum, USDT and 300+ other coins.",
      ),
    },
  ];
  return (
    <div className="modal" id="checkoutModal">
      {"\n        "}
      <div className="modal-content glass checkout-content">
        {"\n            "}
        <span className="close-btn" id="closeCheckout">
          {"×"}
        </span>
        {"\n            \n            "}
        <div className="checkout-header">
          {"\n                "}
          <Localized
            as="h2"
            translationKey="order.title"
            data-i18n="order.title"
          >
            {"Secure Checkout"}
          </Localized>
          {"\n                "}
          <div className="secure-badge">
            <i className="fas fa-lock"></i>
            {" Encrypted"}
          </div>
          {"\n            "}
        </div>
        {"\n\n            "}
        <div className="checkout-body">
          {"\n                "}
          <div className="checkout-product">
            {"\n                    "}
            <img
              id="checkoutImg"
              src=""
              width="70"
              height="70"
              alt="Product"
              className="checkout-img"
            />
            {"\n                    "}
            <div className="checkout-info">
              {"\n                        "}
              <Localized
                as="h3"
                translationKey="order.packaname"
                id="checkoutName"
                data-i18n="order.packaname"
              >
                {"AI Pack"}
              </Localized>
              {"\n                        "}
              <Localized
                as="p"
                translationKey="order.packdesc"
                className="checkout-desc"
                data-i18n="order.packdesc"
              >
                {"Instant delivery • Lifetime validity"}
              </Localized>
              {"\n                        "}
              <div className="checkout-credits">
                {"\n                            "}
                <i className="fas fa-bolt"></i>{" "}
                <span id="checkoutCredits">{"0"}</span>
                {" Credits\n                        "}
              </div>
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n\n                "}
          <div className="divider"></div>
          {"\n\n                "}
          <div className="checkout-summary">
            {"\n                    "}
            <div className="row">
              {"\n                        "}
              <Localized
                as="span"
                translationKey="order.price"
                data-i18n="order.price"
              >
                {"Price"}
              </Localized>
              {"\n                        "}
              <span id="checkoutPrice">{"$0.00"}</span>
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className="row">
              {"\n                        "}
              <Localized
                as="span"
                translationKey="order.fee_title"
                data-i18n="order.fee_title"
              >
                {"Processing Fee"}
              </Localized>
              {"\n                        "}
              <Localized
                as="span"
                translationKey="order.fee_desc"
                className="green-text"
                data-i18n="order.fee_desc"
              >
                {"Covered by us"}
              </Localized>
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className="row total">
              {"\n                        "}
              <Localized
                as="span"
                translationKey="order.total"
                data-i18n="order.total"
              >
                {"Total due"}
              </Localized>
              {"\n                        "}
              <span id="checkoutTotal">{"$0.00"}</span>
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n\n                "}
          {options.length > 1 && (
            <div
              className="checkout-method"
              role="radiogroup"
              aria-label={t("order.method_choose", "Payment method")}
            >
              {options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={method === option.id}
                  className="checkout-method-option"
                  onClick={() => setMethod(option.id)}
                >
                  <i className={option.icon} aria-hidden="true"></i>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          )}
          <p className="checkout-method-hint" aria-live="polite">
            {options.find((option) => option.id === method)?.hint}
          </p>
          <div className="payment-methods">
            {"\n                    "}
            <Localized
              as="span"
              translationKey="order.method"
              data-i18n="order.method"
            >
              {"We accept:"}
            </Localized>
            {"\n                    "}
            <div className="methods-icons">
              {"\n                        "}
              <i className="fab fa-bitcoin" title="Bitcoin"></i>
              {"\n                        "}
              <i className="fab fa-ethereum" title="Ethereum"></i>
              {"\n                        "}
              <i className="fas fa-dollar-sign" title="USDT"></i>
              {"\n                        "}
              {cardEnabled && (
                <i className="fab fa-cc-visa" title="Visa/Mastercard"></i>
              )}
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n\n                "}
          <button
            disabled={!ready}
            className="pay-now-btn"
            id="payBtn"
            data-method={method}
            aria-label="Pay Now"
            onClick={(event) => dispatch("home-4", event)}
          >
            {"\n                    "}
            <Localized
              as="span"
              translationKey="order.button"
              className="btn-text"
              data-i18n="order.button"
            >
              {"Proceed to Payment"}
            </Localized>
            {"\n                    "}
            <div className="spinner"></div>
            {"\n                "}
          </button>
          {"\n\n                "}
          <Localized
            as="p"
            translationKey="order.footer"
            className="checkout-footer"
            data-i18n="order.footer"
          >
            {"\n                    Powered by "}
            <strong>{"NowPayments"}</strong>
            {
              ". You will be redirected to complete the secure payment.\n                "
            }
          </Localized>
          {"\n            "}
        </div>
        {"\n        "}
      </div>
      {"\n    "}
    </div>
  );
}
