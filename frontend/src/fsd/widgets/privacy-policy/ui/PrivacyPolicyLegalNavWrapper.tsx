'use client';
import type { SyntheticEvent } from 'react';

export function PrivacyPolicyLegalNavWrapper({dispatch}: {dispatch:(name:string,event:SyntheticEvent<Element>)=>unknown}) { return (<div className="legal-nav-wrapper">
        <div className="legal-tabs-container">
            <a href="/policies/policies.html"><button className="tab-link" onClick={event => dispatch("privacy-policy-11", event)}>{"Review"}</button></a>
            <button className="tab-link active" onClick={event => dispatch("privacy-policy-12", event)}>{"Privacy Policy"}</button>
            <a href="/policies/terms-of-service.html"><button className="tab-link" onClick={event => dispatch("privacy-policy-13", event)}>{"Terms of Service"}</button></a>
            <button className="tab-link" onClick={event => dispatch("privacy-policy-14", event)}>{"Frequently Asked Questions"}</button>
        </div>
    </div>); }
