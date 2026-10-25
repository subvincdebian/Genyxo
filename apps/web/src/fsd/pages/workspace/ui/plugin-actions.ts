"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/features/workspace";
import { connectsInstantly, integrationsRequest, pluginPath, type CatalogPlugin } from "../model/integrations";
import { useLabels } from "./page-tools";

/** Connect, try and disconnect, shared by the catalog, plugin page and settings page. */
export function usePluginActions(reload: () => void) {
  const l = useLabels(); const workspace = useWorkspace(); const router = useRouter();
  const [busy, setBusy] = useState("");
  const failed = (error: unknown) => workspace.notify(error instanceof Error ? error.message : l("connectFailed", "The connection did not complete. Try again."), "error");

  const connect = async (plugin: CatalogPlugin) => {
    if (!plugin.configured) { router.push(pluginPath(plugin.id)); return; }
    if (plugin.auth.type === "token") { router.push(`${pluginPath(plugin.id)}#connect`); return; }
    setBusy(plugin.id);
    try {
      if (connectsInstantly(plugin)) {
        await integrationsRequest(`${plugin.id}/enable`, { method: "POST" });
        workspace.notify(`${plugin.name} ${l("connectedNotice", "connected")}`);
        reload();
      } else {
        const { url } = await integrationsRequest<{ url: string }>(`${plugin.id}/authorize`, { method: "POST" });
        window.location.assign(url);
        return; // Keep the spinner while the browser leaves for the provider.
      }
    } catch (error) { failed(error); }
    setBusy("");
  };

  /** A new chat with a suggested prompt in the composer; it is never sent automatically. */
  const tryNow = (plugin: CatalogPlugin, prompt?: string) => {
    workspace.startNewChat();
    const text = prompt || plugin.prompts[0] || `Use ${plugin.name} to `;
    requestAnimationFrame(() => document.dispatchEvent(new CustomEvent("genyxo:composer-draft", { detail: { text } })));
  };

  const disconnect = async (plugin: CatalogPlugin) => {
    const result = await integrationsRequest<{ revoked: boolean }>(plugin.id, { method: "DELETE" });
    workspace.notify(result.revoked ? `${plugin.name} ${l("disconnectedNotice", "disconnected")}` : `${plugin.name} ${l("disconnectedLocal", "disconnected here. Remove Genyxo in the provider's settings to revoke access there too.")}`);
    reload();
  };

  return { busy, connect, tryNow, disconnect };
}
