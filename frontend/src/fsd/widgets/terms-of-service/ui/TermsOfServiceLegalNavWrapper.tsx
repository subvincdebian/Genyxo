'use client';
import type { SyntheticEvent } from 'react';

export function TermsOfServiceLegalNavWrapper({dispatch}: {dispatch:(name:string,event:SyntheticEvent<Element>)=>unknown}) { return (<div className="legal-nav-wrapper">
        <div className="legal-tabs-container">
            <a href="/policies/policies.html"><button className="tab-link" onClick={event => dispatch("terms-of-service-11", event)}>{"Review"}</button></a>
            <a href="/policies/privacy-policy.html"><button className="tab-link" onClick={event => dispatch("terms-of-service-12", event)}>{"Privacy Policy"}</button></a>
            <button className="tab-link active" onClick={event => dispatch("terms-of-service-13", event)}>{"Terms of Service"}</button>
            <a href="/policies/faq.html"><button className="tab-link" onClick={event => dispatch("terms-of-service-14", event)}>{"Frequently Asked Questions"}</button></a>
        </div>
    </div>); }
