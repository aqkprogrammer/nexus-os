"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Mascot } from "@/components/Mascot";
import { Btn } from "@/components/ui";
import { authClient } from "@/lib/auth-client";

const MIN_PASSWORD = 8;

/** Asks for an email to send a reset link to, or, arriving from that link, for the new password. */
export function ResetPasswordForm() {
  const [token, setToken] = useState<string | null>(null);
  const [linkError, setLinkError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token"));
    setLinkError(params.get("error") === "INVALID_TOKEN");
  }, []);

  const request = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    const email = String(new FormData(e.currentTarget).get("email"));
    const { error } = await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
    setBusy(false);
    if (error && error.status !== 429) {
      setMessage({ text: "Password reset needs email, which isn't set up on this server yet. Ask whoever runs it to reset your password.", error: true });
      return;
    }
    // Always the same answer, so the form doesn't reveal which emails have accounts.
    setMessage({ text: error ? "Too many attempts. Wait a minute and try again." : "If that email has an account, a reset link is on its way. It works for one hour.", error: !!error });
    if (!error) setDone(true);
  };

  const reset = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await authClient.resetPassword({ newPassword: String(new FormData(e.currentTarget).get("new-password")), token: token! });
    setBusy(false);
    if (error) {
      setMessage({ text: "This link has expired or was already used. Ask for a new one.", error: true });
      setToken(null);
      return;
    }
    setDone(true);
    setMessage({ text: "Your password is changed. Sign in with the new one." });
  };

  return (
    <>
      <div className="nx-backdrop" aria-hidden />
      <main className="grid min-h-dvh place-items-center p-4">
        <div className="nx-card nx-solid w-full max-w-sm p-6">
          <div className="flex flex-col items-center text-center">
            <Mascot variant="head" className="w-16 animate-float-sm" />
            <h1 className="mt-2 text-xl font-semibold">{token ? "Choose a new password" : "Reset your password"}</h1>
          </div>

          {!done && token && (
            <form onSubmit={reset} className="mt-5 flex flex-col gap-3">
              <label htmlFor="new-password" className="text-xs text-fg-2">
                New password
              </label>
              <input id="new-password" name="new-password" type="password" required minLength={MIN_PASSWORD} autoComplete="new-password" className="nx-input -mt-1.5" />
              <Btn type="submit" disabled={busy} className="w-full">
                Change password
              </Btn>
            </form>
          )}

          {!done && !token && (
            <form onSubmit={request} className="mt-5 flex flex-col gap-3">
              {linkError && <p className="text-[0.8125rem] text-nx-rose">That reset link has expired or was already used. Ask for a new one.</p>}
              <label htmlFor="email" className="text-xs text-fg-2">
                Your account email
              </label>
              <input id="email" name="email" type="email" required autoComplete="email" className="nx-input -mt-1.5" />
              <Btn type="submit" disabled={busy} className="w-full">
                Send reset link
              </Btn>
            </form>
          )}

          {message && (
            <p role={message.error ? "alert" : "status"} className={message.error ? "mt-3 text-[0.8125rem] text-nx-rose" : "mt-3 text-[0.8125rem] text-nx-green"}>
              {message.text}
            </p>
          )}
          <p className="mt-4 text-center text-xs">
            <Link href="/login" className="text-nx-lilac hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
