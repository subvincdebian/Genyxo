'use client';
import type { SyntheticEvent } from 'react';

export function ChatSearchChatsModal({}: {dispatch:(name:string,event:SyntheticEvent<Element>)=>unknown}) { return (<div id="searchChatsModal" className="search-modal-overlay">
        <div className="search-modal-window">
            <div className="search-modal-header">
                <span className="search-modal-title">{"Search history"}</span>
                <button className="search-close-btn" id="closeSearchModal"><i className="fa-solid fa-xmark"></i></button>
            </div>

            <div className="search-input-container">
                <i className="fa-solid fa-magnifying-glass"></i>
                <input type="text" id="modalSearchInput" placeholder="Find previous chats..." autoComplete="off" />
            </div>

            <ul className="search-results-list" id="modalSearchResults">
                </ul>
            <div id="searchNoResults" className="search-no-results">{"No chats found matching your search."}</div>

            <div className="search-modal-footer">
                <button className="modal-new-chat-btn" id="modalNewChatBtn">
                    <i className="fa-solid fa-plus"></i>{" Start New Chat\n                "}</button>
            </div>
        </div>
    </div>); }
