import { Suspense } from "react";
import { AuthPage } from "@/pages/auth/ui/AuthPage";
import "@/shared/styles/auth-page.css";

export const metadata = {
  title: "Sign in · Genyxo",
  description: "Access your Genyxo workspace.",
};

export default function SignInPage() {
  return <Suspense fallback={<main className="gx-auth-page" />}><AuthPage /></Suspense>;
}
