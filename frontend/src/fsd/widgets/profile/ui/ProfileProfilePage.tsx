'use client';
import type { SyntheticEvent } from 'react';
import { Localized } from '@/features/language';
export function ProfileProfilePage({dispatch}: {dispatch:(name:string,event:SyntheticEvent<Element>)=>unknown}) { return (<div className="profile-page">

        <aside className="sidebar">
            <div className="sidebar-header">

                <div className="avatar" id="avatarPreview"></div>

                <label className="avatar-upload">
                    <input type="file" id="avatarInput" accept="image/*" />
                    <Localized as="span" translationKey="profile.change_avatar" data-i18n="profile.change_avatar">{"Change avatar"}</Localized>
                </label>

                <div className="user-info">
                    <Localized as="p" translationKey="nav.userload" className="name" id="profileName" data-i18n="nav.userload">{"Loading..."}</Localized>
                    <Localized as="p" translationKey="profile.view_profile" className="view-profile" data-i18n="profile.view_profile">{"View profile"}</Localized>
                </div>
            </div>

            <nav className="menu">

                <a href="#" className="menu-item active" data-page="page-general" aria-label="Main Section">
                    <i className="fas fa-user-circle fa-fw"></i>
                    <Localized as="span" translationKey="profile.sidebar.home" data-i18n="profile.sidebar.home">{"Home"}</Localized>
                </a>

                <a href="#" className="menu-item" data-page="page-password" aria-label="Password and Security">
                    <i className="fas fa-shield-halved fa-fw"></i> 
                    <Localized as="span" translationKey="profile.sidebar.security" data-i18n="profile.sidebar.security">{"Password and security"}</Localized>
                </a>

                <a href="#" className="menu-item" data-page="page-payment" aria-label="Payment Settings">
                    <i className="fas fa-credit-card fa-fw"></i>
                   <Localized as="span" translationKey="profile.sidebar.payment" data-i18n="profile.sidebar.payment">{"Payment settings"}</Localized>
                </a>

                <a href="#" className="menu-item" data-page="page-transactions" aria-label="Transactions">
                    <i className="fas fa-history fa-fw"></i>
                    <Localized as="span" translationKey="profile.sidebar.transactions" data-i18n="profile.sidebar.transactions">{"Transactions"}</Localized>
                </a>

                <a href="#" className="menu-item" data-page="page-affiliate" aria-label="Affiliate Program">
                    <i className="fas fa-users-gear fa-fw"></i>
                    <Localized as="span" translationKey="profile.sidebar.affiliate" data-i18n="profile.sidebar.affiliate">{"Affiliate Program"}</Localized>
                </a>

            </nav>
        </aside>

        <main className="main-content">

            <Localized as="h1" translationKey="profile.main_title" className="title" data-i18n="profile.main_title">{"Manage Account"}</Localized>

            <section className="page active content-box" id="page-general">
                <Localized as="h2" translationKey="profile.general.title" data-i18n="profile.general.title">{"Basic info"}</Localized>
                <Localized as="p" translationKey="profile.general.subtitle" className="sub" data-i18n="profile.general.subtitle">{"Edit your profile information"}</Localized>

                <form className="form">
                    <Localized as="label" translationKey="profile.general.label_name" data-i18n="profile.general.label_name">{"Full name"}</Localized>
                    <Localized as="input" translationKey="profile.general.placeholder_name" type="text" data-i18n="profile.general.placeholder_name" placeholder="John Doe" />

                    <Localized as="label" translationKey="profile.general.label_email" data-i18n="profile.general.label_email">{"Email"}</Localized>
                    <Localized as="input" translationKey="profile.general.placeholder_email" type="email" data-i18n="profile.general.placeholder_email" placeholder="your@email.com" />

                    <Localized as="label" translationKey="profile.general.label_location" data-i18n="profile.general.label_location">{"Location"}</Localized>
                    <Localized as="input" translationKey="profile.general.placeholder_location" type="text" data-i18n="profile.general.placeholder_location" placeholder="City, Country" />

                    <Localized as="button" translationKey="profile.general.save_btn" className="save-btn" data-i18n="profile.general.save_btn" aria-label="Save Changes">{"Save changes"}</Localized>
                </form>
            </section>

            <div id="page-password" className="page content-box">
                <Localized as="h2" translationKey="profile.security.title" data-i18n="profile.security.title">{"Password and Security"}</Localized>

                <div className="security-list">
                    <div className="security-card">
                        <div className="security-card__info">
                            <div className="security-card__icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                            </div>
                            <div className="security-card__text">
                                <Localized as="h3" translationKey="profile.security.change_pwd_title" data-i18n="profile.security.change_pwd_title">{"Change Password"}</Localized>
                                <Localized as="p" translationKey="profile.security.change_pwd_desc" data-i18n="profile.security.change_pwd_desc">{"Update your password regularly to keep your account protected."}</Localized>
                            </div>
                        </div>
                        <Localized as="button" translationKey="profile.security.change_pwd_btn" id="openChangePassword" className="btn btn-outline" data-i18n="profile.security.change_pwd_btn">{"Change Password"}</Localized>
                    </div>

                    <div className="security-card">
                        <div className="security-card__info">
                            <div className="security-card__icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
                            </div>
                            <div className="security-card__text">
                                <Localized as="h3" translationKey="profile.security.logout_all_title" data-i18n="profile.security.logout_all_title">{"Active Sessions"}</Localized>
                                <Localized as="p" translationKey="profile.security.logout_all_desc" data-i18n="profile.security.logout_all_desc">{"Sign out from all devices except for this current browser."}</Localized>
                            </div>
                        </div>
                        <Localized as="button" translationKey="profile.security.logout_all_btn" className="btn btn-danger-soft" data-i18n="profile.security.logout_all_btn">{"Log out all devices"}</Localized>
                    </div>
                </div>
            </div>

            <div className="modal glass-modal" id="changePasswordModal" aria-hidden="true" role="dialog" aria-labelledby="modalTitle">
            <div className="glass-card" role="document">
                <button className="modal-close" id="closeModal" aria-label="Close modal">{"×"}</button>

                <Localized as="h3" translationKey="profile.security.modal.title" id="modalTitle" data-i18n="profile.security.modal.title">{"Change Password"}</Localized>
                <Localized as="p" translationKey="profile.security.modal.subtitle" className="modal-sub" data-i18n="profile.security.modal.subtitle">{"Enter your current password and choose a new secure password."}</Localized>

                <input type="text" style={{"display":"none"}} autoComplete="username" />
                <input type="password" style={{"display":"none"}} autoComplete="current-password" />

                <Localized as="label" translationKey="profile.security.modal.label_current" className="field-label" data-i18n="profile.security.modal.label_current">{"Current password"}</Localized>
                <input type="password" id="currentPassword" autoComplete="current-password" className="field" />

            <Localized as="label" translationKey="profile.security.modal.label_new" className="field-label" data-i18n="profile.security.modal.label_new">{"New password"}</Localized>
            <div className="password-field">
                    <Localized as="input" translationKey="profile.security.modal.placeholder_new" type="password" id="newPassword" autoComplete="new-password" className="field" data-i18n="profile.security.modal.placeholder_new" placeholder="New password" />

                    <button type="button" className="eye-btn" data-target="newPassword" aria-label="Show / Hide Password">
                        <svg className="eye-icon" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                    </button>
                </div>

                <Localized as="label" translationKey="profile.security.modal.label_confirm" className="field-label" data-i18n="profile.security.modal.label_confirm">{"Confirm new password"}</Localized>
                <div className="password-field">
                    <Localized as="input" translationKey="profile.security.modal.placeholder_confirm" type="password" id="confirmPassword" autoComplete="new-password" className="field" data-i18n="profile.security.modal.placeholder_confirm" placeholder="Confirm password" />

                    <button type="button" className="eye-btn" data-target="confirmPassword" aria-label="Show / Hide Password">
                    <svg className="eye-icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    </button>
                </div>

                <div id="errors" className="errors" aria-live="polite"></div>

                <div className="modal-actions">
                <Localized as="button" translationKey="profile.security.modal.btn_save" id="savePassword" className="save" disabled={true} data-i18n="profile.security.modal.btn_save" aria-label="Save Password">{"Save"}</Localized>
                <Localized as="button" translationKey="profile.security.modal.btn_cancel" id="cancelPassword" className="cancel" data-i18n="profile.security.modal.btn_cancel" aria-label="Cancel Password">{"Cancel"}</Localized>
                </div>
            </div>
            </div>

            <div id="page-payment" className="page">

                <div>
                <div className="billing-page-header">
                    <h2 className="billing-title">{"Billing & Subscription"}</h2>
                    <p className="billing-subtitle">{"Manage your payment methods and billing history"}</p>
                </div>

                <div className="billing-card-section">
                    <h3 className="section-label">{"Payment Methods"}</h3>
                    <div className="payment-methods-grid">
                        <div className="method-card">
                            <div className="card-info">
                                <div className="card-icon-wrapper">
                                    <i className="fa-brands fa-cc-visa"></i>
                                </div>
                                <div className="card-details">
                                    <p className="card-number">{"Visa ending in 4242"}</p>
                                    <p className="card-expiry">{"Expires 12/26"}</p>
                                </div>
                            </div>
                            <span className="badge-default">{"Default"}</span>
                        </div>
                        
                        <button className="add-method-btn" aria-label="Add Payment Method">
                            <i className="fa-solid fa-plus"></i>
                            <span>{"Add payment method"}</span>
                        </button>
                    </div>
                </div>

                <div className="history-section">
                    <h3 className="section-label">{"Billing History"}</h3>
                    <div className="table-responsive">
                        <table className="billing-table">
                            <thead>
                                <tr>
                                    <th>{"Date"}</th>
                                    <th>{"Amount"}</th>
                                    <th>{"Status"}</th>
                                    <th>{"Receipt"}</th>
                                </tr>
                            </thead>
                            <tbody id="transactions-body">
                                </tbody>
                        </table>
                    </div>
                    <div id="pagination" className="pagination-container"></div>
                </div>

                <div className="billing-footer">
                    <div className="security-info">
                        <i className="fa-solid fa-shield-halved"></i>
                        <div>
                            <h4>{"Secure Payment Processing"}</h4>
                            <p>{"All payments are processed securely through industry-standard encryption. Your payment information is never stored on our servers. You can manage your credits at any time."}</p>
                        </div>
                    </div>
                </div>
            </div>
            </div>

            <div id="page-transactions" className="page">
                <Localized as="h2" translationKey="profile.transactions.title" className="page-transactions__title" data-i18n="profile.transactions.title">{"Transactions"}</Localized>
                <Localized as="p" translationKey="profile.transactions.desc" className="page-transactions__description" data-i18n="profile.transactions.desc">{"Your account's payment information, transactions."}</Localized>

                    <div className="dashboard-container">

                        <div className="stats-grid">
                            <div className="stat-card">
                                <div className="glow-line"></div>
                                <div className="stat-label">{"Current Balance"}</div>
                                <div className="stat-value">{"750 "}<span className="currency">{"🪙"}</span></div>
                                <a href="/index.html#products" style={{"textDecoration":"none"}}>
                                    <button className="btn-action">{"Top Up"}</button>
                                </a>
                            </div>
                            <div className="stat-card">
                                <div className="glow-line"></div>
                                <div className="stat-label spent-label">{"Total Spent"}</div>
                                <div className="stat-value spent-value">{"12,450 "}<span className="currency-spent">{"🪙"}</span></div>
                                <div className="stat-trend spent-trend">{"+12% from last month"}</div>
                                <a href="/profile.html#transactions-chart" style={{"textDecoration":"none"}}>
                                    <button className="btn-secondary">{"View Analytics"}</button>
                                </a>
                            </div>
                        </div>

                        <div className="tables-grid">
                            <div className="table-card card purchase-history-card">
                                <div className="card-header">
                                    <h3>{"Purchase History"}</h3>
                                    <span className="badge">{"Last 30 days"}</span>
                                </div>
                                <div className="table-wrapper">
                                    <table className="genyxo-table purchase-table" id="purchaseTable">
                                        <thead>
                                            <tr>
                                                <th>{"Package Name"}</th>
                                                <th>{"Price"}</th>
                                                <th>{"Status"}</th>
                                                <th>{"Date"}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td>
                                                    <div style={{"display":"flex","alignItems":"center"}}>
                                                        <span className="ai-icon-wrapper icon-pro">
                                                            <i className="fa-solid fa-wand-magic-sparkles"></i>
                                                        </span>
                                                        <span className="bold-white">{"Pro Creator"}</span>
                                                    </div>
                                                </td>
                                                <td className="accent-text products-table__price">{"$24.99"}</td>
                                                <td><span className="status-pill">{"Success"}</span></td>
                                                <td className="dim-text products-table__data">{"May 28, 2025"}</td>
                                            </tr>
                                            <tr>
                                                <td>
                                                    <div style={{"display":"flex","alignItems":"center"}}>
                                                        <span className="ai-icon-wrapper icon-titan">
                                                            <i className="fa-solid fa-box-archive"></i>
                                                        </span>
                                                        <span className="bold-white">{"AI Explorer"}</span>
                                                    </div>
                                                </td>
                                                <td className="accent-text products-table__price">{"$9.99"}</td>
                                                <td><span className="status-pill">{"Success"}</span></td>
                                                <td className="dim-text products-table__data">{"Apr 15, 2025"}</td>
                                            </tr>
                                            <tr>
                                                <td>
                                                    <div style={{"display":"flex","alignItems":"center"}}>
                                                        <span className="ai-icon-wrapper icon-start">
                                                            <i className="fa-solid fa-play-circle"></i>
                                                        </span>
                                                        <span className="bold-white">{"Start Ai"}</span>
                                                    </div>
                                                </td>
                                                <td className="accent-text products-table__price">{"$4.99"}</td>
                                                <td><span className="status-pill">{"Success"}</span></td>
                                                <td className="dim-text products-table__data">{"Apr 16, 2025"}</td>
                                            </tr>
                                            <tr>
                                                <td>
                                                    <div style={{"display":"flex","alignItems":"center"}}>
                                                        <span className="ai-icon-wrapper icon-master">
                                                            <i className="fa-solid fa-people-group"></i>
                                                        </span>
                                                        <span className="bold-white">{"AI Master"}</span>
                                                    </div>
                                                </td>
                                                <td className="accent-text products-table__price">{"$49.99"}</td>
                                                <td><span className="status-pill">{"Success"}</span></td>
                                                <td className="dim-text products-table__data">{"Apr 17, 2025"}</td>
                                            </tr>
                                            <tr>
                                                <td>
                                                    <div style={{"display":"flex","alignItems":"center"}}>
                                                        <span className="ai-icon-wrapper icon-power">
                                                            <i className="fa-solid fa-bolt"></i>
                                                        </span>
                                                        <span className="bold-white">{"Unlimited Power"}</span>
                                                    </div>
                                                </td>
                                                <td className="accent-text products-table__price">{"$99.99"}</td>
                                                <td><span className="status-pill">{"Success"}</span></td>
                                                <td className="dim-text products-table__data">{"Apr 18, 2025"}</td>
                                            </tr>
                                            <tr>
                                                <td>
                                                    <div style={{"display":"flex","alignItems":"center"}}>
                                                        <span className="ai-icon-wrapper icon-titan">
                                                            <i className="fa-solid fa-crown"></i>
                                                        </span>
                                                        <span className="bold-white">{"AI Titan"}</span>
                                                    </div>
                                                </td>
                                                <td className="accent-text products-table__price">{"$219.99"}</td>
                                                <td><span className="status-pill">{"Success"}</span></td>
                                                <td className="dim-text products-table__data">{"Apr 19, 2025"}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    <div className="pagination-container purchase-table" id="purchasePagination"></div>
                                </div>
                            </div>

                            <div className="table-card card prompt-usage-card">
                                <div className="card-header">
                                    <h3>{"Prompt Usage"}</h3>
                                    <div className="model-select-wrapper">
                                        <i className="fas fa-robot" style={{"color":"#10e6cc"}}></i>

                                        <div className="custom-select" id="customModelSelect" tabIndex={0} aria-haspopup="listbox" aria-expanded="false">
                                            <span className="current">{"GPT-4o (40 cr)"}</span>
                                            <i className="fas fa-chevron-down caret"></i>
                                            <ul className="custom-options" role="listbox"></ul>
                                        </div>

                                        <select id="modelFilter" className="genyxo-select" onChange={event => dispatch("profile-0", event)} style={{"display":"none"}} defaultValue="all">
                                            <option value="all">{"All Models"}</option>
                                            <option value="openai/gpt-5.1">{"GPT-5.1 (150 cr)"}</option>
                                            <option value="openai/gpt-5-mini">{"GPT-5 (70 cr)"}</option>
                                            <option value="openai/gpt-5-nano">{"GPT-5 Mini (45 cr)"}</option>
                                            <option value="openai/gpt-4.1">{"GPT-4.1 (55 cr)"}</option>
                                            <option value="openai/gpt-4.1-mini">{"GPT-4 Mini (25 cr)"}</option>
                                            <option value="openai/gpt-4o">{"GPT-4o (40 cr)"}</option>
                                            <option value="openai/gpt-4o-mini">{"GPT-4o Mini (20 cr)"}</option>
                                            <option value="openai/o1-preview">{"GPT-o1 (100 cr)"}</option>
                                            <option value="openai/o3-reasoning">{"GPT-o3 Reasoning (150 cr)"}</option>
                                            <option value="openai/dall-e-3">{"DALL-E Image (120 cr)"}</option>
                                            <option value="kling-video">{"Kling Video (500 cr)"}</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="table-wrapper">
                                    <table className="genyxo-table" id="promptsTable">
                                        <thead>
                                            <tr>
                                                <th>{"AI Model"}</th>
                                                <th>{"Credits"}</th>
                                                <th>{"Time"}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr data-model="openai/gpt-5.1">
                                                <td><span className="ai-icon-wrapper icon-gpt"><i className="fa-solid fa-bolt"></i></span>{" GPT-5.1"}</td>
                                                <td className="cost-text models-table__price">{"-150 🪙"}</td>
                                                <td className="dim-text models-table__data">{"Just now"}</td>
                                            </tr>
                                            <tr data-model="openai/gpt-5-mini">
                                                <td><span className="ai-icon-wrapper icon-gpt"><i className="fa-solid fa-bolt"></i></span>{" GPT-5"}</td>
                                                <td className="cost-text models-table__price">{"-70 🪙"}</td>
                                                <td className="dim-text models-table__data">{"5 min ago"}</td>
                                            </tr>
                                            <tr data-model="openai/gpt-5-nano">
                                                <td><span className="ai-icon-wrapper icon-gpt">
                                                <i className="fa-solid fa-bolt"></i></span>{"GPT-5 Mini"}</td>
                                                <td className="cost-text models-table__price">{"-45 🪙"}</td>
                                                <td className="dim-text models-table__data">{"12 min ago"}</td>
                                            </tr>
                                            <tr data-model="openai/gpt-4.1">
                                                <td><span className="ai-icon-wrapper icon-gpt"><i className="fa-solid fa-brain"></i></span>{" GPT-4.1"}</td>
                                                <td className="cost-text models-table__price">{"-55 🪙"}</td>
                                                <td className="dim-text models-table__data">{"1 hour ago"}</td>
                                            </tr>
                                            <tr data-model="openai/gpt-4.1-mini">
                                                <td><span className="ai-icon-wrapper icon-gpt"><i className="fa-solid fa-microscope"></i></span>{" GPT-4 Mini"}</td>
                                                <td className="cost-text models-table__price">{"-25 🪙"}</td>
                                                <td className="dim-text models-table__data">{"2 hours ago"}</td>
                                            </tr>
                                            
                                            <tr data-model="openai/gpt-4o">
                                                <td><span className="ai-icon-wrapper icon-gpt"><i className="fa-solid fa-bolt"></i></span>{" GPT-4o"}</td>
                                                <td className="cost-text models-table__price">{"-40 🪙"}</td>
                                                <td className="dim-text models-table__data">{"Yesterday"}</td>
                                            </tr>
                                            <tr data-model="openai/gpt-4o-mini">
                                                <td><span className="ai-icon-wrapper icon-gpt"><i className="fa-solid fa-circle"></i></span>{" GPT-4o Mini"}</td>
                                                <td className="cost-text models-table__price">{"-20 🪙"}</td>
                                                <td className="dim-text models-table__data">{"Yesterday"}</td>
                                            </tr>
                                            <tr data-model="openai/o1-preview">
                                                <td><span className="ai-icon-wrapper icon-gpt"><i className="fa-solid fa-question-circle"></i></span>{" GPT-o1"}</td>
                                                <td className="cost-text models-table__price">{"-100 🪙"}</td>
                                                <td className="dim-text models-table__data">{"2 days ago"}</td>
                                            </tr>
                                            <tr data-model="openai/o3-reasoning">
                                                <td><span className="ai-icon-wrapper icon-gpt"><i className="fa-solid fa-graduation-cap"></i></span>{" GPT-o3 Reas."}</td>
                                                <td className="cost-text models-table__price">{"-150 🪙"}</td>
                                                <td className="dim-text models-table__data">{"3 days ago"}</td>
                                            </tr>
                                            <tr data-model="openai/dall-e-3">
                                                <td><span className="ai-icon-wrapper icon-dall-e"><i className="fa-solid fa-palette"></i></span>{" DALL-E 3"}</td>
                                                <td className="cost-text models-table__price">{"-120 🪙"}</td>
                                                <td className="dim-text models-table__data">{"Last week"}</td>
                                            </tr>
                                            <tr data-model="kling-video">
                                                <td><span className="ai-icon-wrapper icon-kling"><i className="fa-solid fa-film"></i></span>{" Kling Video"}</td>
                                                <td className="cost-text models-table__price">{"-500 🪙"}</td>
                                                <td className="dim-text models-table__data">{"Last week"}</td>
                                            </tr>
                                            <tr data-model="midjourney">
                                                <td><span className="ai-icon-wrapper icon-midjourney"><i className="fa-solid fa-paint-brush"></i></span>{" Midjourney v6"}</td>
                                                <td className="cost-text models-table__price">{"-20 🪙"}</td>
                                                <td className="dim-text models-table__data">{"14:20"}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    
                                    <div className="pagination-container" id="paginationControls">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="chart-section card" id="transactions-chart">
                            <div className="chart-header">
                                <h3>{"Credit Usage"}</h3>
                                <div className="time-filters">
                                    <button className="filter-btn active" onClick={event => dispatch("profile-1", event)}>{"1D"}</button>
                                    <button className="filter-btn" onClick={event => dispatch("profile-2", event)}>{"1W"}</button>
                                    <button className="filter-btn" onClick={event => dispatch("profile-3", event)}>{"1M"}</button>
                                    <button className="filter-btn" onClick={event => dispatch("profile-4", event)}>{"1Y"}</button>
                                </div>
                            </div>
                            <div className="chart-container">
                                <canvas id="creditsChart"></canvas>
                            </div>
                        </div>
                    </div>
                    
            </div>

            <div id="page-affiliate" className="page content-box">
                <Localized as="h2" translationKey="affiliate.title" data-i18n="affiliate.title">{"Affiliate Dashboard"}</Localized>
                <Localized as="p" translationKey="affiliate.desc" className="sub" data-i18n="affiliate.desc">{"Invite friends and earn real money (10%) from every purchase they make."}</Localized>

                <div className="affiliate-stats">
                    <div className="stat-card glass-card">
                        <div className="stat-title">{"Your Balance"}</div>
                        <div className="stat-value text-green">{"$"}<span id="affiliateBalance">{"0.00"}</span></div>
                        <button className="action-btn primary-btn" aria-label="Request Payout" onClick={event => dispatch("profile-5", event)} style={{"marginTop":"10px","width":"100%"}}>{"Request Payout"}</button>
                    </div>
                    
                    <div className="stat-card glass-card">
                        <div className="stat-title">{"Total Invited"}</div>
                        <div className="stat-value"><span id="invitedCount">{"0"}</span>{" Users"}</div>
                    </div>
                </div>

                <div className="glass-card referral-share-box" style={{"marginTop":"30px"}}>
                    <h3 style={{"marginBottom":"15px"}}>{"Your Referral Link"}</h3>
                    <div className="copy-row">
                        <input type="text" id="referralLinkInput" readOnly={true} defaultValue="Loading..." />
                        <button className="action-btn" id="copyAffBtn" aria-label="Copy Your Referral Link">
                            <i className="fas fa-copy fa-fw copy-link-btn"></i>{" Copy\n                        "}</button>
                    </div>
                    <p style={{"fontSize":"0.9rem","color":"#888","marginTop":"10px"}}>{"\n                        Share this link anywhere. When users register via this link, you get 10% of all their purchases forever.\n                    "}</p>
                </div>

                <div style={{"marginTop":"30px","fontSize":"0.9rem","color":"#888"}}>
                    <h3>{"How it works:"}</h3>
                    <ul style={{"marginLeft":"20px","marginTop":"10px","lineHeight":"1.6"}}>
                        <li>{"1. Share your link with friends."}</li>
                        <li>{"2. Get "}<strong>{"$1.00"}</strong>{" for their first \"Start AI\" pack."}</li>
                        <li>{"3. Get "}<strong>{"10%"}</strong>{" commission for any other first pack purchase."}</li>
                        <li>{"4. Rewards are credited instantly after payment approval."}</li>
                        <li>{"5. Minimum payout: "}<strong>{"$10.00"}</strong>{" via USDT (TRC20)."}</li>
                    </ul>
                </div>
            </div>
            
        </main>
    </div>); }
