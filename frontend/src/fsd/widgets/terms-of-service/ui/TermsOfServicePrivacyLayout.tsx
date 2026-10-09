'use client';
import type { SyntheticEvent } from 'react';

export function TermsOfServicePrivacyLayout({dispatch}: {dispatch:(name:string,event:SyntheticEvent<Element>)=>unknown}) { return (<div className="privacy-layout">
        <aside className="privacy-sidebar" id="sidebar">
            <nav>
                <ul>
                    <li><a href="#intro" onClick={event => dispatch("terms-of-service-15", event)}>{"Introduction"}</a></li>
                    <li><a href="#data-collect" onClick={event => dispatch("terms-of-service-16", event)}>{"Your relationship with Genyxo"}</a></li>
                    <li><a href="#service-specifics" onClick={event => dispatch("terms-of-service-17", event)}>{" AI Service Specifics"}</a></li>
                    <li><a href="#credits" onClick={event => dispatch("terms-of-service-18", event)}>{"Credit Consumption & Expiration"}</a></li>
                    <li><a href="#security" onClick={event => dispatch("terms-of-service-19", event)}>{"Data Residency & Prompt Privacy"}</a></li>
                    <li><a href="#prohibited" onClick={event => dispatch("terms-of-service-20", event)}>{"Prohibited Use"}</a></li>
                    <li><a href="#referral" onClick={event => dispatch("terms-of-service-21", event)}>{"Affiliate & Referral Terms"}</a></li>
                    <li><a href="#support" onClick={event => dispatch("terms-of-service-22", event)}>{"Support & Disputing Charges"}</a></li>
                    <li><a href="#about" onClick={event => dispatch("terms-of-service-23", event)}>{"About these Terms"}</a></li>
                </ul>
            </nav>
        </aside>

        <main className="privacy-body">
            <section id="intro">
                <h1>{"Terms of Service"}</h1>
                <p><strong>{"Last updated:"}</strong>{" March 6, 2026"}</p>
                <p>{"We know reading the Terms of Service can be daunting. However, "}<br />{" it's important that you understand the rules of conduct when using "}<br />{" our services , as well as Genyxo's rights and responsibilities."}</p>
                <h2>{"What is considered in these terms"}</h2>
                <div className="tos-container">
                    <p>{"These Terms of Service reflect "}<a href="#">{"Genyxo's bussiness model"}</a>{", applicable law, and"}<a href="#">{" our company principles"}</a>{". These Terms therefore govern your relationship with Genyxo when using our services. These Terms include the following sections:"}</p>

                    <ul className="tos-list">
                        <li>
                            <a href="#">{"What We Do for You"}</a>{". This section explains how we provide and develop our services.\n                        "}</li>
                        <li>
                            <a href="#">{"What we expect from you"}</a>{".  Here are the rules for using our services.\n                        "}</li>
                        <li>
                            <a href="#">{"Content on Genyxo Services"}</a>{". This section explains the intellectual property rights associated with content published by you, other users, or Genyxo on our services.\n                        "}</li>
                        <li>
                            <a href="#">{"Problems and Disputes"}</a>{". This section describes your other legal rights and what to do if you violate these terms.\n                        "}</li>
                    </ul>

                    <p>{"It is important that you read these terms because you agree to them by accessing or using our services."}</p>

                    <p>{"We also recommend that you read our "}<a href="/policies/privacy-policy.html">{"Privacy Policy"}</a>{". It is not part of these terms. It explains how you can "}<a href="/profile.html">{"change, export, delete your data and manage it"}</a>{"."}</p>

                    <h2>{"Terms of Use"}</h2>

                    

                    <h3>{"Age restrictions"}</h3>
                    <p>{"If you are not yet "}<a href="#">{"old enough to manage Genyxo Account"}</a>{", you may use it only with permission from a parent or legal guardian. To do so, your parent or legal guardian must review these terms with you."}</p>
                    
                    <p>{"If you are a parent or legal guardian of a child and allow them to use "}<a href="#">{"Genyxo services"}</a>{", these terms apply to you and you are responsible for your child's activities on our services."}</p>
                    
                    <p>{"Some Genyxo services have specific age restrictions. These are specified in "}<a href="#">{"the additional terms and conditions for each service"}</a>{"."}</p>
                </div>
            </section>

            <hr />

            <section id="data-collect">
                <h2>{"Your relationship with Genyxo"}</h2>
                <p>{"These terms help define the relationship between you and Genyxo. Broadly speaking, we give you permission to use our services if you agree to follow these terms, which reflect how Genyxo’s business works and how we earn money."}</p>
                
                <div className="relationship-grid">
                    <div className="relation-block">
                        <h3>{"What you can expect from us"}</h3>
                        <p>{"Genyxo provides a unified interface to interact with various Artificial Intelligence models. Our service includes:"}</p>
                        <ul>
                            <li><strong>{"Access to AI Models:"}</strong>{" We provide a stable bridge to industry-leading AI models using our proprietary credit-based system."}</li>
                            <li><strong>{"Credit Management:"}</strong>{" We ensure accurate accounting of your purchased credit packages and their consumption based on the complexity of your requests."}</li>
                            <li><strong>{"Continuous Improvement:"}</strong>{" We constantly update our platform, adding new models and features to enhance your experience."}</li>
                        </ul>
                    </div>

                    <div className="relation-block">
                        <h3>{"What we expect from you"}</h3>
                        <p>{"In exchange for access to these powerful tools, we expect you to act responsibly:"}</p>
                        <ul>
                            <li><strong>{"Compliance:"}</strong>{" Follow these terms and any model-specific usage policies (e.g., OpenAI or other companies policies)."}</li>
                            <li><strong>{"Fair Usage:"}</strong>{" Do not attempt to bypass credit costs, reverse-engineer the platform, or use automated scripts to abuse the service."}</li>
                            <li><strong>{"Content Responsibility:"}</strong>{" You are responsible for the prompts you send and how you use the resulting AI-generated content."}</li>
                        </ul>
                    </div>
                </div>

                <div className="highlight-box">
                    <h3>{"Understanding Credits & Usage"}</h3>
                    <p>{"\n                        Genyxo operates on a \"Pay-as-you-go\" basis via credit packages. \n                        "}<strong>{"1 message ≠ 1 credit."}</strong>{" The cost of each interaction depends on the specific AI model chosen, the length of your input, and the complexity of the generated response (tokens). \n                        By using the service, you acknowledge that credits are non-refundable once consumed by an AI request.\n                    "}</p>
                </div>

                <div className="relation-block">
                    <h3>{"Content in Genyxo services"}</h3>
                    <p>{"\n                        Some of our services allow you to generate original content. Genyxo does not claim ownership of the output generated by AI models based on your prompts. \n                        However, please note that AI models can occasionally produce incorrect, biased, or \"hallucinated\" information. Genyxo is a provider of "}<strong>{"access"}</strong>{", not the author of the AI's responses.\n                    "}</p>
                </div>
            </section>

            <section id="service-specifics">
                <h2><i className="fas fa-microchip"></i>{" AI Service Specifics"}</h2>
                <p>{"Genyxo provides access to third-party artificial intelligence models (such as GPT-4, Claude, Gemini, etc.) through a unified interface. By using our service, you acknowledge:"}</p>
                <div className="info-card">
                    <ul>
                        <li><strong>{"Model Authorship:"}</strong>{" Genyxo does not develop these models. The output is generated by the respective third-party providers."}</li>
                        <li><strong>{"Accuracy:"}</strong>{" AI can provide inaccurate information or \"hallucinations\". We recommend verifying critical data."}</li>
                        <li><strong>{"Availability:"}</strong>{" Access to specific models depends on the uptime of the respective API providers."}</li>
                    </ul>
                </div>
            </section>

            <section id="credits">
                <h2><i className="fas fa-coins"></i>{" Credit Consumption & Expiration"}</h2>
                <p>{"We believe in simplicity. Unlike other platforms, Genyxo uses a "}<strong>{"fixed-price per message"}</strong>{" system."}</p>
                <div className="highlight-box">
                    <p><strong>{"Simple Billing:"}</strong>{" Every time you send a message, a fixed number of credits is deducted from your balance based on the selected model. The cost is the same regardless of the length of your prompt or the AI's response."}</p>
                </div>
                <ul>
                    <li><strong>{"Transparency:"}</strong>{" The cost per message is clearly displayed in the model selection menu."}</li>
                    <li><strong>{"Expiration:"}</strong>{" Purchased credit packages do not expire. They remain on your account until fully used."}</li>
                    <li><strong>{"Refunds:"}</strong>{" Since credits are consumed instantly upon a successful AI response, they are non-refundable once used."}</li>
                </ul>
            </section>

            <section id="security">
                <h2><i className="fas fa-user-shield"></i>{" Data Residency & Prompt Privacy"}</h2>
                <p>{"Your privacy is our priority. We handle your data with professional-grade security."}</p>
                <div className="relationship-grid">
                    <div className="relation-block">
                        <h3>{"No Training"}</h3>
                        <p>{"We "}<strong>{"never"}</strong>{" use your prompts or AI responses to train our own models or sell them to third parties."}</p>
                    </div>
                    <div className="relation-block">
                        <h3>{"Encryption"}</h3>
                        <p>{"All interactions between your browser and Genyxo are encrypted via SSL. Data sent to AI providers is anonymized where possible."}</p>
                    </div>
                </div>
            </section>

            <section id="prohibited" className="legal-section">
                <h2><i className="fas fa-ban"></i>{" Prohibited Use"}</h2>
                <p>{"To keep Genyxo safe, you agree not to use the service to:"}</p>
                <div className="warning-box">
                    <ul>
                        <li>{"Generate illegal, harmful, or sexually explicit content."}</li>
                        <li>{"Attempt to bypass credit costs or exploit the platform's infrastructure."}</li>
                        <li>{"Use automated scripts (bots) to access the platform without prior written consent."}</li>
                        <li>{"Deceive others by claiming AI-generated content is 100% human-made for fraudulent purposes."}</li>
                    </ul>
                </div>
            </section>

            <section id="referral" className="legal-section">
                <h2><i className="fas fa-users"></i>{" Affiliate & Referral Terms"}</h2>
                <p>{"Grow with Genyxo! Our referral program allows you to earn credits by inviting others."}</p>
                <div className="referral-logic">
                    <div className="step">
                        <span className="step-num">{"1"}</span>
                        <p>{"Share your unique referral link found in your dashboard."}</p>
                    </div>
                    <div className="step">
                        <span className="step-num">{"2"}</span>
                        <p>{"When a new user signs up, they get a welcome bonus (if applicable)."}</p>
                    </div>
                    <div className="step">
                        <span className="step-num">{"3"}</span>
                        <p><strong>{"Your Reward:"}</strong>{" You receive a percentage of credits every time your referral tops up their balance."}</p>
                    </div>
                </div>
                <p className="small-note">{"Note: Creating multiple accounts to refer yourself (self-referral) is strictly prohibited and will lead to an immediate ban and loss of credits."}</p>
            </section>

            <section id="support" className="legal-section">
                <h2><i className="fas fa-headset"></i>{" Support & Disputing Charges"}</h2>
                <p>{"We strive for a seamless experience, but technology can sometimes fail. If a credit deduction occurs without a successful AI response, here is our protocol:"}</p>
                
                <div className="info-card">
                    <h3>{"Technical Errors"}</h3>
                    <p>{"If the AI model returns a system error or fails to generate a response due to a technical glitch on our side, "}<strong>{"credits should not be deducted"}</strong>{". If you notice a discrepancy, please contact us."}</p>
                </div>

                <div className="dispute-process">
                    <h3>{"How to dispute a charge:"}</h3>
                    <ol>
                        <li>{"Contact our support via Telegram "}<strong>{"@gmblessed"}</strong>{" or email "}<strong>{"info@genyxo.com"}</strong>{"."}</li>
                        <li>{"Provide your account email and the approximate time of the failed request."}</li>
                        <li>{"Disputes must be submitted within "}<strong>{"14 days"}</strong>{" of the incident."}</li>
                    </ol>
                </div>
                <p className="small-note">{"Please note: We do not refund credits if you simply \"dislike\" the AI's answer, as the computational cost remains the same."}</p>
            </section>

            <section id="about" className="legal-section">
                <h2><i className="fas fa-info-circle"></i>{" About these Terms"}</h2>
                <p>{"By law, you have certain rights that can’t be limited by a contract like these Terms of Service. These terms are in no way intended to restrict those rights."}</p>
                
                <div className="relationship-grid">
                    <div className="relation-block">
                        <h3>{"Changes to these terms"}</h3>
                        <p>{"We may update these terms to reflect changes in our service or how we do business. If we make material changes, we’ll provide you with reasonable advance notice and the opportunity to review the changes."}</p>
                    </div>
                    <div className="relation-block">
                        <h3>{"Disclaimers"}</h3>
                        <p>{"We provide our services using a statistically reasonable level of skill and care. If we don’t meet the quality level described in this warranty, you agree to tell us and we will work with you to solve the issue."}</p>
                    </div>
                </div>

                <div className="about-footer-box">
                    <h3>{"Contact & Legal"}</h3>
                    <p>{"If you have questions about these terms, you can contact Genyxo at any time. These terms are governed by the laws of the jurisdiction where Genyxo is registered, and any disputes will be settled in the corresponding courts."}</p>
                    <div className="contact-links">
                        <a href="mailto:info@genyxo.com">{"Email Support"}</a>
                        <a href="https://t.me/gmblessed" target="_blank">{"Telegram Support"}</a>
                    </div>
                </div>
            </section>
        </main>
    </div>); }
