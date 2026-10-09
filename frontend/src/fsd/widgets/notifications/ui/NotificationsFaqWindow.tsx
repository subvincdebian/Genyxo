'use client';
import type { SyntheticEvent } from 'react';
import { Localized } from '@/features/language';
export function NotificationsFaqWindow({dispatch}: {dispatch:(name:string,event:SyntheticEvent<Element>)=>unknown}) { return (<div id="faqWindow">
        <div className="faq-header">
            <button id="faqBackBtn" className="faq-icon-btn" style={{"visibility":"hidden"}}>
                <i className="fas fa-arrow-left"></i> </button>
            <Localized as="span" translationKey="faq.title" className="faq-title" data-i18n="faq.title">{"Help & FAQ"}</Localized>
            <button id="faqCloseBtn" className="faq-icon-btn">
                <i className="fas fa-times"></i> </button>
        </div>

        <div className="faq-body">
            
            <div id="faqMenu" className="faq-menu">
                <div className="faq-menu-item" onClick={event => dispatch("notifications-1", event)}>
                    <Localized as="span" translationKey="faq.general" className="faq-item-title" data-i18n="faq.general">{"General Questions"}</Localized>
                    <span className="faq-arrow">{"❯"}</span>
                </div>
                <div className="faq-menu-item" onClick={event => dispatch("notifications-2", event)}>
                    <Localized as="span" translationKey="faq.subscription" className="faq-item-title" data-i18n="faq.subscription">{"Credits and Payment"}</Localized>
                    <span className="faq-arrow">{"❯"}</span>
                </div>
                <div className="faq-menu-item" onClick={event => dispatch("notifications-3", event)}>
                    <Localized as="span" translationKey="faq.models" className="faq-item-title" data-i18n="faq.models">{"Models (GPT, Gemini)"}</Localized>
                    <span className="faq-arrow">{"❯"}</span>
                </div>
                <div className="faq-menu-item" onClick={event => dispatch("notifications-4", event)}>
                    <Localized as="span" translationKey="faq.tech" className="faq-item-title" data-i18n="faq.tech">{"Technical problems"}</Localized>
                    <span className="faq-arrow">{"❯"}</span>
                </div>
            </div>

            <div id="page-general" className="faq-content-page">
                <Localized as="h4" translationKey="faq.general_title" data-i18n="faq.general_title">{"What is Genyxo AI?"}</Localized>
                <Localized as="p" translationKey="faq.general_text" data-i18n="faq.general_text">{"Genyxo AI is a platform that combines the best neural networks in a single interface..."}</Localized>
                
                <Localized as="h4" translationKey="faq.safe_title" data-i18n="faq.safe_title">{"Is my data safe?"}</Localized>
                <Localized as="p" translationKey="faq.safe_text" data-i18n="faq.safe_text">{"We transmit your prompts to neural networks via secure corporate API channels. According to our agreements, your data is not used to train global models. However, we still recommend that you do not enter your passwords or bank card information in the chat."}</Localized>
            </div>

            <div id="page-subscription" className="faq-content-page">
                <Localized as="h4" translationKey="faq.tokens_title" data-i18n="faq.tokens_title">{"How do Credits work?"}</Localized>
                <Localized as="p" translationKey="faq.tokens_text" data-i18n="faq.tokens_text">{"You purchase a package of credits that are spent on each message. The amount spent depends on two factors: the chosen model and the length of the conversation.."}</Localized>
                <Localized as="h4" translationKey="faq.tokens_title" data-i18n="faq.tokens_title">{"How much does one message cost?"}</Localized>
                <Localized as="p" translationKey="faq.tokens_text" data-i18n="faq.tokens_text">{"Different models cost differently:"}<br />{"\n                • "}<b>{"GPT-4o / Claude 3 Opus:"}</b>{" High cost (smart models)."}<br />{"\n                • "}<b>{"GPT-3.5 / Gemini Flash:"}</b>{" Low cost (fast models)."}<br />{"\n                The exact price is displayed next to the model selection."}</Localized>

                <Localized as="h4" translationKey="faq.tokens_title" data-i18n="faq.tokens_title">{"Do credits burn out?"}</Localized>
                <Localized as="p" translationKey="faq.tokens_text" data-i18n="faq.tokens_text">{"No! Purchased credit packages remain on your balance forever until you spend them. You can return to them even after a year."}</Localized>

                <Localized as="h4" translationKey="faq.tokens_title" data-i18n="faq.tokens_title">{"What to do if you run out of credit?"}</Localized>
                <Localized as="p" translationKey="faq.tokens_text" data-i18n="faq.tokens_text">{"The chat will be paused. You need to click the \"Top Up\" button in the menu to purchase a new package."}</Localized>
            </div>

            <div id="page-models" className="faq-content-page">
                <Localized as="h4" translationKey="faq.models_diff" data-i18n="faq.models_diff">{"What is the difference between the models?"}</Localized>
                <p>{"GPT-4 is better suited for logic and code. Gemini works great with large texts. Sora generates video."}</p>
            </div>

            <div id="page-errors" className="faq-content-page">
                <h4>{"Why is the chat not responding?"}</h4>
                <p>{"Check your internet connection or refresh the page. If the issue persists, click the \"Report a Bug\" button below."}</p>
            </div>

        </div>

        <div className="faq-footer">
            <a href="/support.html" className="faq-report-btn">
                <i className="fas fa-bug" style={{"marginRight":"8px"}}></i>{" Report a Bug\n            "}</a>
        </div>
    </div>); }
