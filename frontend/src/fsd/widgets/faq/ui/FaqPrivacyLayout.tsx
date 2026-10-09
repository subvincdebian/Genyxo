'use client';
import type { SyntheticEvent } from 'react';

export function FaqPrivacyLayout({dispatch}: {dispatch:(name:string,event:SyntheticEvent<Element>)=>unknown}) { return (<div className="privacy-layout">
        <aside className="privacy-sidebar" id="sidebar">
            <nav>
                <ul>
                    <li><a href="#intro" onClick={event => dispatch("faq-11", event)}>{"Introduction"}</a></li>
                    <li><a href="#general" onClick={event => dispatch("faq-12", event)}>{"General Questions"}</a></li>
                    <li><a href="#credits" onClick={event => dispatch("faq-13", event)}>{"Credits & Billing"}</a></li>
                    <li><a href="#models" onClick={event => dispatch("faq-14", event)}>{"AI Models & Usage"}</a></li>
                    <li><a href="#privacy" onClick={event => dispatch("faq-15", event)}>{"Privacy & Security"}</a></li>
                    <li><a href="#troubleshooting" onClick={event => dispatch("faq-16", event)}>{"Troubleshooting"}</a></li>
                </ul>
            </nav>
        </aside>

        <main className="privacy-body">
            <section id="intro">
                <h1>{"Frequently Asked Questions"}</h1>
                <p><strong>{"Last updated:"}</strong>{" March 6, 2026"}</p>
                <p>{"Welcome to the Genyxo Help Center. We’ve compiled answers to the most common questions to help you understand how our platform works, how credits are managed, and how to get the most out of your AI interactions."}</p>
            </section>

            <hr />

            <section id="general">
                <h2><i className="fas fa-info-circle"></i>{" General Questions"}</h2>
                
                <div className="tos-container">
                    <h3>{"What is Genyxo?"}</h3>
                    <p>{"Genyxo is a unified platform that provides manual access to the latest artificial intelligence models (like GPT-4, Claude, Gemini, etc.) all in one place. Instead of buying multiple subscriptions for different AI services, you can use our single interface to interact with any model you need."}</p>
                    
                    <h3>{"Do I need multiple accounts for different AI models?"}</h3>
                    <p>{"No. One of the main benefits of Genyxo is that you only need "}<strong>{"one account"}</strong>{" with us to access a wide variety of both paid and free AI models from different providers."}</p>
                </div>
            </section>

            <section id="credits">
                <h2><i className="fas fa-coins"></i>{" Credits & Billing"}</h2>
                
                <div className="relationship-grid">
                    <div className="relation-block">
                        <h3>{"How does the credit system work?"}</h3>
                        <p>{"We use a transparent \"Pay-as-you-go\" system. You purchase a package of credits, and every time you send a message to an AI, a fixed amount of credits is deducted. The cost is static per message but varies depending on which AI model you choose (e.g., smarter models cost more credits per message)."}</p>
                    </div>

                    <div className="relation-block">
                        <h3>{"Do my credits expire?"}</h3>
                        <p>{"No. Your purchased credit packages do not expire. They will remain securely in your Genyxo account until you decide to use them."}</p>
                    </div>
                </div>

                <div className="highlight-box">
                    <h3>{"Are credit costs affected by message length?"}</h3>
                    <p>{"No! Unlike API providers that charge by \"tokens\" (which means long texts cost you more), Genyxo charges a "}<strong>{"fixed price per message"}</strong>{". The cost remains the same regardless of how long your prompt is or how detailed the AI's response is."}</p>
                </div>

                <div className="tos-container">
                    <h3>{"Can I get a refund if the AI gives a bad answer?"}</h3>
                    <p>{"Since the computational cost on our end remains the same regardless of the content of the response, credits are non-refundable once an AI successfully generates an answer. We recommend tweaking your prompt for better results."}</p>
                </div>
            </section>

            <section id="models">
                <h2><i className="fas fa-microchip"></i>{" AI Models & Usage"}</h2>
                
                <div className="tos-container">
                    <h3>{"Which models are available on Genyxo?"}</h3>
                    <p>{"We continuously update our library to include industry-leading models. Currently, you can access top-tier models from OpenAI, Anthropic, Google, and others. The full list and their fixed per-message prices are always visible in your chat interface."}</p>

                    <h3>{"Why did the AI give me incorrect information?"}</h3>
                    <p>{"Artificial Intelligence models can occasionally produce inaccurate information, biased content, or \"hallucinations\" (invented facts). Genyxo provides the bridge to these models, but we do not author their responses. Always verify critical or sensitive data."}</p>
                </div>
            </section>

            <section id="privacy">
                <h2><i className="fas fa-user-shield"></i>{" Privacy & Security"}</h2>
                
                <div className="info-card">
                    <h3>{"Does Genyxo use my data to train models?"}</h3>
                    <p><strong>{"Absolutely not."}</strong>{" We never use your prompts, conversations, or generated content to train our own models, nor do we sell your interaction data to third parties."}</p>
                </div>

                <div className="tos-container">
                    <h3>{"Are my conversations private?"}</h3>
                    <p>{"Yes. All interactions between your browser and Genyxo are encrypted via standard SSL technology. Data sent to the third-party AI providers is handled securely and anonymized wherever possible according to our Privacy Policy."}</p>
                </div>
            </section>

            <section id="troubleshooting" className="legal-section">
                <h2><i className="fas fa-headset"></i>{" Troubleshooting & Support"}</h2>
                
                <div className="dispute-process">
                    <h3>{"What if a system error occurs and my credits are gone?"}</h3>
                    <p>{"If an AI model fails to generate a response due to a technical glitch or server timeout on our end, your credits "}<strong>{"should not be deducted"}</strong>{". If you notice an unfair deduction:"}</p>
                    <ol>
                        <li>{"Write to our Telegram support: "}<strong>{"@gmblessed"}</strong></li>
                        <li>{"Or email us at: "}<strong>{"info@genyxo.com"}</strong></li>
                        <li>{"Include your account email and the approximate time of the error."}</li>
                    </ol>
                    <p className="small-note">{"Please remember to dispute any charges within 14 days of the incident."}</p>
                </div>
            </section>
        </main>
    </div>); }
