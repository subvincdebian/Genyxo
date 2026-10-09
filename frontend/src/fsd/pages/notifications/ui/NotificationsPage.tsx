'use client';
import { useController } from '@/shared/lib/use-controller';
import { NotificationsToastContainer, NotificationsNavbar, NotificationsNotifContainer, NotificationsFaqWindow, NotificationsLangModal } from '@/widgets/notifications';
const loadController=()=>import('../model/initialize').then(module=>module.default);
export function NotificationsPage(){const dispatch=useController(loadController);return <><NotificationsToastContainer dispatch={dispatch}/><NotificationsNavbar dispatch={dispatch}/><NotificationsNotifContainer dispatch={dispatch}/><NotificationsFaqWindow dispatch={dispatch}/><NotificationsLangModal dispatch={dispatch}/></>;}