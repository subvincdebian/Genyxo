'use client';
import type { SyntheticEvent } from 'react';
import { Localized } from '@/features/language';
export function DashboardAdminNavbar({}: {dispatch:(name:string,event:SyntheticEvent<Element>)=>unknown}) { return (<nav className="admin-navbar animate-item">
        <div className="nav-left">
            <button className="sidebar-toggle-btn" id="sidebarToggle" aria-label="Open Menu">
                <i className="fas fa-bars"></i>
            </button>
            <a href="/index.html" style={{"textDecoration":"none","color":"#fff","display":"flex"}}>
            <div className="nav-logo">
                <img src="/images/logo.svg" width="30" height="30" alt="Logo" />
                <span>{"Genyxo "}<span style={{"color":"#10e6cc"}}>{"Admin"}</span></span>
            </div>
            </a>
        </div>
        
        <div className="nav-right">
            <div className="profile-container">

                <button className="profile-toggle-btn" id="profileToggle" aria-label="Login / Signup">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=User" className="nav-avatar-small" id="navAvatarImg" alt="Avatar" />
                </button>
                
                <div className="profile-dropdown glass-card" id="profileDropdown">
                    <button className="close-profile-panel" aria-label="Close Profile Dropdown" id="closeProfilePanel">{"✕"}</button>
                    
                    <div className="dropdown-header">
                        <div className="user-details">
                            <img src="" alt="Avatar" className="avatar-big dropdown-avatar" id="dropdownAvatars" />
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
                        <div className="credits-meta">{"\n                            Available Balance\n                        "}</div>
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
    </nav>); }
