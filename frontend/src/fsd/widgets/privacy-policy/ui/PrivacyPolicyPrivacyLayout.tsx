'use client';
import type { SyntheticEvent } from 'react';

export function PrivacyPolicyPrivacyLayout({}: {dispatch:(name:string,event:SyntheticEvent<Element>)=>unknown}) { return (<div className="privacy-layout">
        <aside className="privacy-sidebar" id="sidebar">
            <nav>
                <ul>
                    <li><a href="#intro">{"Introduction"}</a></li>
                    <li><a href="#data-collect">{"What data do we collect?"}</a></li>
                    <li><a href="#why-collect">{"Why we collect data"}</a></li>
                    <li><a href="#third-party">{"AI Services & Third Parties"}</a></li>
                    <li><a href="#credits">{"Credits & Payments"}</a></li>
                    <li><a href="#respect-rights">{"Respecting others' rights"}</a></li>
                    <li><a href="#privacy-controls">{"Your Privacy Controls"}</a></li>
                    <li><a href="#security">{"Keeping your info secure"}</a></li>
                    <li><a href="#about">{"About this Policy"}</a></li>
                </ul>
            </nav>
        </aside>

        <main className="privacy-body">
            <section id="intro">
                <h1>{"Genyxo Privacy Policy"}</h1>
                <p><strong>{"Last updated:"}</strong>{" March 6, 2026"}</p>
                <br />
                <p>{"Welcome to Genyxo. When you use our services, you trust us with your personal information and your AI conversations. We take this responsibility seriously and are committed to protecting your privacy while putting you in control."}</p>
                <p>{"This Privacy Policy is meant to help you understand what information we collect, why we collect it, and how you can manage, export, and delete your information."}</p>
            </section>

            <hr />

            <section id="data-collect">
                <h2>{"What data do we collect?"}</h2>
                <p>{"We want you to understand the types of information we collect as you use our services to provide you with a seamless experience."}</p>
                
                <h3>{"Information you provide to us"}</h3>
                <ul>
                    <li><strong>{"Account Information:"}</strong>{" When you create a Genyxo account, you provide us with personal information that includes your email address and a password."}</li>
                    <li><strong>{"Your Prompts and Content:"}</strong>{" We collect the text, files, and images you send as inputs (prompts) to the AI models, as well as the generated responses you receive."}</li>
                    <li><strong>{"Payment Information:"}</strong>{" When you purchase credit packages, you provide payment details. "}<strong>{"Note:"}</strong>{" We do not store your full credit card numbers. All transactions are securely processed by our trusted payment partners."}</li>
                </ul>

                <h3>{"Information we collect as you use our services"}</h3>
                <ul>
                    <li><strong>{"Usage Data:"}</strong>{" We collect data about your interactions with the platform, including which AI models you use (free or paid), the frequency of your requests, and your credit consumption."}</li>
                    <li><strong>{"Technical Information:"}</strong>{" We collect device and browser information, IP addresses, and log data to help us troubleshoot errors, prevent fraud, and optimize our website's performance."}</li>
                </ul>
            </section>

            <hr />

            <section id="why-collect">
                <h2>{"Why does Genyxo collect data?"}</h2>
                <p>{"We use the data we collect for the following essential purposes:"}</p>
                <ul>
                    <li><strong>{"Provide our services:"}</strong>{" To successfully route your prompts to the AI models you select and deliver the generated responses back to your chat interface."}</li>
                    <li><strong>{"Manage your balances:"}</strong>{" To accurately calculate and deduct credits based on the static cost of the specific AI model you choose for your query."}</li>
                    <li><strong>{"Maintain and improve Genyxo:"}</strong>{" To ensure our platform is working as intended, to track system outages, and to understand which AI models are most popular so we can introduce new features."}</li>
                    <li><strong>{"Communicate with you:"}</strong>{" To send you essential updates about your account, payment receipts, or changes to our policies."}</li>
                </ul>
            </section>

            <hr />

            <section id="third-party">
                <h2>{"AI Services & Third Parties"}</h2>
                <p>{"Genyxo acts as an aggregator platform, allowing you to access various AI models from different companies (e.g., OpenAI, Google, Anthropic, etc.) in one place."}</p>
                
                <h3>{"How your data is shared with AI Providers"}</h3>
                <p>{"To provide you with a response, we must securely transmit your specific prompt to the third-party provider of the AI model you selected. When doing so:"}</p>
                <ul>
                    <li>{"We transmit your prompt via secure API connections."}</li>
                    <li>{"We strive to minimize the sharing of your account metadata. The provider receives the content necessary to generate a response."}</li>
                    <li>{"We configure our API agreements with these providers to ensure that, whenever possible based on their business terms, your data is "}<strong>{"not used"}</strong>{" to train their public AI models."}</li>
                </ul>
                <p>{"We do not sell your personal information, email addresses, or chat histories to advertisers or any unauthorized third parties."}</p>
            </section>

            <hr />

            <section id="credits">
                <h2>{"Credits & Payments"}</h2>
                <p>{"Genyxo operates on a unified credit system. The cost of sending a message to an AI model is static and depends entirely on the specific model you choose to interact with."}</p>
                <p>{"Your payment data is securely processed by third-party payment gateways complying with strict PCI-DSS standards. We strictly track your credit usage to ensure accurate billing and deductions. You can review your transaction history and credit deductions at any time within your profile dashboard."}</p>
            </section>

            <hr />

            <section id="respect-rights">
                <h2>{"Respecting others' rights (Acceptable Use)"}</h2>
                <p>{"Because Genyxo serves as a bridge to third-party AI models, we must enforce strict safety guidelines to comply with the terms of our AI provider partners. We expect our users to respect the rights of others and the law."}</p>
                <p>{"By using Genyxo, you agree "}<strong>{"not"}</strong>{" to use our platform to generate, promote, or share:"}</p>
                <ul>
                    <li>{"Illegal content or activities."}</li>
                    <li>{"Hate speech, harassment, or abusive material."}</li>
                    <li>{"Highly explicit or non-consensual sexual content."}</li>
                    <li>{"Malware, phishing material, or harmful code."}</li>
                </ul>
                <p>{"We reserve the right to monitor usage patterns and suspend or terminate accounts that consistently violate these rules or attempt to bypass the safety filters of our partner AI models."}</p>
            </section>

            <hr />

            <section id="privacy-controls">
                <h2>{"Your Privacy Controls"}</h2>
                <p>{"You have control over the information you share with us. Through your account settings, you can:"}</p>
                <ul>
                    <li><strong>{"Delete specific chats:"}</strong>{" Remove individual conversations from your history."}</li>
                    <li><strong>{"Clear your data:"}</strong>{" Delete your entire chat history with all AI models."}</li>
                    <li><strong>{"Delete your account:"}</strong>{" If you choose to close your account, we will permanently delete your profile, chat history, and remaining credits from our active servers."}</li>
                </ul>
            </section>

            <hr />

            <section id="security">
                <h2>{"Keeping your information secure"}</h2>
                <p>{"We build security into Genyxo's core architecture to protect your information from unauthorized access, alteration, disclosure, or destruction."}</p>
                <ul>
                    <li>{"We use encryption (such as SSL/TLS) to keep your data private while in transit between your device, our servers, and our third-party AI providers."}</li>
                    <li>{"We restrict access to personal information to Genyxo employees, contractors, and agents who need that information in order to process it. Anyone with this access is subject to strict contractual confidentiality obligations."}</li>
                </ul>
            </section>

            <hr />

            <section id="about">
                <h2>{"About this Policy"}</h2>
                <p>{"We regularly review this Privacy Policy and make sure that we process your information in ways that comply with it."}</p>
                <p><strong>{"Changes to this policy"}</strong><br />{"We change this Privacy Policy from time to time. We will not reduce your rights under this Privacy Policy without your explicit consent. If changes are significant, we will provide a more prominent notice (including email notification of changes)."}</p>
                
                <p><strong>{"Contact Us"}</strong><br />{"If you have any questions about this Privacy Policy or how your data is handled, please contact our support team at "}<a href="mailto:info@genyxo.com" style={{"color":"#8ab4f8"}}>{"info@genyxo.com"}</a>{"."}</p>
            </section>
        </main>
    </div>); }
