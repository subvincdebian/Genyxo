'use client';
import type { SyntheticEvent } from 'react';
import { Localized, LanguageGrid } from '@/features/language';
export function ProfileLangModal({}: {dispatch:(name:string,event:SyntheticEvent<Element>)=>unknown}) { return (<div className="modal" id="langModal">
        <div className="modal-content glass" style={{"maxWidth":"400px"}}>
            <span className="close-btn" id="closeLangModal">{"×"}</span>
            <Localized as="h2" translationKey="language.select" style={{"textAlign":"center","marginBottom":"20px"}} data-i18n="language.select">{"Select Language"}</Localized>
            <div className="lang-grid" id="langGrid"><LanguageGrid /></div>
        </div>
    </div>); }
