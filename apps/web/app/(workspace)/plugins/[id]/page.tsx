import type { Metadata } from "next";
import { WorkspacePluginDetailPage } from "@/pages/workspace";
export const metadata: Metadata = { title: "Plugin — Genyxo", robots: { index: false } };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WorkspacePluginDetailPage id={decodeURIComponent(id)} />;
}
