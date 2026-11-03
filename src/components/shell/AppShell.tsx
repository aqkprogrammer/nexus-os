"use client";

import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { CommandPalette } from "@/components/shell/CommandPalette";
import { GlobalModals } from "@/components/shell/GlobalModals";
import { Sidebar } from "@/components/shell/Sidebar";
import { Tour } from "@/components/shell/Tour";
import { Topbar } from "@/components/shell/Topbar";
import { Btn, Toaster } from "@/components/ui";
import { useStore } from "@/lib/store";
import { isStaticDemo } from "@/lib/utils";
import { loadWorkspace, startSync } from "@/lib/workspace-sync";

export function AppShell({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  const pathname = usePathname();
  const motionOn = useStore((s) => s.prefs.motion);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const ready = status === "ready";

  // The app waits for saved state instead of flashing seed data, and never saves over it after a failed load.
  useEffect(() => {
    if (status !== "loading") return;
    let active = true;
    const load = isStaticDemo ? Promise.resolve(useStore.persist.rehydrate()).then(() => true) : loadWorkspace();
    load
      .then((loaded) => {
        if (!active || !loaded) return;
        useStore.getState().settleRuns();
        setStatus("ready");
      })
      .catch(() => active && setStatus("failed"));
    return () => {
      active = false;
    };
  }, [status]);

  useEffect(() => {
    if (ready && !isStaticDemo) return startSync();
  }, [ready]);

  useEffect(() => {
    document.documentElement.dataset.motion = motionOn ? "on" : "off";
  }, [motionOn]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        useStore.getState().setUi({ paletteOpen: !useStore.getState().paletteOpen });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <MotionConfig reducedMotion={motionOn ? "user" : "always"}>
      <div className="nx-backdrop" aria-hidden />
      {status === "failed" && (
        <div role="alert" className="grid h-dvh place-items-center p-4 text-center">
          <div>
            <p className="text-sm text-fg-2">We couldn&apos;t load your workspace. Your data is safe.</p>
            <Btn className="mt-3" onClick={() => setStatus("loading")}>
              Try again
            </Btn>
          </div>
        </div>
      )}
      {ready && (
        <div className="flex h-dvh">
          <div className="hidden w-[16.6rem] shrink-0 xl:block">
            <Sidebar />
          </div>

          <AnimatePresence>
            {navOpen && (
              <motion.div className="fixed inset-0 z-40 xl:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/60" onClick={() => setNavOpen(false)} />
                <motion.div
                  className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-line bg-[#0b0619]"
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ type: "spring", stiffness: 340, damping: 34 }}
                >
                  <Sidebar onNavigate={() => setNavOpen(false)} />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar onMenu={() => setNavOpen(true)} />
            <main key={pathname} className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 pb-3 md:pr-3 md:pl-4">
              {children}
            </main>
          </div>
        </div>
      )}

      {ready && <Tour />}
      <CommandPalette />
      <GlobalModals />
      <Toaster />
    </MotionConfig>
  );
}
