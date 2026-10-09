'use client';
import type { SyntheticEvent } from 'react';

export function FaqOverlay({dispatch}: {dispatch:(name:string,event:SyntheticEvent<Element>)=>unknown}) { return (<div className="sidebar-overlay" id="overlay" onClick={event => dispatch("faq-0", event)}></div>); }
