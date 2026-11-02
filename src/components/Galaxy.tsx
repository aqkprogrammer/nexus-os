"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";

const COLORS = ["#ffffff", "#e9d5ff", "#c084fc", "#f0abfc", "#a78bfa", "#7dd3fc"];
const CENTER = [0.68, 0.56];

interface Particle {
  r: number;
  theta: number;
  size: number;
  color: string;
  phase: number;
}

/** Slowly rotating spiral of stars behind the hero. */
export function Galaxy() {
  const ref = useRef<HTMLCanvasElement>(null);
  const ambient = useStore((s) => s.prefs.ambient && s.prefs.motion);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const arms: Particle[] = Array.from({ length: 900 }, (_, i) => {
      const t = Math.pow(Math.random(), 0.7);
      return {
        r: t,
        theta: (i % 2) * Math.PI + t * 5.4 + rand(-0.42, 0.42),
        size: rand(0.5, t < 0.3 ? 2.2 : 1.7),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        phase: rand(0, Math.PI * 2),
      };
    });
    const field: Particle[] = Array.from({ length: 130 }, () => ({
      r: Math.random(),
      theta: Math.random(),
      size: rand(0.4, 1.3),
      color: COLORS[Math.floor(Math.random() * 3)],
      phase: rand(0, Math.PI * 2),
    }));

    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tilt = -0.32;
    let raf = 0;

    const draw = (time: number) => {
      const t = time / 1000;
      ctx.clearRect(0, 0, w, h);

      for (const p of field) {
        ctx.globalAlpha = 0.25 + 0.5 * (0.5 + 0.5 * Math.sin(t * 1.4 + p.phase));
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.r * w, p.theta * h, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      const cx = w * CENTER[0];
      const cy = h * CENTER[1];
      const radius = Math.max(w * 0.42, 260);
      const cos = Math.cos(tilt);
      const sin = Math.sin(tilt);
      ctx.globalCompositeOperation = "lighter";
      for (const p of arms) {
        const angle = p.theta + t * (0.05 / (0.35 + p.r));
        const x = Math.cos(angle) * p.r * radius;
        const y = Math.sin(angle) * p.r * radius * 0.4;
        ctx.globalAlpha = (0.3 + 0.6 * (0.5 + 0.5 * Math.sin(t * 2 + p.phase))) * (1 - p.r * 0.45);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(cx + x * cos - y * sin, cy + x * sin + y * cos, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;

      if (ambient && !reduced) raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [ambient]);

  return <canvas ref={ref} aria-hidden className="pointer-events-none absolute inset-0 size-full" />;
}
