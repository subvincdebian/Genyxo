import { Suspense } from "react";
import { AuthPage } from "@/pages/auth/ui/AuthPage";
import { RouteScope } from "@/shared/ui/route-scope";
import "@/shared/styles/auth-page.css";

export const metadata = {
  title: "Sign in · Genyxo",
  description: "Access your Genyxo workspace.",
};

export default function SignInPage() {
  return <RouteScope name="sign-in"><Suspense fallback={<main className="gx-auth-page" />}><AuthPage /></Suspense></RouteScope>;
}
