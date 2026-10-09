'use client';
import { useController } from '@/shared/lib/use-controller';
import { TermsOfServiceToastContainer, TermsOfServiceOverlay, TermsOfServiceNavbar, TermsOfServiceLegalNavWrapper, TermsOfServicePrivacyLayout, TermsOfServiceFooter } from '@/widgets/terms-of-service';
const loadController=()=>import('../model/initialize').then(module=>module.default);
export function TermsOfServicePage(){const dispatch=useController(loadController);return <><TermsOfServiceToastContainer dispatch={dispatch}/><TermsOfServiceOverlay dispatch={dispatch}/><TermsOfServiceNavbar dispatch={dispatch}/><TermsOfServiceLegalNavWrapper dispatch={dispatch}/><TermsOfServicePrivacyLayout dispatch={dispatch}/><TermsOfServiceFooter dispatch={dispatch}/></>;}