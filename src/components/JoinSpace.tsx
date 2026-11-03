"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Mascot } from "@/components/Mascot";
import { LinkBtn } from "@/components/ui";
import { acceptInvite, PENDING_INVITE } from "@/lib/invites";

type State = { kind: "joining" } | { kind: "joined"; name: string } | { kind: "signin" } | { kind: "error"; message: string };

/** Accepts a shared space invitation. A visitor who isn't signed in is asked to, and the invite waits for them. */
export function JoinSpace() {
  const [state, setState] = useState<State>({ kind: "joining" });

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) return setState({ kind: "error", message: "This link is missing its invitation." });
    void acceptInvite(token).then((result) => {
      if (result.ok) return setState({ kind: "joined", name: result.name });
      if (result.status === 401) {
        try {
          localStorage.setItem(PENDING_INVITE, token);
        } catch {
          // Without storage, the user opens the link again after signing in.
        }
        return setState({ kind: "signin" });
      }
      setState({ kind: "error", message: result.message });
    });
  }, []);

  return (
    <>
      <div className="nx-backdrop" aria-hidden />
      <main className="grid min-h-dvh place-items-center p-4">
        <div className="nx-card nx-solid w-full max-w-sm p-6 text-center">
          <Mascot variant="head" className="mx-auto w-16 animate-float-sm" />
          {state.kind === "joining" && <p className="mt-3 text-sm text-fg-2">Joining the space...</p>}
          {state.kind === "joined" && (
            <>
              <h1 className="mt-2 text-xl font-semibold">You joined {state.name}</h1>
              <LinkBtn href="/spaces" className="mt-4">
                Open Shared Spaces
              </LinkBtn>
            </>
          )}
          {state.kind === "signin" && (
            <>
              <h1 className="mt-2 text-xl font-semibold">You&apos;re invited</h1>
              <p className="mt-2 text-sm text-fg-2">Sign in, or create an account with the email the invitation was sent to. You&apos;ll join the space straight after.</p>
              <LinkBtn href="/login" className="mt-4">
                Continue
              </LinkBtn>
            </>
          )}
          {state.kind === "error" && (
            <>
              <p role="alert" className="mt-3 text-sm text-nx-rose">
                {state.message}
              </p>
              <Link href="/" className="mt-4 inline-block text-xs text-nx-lilac hover:underline">
                Go to NEXUS OS
              </Link>
            </>
          )}
        </div>
      </main>
    </>
  );
}
