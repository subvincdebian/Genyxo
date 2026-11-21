import type { Metadata } from "next";
import { WorkspacePluginSettingsPage } from "@/pages/workspace";
export const metadata: Metadata = { title: "Plugin settings — Genyxo", robots: { index: false } };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WorkspacePluginSettingsPage id={decodeURIComponent(id)} />;
}
