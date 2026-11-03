"use client";

import { useState, type FormEvent } from "react";
import { Mascot } from "@/components/Mascot";
import { Btn, LinkBtn, Segmented } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { isStaticDemo } from "@/lib/utils";

const MIN_PASSWORD = 8;

type Mode = "sign-in" | "sign-up";

const MODES: { value: Mode; label: string }[] = [
  { value: "sign-in", label: "Sign in" },
  { value: "sign-up", label: "Create account" },
];

function describe(error: { status: number; message?: string }) {
  if (error.status === 429) return "Too many attempts. Wait a minute and try again.";
  return error.message || "Something went wrong. Please try again.";
}

export function LoginForm() {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const creating = mode === "sign-up";

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));

    setBusy(true);
    setError("");
    const result = creating
      ? await authClient.signUp.email({ name: String(form.get("name")).trim(), email, password })
      : await authClient.signIn.email({ email, password });

    if (result.error) {
      setError(describe(result.error));
      setBusy(false);
      return;
    }
    // A full load, so the app starts from this account's saved workspace.
    window.location.assign("/");
  };

  return (
    <>
      <div className="nx-backdrop" aria-hidden />
      <main className="grid min-h-dvh place-items-center p-4">
        <div className="nx-card nx-solid w-full max-w-sm p-6">
          <div className="flex flex-col items-center text-center">
            <Mascot variant="head" className="w-16 animate-float-sm" />
            <h1 className="nx-wordmark mt-2 text-3xl leading-9 font-bold tracking-tight">
              <i className="pr-1 font-medium">Nexus</i>OS
            </h1>
            <p className="mt-1 text-[0.8125rem] text-fg-2">Your AI Operating System.</p>
          </div>

          {isStaticDemo ? (
            <div className="mt-5 text-center">
              <p className="text-sm text-fg-2">This demo doesn&apos;t use accounts. Everything stays in your browser.</p>
              <LinkBtn href="/" className="mt-4">
                Open the demo
              </LinkBtn>
            </div>
          ) : (
            <>
              <div className="mt-5 flex justify-center">
                <Segmented
                  id="auth-mode"
                  value={mode}
                  options={MODES}
                  onChange={(next) => {
                    setMode(next);
                    setError("");
                  }}
                />
              </div>

              <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
                {creating && (
                  <div>
                    <label htmlFor="name" className="text-xs text-fg-2">
                      Name
                    </label>
                    <input id="name" name="name" required maxLength={80} autoComplete="name" className="nx-input mt-1.5" />
                  </div>
                )}
                <div>
                  <label htmlFor="email" className="text-xs text-fg-2">
                    Email
                  </label>
                  <input id="email" name="email" type="email" required autoComplete="email" className="nx-input mt-1.5" />
                </div>
                <div>
                  <label htmlFor="password" className="text-xs text-fg-2">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={creating ? MIN_PASSWORD : undefined}
                    autoComplete={creating ? "new-password" : "current-password"}
                    className="nx-input mt-1.5"
                  />
                  {creating && <p className="mt-1 text-[0.6875rem] text-fg-3">At least {MIN_PASSWORD} characters.</p>}
                </div>

                {error && (
                  <p role="alert" className="text-[0.8125rem] text-nx-rose">
                    {error}
                  </p>
                )}

                <Btn type="submit" disabled={busy} className="mt-1 w-full">
                  {busy ? "One moment..." : creating ? "Create account" : "Sign in"}
                </Btn>
              </form>
            </>
          )}
        </div>
      </main>
    </>
  );
}
