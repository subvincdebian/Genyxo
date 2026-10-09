'use client';
import type { SyntheticEvent } from 'react';
import { Localized } from '@/features/language';
export function AdminAdminContainer({dispatch}: {dispatch:(name:string,event:SyntheticEvent<Element>)=>unknown}) { return (<div className="admin-container">
        <Localized as="h1" translationKey="admin.system_mgmt" style={{"color":"white","marginBottom":"2rem"}} data-i18n="admin.system_mgmt">{"System Management"}</Localized>

        <div className="glass" style={{"padding":"25px","marginBottom":"30px"}}>
            <div className="section-header">
                <h2><i className="fas fa-users"></i> <Localized as="span" translationKey="admin.users_title" data-i18n="admin.users_title">{"Users"}</Localized></h2>
                <button onClick={event => dispatch("admin-1", event)} className="action-btn" aria-label="Refresh">
                    <i id="refreshIconUsers" className="fas fa-sync"></i> <Localized as="span" translationKey="admin.refresh" data-i18n="admin.refresh">{"Refresh"}</Localized>
                </button>
            </div>
            <div className="search-container" style={{"margin":"20px 0","display":"flex","gap":"10px"}}>
                <input type="text" id="userSearchInput" onKeyUp={event => dispatch("admin-2", event)} placeholder="Search users by email or nickname..." style={{"padding":"12px","borderRadius":"8px","border":"1px solid #333","background":"#1a1a1a","color":"#fff","flexGrow":"1"}} />
            </div>
            <table className="data-table">
                <thead>
                    <tr>
                        <th className="col-id">{"ID"}</th>
                        <th className="col-email">{"Email"}</th>
                        <th className="col-name">{"Name"}</th>
                        <th className="col-status">{"Role"}</th>
                        <th className="col-credits">{"Credits"}</th>
                        <th className="col-action">{"Action"}</th>
                    </tr>
                </thead>
                <tbody id="usersTable"></tbody>
            </table>
            <div className="pagination-controls">
                <button id="prevUserBtn" aria-label="Previous" disabled={true}><i className="fas fa-chevron-left"></i>{" Prev"}</button>
                <span id="userPageInfo">{"Page 1"}</span>
                <button id="nextUserBtn" aria-label="Next" disabled={true}>{"Next "}<i className="fas fa-chevron-right"></i></button>
            </div>
        </div>

        <div className="glass" style={{"padding":"25px"}}>
            <div className="section-header">
                <h2><i className="fas fa-receipt"></i> <Localized as="span" translationKey="admin.transactions_title" data-i18n="admin.transactions_title">{"Transactions"}</Localized></h2>
                <button onClick={event => dispatch("admin-3", event)} className="action-btn" aria-label="Refresh">
                    <i id="refreshIconUsers" className="fas fa-sync"></i> <Localized as="span" translationKey="admin.refresh" data-i18n="admin.refresh">{"Refresh"}</Localized>
                </button>
            </div>
            <table className="data-table">
                <thead>
                    <tr>
                        <th className="col-id">{"ID"}</th>
                        <th className="col-email">{"User Email"}</th>
                        <th style={{"width":"100px"}}>{"Amount"}</th>
                        <th style={{"width":"100px"}}>{"Credits"}</th>
                        <th className="col-status">{"Status"}</th>
                        <th style={{"width":"100px"}}>{"Method"}</th>
                        <th className="col-date">{"Date"}</th>
                        <th className="col-action">{"Action"}</th>
                    </tr>
                </thead>
                <tbody id="transactionsTable"></tbody>
            </table>
             <div className="pagination-controls">
                <button id="prevTxBtn" aria-label="Previous" disabled={true}><i className="fas fa-chevron-left"></i>{" Prev"}</button>
                <span id="txPageInfo">{"Page 1"}</span>
                <button id="nextTxBtn" aria-label="Next" disabled={true}>{"Next "}<i className="fas fa-chevron-right"></i></button>
            </div>
        </div>

        <div className="glass" style={{"padding":"25px"}}>
            <div className="section-header">
                <h2><i className="fas fa-history"></i> <Localized as="span" translationKey="admin.logs_title" data-i18n="admin.logs_title">{"Usage Logs"}</Localized></h2>
                <button onClick={event => dispatch("admin-4", event)} aria-label="Refresh" className="action-btn">
                    <i id="refreshIconUsers" className="fas fa-sync"></i> <Localized as="span" translationKey="admin.refresh" data-i18n="admin.refresh">{"Refresh"}</Localized>
                </button>
            </div>
            <table className="data-table">
                <thead>
                    <tr>
                        <th className="col-id">{"ID"}</th>
                        <th className="col-user">{"User"}</th>
                        <th>{"Model"}</th>
                        <th>{"Credits Change"}</th>
                        <th>{"Action"}</th>
                        <th className="col-date">{"Date"}</th>
                    </tr>
                </thead>
                <tbody id="usageTableBody"></tbody>
            </table>
             <div className="pagination-controls">
                <button id="prevTxBtn" aria-label="Previous" disabled={true}><i className="fas fa-chevron-left"></i>{" Prev"}</button>
                <span id="txPageInfo">{"Page 1"}</span>
                <button id="nextTxBtn" aria-label="Next" disabled={true}>{"Next "}<i className="fas fa-chevron-right"></i></button>
            </div>
        </div>

        <div className="glass" style={{"padding":"25px","marginTop":"30px"}}>
            <div className="section-header">
                <h2><i className="fas fa-headset"></i> <Localized as="span" translationKey="admin.tickets_title" data-i18n="admin.tickets_title">{"Support Tickets"}</Localized></h2>
                <button onClick={event => dispatch("admin-5", event)} className="action-btn" aria-label="Refresh">
                    <i id="refreshIconTickets" className="fas fa-sync"></i> <Localized as="span" translationKey="admin.refresh" data-i18n="admin.refresh">{"Refresh"}</Localized>
                </button>
            </div>
            <table className="data-table">
                <thead>
                    <tr>
                        <th className="col-id">{"ID"}</th>
                        <th className="col-email">{"User"}</th>       
                        <th className="col-subject">{"Subject"}</th>
                        <th style={{"width":"100px"}}>{"Priority"}</th>
                        <th className="col-status">{"Status"}</th>
                        <th className="col-date">{"Created At"}</th>
                        <th className="col-action">{"Action"}</th>
                    </tr>
                </thead>
                <tbody id="ticketsTableBody"></tbody>
            </table>

            <div className="pagination-controls">
                <button id="prevTicketBtn" aria-label="Previous" disabled={true}><i className="fas fa-chevron-left"></i>{" Prev"}</button>
                <span id="ticketPageInfo">{"Page 1"}</span>
                <button id="nextTicketBtn" aria-label="Next" disabled={true}>{"Next "}<i className="fas fa-chevron-right"></i></button>
            </div>
        </div>
    </div>); }
