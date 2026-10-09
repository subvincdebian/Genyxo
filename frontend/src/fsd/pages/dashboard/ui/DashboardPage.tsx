'use client';
import { useController } from '@/shared/lib/use-controller';
import { DashboardAdminNavbar, DashboardAdminLayout, DashboardSidebarOverlay } from '@/widgets/dashboard';
const loadController=()=>import('../model/initialize').then(module=>module.default);
export function DashboardPage(){const dispatch=useController(loadController);return <><DashboardAdminNavbar dispatch={dispatch}/><DashboardAdminLayout dispatch={dispatch}/><DashboardSidebarOverlay dispatch={dispatch}/></>;}