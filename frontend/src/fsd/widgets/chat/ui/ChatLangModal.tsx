'use client';
import type { SyntheticEvent } from 'react';
import { LanguageGrid } from '@/features/language';
export function ChatLangModal({}: {dispatch:(name:string,event:SyntheticEvent<Element>)=>unknown}) { return (<div className="modal" id="langModal">
        <div className="modal-content glass" style={{"maxWidth":"400px"}}>
            <span className="close-btn" id="closeLangModal">{"×"}</span>
            <h2 style={{"textAlign":"center","marginBottom":"20px"}}>{"Select Language"}</h2>
            <div className="lang-grid" id="langGrid"><LanguageGrid /></div>
        </div>
    </div>); }
