'use client';
import { useController } from '@/shared/lib/use-controller';
import { AdminAdminLoader, AdminNavbar, AdminAdminContainer, AdminLangModal, AdminReplyModal } from '@/widgets/admin';
const loadController=()=>import('../model/initialize').then(module=>module.default);
export function AdminPage(){const dispatch=useController(loadController);return <><AdminAdminLoader dispatch={dispatch}/><AdminNavbar dispatch={dispatch}/><AdminAdminContainer dispatch={dispatch}/><AdminLangModal dispatch={dispatch}/><AdminReplyModal dispatch={dispatch}/></>;}