'use client';
import { useController } from '@/shared/lib/use-controller';
import { FaqToastContainer, FaqOverlay, FaqNavbar, FaqLegalNavWrapper, FaqPrivacyLayout, FaqFooter } from '@/widgets/faq';
const loadController=()=>import('../model/initialize').then(module=>module.default);
export function FaqPage(){const dispatch=useController(loadController);return <><FaqToastContainer dispatch={dispatch}/><FaqOverlay dispatch={dispatch}/><FaqNavbar dispatch={dispatch}/><FaqLegalNavWrapper dispatch={dispatch}/><FaqPrivacyLayout dispatch={dispatch}/><FaqFooter dispatch={dispatch}/></>;}