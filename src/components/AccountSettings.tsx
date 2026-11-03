"use client";

import { Download, KeyRound, LogOut, Mail, Monitor, Smartphone, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Btn, Card, Modal, Pill } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { useStore } from "@/lib/store";
import { saveWorkspace } from "@/lib/workspace-sync";

const MIN_PASSWORD = 8;

interface Device {
  token: string;
  userAgent?: string | null;
  createdAt: Date | string;
}

/** A short, readable name for a browser's user agent string. */
export function describeDevice(userAgent?: string | null) {
  const ua = userAgent ?? "";
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Mac OS X/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "";
  return { name: os ? `${browser} on ${os}` : browser, mobile: /iPhone|Android|Mobile/.test(ua) };
}

function Field({ id, label, ...props }: { id: string; label: string } & React.ComponentProps<"input">) {
  return (
    <div>
      <label htmlFor={id} className="text-xs text-fg-2">
        {label}
      </label>
      <input id={id} name={id} required className="nx-input mt-1.5" {...props} />
    </div>
  );
}

function Status({ text, error }: { text: string; error?: boolean }) {
  if (!text) return null;
  return (
    <p role={error ? "alert" : "status"} className={error ? "text-[0.8125rem] text-nx-rose" : "text-[0.8125rem] text-nx-green"}>
      {text}
    </p>
  );
}

function useForm(run: (form: FormData) => Promise<string | null>, done: string) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ text: string; error?: boolean }>({ text: "" });
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setResult({ text: "" });
    const error = await run(new FormData(form)).catch(() => "Something went wrong. Please try again.");
    setBusy(false);
    setResult(error ? { text: error, error: true } : { text: done });
    if (!error) form.reset();
  };
  return { busy, result, submit };
}

function EmailCard() {
  const account = useStore((s) => s.account);
  const { busy, result, submit } = useForm(async (form) => {
    const res = await fetch("/api/account/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newEmail: form.get("new-email"), password: form.get("email-password") }),
    });
    const data = (await res.json()) as { email?: string; error?: string };
    if (!res.ok || !data.email) return data.error ?? "Couldn't change your email.";
    useStore.setState((s) => ({ account: s.account && { ...s.account, email: data.email! } }));
    return null;
  }, "Your sign-in email is updated.");

  return (
    <Card title="Sign-in email" subtitle={account?.email} delay={0.2}>
      <form onSubmit={submit} className="flex flex-col gap-3 pt-1">
        <Field id="new-email" label="New email" type="email" autoComplete="email" />
        <Field id="email-password" label="Current password" type="password" autoComplete="current-password" />
        <Status {...result} />
        <Btn type="submit" disabled={busy} className="self-start">
          <Mail className="size-4" /> Change email
        </Btn>
      </form>
    </Card>
  );
}

function PasswordCard() {
  const { busy, result, submit } = useForm(async (form) => {
    const { error } = await authClient.changePassword({
      currentPassword: String(form.get("current-password")),
      newPassword: String(form.get("new-password")),
      revokeOtherSessions: true,
    });
    return error ? (error.status === 400 ? "That current password isn't right." : error.message || "Couldn't change your password.") : null;
  }, "Password changed. Other devices were signed out.");

  return (
    <Card title="Password" subtitle="Changing it signs out your other devices." delay={0.22}>
      <form onSubmit={submit} className="flex flex-col gap-3 pt-1">
        <Field id="current-password" label="Current password" type="password" autoComplete="current-password" />
        <Field id="new-password" label="New password" type="password" autoComplete="new-password" minLength={MIN_PASSWORD} />
        <Status {...result} />
        <Btn type="submit" disabled={busy} className="self-start">
          <KeyRound className="size-4" /> Change password
        </Btn>
      </form>
    </Card>
  );
}

function DevicesCard() {
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [current, setCurrent] = useState("");
  const toast = useStore((s) => s.toast);

  const load = useCallback(async () => {
    const [list, session] = await Promise.all([authClient.listSessions(), authClient.getSession()]);
    setDevices((list.data ?? []) as Device[]);
    setCurrent(session.data?.session.token ?? "");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const others = (devices ?? []).filter((d) => d.token !== current);

  return (
    <Card title="Signed-in devices" subtitle="Every browser that is signed in to your account." delay={0.24}>
      <ul className="space-y-1.5">
        {(devices ?? []).map((d) => {
          const { name, mobile } = describeDevice(d.userAgent);
          const Icon = mobile ? Smartphone : Monitor;
          return (
            <li key={d.token} className="nx-tile flex items-center gap-3 px-3 py-2">
              <Icon className="size-5 text-fg-2" strokeWidth={1.6} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm">{name}</span>
                <span className="block text-xs text-fg-3">Signed in {new Date(d.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
              </span>
              {d.token === current && <Pill className="border-nx-green/40 text-nx-green">This device</Pill>}
            </li>
          );
        })}
        {devices === null && <li className="text-xs text-fg-3">Loading...</li>}
      </ul>
      <Btn
        tone="ghost"
        className="mt-3"
        disabled={others.length === 0}
        onClick={async () => {
          await authClient.revokeOtherSessions();
          await load();
          toast("Signed out of your other devices");
        }}
      >
        <LogOut className="size-4" /> Sign out other devices
      </Btn>
    </Card>
  );
}

function DangerCard() {
  const [open, setOpen] = useState(false);
  const { busy, result, submit } = useForm(async (form) => {
    await saveWorkspace();
    const { error } = await authClient.deleteUser({ password: String(form.get("delete-password")) });
    if (error) return error.status === 400 ? "That password isn't right." : error.message || "Couldn't delete your account.";
    window.location.assign("/login");
    return null;
  }, "Account deleted.");

  return (
    <Card title="Your data" subtitle="Download a copy, or delete your account for good." delay={0.26}>
      <div className="flex flex-wrap gap-2 pt-1">
        <a href="/api/account/export" download className="nx-btn h-8.5 px-5 text-[0.8125rem]" data-tone="ghost">
          <Download className="size-4" /> Export my data
        </a>
        <Btn tone="rose" onClick={() => setOpen(true)}>
          <Trash2 className="size-4" /> Delete account
        </Btn>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Delete your account?" subtitle="This permanently removes your account and everything in your workspace. It can't be undone.">
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
          <Field id="delete-password" label="Enter your password to confirm" type="password" autoComplete="current-password" />
          <Status {...result} />
          <div className="flex justify-end gap-2">
            <Btn tone="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Btn>
            <Btn type="submit" tone="rose" disabled={busy}>
              Delete my account
            </Btn>
          </div>
        </form>
      </Modal>
    </Card>
  );
}

/** Account controls, shown only to a signed-in account. */
export function AccountSettings() {
  return (
    <>
      <EmailCard />
      <PasswordCard />
      <DevicesCard />
      <DangerCard />
    </>
  );
}
