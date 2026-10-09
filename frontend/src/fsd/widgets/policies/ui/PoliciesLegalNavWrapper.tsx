'use client';
import type { SyntheticEvent } from 'react';

export function PoliciesLegalNavWrapper({dispatch}: {dispatch:(name:string,event:SyntheticEvent<Element>)=>unknown}) { return (<div className="legal-nav-wrapper">
        <div className="legal-tabs-container">
            <button className="tab-link active" onClick={event => dispatch("policies-2", event)}>{"Review"}</button>
            <a href="/policies/privacy-policy.html"><button className="tab-link" onClick={event => dispatch("policies-3", event)}>{"Privacy Policy"}</button></a>
            <a href="/policies/terms-of-service.html"><button className="tab-link" onClick={event => dispatch("policies-4", event)}>{"Terms of Service"}</button></a>
            <a href="/policies/faq.html"><button className="tab-link" onClick={event => dispatch("policies-5", event)}>{"Frequently Asked Questions"}</button></a>
        </div>
    </div>); }
