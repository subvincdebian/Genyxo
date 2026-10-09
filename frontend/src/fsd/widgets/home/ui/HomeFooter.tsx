"use client";
import type { SyntheticEvent } from "react";

import { Localized } from "@/shared/i18n";
export function HomeFooter({}: {
  dispatch: (name: string, event: SyntheticEvent<Element>) => unknown;
  ready: boolean;
}) {
  return (
    <footer
      className="footer animate-on-scroll"
      style={{ animation: "fadeInUp 1s ease" }}
    >
      {"\n        "}
      <div className="footer-content">
        {"\n            "}
        <div className="footer-section">
          {"\n                "}
          <span className="footer-logo">
            {"\n                    "}
            <img
              src="/images/logo.svg"
              width="40"
              height="40"
              fetchPriority="high"
              className="logo-icon"
              alt="Logo"
            />
            {"\n                    "}
            <h3 className="footer-logo-title">{"Genyxo"}</h3>
            {"\n                "}
          </span>
          {"\n                "}
          <Localized
            as="p"
            translationKey="footer.desc_1"
            data-i18n="footer.desc_1"
          >
            {"Manual access to the latest AI models in one place."}
          </Localized>
          {"\n                "}
          <Localized
            as="p"
            translationKey="footer.desc_2"
            data-i18n="footer.desc_2"
          >
            {"Fast, transparent, no overpayments."}
          </Localized>
          {"\n                \n                "}
          <div className="social-links">
            {"\n                    "}
            <a
              href="https://instagram.com/username"
              className="social-icon"
              title="Instagram"
              target="_blank"
              aria-label="Instagram"
            >
              {"\n                    "}
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                {"\n                        "}
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"></path>
                {"\n                    "}
              </svg>
              {"\n                    "}
            </a>
            {"\n                    "}
            <a
              href="/paste your tiktok profile link"
              className="social-icon"
              title="TikTok"
              target="_blank"
              aria-label="TikTok"
            >
              {"\n                    "}
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                {"\n                        "}
                <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-5.394 10.692 6.33 6.33 0 0 0 10.857-4.424V8.687a8.182 8.182 0 0 0 4.773 1.526V6.79a4.831 4.831 0 0 1-1.003-.104z"></path>
                {"\n                    "}
              </svg>
              {"\n                    "}
            </a>
            {"\n                    "}
            <a
              href="https://wa.me/phonenumber"
              className="social-icon"
              title="WhatsApp"
              target="_blank"
              aria-label="WhatsApp"
            >
              {"\n                    "}
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                {"\n                        "}
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893c0-3.189-1.248-6.189-3.515-8.444"></path>
                {"\n                    "}
              </svg>
              {"\n                    "}
            </a>
            {"\n                "}
          </div>
          {"\n            "}
        </div>
        {"\n\n            "}
        <div className="footer-section">
          {"\n                "}
          <Localized
            as="h3"
            translationKey="footer.legal_title"
            data-i18n="footer.legal_title"
          >
            {"Legal & Help"}
          </Localized>
          {"\n                "}
          <ul className="footer-links">
            {"\n                    "}
            <li>
              <Localized
                as="a"
                translationKey="footer.privacy"
                href="/policies/privacy-policy.html"
                data-i18n="footer.privacy"
              >
                {"Privacy Policy"}
              </Localized>
            </li>
            {"\n                    "}
            <li>
              <Localized
                as="a"
                translationKey="footer.terms"
                href="/policies/terms-of-service.html"
                data-i18n="footer.terms"
              >
                {"Terms of Service"}
              </Localized>
            </li>
            {"\n                    "}
            <li>
              <Localized
                as="a"
                translationKey="footer.faq"
                href="#"
                id="openFaqBtn"
                data-i18n="footer.faq"
              >
                {"FAQ"}
              </Localized>
            </li>
            {"\n                "}
          </ul>
          {"\n            "}
        </div>
        {"\n                \n            "}
        <div className="footer-section">
          {"\n                "}
          <Localized
            as="h3"
            translationKey="footer.links_title"
            data-i18n="footer.links_title"
          >
            {"Links"}
          </Localized>
          {"\n                "}
          <ul className="footer-links">
            {"\n                    "}
            <li>
              <a href="#home" aria-label="Home Page">
                {"Home"}
              </a>
            </li>
            {"\n                    "}
            <li>
              <a href="#products" aria-label="Product Section">
                {"All Products"}
              </a>
            </li>
            {"\n                    "}
            <li>
              <a href="/chat.html" aria-label="Chat Page">
                {"Chat With AI"}
              </a>
            </li>
            {"\n                    "}
            <li>
              <a href="mailto:info@genyxo.com" aria-label="Contact Us">
                {"Contacts"}
              </a>
            </li>
            {"\n                "}
          </ul>
          {"\n            "}
        </div>
        {"\n                    \n            "}
        <div className="footer-section">
          {"\n                "}
          <Localized
            as="h3"
            translationKey="footer.contact_title"
            data-i18n="footer.contact_title"
          >
            {"Contact Information"}
          </Localized>
          {"\n                "}
          <p className="contact-info">
            {"\n                    "}
            <i className="fas fa-map-marker-alt"></i>
            {"\n                    USA, New York\n                "}
          </p>
          {"\n                "}
          <p className="contact-info">
            {"\n                    "}
            <i className="fas fa-phone"></i>
            {"\n                    @gmblessed\n                "}
          </p>
          {"\n                "}
          <p className="contact-info">
            {"\n                    "}
            <i className="fas fa-envelope"></i>
            {"\n                    info@genyxo.com\n                "}
          </p>
          {"\n            "}
        </div>
        {"\n        "}
      </div>
      {"    \n            \n        "}
      <div className="footer-bottom">
        {"\n            "}
        <Localized
          as="p"
          translationKey="footer.rights"
          data-i18n="footer.rights"
        >
          {"© 2025 Genyxo. All rights reserved."}
        </Localized>
        {"\n        "}
      </div>
      {"\n    "}
    </footer>
  );
}
