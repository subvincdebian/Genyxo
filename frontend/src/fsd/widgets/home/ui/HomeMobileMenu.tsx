'use client';
import type { SyntheticEvent } from 'react';

export function HomeMobileMenu({}: {dispatch:(name:string,event:SyntheticEvent<Element>)=>unknown}) { return (<div className="mobile-menu" id="mobileMenu">
        <ul>
            <li><a href="#home" aria-label="Home Page">{"Home"}</a></li>
            <li><a href="#products" aria-label="Product Section">{"Products"}</a></li>
            <li><a href="/chat.html" aria-label="Chat Page">{"Chat"}</a></li>
            <li><a href="#about" aria-label="About Us">{"About us"}</a></li>
        </ul>
    </div>); }
