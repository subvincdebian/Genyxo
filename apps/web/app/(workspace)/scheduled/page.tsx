import type { Metadata } from "next";
import { WorkspaceScheduledPage } from "@/pages/workspace";
export const metadata: Metadata = { title: "Scheduled — Genyxo", robots: { index: false } };
export default function Page() { return <WorkspaceScheduledPage/>; }
