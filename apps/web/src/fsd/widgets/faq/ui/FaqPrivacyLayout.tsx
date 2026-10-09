"use client";
import type { SyntheticEvent } from "react";

export function FaqPrivacyLayout({
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
              <a href="#intro" onClick={(event) => dispatch("faq-11", event)}>
                {"Introduction"}
              </a>
            </li>
            {"\n                    "}
            <li>
              <a href="#general" onClick={(event) => dispatch("faq-12", event)}>
                {"General Questions"}
              </a>
            </li>
            {"\n                    "}
            <li>
              <a href="#credits" onClick={(event) => dispatch("faq-13", event)}>
                {"Credits & Billing"}
              </a>
            </li>
            {"\n                    "}
            <li>
              <a href="#models" onClick={(event) => dispatch("faq-14", event)}>
                {"AI Models & Usage"}
              </a>
            </li>
            {"\n                    "}
            <li>
              <a href="#privacy" onClick={(event) => dispatch("faq-15", event)}>
                {"Privacy & Security"}
              </a>
            </li>
            {"\n                    "}
            <li>
              <a
                href="#troubleshooting"
                onClick={(event) => dispatch("faq-16", event)}
              >
                {"Troubleshooting"}
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
          <h1>{"Frequently Asked Questions"}</h1>
          {"\n                "}
          <p>
            <strong>{"Last updated:"}</strong>
            {" March 6, 2026"}
          </p>
          {"\n                "}
          <p>
            {
              "Welcome to the Genyxo Help Center. We’ve compiled answers to the most common questions to help you understand how our platform works, how credits are managed, and how to get the most out of your AI interactions."
            }
          </p>
          {"\n            "}
        </section>
        {"\n\n            "}
        <hr />
        {"\n\n            "}
        <section id="general">
          {"\n                "}
          <h2>
            <i className="fas fa-info-circle"></i>
            {" General Questions"}
          </h2>
          {"\n                \n                "}
          <div className="tos-container">
            {"\n                    "}
            <h3>{"What is Genyxo?"}</h3>
            {"\n                    "}
            <p>
              {
                "Genyxo is a unified platform that provides manual access to the latest artificial intelligence models (like GPT-4, Claude, Gemini, etc.) all in one place. Instead of buying multiple subscriptions for different AI services, you can use our single interface to interact with any model you need."
              }
            </p>
            {"\n                    \n                    "}
            <h3>{"Do I need multiple accounts for different AI models?"}</h3>
            {"\n                    "}
            <p>
              {"No. One of the main benefits of Genyxo is that you only need "}
              <strong>{"one account"}</strong>
              {
                " with us to access a wide variety of both paid and free AI models from different providers."
              }
            </p>
            {"\n                "}
          </div>
          {"\n            "}
        </section>
        {"\n\n            "}
        <section id="credits">
          {"\n                "}
          <h2>
            <i className="fas fa-coins"></i>
            {" Credits & Billing"}
          </h2>
          {"\n                \n                "}
          <div className="relationship-grid">
            {"\n                    "}
            <div className="relation-block">
              {"\n                        "}
              <h3>{"How does the credit system work?"}</h3>
              {"\n                        "}
              <p>
                {
                  'We use a transparent "Pay-as-you-go" system. You purchase a package of credits, and every time you send a message to an AI, a fixed amount of credits is deducted. The cost is static per message but varies depending on which AI model you choose (e.g., smarter models cost more credits per message).'
                }
              </p>
              {"\n                    "}
            </div>
            {"\n\n                    "}
            <div className="relation-block">
              {"\n                        "}
              <h3>{"Do my credits expire?"}</h3>
              {"\n                        "}
              <p>
                {
                  "No. Your purchased credit packages do not expire. They will remain securely in your Genyxo account until you decide to use them."
                }
              </p>
              {"\n                    "}
            </div>
            {"\n                "}
          </div>
          {"\n\n                "}
          <div className="highlight-box">
            {"\n                    "}
            <h3>{"Are credit costs affected by message length?"}</h3>
            {"\n                    "}
            <p>
              {
                'No! Unlike API providers that charge by "tokens" (which means long texts cost you more), Genyxo charges a '
              }
              <strong>{"fixed price per message"}</strong>
              {
                ". The cost remains the same regardless of how long your prompt is or how detailed the AI's response is."
              }
            </p>
            {"\n                "}
          </div>
          {"\n\n                "}
          <div className="tos-container">
            {"\n                    "}
            <h3>{"Can I get a refund if the AI gives a bad answer?"}</h3>
            {"\n                    "}
            <p>
              {
                "Since the computational cost on our end remains the same regardless of the content of the response, credits are non-refundable once an AI successfully generates an answer. We recommend tweaking your prompt for better results."
              }
            </p>
            {"\n                "}
          </div>
          {"\n            "}
        </section>
        {"\n\n            "}
        <section id="models">
          {"\n                "}
          <h2>
            <i className="fas fa-microchip"></i>
            {" AI Models & Usage"}
          </h2>
          {"\n                \n                "}
          <div className="tos-container">
            {"\n                    "}
            <h3>{"Which models are available on Genyxo?"}</h3>
            {"\n                    "}
            <p>
              {
                "We continuously update our library to include industry-leading models. Currently, you can access top-tier models from OpenAI, Anthropic, Google, and others. The full list and their fixed per-message prices are always visible in your chat interface."
              }
            </p>
            {"\n\n                    "}
            <h3>{"Why did the AI give me incorrect information?"}</h3>
            {"\n                    "}
            <p>
              {
                'Artificial Intelligence models can occasionally produce inaccurate information, biased content, or "hallucinations" (invented facts). Genyxo provides the bridge to these models, but we do not author their responses. Always verify critical or sensitive data.'
              }
            </p>
            {"\n                "}
          </div>
          {"\n            "}
        </section>
        {"\n\n            "}
        <section id="privacy">
          {"\n                "}
          <h2>
            <i className="fas fa-user-shield"></i>
            {" Privacy & Security"}
          </h2>
          {"\n                \n                "}
          <div className="info-card">
            {"\n                    "}
            <h3>{"Does Genyxo use my data to train models?"}</h3>
            {"\n                    "}
            <p>
              <strong>{"Absolutely not."}</strong>
              {
                " We never use your prompts, conversations, or generated content to train our own models, nor do we sell your interaction data to third parties."
              }
            </p>
            {"\n                "}
          </div>
          {"\n\n                "}
          <div className="tos-container">
            {"\n                    "}
            <h3>{"Are my conversations private?"}</h3>
            {"\n                    "}
            <p>
              {
                "Yes. All interactions between your browser and Genyxo are encrypted via standard SSL technology. Data sent to the third-party AI providers is handled securely and anonymized wherever possible according to our Privacy Policy."
              }
            </p>
            {"\n                "}
          </div>
          {"\n            "}
        </section>
        {"\n\n            "}
        <section id="troubleshooting" className="legal-section">
          {"\n                "}
          <h2>
            <i className="fas fa-headset"></i>
            {" Troubleshooting & Support"}
          </h2>
          {"\n                \n                "}
          <div className="dispute-process">
            {"\n                    "}
            <h3>{"What if a system error occurs and my credits are gone?"}</h3>
            {"\n                    "}
            <p>
              {
                "If an AI model fails to generate a response due to a technical glitch or server timeout on our end, your credits "
              }
              <strong>{"should not be deducted"}</strong>
              {". If you notice an unfair deduction:"}
            </p>
            {"\n                    "}
            <ol>
              {"\n                        "}
              <li>
                {"Write to our Telegram support: "}
                <strong>{"@gmblessed"}</strong>
              </li>
              {"\n                        "}
              <li>
                {"Or email us at: "}
                <strong>{"info@genyxo.com"}</strong>
              </li>
              {"\n                        "}
              <li>
                {
                  "Include your account email and the approximate time of the error."
                }
              </li>
              {"\n                    "}
            </ol>
            {"\n                    "}
            <p className="small-note">
              {
                "Please remember to dispute any charges within 14 days of the incident."
              }
            </p>
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
