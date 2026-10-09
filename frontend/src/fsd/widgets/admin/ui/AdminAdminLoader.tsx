'use client';
import type { SyntheticEvent } from 'react';

export function AdminAdminLoader({}: {dispatch:(name:string,event:SyntheticEvent<Element>)=>unknown}) { return (<div id="admin-loader" style={{"position":"fixed","top":"0","left":"0","width":"100%","height":"100%","background":"#0a0a0a","zIndex":"9999","display":"flex","alignItems":"center","justifyContent":"center"}}>
        <div style={{"color":"white","fontFamily":"sans-serif"}}>{"Loading..."}</div>
    </div>); }
