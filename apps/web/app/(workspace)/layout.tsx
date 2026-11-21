import type { ReactNode } from "react";
import { WorkspaceLayout } from "@/pages/chat";
import "@/shared/styles/chat.css";
import "@/shared/styles/style.css";
import "@/pages/chat/ui/page.css";
import "@/shared/styles/workspace.css";
import "@/shared/styles/genyxo-icons.css";
import "@/shared/styles/genyxo-orb.css";
import "@/shared/styles/workspace-premium.css";
import "@/shared/styles/composer-premium.css";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400..700&family=Inter+Tight:wght@500..700&display=swap"
        precedence="default"
      />
      <WorkspaceLayout>{children}</WorkspaceLayout>
    </>
  );
}
