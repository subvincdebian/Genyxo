'use client';
import type { SyntheticEvent } from 'react';
import { Localized } from '@/features/language';
export function HomeLoginModal({}: {dispatch:(name:string,event:SyntheticEvent<Element>)=>unknown}) { return (<div className="modal" id="loginModal">
        <div className="modal-content glass">
            <span className="close-btn" id="closeLogin">{"×"}</span>
            
            <form id="loginForm" className="auth-form">
                <Localized as="h2" translationKey="auth.login_title" data-i18n="auth.login_title">{"Welcome Back"}</Localized>
                <p className="auth-subtitle">{"Login to access your workspace"}</p>
                
                <div className="social-login">
                    <a href="/auth/google" className="social-btn google" aria-label="Login via Google">
                        <i className="fab fa-google"></i>{" Google\n                    "}</a>
                    <a href="/auth/facebook" className="social-btn facebook" aria-label="Login via Facebook">
                        <i className="fab fa-facebook-f"></i>{" Facebook\n                    "}</a>
                </div>

                <div className="divider"><span>{"OR"}</span></div>

                <div className="form-group">
                    <label>{"Email"}</label>
                    <div className="input-wrapper">
                        <i className="fas fa-envelope"></i>
                        <input type="email" id="loginEmail" placeholder="name@example.com" required={true} />
                    </div>
                </div>
                <div className="form-group">
                    <label>{"Password"}</label>
                    <div className="input-wrapper">
                        <i className="fas fa-lock"></i>
                        <input type="password" id="loginPassword" placeholder="••••••••" required={true} />
                    </div>
                </div>
                
                <button type="submit" aria-label="Sign In" className="submit-btn glow-on-hover">{"\n                    Sign In "}<i className="fas fa-arrow-right"></i>
                </button>
                
                <div className="signup-link">
                    <span>{"New here? "}</span>
                    <a href="#" id="showSignup" aria-label="Create Account">{"Create an account"}</a>
                </div>
            </form>

            <form id="signupForm" className="auth-form" style={{"display":"none"}}>
                <Localized as="h2" translationKey="auth.signup_title" data-i18n="auth.signup_title">{"Create Account"}</Localized>
                <p className="auth-subtitle">{"Join the future of AI tools"}</p>

                <div className="social-login">
                    <a href="/auth/google" className="social-btn google" aria-label="Signup via Google">
                        <i className="fab fa-google"></i>{" Google\n                    "}</a>
                    <a href="/auth/facebook" className="social-btn facebook" aria-label="Signup via Facebook">
                        <i className="fab fa-facebook-f"></i>{" Facebook\n                    "}</a>
                </div>

                <div className="divider"><span>{"OR"}</span></div>

                <div className="form-group">
                    <label>{"Full Name"}</label>
                    <div className="input-wrapper">
                        <i className="fas fa-user"></i>
                        <input type="text" id="signupName" placeholder="John Doe" required={true} />
                    </div>
                </div>
                <div className="form-group">
                    <label>{"Email"}</label>
                    <div className="input-wrapper">
                        <i className="fas fa-envelope"></i>
                        <input type="email" id="signupEmail" placeholder="name@example.com" required={true} />
                    </div>
                </div>
                <div className="form-group">
                    <label>{"Password"}</label>
                    <div className="input-wrapper">
                        <i className="fas fa-lock"></i>
                        <input type="password" id="signupPassword" placeholder="Min 8 chars, A-Z, 0-9" required={true} />
                    </div>
                </div>
                <div className="form-group">
                    <Localized as="label" translationKey="auth.confirm_password_placeholder" data-i18n="auth.confirm_password_placeholder">{"Confirm Password"}</Localized>
                    <div className="input-wrapper">
                        <i className="fas fa-lock"></i>
                        <input type="password" id="signupConfirmPassword" placeholder="Repeat Password" required={true} /> 
                    </div>
                </div>

                <button type="submit" aria-label="Register" className="submit-btn glow-on-hover">{"\n                    Register "}<i className="fas fa-user-plus"></i>
                </button>
                
                <div className="signup-link">
                    <span>{"Already have an account? "}</span>
                    <a href="#" id="showLogin" aria-label="Log In">{"Log In"}</a>
                </div>
            </form>
        </div>
    </div>); }
