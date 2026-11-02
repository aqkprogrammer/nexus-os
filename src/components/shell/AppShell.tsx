"use client";

import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { CommandPalette } from "@/components/shell/CommandPalette";
import { GlobalModals } from "@/components/shell/GlobalModals";
import { Sidebar } from "@/components/shell/Sidebar";
import { Tour } from "@/components/shell/Tour";
import { Topbar } from "@/components/shell/Topbar";
import { Toaster } from "@/components/ui";
import { useStore } from "@/lib/store";

export function AppShell({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  const pathname = usePathname();
  const motionOn = useStore((s) => s.prefs.motion);
  const [ready, setReady] = useState(false);

  // Saved state lives in localStorage, so the app waits for it instead of flashing seed data.
  useEffect(() => {
    void Promise.resolve(useStore.persist.rehydrate()).then(() => {
      useStore.getState().settleRuns();
      setReady(true);
    });
  }, []);

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
