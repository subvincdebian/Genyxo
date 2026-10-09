'use client';
import { useController } from '@/shared/lib/use-controller';
import { ProfileToastContainer, ProfileNavbar, ProfileMobileMenu, ProfileMenuOverlay, ProfileProfilePage, ProfileFaqWindow, ProfileLangModal } from '@/widgets/profile';
const loadController=()=>import('../model/initialize').then(module=>module.default);
export function ProfilePage(){const dispatch=useController(loadController);return <><ProfileToastContainer dispatch={dispatch}/><ProfileNavbar dispatch={dispatch}/><ProfileMobileMenu dispatch={dispatch}/><ProfileMenuOverlay dispatch={dispatch}/><ProfileProfilePage dispatch={dispatch}/><ProfileFaqWindow dispatch={dispatch}/><ProfileLangModal dispatch={dispatch}/></>;}