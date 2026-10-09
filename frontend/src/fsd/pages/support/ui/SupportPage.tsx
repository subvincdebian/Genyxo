'use client';
import { useController } from '@/shared/lib/use-controller';
import { SupportNavbar, SupportSupportContainer, SupportFaqWindow, SupportLangModal } from '@/widgets/support';
const loadController=()=>import('../model/initialize').then(module=>module.default);
export function SupportPage(){const dispatch=useController(loadController);return <><SupportNavbar dispatch={dispatch}/><SupportSupportContainer dispatch={dispatch}/><SupportFaqWindow dispatch={dispatch}/><SupportLangModal dispatch={dispatch}/></>;}