'use client';
import type { SyntheticEvent } from 'react';

export function HomeMenuOverlay({}: {dispatch:(name:string,event:SyntheticEvent<Element>)=>unknown}) { return (<div className="menu-overlay" id="menuOverlay"></div>); }
