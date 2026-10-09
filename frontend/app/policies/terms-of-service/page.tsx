import type { Metadata } from 'next';
import { TermsOfServicePage } from '@/pages/terms-of-service';
import '@/shared/styles/policies.css';
import '@/shared/styles/profile.css';
import '@/shared/styles/style.css';


export const metadata:Metadata={"title":"Terms of Service - Genyxo","description":"Learn more about our Terms of Service, including user responsibilities, content guidelines, and support policies. Your relationship with Genyxo and how we provide access to AI models.","robots":{"index":true,"follow":true},"alternates":{"canonical":"https://genyxo.com/policies/terms-of-service.html"}};
export default function Page(){return <><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"/><TermsOfServicePage/></>;}