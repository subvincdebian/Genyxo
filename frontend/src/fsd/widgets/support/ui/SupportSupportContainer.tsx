'use client';
import type { SyntheticEvent } from 'react';
import { Localized } from '@/features/language';
export function SupportSupportContainer({}: {dispatch:(name:string,event:SyntheticEvent<Element>)=>unknown}) { return (<div className="support-container">
        <Localized as="h1" translationKey="support.title" className="title" data-i18n="support.title">
            <i className="fas fa-headset"></i>
            <span>{"Support Requests"}</span>
        </Localized>
        
        <div className="ticket-form">
            <Localized as="h2" translationKey="support.create_title" style={{"marginBottom":"20px"}} data-i18n="support.create_title">{"Create new ticket"}</Localized>
            <form id="createTicketForm" className="form">
                <Localized as="label" translationKey="support.form_subject" data-i18n="support.form_subject">{"Subject"}</Localized>
                <Localized as="input" translationKey="support.form_subject_placeholder" type="text" id="ticketSubject" data-i18n="support.form_subject_placeholder" placeholder="e.g., Payment issue" required={true} />
                
                <Localized as="label" translationKey="support.form_message" style={{"marginTop":"15px"}} data-i18n="support.form_message">{"Message"}</Localized>
                <Localized as="textarea" translationKey="support.form_message_placeholder" id="ticketMessage" rows={5} data-i18n="support.form_message_placeholder" placeholder="Describe your problem..." style={{"width":"100%","padding":"10px","background":"#1a1a1a","border":"1px solid #333","color":"white","borderRadius":"8px"}} required={true} defaultValue="" />
                
                <div className="ticket-form">
                    <Localized as="label" translationKey="support.label_priority" htmlFor="ticketPriority" data-i18n="support.label_priority">{"Priority:"}</Localized>
                    <select id="ticketPriority">
                        <Localized as="option" translationKey="support.priority_medium" value="MEDIUM" data-i18n="support.priority_medium">{"Medium (Default)"}</Localized>
                        <Localized as="option" translationKey="support.priority_low" value="LOW" data-i18n="support.priority_low">{"Low"}</Localized>
                        <Localized as="option" translationKey="support.priority_high" value="HIGH" data-i18n="support.priority_high">{"High"}</Localized>
                    </select>
                </div>
                <Localized as="button" translationKey="support.submit_btn" type="submit" className="save-btn" style={{"marginTop":"20px"}} data-i18n="support.submit_btn" aria-label="Submit Ticket">{"Submit Ticket"}</Localized>
            </form>
        </div>

        <Localized as="h2" translationKey="support.history_title" style={{"marginBottom":"20px"}} data-i18n="support.history_title">{"Your History"}</Localized>
        <div id="ticketList" className="ticket-list">
            <Localized as="p" translationKey="support.loading" style={{"color":"gray","textAlign":"center"}} data-i18n="support.loading">{"Loading tickets..."}</Localized>
        </div>
    </div>); }
