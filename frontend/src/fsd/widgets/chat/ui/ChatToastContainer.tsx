'use client';
import type { SyntheticEvent } from 'react';

export function ChatToastContainer({}: {dispatch:(name:string,event:SyntheticEvent<Element>)=>unknown}) { return (<div id="toast-container" className="toast-container"></div>); }
