'use client';
import type { SyntheticEvent } from 'react';
import { Localized } from '@/features/language';
export function PoliciesMobileMenu({}: {dispatch:(name:string,event:SyntheticEvent<Element>)=>unknown}) { return (<div className="mobile-menu" id="mobileMenu">
        <ul>
            <li><Localized as="a" translationKey="nav.home" href="/index.html" data-i18n="nav.home" aria-label="Home Page">{"Home"}</Localized></li>
            <li><Localized as="a" translationKey="nav.chat" href="/chat.html" data-i18n="nav.chat" aria-label="Chat Page">{"Chat"}</Localized></li>
            <li><Localized as="a" translationKey="nav.about" href="/support.html" data-i18n="nav.about" aria-label="Support Page">{"Support"}</Localized></li>
        </ul>
    </div>); }
