'use client';
import { useController } from '@/shared/lib/use-controller';
import { PrivacyPolicyToastContainer, PrivacyPolicySidebarOverlay, PrivacyPolicyNavbar, PrivacyPolicyLegalNavWrapper, PrivacyPolicyPrivacyLayout, PrivacyPolicyFooter } from '@/widgets/privacy-policy';
const loadController=()=>import('../model/initialize').then(module=>module.default);
export function PrivacyPolicyPage(){const dispatch=useController(loadController);return <><PrivacyPolicyToastContainer dispatch={dispatch}/><PrivacyPolicySidebarOverlay dispatch={dispatch}/><PrivacyPolicyNavbar dispatch={dispatch}/><PrivacyPolicyLegalNavWrapper dispatch={dispatch}/><PrivacyPolicyPrivacyLayout dispatch={dispatch}/><PrivacyPolicyFooter dispatch={dispatch}/></>;}