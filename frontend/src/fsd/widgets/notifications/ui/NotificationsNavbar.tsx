'use client';
import type { SyntheticEvent } from 'react';
import { Localized } from '@/features/language';
export function NotificationsNavbar({}: {dispatch:(name:string,event:SyntheticEvent<Element>)=>unknown}) { return (<nav className="navbar">
        <div className="nav-container">
            <div className="nav-logo">
                <a href="/index.html" aria-label="Home Page" style={{"textDecoration":"none","color":"inherit","display":"flex","gap":"0.5rem","alignItems":"center"}}>
                    <img src="/images/logo.svg" width="40" height="40" fetchPriority="high" className="logo-icon" alt="Logo" />
                    <span>{"Genyxo"}</span>
                </a>
            </div>
            
            <div className="right-side">
                <div className="nav-links">
                    <Localized as="a" translationKey="nav.back_home" href="/index.html" className="nav-link active" data-i18n="nav.back_home" aria-label="Back To Home">{"Back To Home"}</Localized>
                    <Localized as="a" translationKey="nav.chat" href="/chat.html" className="nav-link" data-i18n="nav.chat" aria-label="Chat Page">{"Chat"}</Localized>
                </div>
                <div className="profile-container">
                    <button className="login-btn" id="loginBtn" aria-label="Register / Login">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" width="40" height="40" className="nav-avatar-small" id="navAvatar" style={{"display":"none"}} alt="Avatar" />
                        <i className="fas fa-user" id="navIcon"></i>
                        <Localized as="span" translationKey="nav.login" id="navUsername" data-i18n="nav.login">{"Register / Login"}</Localized>
                    </button>
                    
                    <div className="profile-dropdown glass" id="profilePanel">
                        <button className="close-profile-panel" id="closeProfilePanel" aria-label="Close Profile Dropdown">{"✕"}</button>
                        
                        <div className="dropdown-header">
                            <div className="user-details">
                                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="Avatar" width="48" height="48" className="avatar-big dropdown-avatar" />
                                <div className="user-text">
                                    <h3 id="menuName">{"Loading..."}</h3>
                                    <p id="menuEmail">{"loading@email.com"}</p>
                                </div>
                            </div>
                        </div>

                        <div className="credits-card">
                            <div className="credits-top">
                                <div className="credits-amount">
                                    <span className="icon-flask">{"🪙"}</span>
                                    <span className="amount-number" id="menuCredits">{"70"}</span>
                                    <i className="fas fa-info-circle info-icon" id="openFaqBtn" title="Details"></i>
                                </div>
                            </div>
                            <a href="/index.html#products" style={{"textDecoration":"none"}} aria-label="Buy Credits">
                                <button className="upgrade-full-btn" aria-label="Buy Credits">{"Buy Credits"}</button>
                            </a>
                        </div>

                        <div className="dropdown-menu">

                            <a href="/profile.html" className="menu-item" aria-label="Profile">
                                <i className="fas fa-user-cog"></i> <Localized as="span" translationKey="menu.profile" data-i18n="menu.profile">{"Profile"}</Localized>
                            </a>

                            <a href="/notifications.html" className="menu-item" id="menuNotificationsLink" aria-label="Notifications" style={{"justifyContent":"space-between"}}>
                                <div style={{"display":"flex","alignItems":"center"}}>
                                    <i className="fas fa-bell"></i> 
                                    <Localized as="span" translationKey="menu.notifications" data-i18n="menu.notifications">{"Notifications"}</Localized>
                                </div>
                                <span id="notificationBadge" className="nav-badge" style={{"display":"none"}}>{"0"}</span>
                            </a>

                            <a href="/support.html" className="menu-item" aria-label="Help Center">
                                <i className="fas fa-question-circle"></i> <Localized as="span" translationKey="menu.help" data-i18n="menu.help">{"Help Center"}</Localized>
                            </a>

                            <a href="#" className="menu-item" id="langMenuBtn" aria-label="Change Language">
                                <i className="fas fa-globe"></i> <Localized as="span" translationKey="menu.language" data-i18n="menu.language">{"Language"}</Localized>
                                <Localized as="span" translationKey="menu.language" className="lang-val" id="currentLangDisplay">{"English >"}</Localized>
                            </a>

                            <a href="/info@genyxo.com" className="menu-item" aria-label="Contact Us">
                                <i className="fas fa-envelope"></i> <Localized as="span" translationKey="menu.contact" data-i18n="menu.contact">{"Contact us"}</Localized>
                                <i className="fas fa-arrow-up-right-from-square" style={{"color":"var(--text-gray)","marginLeft":"8px","fontSize":"0.95rem","position":"relative","left":"120px"}} title="Mail us"></i>
                            </a>
                            
                        </div>

                        <div className="dropdown-footer">
                            <button className="menu-item logout-item" id="dropdownLogoutBtn" aria-label="Log out">
                                <i className="fas fa-sign-out-alt"></i> <Localized as="span" translationKey="menu.logout" data-i18n="menu.logout">{"Log out"}</Localized>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    </nav>); }
