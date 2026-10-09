"use client";
import type { SyntheticEvent } from "react";

export function TermsOfServicePrivacyLayout({
  dispatch,
}: {
  dispatch: (name: string, event: SyntheticEvent<Element>) => unknown;
  ready: boolean;
}) {
  return (
    <div className="privacy-layout">
      {"\n        "}
      <aside className="privacy-sidebar" id="sidebar">
        {"\n            "}
        <nav>
          {"\n                "}
          <ul>
            {"\n                    "}
            <li>
              <a
                href="#intro"
                onClick={(event) => dispatch("terms-of-service-15", event)}
              >
                {"Introduction"}
              </a>
            </li>
            {"\n                    "}
            <li>
              <a
                href="#data-collect"
                onClick={(event) => dispatch("terms-of-service-16", event)}
              >
                {"Your relationship with Genyxo"}
              </a>
            </li>
            {"\n                    "}
            <li>
              <a
                href="#service-specifics"
                onClick={(event) => dispatch("terms-of-service-17", event)}
              >
                {" AI Service Specifics"}
              </a>
            </li>
            {"\n                    "}
            <li>
              <a
                href="#credits"
                onClick={(event) => dispatch("terms-of-service-18", event)}
              >
                {"Credit Consumption & Expiration"}
              </a>
            </li>
            {"\n                    "}
            <li>
              <a
                href="#security"
                onClick={(event) => dispatch("terms-of-service-19", event)}
              >
                {"Data Residency & Prompt Privacy"}
              </a>
            </li>
            {"\n                    "}
            <li>
              <a
                href="#prohibited"
                onClick={(event) => dispatch("terms-of-service-20", event)}
              >
                {"Prohibited Use"}
              </a>
            </li>
            {"\n                    "}
            <li>
              <a
                href="#referral"
                onClick={(event) => dispatch("terms-of-service-21", event)}
              >
                {"Affiliate & Referral Terms"}
              </a>
            </li>
            {"\n                    "}
            <li>
              <a
                href="#support"
                onClick={(event) => dispatch("terms-of-service-22", event)}
              >
                {"Support & Disputing Charges"}
              </a>
            </li>
            {"\n                    "}
            <li>
              <a
                href="#about"
                onClick={(event) => dispatch("terms-of-service-23", event)}
              >
                {"About these Terms"}
              </a>
            </li>
            {"\n                "}
          </ul>
          {"\n            "}
        </nav>
        {"\n        "}
      </aside>
      {"\n\n        "}
      <main className="privacy-body">
        {"\n            "}
        <section id="intro">
          {"\n                "}
          <h1>{"Terms of Service"}</h1>
          {"\n                "}
          <p>
            <strong>{"Last updated:"}</strong>
            {" March 6, 2026"}
          </p>
          {"\n                "}
          <p>
            {"We know reading the Terms of Service can be daunting. However, "}
            <br />
            {
              " it's important that you understand the rules of conduct when using "
            }
            <br />
            {" our services , as well as Genyxo's rights and responsibilities."}
          </p>
          {"\n                "}
          <h2>{"What is considered in these terms"}</h2>
          {"\n                "}
          <div className="tos-container">
            {"\n                    "}
            <p>
              {"These Terms of Service reflect "}
              <a href="#">{"Genyxo's bussiness model"}</a>
              {", applicable law, and"}
              <a href="#">{" our company principles"}</a>
              {
                ". These Terms therefore govern your relationship with Genyxo when using our services. These Terms include the following sections:"
              }
            </p>
            {"\n\n                    "}
            <ul className="tos-list">
              {"\n                        "}
              <li>
                {"\n                            "}
                <a href="#">{"What We Do for You"}</a>
                {
                  ". This section explains how we provide and develop our services.\n                        "
                }
              </li>
              {"\n                        "}
              <li>
                {"\n                            "}
                <a href="#">{"What we expect from you"}</a>
                {
                  ".  Here are the rules for using our services.\n                        "
                }
              </li>
              {"\n                        "}
              <li>
                {"\n                            "}
                <a href="#">{"Content on Genyxo Services"}</a>
                {
                  ". This section explains the intellectual property rights associated with content published by you, other users, or Genyxo on our services.\n                        "
                }
              </li>
              {"\n                        "}
              <li>
                {"\n                            "}
                <a href="#">{"Problems and Disputes"}</a>
                {
                  ". This section describes your other legal rights and what to do if you violate these terms.\n                        "
                }
              </li>
              {"\n                    "}
            </ul>
            {"\n\n                    "}
            <p>
              {
                "It is important that you read these terms because you agree to them by accessing or using our services."
              }
            </p>
            {"\n\n                    "}
            <p>
              {"We also recommend that you read our "}
              <a href="/policies/privacy-policy.html">{"Privacy Policy"}</a>
              {". It is not part of these terms. It explains how you can "}
              <a href="/profile.html">
                {"change, export, delete your data and manage it"}
              </a>
              {"."}
            </p>
            {"\n\n                    "}
            <h2>{"Terms of Use"}</h2>
            {"\n\n                    "}
            {"\n\n                    "}
            <h3>{"Age restrictions"}</h3>
            {"\n                    "}
            <p>
              {"If you are not yet "}
              <a href="#">{"old enough to manage Genyxo Account"}</a>
              {
                ", you may use it only with permission from a parent or legal guardian. To do so, your parent or legal guardian must review these terms with you."
              }
            </p>
            {"\n                    \n                    "}
            <p>
              {
                "If you are a parent or legal guardian of a child and allow them to use "
              }
              <a href="#">{"Genyxo services"}</a>
              {
                ", these terms apply to you and you are responsible for your child's activities on our services."
              }
            </p>
            {"\n                    \n                    "}
            <p>
              {
                "Some Genyxo services have specific age restrictions. These are specified in "
              }
              <a href="#">
                {"the additional terms and conditions for each service"}
              </a>
              {"."}
            </p>
            {"\n                "}
          </div>
          {"\n            "}
        </section>
        {"\n\n            "}
        <hr />
        {"\n\n            "}
        <section id="data-collect">
          {"\n                "}
          <h2>{"Your relationship with Genyxo"}</h2>
          {"\n                "}
          <p>
            {
              "These terms help define the relationship between you and Genyxo. Broadly speaking, we give you permission to use our services if you agree to follow these terms, which reflect how Genyxo’s business works and how we earn money."
            }
          </p>
          {"\n                \n                "}
          <div className="relationship-grid">
            {"\n                    "}
            <div className="relation-block">
              {"\n                        "}
              <h3>{"What you can expect from us"}</h3>
              {"\n                        "}
              <p>
                {
                  "Genyxo provides a unified interface to interact with various Artificial Intelligence models. Our service includes:"
                }
              </p>
              {"\n                        "}
              <ul>
                {"\n                            "}
                <li>
                  <strong>{"Access to AI Models:"}</strong>
                  {
                    " We provide a stable bridge to industry-leading AI models using our proprietary credit-based system."
                  }
                </li>
                {"\n                            "}
                <li>
                  <strong>{"Credit Management:"}</strong>
                  {
                    " We ensure accurate accounting of your purchased credit packages and their consumption based on the complexity of your requests."
                  }
                </li>
                {"\n                            "}
                <li>
                  <strong>{"Continuous Improvement:"}</strong>
                  {
                    " We constantly update our platform, adding new models and features to enhance your experience."
                  }
                </li>
                {"\n                        "}
              </ul>
              {"\n                    "}
            </div>
            {"\n\n                    "}
            <div className="relation-block">
              {"\n                        "}
              <h3>{"What we expect from you"}</h3>
              {"\n                        "}
              <p>
                {
                  "In exchange for access to these powerful tools, we expect you to act responsibly:"
                }
              </p>
              {"\n                        "}
              <ul>
                {"\n                            "}
                <li>
                  <strong>{"Compliance:"}</strong>
                  {
                    " Follow these terms and any model-specific usage policies (e.g., OpenAI or other companies policies)."
                  }
                </li>
                {"\n                            "}
                <li>
                  <strong>{"Fair Usage:"}</strong>
                  {
                    " Do not attempt to bypass credit costs, reverse-engineer the platform, or use automated scripts to abuse the service."
                  }
                </li>
                {"\n                            "}
                <li>
                  <strong>{"Content Responsibility:"}</strong>
                  {
                    " You are responsible for the prompts you send and how you use the resulting AI-generated content."
                  }
                </li>
                {"\n                        "}
              </ul>
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n\n                "}
          <div className="highlight-box">
            {"\n                    "}
            <h3>{"Understanding Credits & Usage"}</h3>
            {"\n                    "}
            <p>
              {
                '\n                        Genyxo operates on a "Pay-as-you-go" basis via credit packages. \n                        '
              }
              <strong>{"1 message ≠ 1 credit."}</strong>
              {
                " The cost of each interaction depends on the specific AI model chosen, the length of your input, and the complexity of the generated response (tokens). \n                        By using the service, you acknowledge that credits are non-refundable once consumed by an AI request.\n                    "
              }
            </p>
            {"\n                "}
          </div>
          {"\n\n                "}
          <div className="relation-block">
            {"\n                    "}
            <h3>{"Content in Genyxo services"}</h3>
            {"\n                    "}
            <p>
              {
                '\n                        Some of our services allow you to generate original content. Genyxo does not claim ownership of the output generated by AI models based on your prompts. \n                        However, please note that AI models can occasionally produce incorrect, biased, or "hallucinated" information. Genyxo is a provider of '
              }
              <strong>{"access"}</strong>
              {", not the author of the AI's responses.\n                    "}
            </p>
            {"\n                "}
          </div>
          {"\n            "}
        </section>
        {"\n\n            "}
        <section id="service-specifics">
          {"\n                "}
          <h2>
            <i className="fas fa-microchip"></i>
            {" AI Service Specifics"}
          </h2>
          {"\n                "}
          <p>
            {
              "Genyxo provides access to third-party artificial intelligence models (such as GPT-4, Claude, Gemini, etc.) through a unified interface. By using our service, you acknowledge:"
            }
          </p>
          {"\n                "}
          <div className="info-card">
            {"\n                    "}
            <ul>
              {"\n                        "}
              <li>
                <strong>{"Model Authorship:"}</strong>
                {
                  " Genyxo does not develop these models. The output is generated by the respective third-party providers."
                }
              </li>
              {"\n                        "}
              <li>
                <strong>{"Accuracy:"}</strong>
                {
                  ' AI can provide inaccurate information or "hallucinations". We recommend verifying critical data.'
                }
              </li>
              {"\n                        "}
              <li>
                <strong>{"Availability:"}</strong>
                {
                  " Access to specific models depends on the uptime of the respective API providers."
                }
              </li>
              {"\n                    "}
            </ul>
            {"\n                "}
          </div>
          {"\n            "}
        </section>
        {"\n\n            "}
        <section id="credits">
          {"\n                "}
          <h2>
            <i className="fas fa-coins"></i>
            {" Credit Consumption & Expiration"}
          </h2>
          {"\n                "}
          <p>
            {"We believe in simplicity. Unlike other platforms, Genyxo uses a "}
            <strong>{"fixed-price per message"}</strong>
            {" system."}
          </p>
          {"\n                "}
          <div className="highlight-box">
            {"\n                    "}
            <p>
              <strong>{"Simple Billing:"}</strong>
              {
                " Every time you send a message, a fixed number of credits is deducted from your balance based on the selected model. The cost is the same regardless of the length of your prompt or the AI's response."
              }
            </p>
            {"\n                "}
          </div>
          {"\n                "}
          <ul>
            {"\n                    "}
            <li>
              <strong>{"Transparency:"}</strong>
              {
                " The cost per message is clearly displayed in the model selection menu."
              }
            </li>
            {"\n                    "}
            <li>
              <strong>{"Expiration:"}</strong>
              {
                " Purchased credit packages do not expire. They remain on your account until fully used."
              }
            </li>
            {"\n                    "}
            <li>
              <strong>{"Refunds:"}</strong>
              {
                " Since credits are consumed instantly upon a successful AI response, they are non-refundable once used."
              }
            </li>
            {"\n                "}
          </ul>
          {"\n            "}
        </section>
        {"\n\n            "}
        <section id="security">
          {"\n                "}
          <h2>
            <i className="fas fa-user-shield"></i>
            {" Data Residency & Prompt Privacy"}
          </h2>
          {"\n                "}
          <p>
            {
              "Your privacy is our priority. We handle your data with professional-grade security."
            }
          </p>
          {"\n                "}
          <div className="relationship-grid">
            {"\n                    "}
            <div className="relation-block">
              {"\n                        "}
              <h3>{"No Training"}</h3>
              {"\n                        "}
              <p>
                {"We "}
                <strong>{"never"}</strong>
                {
                  " use your prompts or AI responses to train our own models or sell them to third parties."
                }
              </p>
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className="relation-block">
              {"\n                        "}
              <h3>{"Encryption"}</h3>
              {"\n                        "}
              <p>
                {
                  "All interactions between your browser and Genyxo are encrypted via SSL. Data sent to AI providers is anonymized where possible."
                }
              </p>
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n            "}
        </section>
        {"\n\n            "}
        <section id="prohibited" className="legal-section">
          {"\n                "}
          <h2>
            <i className="fas fa-ban"></i>
            {" Prohibited Use"}
          </h2>
          {"\n                "}
          <p>{"To keep Genyxo safe, you agree not to use the service to:"}</p>
          {"\n                "}
          <div className="warning-box">
            {"\n                    "}
            <ul>
              {"\n                        "}
              <li>
                {"Generate illegal, harmful, or sexually explicit content."}
              </li>
              {"\n                        "}
              <li>
                {
                  "Attempt to bypass credit costs or exploit the platform's infrastructure."
                }
              </li>
              {"\n                        "}
              <li>
                {
                  "Use automated scripts (bots) to access the platform without prior written consent."
                }
              </li>
              {"\n                        "}
              <li>
                {
                  "Deceive others by claiming AI-generated content is 100% human-made for fraudulent purposes."
                }
              </li>
              {"\n                    "}
            </ul>
            {"\n                "}
          </div>
          {"\n            "}
        </section>
        {"\n\n            "}
        <section id="referral" className="legal-section">
          {"\n                "}
          <h2>
            <i className="fas fa-users"></i>
            {" Affiliate & Referral Terms"}
          </h2>
          {"\n                "}
          <p>
            {
              "Grow with Genyxo! Our referral program allows you to earn credits by inviting others."
            }
          </p>
          {"\n                "}
          <div className="referral-logic">
            {"\n                    "}
            <div className="step">
              {"\n                        "}
              <span className="step-num">{"1"}</span>
              {"\n                        "}
              <p>
                {"Share your unique referral link found in your dashboard."}
              </p>
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className="step">
              {"\n                        "}
              <span className="step-num">{"2"}</span>
              {"\n                        "}
              <p>
                {
                  "When a new user signs up, they get a welcome bonus (if applicable)."
                }
              </p>
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className="step">
              {"\n                        "}
              <span className="step-num">{"3"}</span>
              {"\n                        "}
              <p>
                <strong>{"Your Reward:"}</strong>
                {
                  " You receive a percentage of credits every time your referral tops up their balance."
                }
              </p>
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n                "}
          <p className="small-note">
            {
              "Note: Creating multiple accounts to refer yourself (self-referral) is strictly prohibited and will lead to an immediate ban and loss of credits."
            }
          </p>
          {"\n            "}
        </section>
        {"\n\n            "}
        <section id="support" className="legal-section">
          {"\n                "}
          <h2>
            <i className="fas fa-headset"></i>
            {" Support & Disputing Charges"}
          </h2>
          {"\n                "}
          <p>
            {
              "We strive for a seamless experience, but technology can sometimes fail. If a credit deduction occurs without a successful AI response, here is our protocol:"
            }
          </p>
          {"\n                \n                "}
          <div className="info-card">
            {"\n                    "}
            <h3>{"Technical Errors"}</h3>
            {"\n                    "}
            <p>
              {
                "If the AI model returns a system error or fails to generate a response due to a technical glitch on our side, "
              }
              <strong>{"credits should not be deducted"}</strong>
              {". If you notice a discrepancy, please contact us."}
            </p>
            {"\n                "}
          </div>
          {"\n\n                "}
          <div className="dispute-process">
            {"\n                    "}
            <h3>{"How to dispute a charge:"}</h3>
            {"\n                    "}
            <ol>
              {"\n                        "}
              <li>
                {"Contact our support via Telegram "}
                <strong>{"@gmblessed"}</strong>
                {" or email "}
                <strong>{"info@genyxo.com"}</strong>
                {"."}
              </li>
              {"\n                        "}
              <li>
                {
                  "Provide your account email and the approximate time of the failed request."
                }
              </li>
              {"\n                        "}
              <li>
                {"Disputes must be submitted within "}
                <strong>{"14 days"}</strong>
                {" of the incident."}
              </li>
              {"\n                    "}
            </ol>
            {"\n                "}
          </div>
          {"\n                "}
          <p className="small-note">
            {
              'Please note: We do not refund credits if you simply "dislike" the AI\'s answer, as the computational cost remains the same.'
            }
          </p>
          {"\n            "}
        </section>
        {"\n\n            "}
        <section id="about" className="legal-section">
          {"\n                "}
          <h2>
            <i className="fas fa-info-circle"></i>
            {" About these Terms"}
          </h2>
          {"\n                "}
          <p>
            {
              "By law, you have certain rights that can’t be limited by a contract like these Terms of Service. These terms are in no way intended to restrict those rights."
            }
          </p>
          {"\n                \n                "}
          <div className="relationship-grid">
            {"\n                    "}
            <div className="relation-block">
              {"\n                        "}
              <h3>{"Changes to these terms"}</h3>
              {"\n                        "}
              <p>
                {
                  "We may update these terms to reflect changes in our service or how we do business. If we make material changes, we’ll provide you with reasonable advance notice and the opportunity to review the changes."
                }
              </p>
              {"\n                    "}
            </div>
            {"\n                    "}
            <div className="relation-block">
              {"\n                        "}
              <h3>{"Disclaimers"}</h3>
              {"\n                        "}
              <p>
                {
                  "We provide our services using a statistically reasonable level of skill and care. If we don’t meet the quality level described in this warranty, you agree to tell us and we will work with you to solve the issue."
                }
              </p>
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n\n                "}
          <div className="about-footer-box">
            {"\n                    "}
            <h3>{"Contact & Legal"}</h3>
            {"\n                    "}
            <p>
              {
                "If you have questions about these terms, you can contact Genyxo at any time. These terms are governed by the laws of the jurisdiction where Genyxo is registered, and any disputes will be settled in the corresponding courts."
              }
            </p>
            {"\n                    "}
            <div className="contact-links">
              {"\n                        "}
              <a href="mailto:info@genyxo.com">{"Email Support"}</a>
              {"\n                        "}
              <a href="https://t.me/gmblessed" target="_blank">
                {"Telegram Support"}
              </a>
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n            "}
        </section>
        {"\n        "}
      </main>
      {"\n    "}
    </div>
  );
}
