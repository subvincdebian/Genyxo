'use client';
import type { SyntheticEvent } from 'react';
import { Localized } from '@/features/language';
export function HomeNavbar({dispatch}: {dispatch:(name:string,event:SyntheticEvent<Element>)=>unknown}) { return (<nav className="navbar">
        <div className="nav-container">
            <div className="burger" id="burger">
                <span></span>
                <span></span>
                <span></span>
            </div>

            <div className="left-side">
                <div className="nav-logo">
                    <img src="/images/logo.svg" width="40" height="40" fetchPriority="high" className="logo-icon" alt="Logo" />
                    <span>{"Genyxo"}</span>
                </div>
                    
                <div className="search-container">
                    <div className="search-box">
                        <input type="text" style={{"display":"none"}} autoComplete="username" />
                        <input type="password" style={{"display":"none"}} autoComplete="current-password" />
                        <Localized as="input" translationKey="nav.search_placeholder" type="text" className="search-input" data-i18n="nav.search_placeholder" placeholder="Search products..." autoComplete="off" autoCapitalize="none" spellCheck="false" name="search-field-xyz" />
                        
                        <button className="search-btn" aria-label="Search Button">
                            <i className="fas fa-search"></i>
                        </button>
                    </div>

                    <div className="search-results-dropdown" id="searchResultsDropdown">
    
                        <div id="searchDefaultState" className="search-state-view">
                            <div className="search-section-label">{"Popular packs"}</div>
                            <div id="defaultSearchList">
                                </div>
                            
                            <div className="search-categories-grid">
                                <button className="search-category-btn" onClick={event => dispatch("home-0", event)}>
                                    <i className="fas fa-box"></i>{"\n                                    Credit Packages\n                                "}</button>
                                <button className="search-category-btn" onClick={event => dispatch("home-1", event)}>
                                    <i className="fas fa-robot"></i>{"\n                                    AI Models\n                                "}</button>
                                <button className="search-category-btn" onClick={event => dispatch("home-2", event)}>
                                    <i className="fas fa-bolt"></i>{"\n                                    Quick Actions\n                                "}</button>
                            </div>
                        </div>

                        <div id="searchResultsState" className="search-state-view" style={{"display":"none"}}></div>
                    </div>
                </div>
            </div>

            <div className="right-side">
                <div className="nav-links">
                    <Localized as="a" translationKey="nav.home" href="#home" className="nav-link active" data-i18n="nav.home" aria-label="Home Page">{"Home"}</Localized>
                    <Localized as="a" translationKey="nav.products" href="#products" className="nav-link" data-i18n="nav.products" aria-label="Product Section">{"Products"}</Localized>
                    <Localized as="a" translationKey="nav.chat" href="/chat.html" className="nav-link" data-i18n="nav.chat" aria-label="Chat Page">{"Chat"}</Localized>
                    <Localized as="a" translationKey="nav.about" href="#about" className="nav-link" data-i18n="nav.about" aria-label="About Us">{"About Us"}</Localized>
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
                                    <p id="menuEmail">{"loading@gmail.com"}</p>
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

                            <a href="/notifications.html" className="menu-item" id="menuNotificationsLink" style={{"justifyContent":"space-between"}} aria-label="Notifications">
                                <div style={{"display":"flex","alignItems":"center"}}>
                                    <i className="fas fa-bell"></i> 
                                    <Localized as="span" translationKey="menu.notifications" data-i18n="menu.notifications">{"Notifications"}</Localized>
                                </div>
                                <span id="notificationBadge" className="nav-badge" style={{"display":"none"}}>{"0"}</span>
                            </a>

                            <a href="/support.html" className="menu-item" aria-label="Help Center">
                                <i className="fas fa-question-circle"></i> <Localized as="span" translationKey="menu.help" data-i18n="menu.help">{"Help Center"}</Localized>
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
                                <i className="fas fa-sign-out-alt"></i> <Localized as="span" translationKey="logout" data-i18n="logout">{"Log out"}</Localized>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </nav>); }
