'use client';
import type { SyntheticEvent } from 'react';
import { Localized } from '@/features/language';
export function AdminNavbar({dispatch}: {dispatch:(name:string,event:SyntheticEvent<Element>)=>unknown}) { return (<nav className="navbar">
        <div className="nav-container">

            <div className="nav-logo">
                <a href="/index.html" aria-label="Home Page" style={{"textDecoration":"none","color":"white","display":"flex","alignItems":"center","gap":"10px"}}>
                    <img src="/images/logo.svg" width="40" height="40" fetchPriority="high" className="logo-icon" alt="Logo" />
                    <span>{"Genyxo"}</span>
                </a>
            </div>
            
            <div className="right-side">
                <div className="nav-links">
                    <Localized as="a" translationKey="nav.home" href="/index.html" className="nav-link" data-i18n="nav.home" aria-label="Back To Home">{"Home"}</Localized>
                    <Localized as="a" translationKey="nav.chat" href="/chat.html" className="nav-link" data-i18n="nav.chat" aria-label="Chat Page">{"Chat"}</Localized>
                </div>

                <div className="profile-container">
                    <button className="login-btn profile-toggle-btn" id="loginBtn" aria-label="Profile">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" className="nav-avatar-small" id="navAvatar" alt="Avatar" />
                        <i className="fas fa-user" id="navIcon" style={{"display":"none"}}></i>
                        <span id="navUsername">{"Admin"}</span>
                    </button>
                    
                    <div className="profile-dropdown glass" id="profilePanel">
                        
                        <div className="dropdown-header">
                            <div className="user-details">
                                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" alt="Avatar" className="avatar-big dropdown-avatar" />
                                <div className="user-text">
                                    <h3 id="menuName">{"Admin User"}</h3>
                                    <p id="menuEmail">{"admin@genyxo.com"}</p>
                                </div>
                            </div>
                            <span className="badge badge-admin">{"ADMIN"}</span>
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
                            <a href="#" className="menu-item" aria-label="Change Language" onClick={event => dispatch("admin-0", event)}>
                                <i className="fas fa-globe"></i> <Localized as="span" translationKey="menu.language" data-i18n="menu.language">{"Language"}</Localized>
                                <span className="lang-val">{">"}</span>
                            </a>

                            <a href="mailto:info@genyxo.com" className="menu-item" aria-label="Contact Us">
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
