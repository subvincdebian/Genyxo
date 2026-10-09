'use client';
import type { SyntheticEvent } from 'react';
import { Localized, LanguageGrid } from '@/features/language';
export function NotificationsLangModal({}: {dispatch:(name:string,event:SyntheticEvent<Element>)=>unknown}) { return (<div className="modal" id="langModal" style={{"display":"none","position":"fixed","top":"0","left":"0","width":"100%","height":"100%","background":"rgba(0,0,0,0.8)","justifyContent":"center","alignItems":"center","zIndex":"10001"}}>
        <div className="modal-content glass" style={{"maxWidth":"400px","background":"#121212","padding":"20px","borderRadius":"15px","width":"90%"}}>
            <span className="close-btn" id="closeLangModal" style={{"float":"right","cursor":"pointer","fontSize":"1.5rem","color":"#aaa"}}>{"×"}</span>
            <Localized as="h2" translationKey="language.select" style={{"textAlign":"center","marginBottom":"20px","color":"white"}} data-i18n="language.select">{"Select Language"}</Localized>
            <div className="lang-grid" id="langGrid" style={{"display":"flex","flexDirection":"column","gap":"10px"}}><LanguageGrid /></div>
        </div>
    </div>); }
