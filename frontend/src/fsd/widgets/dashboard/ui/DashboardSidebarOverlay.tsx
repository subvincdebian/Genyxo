'use client';
import type { SyntheticEvent } from 'react';

export function DashboardSidebarOverlay({}: {dispatch:(name:string,event:SyntheticEvent<Element>)=>unknown}) { return (<div className="sidebar-overlay" id="sidebarOverlay"></div>); }
