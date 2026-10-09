'use client';
import { useController } from '@/shared/lib/use-controller';
import { PoliciesToastContainer, PoliciesOverlay, PoliciesNavbar, PoliciesLegalNavWrapper, PoliciesLegalContentWrapper, PoliciesMobileMenu, PoliciesMenuOverlay, PoliciesFooter } from '@/widgets/policies';
const loadController=()=>import('../model/initialize').then(module=>module.default);
export function PoliciesPage(){const dispatch=useController(loadController);return <><PoliciesToastContainer dispatch={dispatch}/><PoliciesOverlay dispatch={dispatch}/><PoliciesNavbar dispatch={dispatch}/><PoliciesLegalNavWrapper dispatch={dispatch}/><PoliciesLegalContentWrapper dispatch={dispatch}/><PoliciesMobileMenu dispatch={dispatch}/><PoliciesMenuOverlay dispatch={dispatch}/><PoliciesFooter dispatch={dispatch}/></>;}