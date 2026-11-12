import type { Metadata } from "next";
import { WorkspaceLibraryPage } from "@/pages/workspace";
export const metadata: Metadata = { title: "Library — Genyxo", robots: { index: false } };
export default function Page() { return <WorkspaceLibraryPage/>; }
