'use client';
import type { SyntheticEvent } from 'react';

export function AdminReplyModal({dispatch}: {dispatch:(name:string,event:SyntheticEvent<Element>)=>unknown}) { return (<div id="replyModal" className="modal-overlay">
        <div className="modal-content glass">
            <h3>{"Reply to Ticket #"}<span id="modalTicketId"></span></h3>
            <p><strong>{"User Message:"}</strong></p>
            <div id="modalUserMessage" className="user-message-box"></div>
            <label htmlFor="replyInput">{"Your Reply:"}</label>
            <textarea id="replyInput" rows={5} placeholder="Enter your response here..." defaultValue="" />
            <div className="modal-actions">
                <button className="action-btn" aria-label="Cancel" onClick={event => dispatch("admin-6", event)}>{"Cancel"}</button>
                <button className="action-btn primary-btn" aria-label="Send Reply" onClick={event => dispatch("admin-7", event)}>{"Send Reply"}</button>
            </div>
        </div>
    </div>); }
