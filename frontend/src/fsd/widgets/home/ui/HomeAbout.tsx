'use client';
import type { SyntheticEvent } from 'react';

export function HomeAbout({}: {dispatch:(name:string,event:SyntheticEvent<Element>)=>unknown}) { return (<section className="about-section" id="about">
        <div className="about-bg-blur"></div>
        
        <div className="about-container">
            <div className="about-header">
                <h2 className="about-title">{"\n                    About Us\n                    "}<span className="title-underline"></span>
                </h2>
            </div>

            <div className="about-text-content">
                <p>{"\n                    We provide seamless access to today's most powerful AI platforms – from cutting-edge language models \n                    like ChatGPT and Claude to creative tools like Midjourney and DALL-E, all in one chat.\n                "}</p>
                <p className="text-secondary">{"\n                    Our mission is to empower creators, entrepreneurs and everyday users with the tools they need to succeed in the AI era.\n                "}</p>
            </div>

            <div className="features-grid">
                <div className="feature-card group">
                    <div className="card-icon-wrapper">
                        <div className="card-icon-bg">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                                <path d="M2 17L12 22L22 17" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                                <path d="M2 12L12 17L22 12" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                            </svg>
                        </div>
                    </div>
                    <h3>{"Instant Access"}</h3>
                    <p>{"Get immediate access to all premium AI tools without waitlists or separate subscriptions."}</p>
                </div>

                <div className="feature-card group">
                    <div className="card-icon-wrapper">
                        <div className="card-icon-bg">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 1V23" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                                <path d="M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3688 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                            </svg>
                        </div>
                    </div>
                    <h3>{"Smart Savings"}</h3>
                    <p>{"Save money with bundled pricing compared to buying individual subscriptions for each service."}</p>
                </div>

                <div className="feature-card group">
                    <div className="card-icon-wrapper">
                        <div className="card-icon-bg">
                            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M16 4L23 7.5V14C23 19.5 16 24 16 24C16 24 9 19.5 9 14V7.5L16 4Z" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                <path d="M13 15L15 17L19 13" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"></path>
                            </svg>
                        </div>
                    </div>
                    <h3>{"Premium Quality"}</h3>
                    <p>{"Experience the highest tier performance and speed across all integrated platforms."}</p>
                </div>

            </div>
        </div>
    </section>); }
