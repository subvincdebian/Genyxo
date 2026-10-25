"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { WorkspaceProvider, useWorkspace } from "@/features/workspace";
import { WorkspaceSidebar } from "@/widgets/workspace/ui/WorkspaceSidebar";
import { CanvasPanel } from "@/widgets/canvas";
import { WorkspaceIcon, WorkspaceTooltip, lockWorkspaceScroll } from "@/shared/ui/workspace";
import { useLanguage } from "@/shared/i18n";
import { ChatPage } from "./ChatPage";
import { WorkspaceSearch } from "./WorkspaceSearch";
import { WorkspaceProjectDialog } from "./WorkspaceProjectDialog";

function WorkspaceFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { startNewChat, projects } = useWorkspace();
  const { t } = useLanguage();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
  const [preset, setPreset] = useState<{ presetId: number; name: string } | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const toggle = useCallback(() => {
    if (window.matchMedia("(max-width: 767px)").matches) setMobileOpen((value) => !value);
    else setCollapsed((value) => { try { localStorage.setItem("genyxo:sidebar-collapsed", String(!value)); } catch { /* Storage is optional. */ } return !value; });
  }, []);
  useEffect(() => {
    // Legacy message actions use this optional icon font. Loading it after
    // hydration keeps an unavailable CDN from suspending the workspace layout.
    if (document.querySelector('link[data-workspace-icons]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
    link.dataset.workspaceIcons = "true";
    document.head.appendChild(link);
  }, []);
  useEffect(() => {
    queueMicrotask(() => { try { setCollapsed(localStorage.getItem("genyxo:sidebar-collapsed") === "true"); } catch { /* Storage is optional. */ } });
    const toggleEvent = () => toggle();
    const projectEvent = (e: Event) => setProjectId((e as CustomEvent).detail.id);
    const notify = (e: Event) => setToast((e as CustomEvent).detail);
    const presetEvent = (e: Event) => setPreset((e as CustomEvent).detail.presetId ? (e as CustomEvent).detail : null);
    const resetPreset = () => setPreset(null);
    const keydown = (event: KeyboardEvent) => {
      if (event.isComposing || event.defaultPrevented || document.querySelector("dialog[open]")) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSearchOpen((open) => !open); }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.code === "KeyS") { event.preventDefault(); toggle(); }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.code === "KeyO") { event.preventDefault(); startNewChat(); }
    };
    document.addEventListener("genyxo:workspace-toggle", toggleEvent);
    document.addEventListener("genyxo:workspace-project", projectEvent);
    document.addEventListener("genyxo:workspace-notify", notify);
    document.addEventListener("genyxo:workspace-preset", presetEvent);
    document.addEventListener("genyxo:workspace-new", resetPreset);
    document.addEventListener("genyxo:workspace-select", resetPreset);
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("genyxo:workspace-toggle", toggleEvent);
      document.removeEventListener("genyxo:workspace-project", projectEvent);
      document.removeEventListener("genyxo:workspace-notify", notify);
      document.removeEventListener("genyxo:workspace-preset", presetEvent);
      document.removeEventListener("genyxo:workspace-new", resetPreset);
      document.removeEventListener("genyxo:workspace-select", resetPreset);
      document.removeEventListener("keydown", keydown);
    };
  }, [toggle, startNewChat]);
  useEffect(() => { queueMicrotask(() => setMobileOpen(false)); }, [pathname]);
  useEffect(() => {
    const resize = () => { setIsMobile(innerWidth < 768); if (innerWidth >= 768) setMobileOpen(false); };
    resize();
    window.addEventListener("resize", resize); return () => window.removeEventListener("resize", resize);
  }, []);
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const unlock = lockWorkspaceScroll();
    const aside = asideRef.current;
    aside?.querySelector<HTMLElement>("button,a")?.focus();
    const handle = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setMobileOpen(false); }
      if (event.key === "Tab") {
        const controls = Array.from(aside?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input') || []).filter((node) => node.getClientRects().length);
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", handle);
    return () => { unlock(); document.removeEventListener("keydown", handle); if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, [mobileOpen]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(null), 4800); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => {
    const timers = new Map<Element, ReturnType<typeof setTimeout>>();
    const activity = (event: Event) => {
      const node = event.target;
      if (!(node instanceof HTMLElement) || !frameRef.current?.contains(node)) return;
      node.classList.add("ws-is-scrolling"); clearTimeout(timers.get(node));
      timers.set(node, setTimeout(() => { node.classList.remove("ws-is-scrolling"); timers.delete(node); }, 700));
    };
    document.addEventListener("scroll", activity, true);
    return () => { document.removeEventListener("scroll", activity, true); timers.forEach(clearTimeout); };
  }, []);
  return <div ref={frameRef} className={`workspace-shell${collapsed ? " is-collapsed" : ""}${mobileOpen ? " is-mobile-open" : ""}`}>
    {mobileOpen && <button className="workspace-drawer-backdrop" tabIndex={-1} aria-label={t("workspace.close_navigation", "Close navigation")} onClick={() => setMobileOpen(false)}/>}
    <aside id="sidebar" ref={asideRef} className="workspace-sidebar" inert={isMobile && !mobileOpen ? true : undefined} role={isMobile && mobileOpen ? "dialog" : undefined} aria-modal={isMobile && mobileOpen ? true : undefined} aria-label={t("workspace.navigation", "Workspace navigation")}><WorkspaceSidebar collapsed={collapsed && !isMobile} onToggle={toggle} onSearch={() => { setMobileOpen(false); setSearchOpen(true); }} onCloseMobile={() => setMobileOpen(false)}/></aside>
    <div className="workspace-main" inert={mobileOpen ? true : undefined}>
      <ChatPage workspace isChatRoute={pathname === "/chat"}>{children}</ChatPage>
      <CanvasPanel active={pathname === "/chat"}/>
      {preset && pathname === "/chat" && <div className="workspace-preset-badge"><WorkspaceIcon name="sparkles" size={14}/><span>{preset.name}</span><WorkspaceTooltip label={t("workspace.remove_preset", "Remove skill")}><button className="ws-icon-btn" onClick={() => { document.dispatchEvent(new CustomEvent("genyxo:workspace-preset", { detail: { presetId: null } })); setPreset(null); }} aria-label={t("workspace.remove_preset", "Remove skill")}><WorkspaceIcon name="close" size={14}/></button></WorkspaceTooltip></div>}
    </div>
    {searchOpen && <WorkspaceSearch onClose={() => setSearchOpen(false)}/>}
    {projectId !== null && <WorkspaceProjectDialog project={projects.find((item) => item.id === projectId)} onClose={() => setProjectId(null)}/>}
    <div className="ws-toast-region" aria-live="polite" aria-atomic="true">{toast && <div className={`ws-toast ws-toast-${toast.type}`}><WorkspaceIcon name={toast.type === "error" ? "info" : "check"} size={17}/>{toast.message}<WorkspaceTooltip label={t("workspace.dismiss", "Dismiss")} side="bottom"><button className="ws-icon-btn" onClick={() => setToast(null)} aria-label={t("workspace.dismiss", "Dismiss")}><WorkspaceIcon name="close" size={16}/></button></WorkspaceTooltip></div>}</div>
  </div>;
}
export function WorkspaceLayout({ children }: { children: ReactNode }) { return <WorkspaceProvider><WorkspaceFrame>{children}</WorkspaceFrame></WorkspaceProvider>; }
