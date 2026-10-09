'use client';
import type { SyntheticEvent } from 'react';
import { Localized } from '@/features/language';
export function NotificationsNotifContainer({dispatch}: {dispatch:(name:string,event:SyntheticEvent<Element>)=>unknown}) { return (<div className="notif-container">
        <div className="header-flex">
            <Localized as="h1" translationKey="notifications.header_title" data-i18n="notifications.header_title">
                <i className="fas fa-bell"></i>
                <span>{"Your Notifications"}</span>
            </Localized>
            <button className="mark-all-btn" aria-label="Mark All Read" onClick={event => dispatch("notifications-0", event)}>
                <i className="fas fa-check-double"></i> <Localized as="span" translationKey="notifications.mark_all_btn" data-i18n="notifications.mark_all_btn">{"Mark all read"}</Localized>
            </button>
        </div>

        <div id="notifList">
            <Localized as="p" translationKey="notifications.loading" style={{"textAlign":"center","color":"#666"}} data-i18n="notifications.loading">{"Loading notifications..."}</Localized>
        </div>
    </div>); }
