"use client";
import type { ReactNode } from "react";
import { useController } from "@/shared/lib/use-controller";
import { useLocalizedMetadata } from "@/shared/i18n";
import {
  ChatApp,
  ChatLangModal,
  ChatSeoContent,
  ChatSearchChatsModal,
  ChatFaqWindow,
  ChatToastContainer,
  ChatCustomModal,
  ChatImageEditorModal,
} from "@/widgets/chat";
const loadController = () =>
  import("../model/initialize").then((module) => module.default);
export function ChatPage({ workspace = false, isChatRoute = true, children }: { workspace?: boolean; isChatRoute?: boolean; children?: ReactNode }) {
  useLocalizedMetadata("chat.meta_title", "chat.meta_description");
  const { dispatch, ready } = useController(loadController);
  return (
    <>
      <ChatApp dispatch={dispatch} ready={ready} workspace={workspace} isChatRoute={isChatRoute}>{children}</ChatApp>
      <ChatLangModal dispatch={dispatch} ready={ready} />
      {!workspace && <ChatSeoContent dispatch={dispatch} ready={ready} />}
      {!workspace && <ChatSearchChatsModal dispatch={dispatch} ready={ready} />}
      <ChatFaqWindow dispatch={dispatch} ready={ready} />
      <ChatToastContainer dispatch={dispatch} ready={ready} />
      <ChatCustomModal dispatch={dispatch} ready={ready} />
      <ChatImageEditorModal dispatch={dispatch} ready={ready} />
    </>
  );
}
