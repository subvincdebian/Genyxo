'use client';
import { useController } from '@/shared/lib/use-controller';
import { ChatApp, ChatLangModal, ChatSeoContent, ChatSearchChatsModal, ChatFaqWindow, ChatToastContainer, ChatCustomModal, ChatImageEditorModal } from '@/widgets/chat';
const loadController=()=>import('../model/initialize').then(module=>module.default);
export function ChatPage(){const dispatch=useController(loadController);return <><ChatApp dispatch={dispatch}/><ChatLangModal dispatch={dispatch}/><ChatSeoContent dispatch={dispatch}/><ChatSearchChatsModal dispatch={dispatch}/><ChatFaqWindow dispatch={dispatch}/><ChatToastContainer dispatch={dispatch}/><ChatCustomModal dispatch={dispatch}/><ChatImageEditorModal dispatch={dispatch}/></>;}