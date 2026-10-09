'use client';
import type { SyntheticEvent } from 'react';

export function FaqLegalNavWrapper({dispatch}: {dispatch:(name:string,event:SyntheticEvent<Element>)=>unknown}) { return (<div className="legal-nav-wrapper">
        <div className="legal-tabs-container">
            <a href="/policies/policies.html"><button className="tab-link" onClick={event => dispatch("faq-7", event)}>{"Review"}</button></a>
            <a href="/policies/privacy-policy.html"><button className="tab-link" onClick={event => dispatch("faq-8", event)}>{"Privacy Policy"}</button></a>
            <a href="/policies/terms-of-service.html"><button className="tab-link" onClick={event => dispatch("faq-9", event)}>{"Terms of Service"}</button></a>
            <button className="tab-link active" onClick={event => dispatch("faq-10", event)}>{"Frequently Asked Questions"}</button>
        </div>
    </div>); }
