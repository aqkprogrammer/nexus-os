import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export const metadata: Metadata = { title: "Reset password | NEXUS OS" };

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
