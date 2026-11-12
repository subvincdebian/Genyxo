import type { Metadata } from "next";
import { WorkspacePluginsPage } from "@/pages/workspace";
export const metadata: Metadata = { title: "Plugins & Skills — Genyxo", robots: { index: false } };
export default function Page() { return <WorkspacePluginsPage/>; }
