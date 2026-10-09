'use client';
import type { SyntheticEvent } from 'react';

export function HomeVerifyEmailModal({}: {dispatch:(name:string,event:SyntheticEvent<Element>)=>unknown}) { return (<div className="modal" id="verifyEmailModal">
        <div className="modal-content glass" style={{"textAlign":"center","maxWidth":"400px"}}>
            <div className="email-animation-container">
                <div className="envelope">
                    <i className="fas fa-envelope-open-text fa-3x" style={{"color":"#10e6cc"}}></i>
                </div>
                <div className="loader-ring"></div>
            </div>
            <h2 style={{"margin":"20px 0"}}>{"Verify your email"}</h2>
            <p style={{"color":"#ccc","marginBottom":"20px"}}>{"\n                We sent a confirmation link to your email."}<br />{"\n                Please check your inbox (and spam).\n            "}</p>
            <p style={{"fontSize":"0.9rem","color":"#888"}}>{"\n                Once you click the link in the email, this window will close automatically.\n            "}</p>
        </div>
    </div>); }
