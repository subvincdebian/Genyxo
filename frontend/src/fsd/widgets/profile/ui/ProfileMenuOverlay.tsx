'use client';
import type { SyntheticEvent } from 'react';

export function ProfileMenuOverlay({}: {dispatch:(name:string,event:SyntheticEvent<Element>)=>unknown}) { return (<div className="menu-overlay" id="menuOverlay"></div>); }
