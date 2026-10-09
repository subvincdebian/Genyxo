'use client';
import type { SyntheticEvent } from 'react';

export function PoliciesOverlay({dispatch}: {dispatch:(name:string,event:SyntheticEvent<Element>)=>unknown}) { return (<div className="sidebar-overlay" id="overlay" onClick={event => dispatch("policies-0", event)}></div>); }
