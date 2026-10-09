import type { Metadata } from "next";
import { AdminPage } from "@/pages/admin";
import "@/shared/styles/profile.css";
import "@/shared/styles/style.css";
import "@/pages/admin/ui/page.css";
import { AdminBoundary } from "@/entities/session";
export const metadata: Metadata = {
  title: "Admin Panel - Genyxo",
  description: "Admin Panel for Genyxo management.",
  robots: { index: false, follow: false },
  alternates: { canonical: "https://genyxo.com/gate.html" },
};
export default function Page() {
  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
      />
      <AdminBoundary>
        <AdminPage />
      </AdminBoundary>
    </>
  );
}
