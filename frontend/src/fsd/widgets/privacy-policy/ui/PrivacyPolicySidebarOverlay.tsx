'use client';
import type { SyntheticEvent } from 'react';

export function PrivacyPolicySidebarOverlay({dispatch}: {dispatch:(name:string,event:SyntheticEvent<Element>)=>unknown}) { return (<div id="sidebar-overlay" onClick={event => dispatch("privacy-policy-0", event)}></div>); }
