"use client";
import type { SyntheticEvent } from "react";

import { Localized } from "@/shared/i18n";
export function HomeLoginModal({
  ready,
}: {
  dispatch: (name: string, event: SyntheticEvent<Element>) => unknown;
  ready: boolean;
}) {
  return (
    <div className="modal" id="loginModal">
      {"\n        "}
      <div className="modal-content glass">
        {"\n            "}
        <span className="close-btn" id="closeLogin">
          {"×"}
        </span>
        {"\n            \n            "}
        <form id="loginForm" className="auth-form">
          {"\n                "}
          <Localized
            as="h2"
            translationKey="auth.login_title"
            data-i18n="auth.login_title"
          >
            {"Welcome Back"}
          </Localized>
          {"\n                "}
          <p className="auth-subtitle">{"Login to access your workspace"}</p>
          {"\n                \n                "}
          <div className="social-login">
            {"\n                    "}
            <a
              href="/auth/google"
              className="social-btn google"
              aria-label="Login via Google"
            >
              {"\n                        "}
              <i className="fab fa-google"></i>
              {" Google\n                    "}
            </a>
            {"\n                    "}
            <a
              href="/auth/facebook"
              className="social-btn facebook"
              aria-label="Login via Facebook"
            >
              {"\n                        "}
              <i className="fab fa-facebook-f"></i>
              {" Facebook\n                    "}
            </a>
            {"\n                "}
          </div>
          {"\n\n                "}
          <div className="divider">
            <span>{"OR"}</span>
          </div>
          {"\n\n                "}
          <div className="form-group">
            {"\n                    "}
            <label>{"Email"}</label>
            {"\n                    "}
            <div className="input-wrapper">
              {"\n                        "}
              <i className="fas fa-envelope"></i>
              {"\n                        "}
              <input
                disabled={!ready}
                type="email"
                id="loginEmail"
                placeholder="name@example.com"
                required={true}
              />
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n                "}
          <div className="form-group">
            {"\n                    "}
            <label>{"Password"}</label>
            {"\n                    "}
            <div className="input-wrapper">
              {"\n                        "}
              <i className="fas fa-lock"></i>
              {"\n                        "}
              <input
                disabled={!ready}
                type="password"
                id="loginPassword"
                placeholder="••••••••"
                required={true}
              />
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n                \n                "}
          <button
            disabled={!ready}
            type="submit"
            aria-label="Sign In"
            className="submit-btn glow-on-hover"
          >
            {"\n                    Sign In "}
            <i className="fas fa-arrow-right"></i>
            {"\n                "}
          </button>
          {"\n                \n                "}
          <div className="signup-link">
            {"\n                    "}
            <span>{"New here? "}</span>
            {"\n                    "}
            <a href="#" id="showSignup" aria-label="Create Account">
              {"Create an account"}
            </a>
            {"\n                "}
          </div>
          {"\n            "}
        </form>
        {"\n\n            "}
        <form id="signupForm" className="auth-form" style={{ display: "none" }}>
          {"\n                "}
          <Localized
            as="h2"
            translationKey="auth.signup_title"
            data-i18n="auth.signup_title"
          >
            {"Create Account"}
          </Localized>
          {"\n                "}
          <p className="auth-subtitle">{"Join the future of AI tools"}</p>
          {"\n\n                "}
          <div className="social-login">
            {"\n                    "}
            <a
              href="/auth/google"
              className="social-btn google"
              aria-label="Signup via Google"
            >
              {"\n                        "}
              <i className="fab fa-google"></i>
              {" Google\n                    "}
            </a>
            {"\n                    "}
            <a
              href="/auth/facebook"
              className="social-btn facebook"
              aria-label="Signup via Facebook"
            >
              {"\n                        "}
              <i className="fab fa-facebook-f"></i>
              {" Facebook\n                    "}
            </a>
            {"\n                "}
          </div>
          {"\n\n                "}
          <div className="divider">
            <span>{"OR"}</span>
          </div>
          {"\n\n                "}
          <div className="form-group">
            {"\n                    "}
            <label>{"Full Name"}</label>
            {"\n                    "}
            <div className="input-wrapper">
              {"\n                        "}
              <i className="fas fa-user"></i>
              {"\n                        "}
              <input
                disabled={!ready}
                type="text"
                id="signupName"
                placeholder="John Doe"
                required={true}
              />
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n                "}
          <div className="form-group">
            {"\n                    "}
            <label>{"Email"}</label>
            {"\n                    "}
            <div className="input-wrapper">
              {"\n                        "}
              <i className="fas fa-envelope"></i>
              {"\n                        "}
              <input
                disabled={!ready}
                type="email"
                id="signupEmail"
                placeholder="name@example.com"
                required={true}
              />
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n                "}
          <div className="form-group">
            {"\n                    "}
            <label>{"Password"}</label>
            {"\n                    "}
            <div className="input-wrapper">
              {"\n                        "}
              <i className="fas fa-lock"></i>
              {"\n                        "}
              <input
                disabled={!ready}
                type="password"
                id="signupPassword"
                placeholder="Min 8 chars, A-Z, 0-9"
                required={true}
              />
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n                "}
          <div className="form-group">
            {"\n                    "}
            <Localized
              as="label"
              translationKey="auth.confirm_password_placeholder"
              data-i18n="auth.confirm_password_placeholder"
            >
              {"Confirm Password"}
            </Localized>
            {"\n                    "}
            <div className="input-wrapper">
              {"\n                        "}
              <i className="fas fa-lock"></i>
              {"\n                        "}
              <input
                disabled={!ready}
                type="password"
                id="signupConfirmPassword"
                placeholder="Repeat Password"
                required={true}
              />
              {" \n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n\n                "}
          <button
            disabled={!ready}
            type="submit"
            aria-label="Register"
            className="submit-btn glow-on-hover"
          >
            {"\n                    Register "}
            <i className="fas fa-user-plus"></i>
            {"\n                "}
          </button>
          {"\n                \n                "}
          <div className="signup-link">
            {"\n                    "}
            <span>{"Already have an account? "}</span>
            {"\n                    "}
            <a href="#" id="showLogin" aria-label="Log In">
              {"Log In"}
            </a>
            {"\n                "}
          </div>
          {"\n            "}
        </form>
        {"\n        "}
      </div>
      {"\n    "}
    </div>
  );
}
