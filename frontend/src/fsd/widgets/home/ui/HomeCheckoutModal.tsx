'use client';
import type { SyntheticEvent } from 'react';
import { Localized } from '@/features/language';
export function HomeCheckoutModal({dispatch}: {dispatch:(name:string,event:SyntheticEvent<Element>)=>unknown}) { return (<div className="modal" id="checkoutModal">
        <div className="modal-content glass checkout-content">
            <span className="close-btn" id="closeCheckout">{"×"}</span>
            
            <div className="checkout-header">
                <Localized as="h2" translationKey="order.title" data-i18n="order.title">{"Secure Checkout"}</Localized>
                <div className="secure-badge"><i className="fas fa-lock"></i>{" Encrypted"}</div>
            </div>

            <div className="checkout-body">
                <div className="checkout-product">
                    <img id="checkoutImg" src="" width="70" height="70" alt="Product" className="checkout-img" />
                    <div className="checkout-info">
                        <Localized as="h3" translationKey="order.packaname" id="checkoutName" data-i18n="order.packaname">{"AI Pack"}</Localized>
                        <Localized as="p" translationKey="order.packdesc" className="checkout-desc" data-i18n="order.packdesc">{"Instant delivery • Lifetime validity"}</Localized>
                        <div className="checkout-credits">
                            <i className="fas fa-bolt"></i> <span id="checkoutCredits">{"0"}</span>{" Credits\n                        "}</div>
                    </div>
                </div>

                <div className="divider"></div>

                <div className="checkout-summary">
                    <div className="row">
                        <Localized as="span" translationKey="order.price" data-i18n="order.price">{"Price"}</Localized>
                        <span id="checkoutPrice">{"$0.00"}</span>
                    </div>
                    <div className="row">
                        <Localized as="span" translationKey="order.fee_title" data-i18n="order.fee_title">{"Processing Fee"}</Localized>
                        <Localized as="span" translationKey="order.fee_desc" className="green-text" data-i18n="order.fee_desc">{"Covered by us"}</Localized>
                    </div>
                    <div className="row total">
                        <Localized as="span" translationKey="order.total" data-i18n="order.total">{"Total due"}</Localized>
                        <span id="checkoutTotal">{"$0.00"}</span>
                    </div>
                </div>

                <div className="payment-methods">
                    <Localized as="span" translationKey="order.method" data-i18n="order.method">{"We accept:"}</Localized>
                    <div className="methods-icons">
                        <i className="fab fa-bitcoin" title="Bitcoin"></i>
                        <i className="fab fa-ethereum" title="Ethereum"></i>
                        <i className="fas fa-dollar-sign" title="USDT"></i>
                        <i className="fab fa-cc-visa" title="Visa/Mastercard"></i>
                    </div>
                </div>

                <button className="pay-now-btn" id="payBtn" aria-label="Pay Now" onClick={event => dispatch("home-4", event)}>
                    <Localized as="span" translationKey="order.button" className="btn-text" data-i18n="order.button">{"Proceed to Payment"}</Localized>
                    <div className="spinner"></div>
                </button>

                <Localized as="p" translationKey="order.footer" className="checkout-footer" data-i18n="order.footer">{"\n                    Powered by "}<strong>{"NowPayments"}</strong>{". You will be redirected to complete the secure payment.\n                "}</Localized>
            </div>
        </div>
    </div>); }
