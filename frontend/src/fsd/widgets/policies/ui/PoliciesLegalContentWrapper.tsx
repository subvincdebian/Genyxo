'use client';
import type { SyntheticEvent } from 'react';

export function PoliciesLegalContentWrapper({dispatch}: {dispatch:(name:string,event:SyntheticEvent<Element>)=>unknown}) { return (<div className="legal-content-wrapper">
    <div id="review" className="tab-content active">
        <div className="cards-grid">
            <div className="legal-card">
                <h2>{"Privacy Policy"}</h2>
                <p>{"Find out how we collect and process your data and how you can change it."}</p>
                <a href="/policies/privacy-policy.html" onClick={event => dispatch("policies-6", event)}>{"Read more..."}</a>
            </div>
            
            <div className="legal-card">
                <h2>{"Terms of Service"}</h2>
                <p>{"Please read the rules for users of our Genyxo services and AI models."}</p>
                <a href="/policies/terms-of-service.html" onClick={event => dispatch("policies-7", event)}>{"Read more..."}</a>
            </div>

            <div className="legal-card with-icon">
                <div className="card-icon">
                <svg viewBox="0 0 24 24" width="32" height="32"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"></path></svg>
                </div>
                <div className="card-text">
                <h2>{"Genyxo Security"}</h2>
                <p>{"Our products are designed for a wide range of users, and we strive to provide reliable protection for your data and AI prompts."}</p>
                <a href="#">{"Find out what we're doing to protect you"}</a>
                </div>
            </div>

            <div className="legal-card with-icon">
                <div className="card-icon">
                <svg viewBox="0 0 24 24" width="32" height="32"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"></path></svg>
                </div>
                <div className="card-text">
                <h2>{"Your Account"}</h2>
                <p>{"The Account page provides tools to help you manage your credits, subscription, and privacy settings."}</p>
                <a href="/profile.html">{"Go to my account"}</a>
                </div>
            </div>
        </div>
    </div>
    </div>); }
