import type { Metadata } from 'next';
import { PoliciesPage } from '@/pages/policies';
import '@/shared/styles/policies.css';
import '@/shared/styles/profile.css';
import '@/shared/styles/style.css';


export const metadata:Metadata={"title":"Privacy Policy and Terms of Service - Genyxo","description":"Manage your Genyxo account settings, security options, billing history, and affiliate dashboard in one place.","robots":{"index":true,"follow":true},"alternates":{"canonical":"https://genyxo.com/policies/policies.html"}};
export default function Page(){return <><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"/><PoliciesPage/></>;}