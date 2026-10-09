'use client';
import type { SyntheticEvent } from 'react';
import { Localized } from '@/features/language';
export function ChatApp({dispatch}: {dispatch:(name:string,event:SyntheticEvent<Element>)=>unknown}) { return (<div className="app-container" id="app">
        <aside id="sidebar">
            <div className="sidebar-full" id="sidebarOverlay">
                <div className="sb-header">
                    <div className="sb-logo-area">
                        <div className="logo-circle">
                            <a href="/index.html" aria-label="Genyxo Home" style={{"textDecoration":"none","color":"inherit","display":"flex","gap":"0.5rem","alignItems":"center","cursor":"pointer"}}>
                                <img src="/images/logo.svg" width="24" height="24" fetchPriority="high" className="chat-logo-icon" alt="Logo" />
                            </a>
                        </div>
                        <span>{"Genyxo AI"}</span>
                    </div>
                    <button className="icon-btn" onClick={event => dispatch("chat-0", event)} data-tooltip="Close Sidebar" style={{"border":"none","width":"32px","height":"32px"}}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M9 3v18"></path></svg>
                    </button>
                </div>

                <div className="sb-actions">
                    <button className="icon-btn new-chat" onClick={event => dispatch("chat-1", event)}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"></path></svg>
                        <Localized as="span" translationKey="chat.new_chat" data-i18n="chat.new_chat">{"New Chat"}</Localized>
                    </button>
                    <button className="icon-btn" data-tooltip="Search" id="searchChatsBtn">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
                    </button>
                    <button className="icon-btn" data-tooltip="Archive">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 8-6 4 6 4V8Z"></path><rect width="14" height="12" x="2" y="6" rx="2"></rect></svg>
                    </button>
                </div>

                <div className="history-container">
                    <div className="history-list" id="historyList">
                        <Localized as="div" translationKey="chat.no_history" style={{"fontSize":"0.85rem","color":"#666","padding":"10px 0"}} data-i18n="chat.no_history">{"No messages yet"}</Localized>
                    </div>
                </div>

                <div className="sidebar-footer">
                    <div className="settings-wrapper">
                        <div className="gemini-menu glass">
                            <a href="#" className="gemini-menu-item">
                                <i className="fas fa-history"></i>
                                <span>{"Action History"}</span>
                            </a>
                            <div className="menu-item-wrapper">
                                <a href="#" className="gemini-menu-item" onClick={event => dispatch("chat-2", event)}> <i className="fas fa-magic"></i> <span>{"Theme"}</span>
                                    <i className="fas fa-chevron-right chevron-right"></i> 
                                </a>

                                <div className="theme-submenu" id="themeMenu">
                                    
                                    <div className="submenu-item" onClick={event => dispatch("chat-3", event)} id="theme-system">
                                        <span>{"System"}</span>
                                        <i className="fas fa-check check-icon"></i>
                                    </div>

                                    <div className="submenu-item" onClick={event => dispatch("chat-4", event)} id="theme-dark">
                                        <span>{"Dark"}</span>
                                        <i className="fas fa-check check-icon"></i>
                                    </div>

                                    <div className="submenu-item" onClick={event => dispatch("chat-5", event)} id="theme-light">
                                        <span>{"Light"}</span>
                                        <i className="fas fa-check check-icon"></i>
                                    </div>
                                </div>
                            </div>
                            <a href="/support.html" className="gemini-menu-item">
                                <i className="fas fa-question-circle"></i>
                                <span>{"Help Center"}</span>
                            </a>
                            <a href="mailto:info@genyxo.com" className="gemini-menu-item">
                                <i className="fas fa-question-circle"></i>
                                <span>{"Send Feedback"}</span>
                            </a>
                            <div className="menu-divider"></div>
                                <div className="sb-section" style={{"marginTop":"20px"}}>
                                    <h4 style={{"fontSize":"12px","color":"#888","textTransform":"uppercase","marginBottom":"10px","paddingLeft":"10px"}}>{"Reference"}</h4>
                                    
                                    <button className="sidebar-btn" onClick={event => dispatch("chat-6", event)}>
                                        <i className="fas fa-shield-alt"></i>
                                        <span>{"Privacy Policy"}</span>
                                    </button>
                                    
                                    <button className="sidebar-btn" onClick={event => dispatch("chat-7", event)}>
                                        <i className="fas fa-file-contract"></i>
                                        <span>{"Terms of Service"}</span>
                                    </button>
                                    
                                    <button className="sidebar-btn" id="openFaqBtn">
                                        <i className="fas fa-question-circle"></i>
                                        <span>{"FAQ"}</span>
                                    </button>
                                </div>
                        </div>

                        <button className="sidebar-btn settings-trigger">
                            <i className="fas fa-bars"></i> <span className="link-text">{"Menu"}</span>
                        </button>
                    </div>  
                </div>
            </div>

            <div className="sidebar-mini">
                <div className="mini-btn logo-toggle" onClick={event => dispatch("chat-8", event)} data-tooltip="Open Sidebar">
                    <div className="logo-circle">
                        <img src="/images/logo.svg" width="24" height="24" fetchPriority="high" className="logo-icon mini-sidebar-logo" alt="Logo" />
                    </div>
                    <div className="icon-alt">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M9 3v18"></path></svg>
                    </div>
                </div>

                <div className="mini-btn" data-tooltip="New Chat">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"></path></svg>
                </div>

                <div className="mini-btn" id="railSearchBtn" data-tooltip="Search">
                    <svg className="mini-sidebar-search-btn" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
                </div>

                <div style={{"marginTop":"auto","display":"flex","flexDirection":"column","alignItems":"center"}}>
                    <div className="mini-btn" data-tooltip="Shop">
                        <a className="shop-btn-icon" href="/index.html#products">   
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="8" cy="21" r="1"></circle><circle cx="19" cy="21" r="1"></circle><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"></path></svg>
                        </a> 
                    </div>
                    <div className="sidebar-footer">
                        <div className="settings-wrapper" data-tooltip="Menu">
                            <div className="gemini-menu glass">
                                <a href="#" className="gemini-menu-item">
                                    <i className="fas fa-history"></i>
                                    <span>{"Action History"}</span>
                                </a>
                                <div className="menu-item-wrapper">
                                    <a href="#" className="gemini-menu-item" onClick={event => dispatch("chat-9", event)}> <i className="fas fa-magic"></i> <span>{"Theme"}</span>
                                        <i className="fas fa-chevron-right chevron-right"></i> </a>

                                    <div className="theme-submenu" id="themeMenu">
                                        
                                        <div className="submenu-item" onClick={event => dispatch("chat-10", event)} id="theme-system">
                                            <span>{"System"}</span>
                                            <i className="fas fa-check check-icon"></i>
                                        </div>

                                        <div className="submenu-item" onClick={event => dispatch("chat-11", event)} id="theme-dark">
                                            <span>{"Dark"}</span>
                                            <i className="fas fa-check check-icon"></i>
                                        </div>

                                        <div className="submenu-item" onClick={event => dispatch("chat-12", event)} id="theme-light">
                                            <span>{"Light"}</span>
                                            <i className="fas fa-check check-icon"></i>
                                        </div>
                                    </div>
                                </div>
                                <a href="/support.html" className="gemini-menu-item">
                                    <i className="fas fa-question-circle"></i>
                                    <span>{"Help Center"}</span>
                                </a>
                                <a href="mailto:info@genyxo.com" className="gemini-menu-item">
                                    <i className="fas fa-question-circle"></i>
                                    <span>{"Send Feedback"}</span>
                                </a>
                                <div className="menu-divider"></div>
                                <div className="sb-section" style={{"marginTop":"20px"}}>
                                    <h4 style={{"fontSize":"12px","color":"#888","textTransform":"uppercase","marginBottom":"10px","paddingLeft":"10px"}}>{"Reference"}</h4>
                                    
                                    <button className="sidebar-btn sidebar-mini-preference-btn" onClick={event => dispatch("chat-13", event)}>
                                        <i className="fas fa-shield-alt"></i>
                                        <span>{"Privacy Policy"}</span>
                                    </button>
                                    
                                    <button className="sidebar-btn sidebar-mini-preference-btn" onClick={event => dispatch("chat-14", event)}>
                                        <i className="fas fa-file-contract"></i>
                                        <span>{"Terms of Service"}</span>
                                    </button>
                                    
                                    <button className="sidebar-btn sidebar-mini-preference-btn" id="openFaqBtn">
                                        <i className="fas fa-question-circle"></i>
                                        <span>{"FAQ"}</span>
                                    </button>
                                </div>
                            </div>
                            <button className="sidebar-btn settings-trigger">
                                <i className="fas fa-bars"></i> <span className="link-text">{"Menu"}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </aside>

        <div className="sidebar-overlay" id="sidebar-overlay"></div>

        <main className="main-container">
            <header>
                <div className="header-left">
                    <button className="mobile-menu-btn" id="sidebarToggle" aria-label="Toggle menu">
                        <i className="fa-solid fa-bars-staggered"></i>
                    </button>
                </div>

                <div className="model-select-wrapper model-selector" id="model-selector">
                        <i className=" fa-solid fas fa-robot bot-icon-to-hide" style={{"color":"#10e6cc"}}></i>

                        <div className="custom-select" id="customModelSelect" tabIndex={0} aria-haspopup="listbox" aria-expanded="false">
                            <span className="current-model-name">{"GPT-4o (40 cr)"}</span>
                            <i className="fas fa-chevron-down caret"></i>
                            <ul className="custom-options" role="listbox"></ul>
                        </div>

                        <select id="modelSelect" style={{"display":"none"}} defaultValue="arcee-ai/trinity-large-preview:free">
                            <option value="arcee-ai/trinity-large-preview:free">{"Arcee (Free)"}</option>
                            <option value="openai/gpt-oss-120b:free">{"ChatGPT OSS"}</option>
                            <option value="google/gemini-3.5-flash">{"Gemini 3.5 Flash"}</option>
                            <option value="google/gemini-3.5-live-translate-preview">{"Gemini 3.5 Live Translate"}</option>
                            <option value="google/gemini-3.1-flash-lite">{"Gemini 3.1 Flash"}</option>
                            <option value="google/gemini-2.5-pro">{"Gemini 2.5 Pro"}</option>
                            <option value="google/gemini-2.5-flash">{"Gemini 2.5 Flash"}</option>
                            <option value="google/gemini-2.5-flash-native-audio-preview-12-2025">{"Gemini 2.5 Flash Audio"}</option>
                            <option value="google/gemini-embedding-2">{"Gemini Embedding 2"}</option>
                            <option value="google/gemini-robotics-er-1.6-preview">{"Gemini Robotics-ER 1.6"}</option>
                            <option value="meta-llama/llama-3.3-70b-instruct:free">{"Llama 3.3"}</option>
                            <option value="qwen/qwen3-next-80b-a3b-instruct:free">{"QWEN 3"}</option>
                            <option value="google/gemma-4-31b-it:free">{"Gemma 4"}</option>
                            <option value="openai/gpt-5.1">{"ChatGPT-5.1 (150 cr)"}</option>
                            <option value="openai/gpt-5-mini">{"ChatGPT-5 (70 cr)"}</option>
                            <option value="openai/gpt-5-nano">{"ChatGPT-5 Mini (45 cr)"}</option>
                            <option value="openai/gpt-4.1">{"ChatGPT-4.1 (55 cr)"}</option>
                            <option value="openai/gpt-4.1-mini">{"ChatGPT-4 Mini (25 cr)"}</option>
                            <option value="openai/gpt-4o">{"ChatGPT-4o (40 cr)"}</option>
                            <option value="openai/gpt-4o-mini">{"ChatGPT-4o Mini (20 cr)"}</option>
                            <option value="openai/o1-preview">{"ChatGPT-o1 (100 cr)"}</option>
                            <option value="openai/o3-reasoning">{"ChatGPT-o3 Reasoning (150 cr)"}</option>
                            <option value="anthropic/claude-sonnet-4.6">{"Claude-Sonnet 4.6 (100 cr)"}</option>
                            <option value="anthropic/claude-sonnet-4.5">{"Claude-Sonnet 4.5 (90 cr)"}</option>
                            <option value="anthropic/claude-opus-4.6">{"Claude-Opus 4.6 (150 cr)"}</option>
                            <option value="anthropic/claude-opus-4.5">{"Claude-Opus 4.5 (140 cr)"}</option>
                            <option value="anthropic/claude-haiku-4.5">{"Claude-Haiku 4.5 (50 cr)"}</option>
                            <option value="anthropic/claude-3-haiku">{"Claude-Haiku 3 (30 cr)"}</option>
                            <option value="openai/dall-e-3">{"DALL-E Image (120 cr)"}</option>
                            <option value="kling-video">{"Kling Video (500 cr)"}</option>
                        </select>
                </div>

                <div className="header-actions">

                    <div className="header-right">
                        <div className="credits-display" id="credits-btn">
                            <button id="creditsBtn" className="creditsBtn primary" aria-label="Get More Credits" onClick={event => dispatch("chat-15", event)} style={{"cursor":"default","background":"rgba(255,255,255,0.1)","color":"white","border":"1px solid rgba(255,255,255,0.2)","minWidth":"auto","padding":"0.5rem 1rem"}}>
                                <i className="fas fa-coins" style={{"color":"#ffd700"}}></i> 
                                <span id="creditBalance">{"0"}</span>{" Credits"}<span className="credits-cta hide-on-mobile credits-text">{" - Get more"}</span>
                            </button>
                        </div>

                        <div className="profile-container profile-trigger" id="profile-trigger" style={{"display":"flex","gap":"10px","alignItems":"center"}}>

                            <button className="login-btn chat-auth-btn" id="loginBtn" aria-label="Register / Login">
                                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=User" width="40" height="40" className="nav-avatar-small" id="navAvatar" alt="Avatar" />
                                <i className="fas fa-user" id="navIcon"></i>
                                <span id="navUsername">{"Register / Login"}</span>
                            </button>
                            
                            <div className="profile-dropdown glass" id="profilePanel">
                                <button className="close-profile-panel" aria-label="Close Profile Dropdown" id="closeProfilePanel">{"✕"}</button>
                                
                                <div className="dropdown-header">
                                    <div className="user-details">
                                        <img src="" alt="Avatar" width="48" height="48" className="avatar-big dropdown-avatar" id="dropdownAvatars" />
                                        <div className="user-text">
                                            <h3 id="menuName">{"Loading..."}</h3>
                                            <p id="menuEmail">{"loading@gmail.com"}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="credits-card">
                                    <div className="credits-top">
                                        <div className="credits-amount">
                                            <span className="icon-flask">{"🪙"}</span>
                                            <span className="amount-number" id="menuCredits">{"0"}</span>
                                            <i className="fas fa-info-circle info-icon" id="openFaqBtn" title="Details"></i>
                                        </div>
                                    </div>
                                    <div className="credits-meta">{"\n                                        Available Balance\n                                    "}</div>
                                    <a href="/index.html#products" style={{"textDecoration":"none"}} aria-label="Buy Credits">
                                        <button className="upgrade-full-btn" aria-label="Buy Credits">{"Buy Credits"}</button>
                                    </a>
                                </div>

                                <div className="dropdown-menu">
                                    <a href="/profile.html" className="menu-item" aria-label="Profile">
                                        <i className="fas fa-user-cog"></i> <span>{"Profile"}</span>
                                    </a>

                                    <a href="/notifications.html" className="menu-item" id="menuNotificationsLink" style={{"justifyContent":"space-between"}} aria-label="Notifications">
                                        <div style={{"display":"flex","alignItems":"center"}}>
                                            <i className="fas fa-bell"></i> 
                                            <Localized as="span" translationKey="menu.notifications" data-i18n="menu.notifications">{"Notifications"}</Localized>
                                        </div>
                                        <span id="notificationBadge" className="nav-badge" style={{"display":"none"}}>{"0"}</span>
                                    </a>

                                    <a href="/support.html" className="menu-item" aria-label="Help Center">
                                        <i className="fas fa-question-circle"></i> <span>{"Help Center"}</span>
                                    </a>

                                    <a href="#" className="menu-item" aria-label="Change Language">
                                        <i className="fas fa-globe"></i> <Localized as="span" translationKey="menu.language" data-i18n="menu.language">{"Language"}</Localized>
                                        <Localized as="span" translationKey="menu.language" className="lang-val" id="currentLangDisplay">{"English >"}</Localized>
                                    </a>

                                    <a href="mailto:info@genyxo.com" className="menu-item" aria-label="Contact Us">
                                        <i className="fas fa-envelope"></i> <Localized as="span" translationKey="menu.contact" data-i18n="menu.contact">{"Contact us"}</Localized>
                                        <i className="fas fa-arrow-up-right-from-square" style={{"color":"var(--text-gray)","marginLeft":"8px","fontSize":"0.95rem","position":"relative","left":"120px"}} title="Mail us"></i>
                                    </a>

                                </div>

                                <div className="dropdown-footer">
                                    <button className="menu-item logout-item" aria-label="Log out" id="dropdownLogoutBtn">
                                        <i className="fas fa-sign-out-alt"></i> <span>{"Log out"}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </header>
            <div id="chatContainer">
                <div className="welcome-container" id="welcomeScreen">
                    <div className="logo-wrapper">
                        <div className="glow-effect"></div>
                        <div className="logo-inner">
                            <img className="welcome-logo-genyxo" src="/images/logo.svg" width="46" height="46" fetchPriority="high" alt="Logo" />
                        </div>
                    </div>
                    <h1 className="welcome-text">{"Hi, I'm "}<span className="text-gradient">{"Genyxo"}</span></h1>
                    <p className="welcome-subtext">{"How can I help you today?"}</p>
                    <div className="features-grid">
                        <div className="feature-card" onClick={event => dispatch("chat-16", event)}>
                            <i className="fas fa-image cyan-icon"></i>
                            <span>{"Image Generation"}</span>
                        </div>
                        <div className="feature-card" onClick={event => dispatch("chat-17", event)}>
                            <i className="fas fa-code cyan-icon"></i>
                            <span>{"Code Assistant"}</span>
                        </div>
                        <div className="feature-card" onClick={event => dispatch("chat-18", event)}>
                            <i className="fas fa-video cyan-icon"></i>
                            <span>{"Video Creation"}</span>
                        </div>
                    </div>
                </div>

                <div className="messages-container" id="chatBox">
                </div>

                <div className="typing-indicator" id="typingIndicator">
                    <div className="dot"></div><div className="dot"></div><div className="dot"></div>
                </div>

                <div className="chat-input-container">
                    <div className="input-wrapper" id="dropZone">
                        <div id="dropOverlay" className="drop-overlay">
                            <div className="drop-message">
                                <i className="fas fa-cloud-upload-alt"></i> 
                                <span>{"Drop the file here"}</span>
                                <span>{"Drop up to 5 files (max 50MB)"}</span>
                            </div>
                        </div>

                        <div className="unified-preview-area" id="unifiedPreviewArea">
                            <div className="preview-scroll-container">
                                <div id="allPreviewItems" className="all-preview-items"></div>
                            </div>
                        </div>

                        <div className="input-form-wrapper">
                            <form className="input-form" id="chatForm">
                                <div className="attachment-menu" id="attachmentMenu">
                                    <label className="plus-menu-item">
                                        <i className="fas fa-image cyan-icon"></i>
                                        <span className="text-box">{"Add Photo"}</span>
                                        <input type="file" accept="image/*" multiple={true} hidden={true} id="photoInput" />
                                    </label>
                                    <label className="plus-menu-item">
                                        <i className="fas fa-file-alt cyan-icon"></i>
                                        <span className="text-box">{"Add Files"}</span>
                                        <input type="file" accept=".docx,.pdf,.txt,.html,.htm,.css,.js,.mjs,.cjs,.ts,.jsx,.tsx,.py,.cpp,.cxx,.cc,.c,.h,.hpp,.java,.cs,.go,.rs,.php,.rb,.swift,.kt,.dart,.json,.xml,.md,.csv,.sql,.sh,.ps1,.yaml,.yml,text/*,application/pdf,application/json" multiple={true} hidden={true} id="fileInput" />
                                    </label>
                                </div>  

                                <button type="button" className="plus-btn" id="plusBtn" data-tooltip="Add Files">
                                    <i className="fas fa-plus"></i>
                                </button>
                                
                                <div className="input-content">
                                    <div className="textarea-wrapper">
                                        <textarea id="userInput" placeholder="Message Genyxo..." rows={1} defaultValue="" />
                                    </div>
                                </div>

                                <button type="submit" className="send-btn" id="sendBtn">
                                    <i className="fas fa-arrow-up"></i>
                                </button>
                            </form>
                        </div>
                    </div>
                    <div className="footer-text">{"AI is smart, but not perfect. Double-check important info!"}</div>
                </div>
            </div>
        </main>
    </div>); }
