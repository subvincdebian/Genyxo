'use client';
import type { SyntheticEvent } from 'react';
import { Localized } from '@/features/language';
export function HomeDemoChatModal({}: {dispatch:(name:string,event:SyntheticEvent<Element>)=>unknown}) { return (<div id="demoChatModal" className="demo-modal-overlay">
        <div className="demo-modal-content">
            <div className="demo-modal-header">
                <div className="demo-header-info">
                    <div className="demo-ai-avatar">
                        <i className="fas fa-bolt"></i>
                    </div>
                    <div className="demo-header-text">
                        <Localized as="h3" translationKey="demo.title" data-i18n="demo.title">{"Genyxo Flash (Free)"}</Localized>
                        <span className="demo-status">{"Online"}</span>
                    </div>
                </div>
                <button id="closeDemoBtn" className="demo-close-btn">
                    <i className="fas fa-times"></i>
                </button>
            </div>

            <div id="demoChatHistory" className="demo-chat-history">
                <div className="demo-message ai-message">
                    <p>{"Hello! I am a free Genyxo demo model. Send me a message to test how fast and smart I am before you get your credits! 🚀"}</p>
                </div>
            </div>

            <div className="demo-chat-input-area">
                <input type="text" id="demoChatInput" placeholder="Type your message..." autoComplete="off" />
                <button id="demoSendBtn" className="demo-send-btn">
                    <i className="fas fa-paper-plane"></i>
                </button>
            </div>
        </div>
    </div>); }
