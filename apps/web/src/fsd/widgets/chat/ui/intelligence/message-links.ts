import { parseKnowledgeLink } from "./KnowledgeViewer";

/**
 * Links to a message in another chat (/c/<key>?chat=<id>&m=<messageId>), as
 * written by chat search, open that chat in place and bring the message into
 * view with a short highlight.
 */

/** Scrolls to a message once it is on the page and flashes it. */
export function focusMessage(messageId: number, timeout = 9000) {
  const started = Date.now();
  const find = () => document.querySelector<HTMLElement>(`#chatBox .message[data-message-id="${messageId}"]`);
  const tick = () => {
    const message = find();
    if (message) {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      message.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
      message.classList.remove("gx-message-flash");
      void message.offsetWidth;
      message.classList.add("gx-message-flash");
      window.setTimeout(() => message.classList.remove("gx-message-flash"), 2400);
      return;
    }
    if (Date.now() - started < timeout) window.setTimeout(tick, 150);
  };
  // Let the chat switch start before looking, so the old chat is not matched.
  window.setTimeout(tick, 120);
}

/** Opens one of the user's chats and, when given, a message in it. */
export function openChatAt(conversationId: number, messageId?: number) {
  document.dispatchEvent(new CustomEvent("genyxo:open-chat", { detail: { id: conversationId } }));
  if (messageId) focusMessage(messageId);
}

export function parseMessageLink(href: string) {
  try {
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin || !/^\/(c\/|chat)/.test(url.pathname)) return null;
    const chat = Number(url.searchParams.get("chat"));
    const message = Number(url.searchParams.get("m"));
    return Number.isFinite(chat) && chat > 0 ? { chat, message: message > 0 ? message : undefined } : null;
  } catch {
    return null;
  }
}

/**
 * Handles clicks on message and knowledge links anywhere in the chat;
 * returns a cleanup.
 */
export function interceptMessageLinks(onKnowledge?: (link: HTMLAnchorElement, sourceId: number, chunkId?: number) => void) {
  const onClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
    const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!link) return;
    const knowledge = parseKnowledgeLink(link.getAttribute("href") || "");
    if (knowledge && onKnowledge) {
      event.preventDefault();
      event.stopPropagation();
      onKnowledge(link, knowledge.sourceId, knowledge.chunkId);
      return;
    }
    const target = parseMessageLink(link.getAttribute("href") || "");
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    openChatAt(target.chat, target.message);
  };
  const onFocus = (event: Event) => {
    const id = Number((event as CustomEvent<{ id: number }>).detail?.id);
    if (id) focusMessage(id);
  };
  document.addEventListener("click", onClick, true);
  document.addEventListener("genyxo:focus-message", onFocus);
  return () => {
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("genyxo:focus-message", onFocus);
  };
}
