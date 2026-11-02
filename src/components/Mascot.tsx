"use client";

import { useEffect, useId, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";

const CURLS: [number, number, number][] = (() => {
  const out: [number, number, number][] = [];
  for (let i = 0; i <= 18; i++) {
    const a = ((-14 + (i * 208) / 18) * Math.PI) / 180;
    out.push([Math.round(180 + Math.cos(a) * 110), Math.round(132 - Math.sin(a) * 94), 25 + (i % 3) * 5]);
  }
  return out;
})();

const BANGS: [number, number, number][] = [
  [98, 138, 22],
  [116, 110, 26],
  [146, 94, 28],
  [180, 88, 29],
  [214, 94, 28],
  [244, 110, 26],
  [262, 138, 22],
];

function Eye({ cx, cy, flip, ids }: { cx: number; cy: number; flip?: boolean; ids: Record<string, string> }) {
  const dir = flip ? -1 : 1;
  return (
    <g>
      <path
        d={`M${cx - 22} ${cy - 49} Q${cx} ${cy - 60} ${cx + 22} ${cy - 50}`}
        fill="none"
        stroke="#2a150a"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <g className="mascot-eye">
        <ellipse cx={cx} cy={cy + 1} rx="29" ry="33" fill="#fff" />
        <g className="mascot-iris">
          <ellipse cx={cx} cy={cy + 2} rx="27" ry="31" fill={`url(#${ids.iris})`} />
          <ellipse cx={cx} cy={cy + 1} rx="15" ry="18" fill="#0b0503" />
          <ellipse cx={cx} cy={cy + 21} rx="16" ry="6" fill="#b06cff" opacity="0.5" />
          <circle cx={cx - 9} cy={cy - 13} r="9.5" fill="#fff" />
          <circle cx={cx + 10} cy={cy + 10} r="4.5" fill="#fff" opacity="0.9" />
        </g>
        <path
          d={`M${cx - 30} ${cy - 12} Q${cx} ${cy - 44} ${cx + 30} ${cy - 12}`}
          fill="none"
          stroke="#130805"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d={`M${cx + dir * 30} ${cy - 15} l${dir * 11} -8 M${cx + dir * 34} ${cy - 7} l${dir * 12} -3`}
          fill="none"
          stroke="#130805"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </g>
    </g>
  );
}

interface MascotProps {
  variant?: "full" | "head";
  className?: string;
  /** Pupils follow the pointer */
  track?: boolean;
  title?: string;
}

export function Mascot({ variant = "full", className, track = false, title = "Nexus companion" }: MascotProps) {
  const raw = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const ids = useMemo(() => {
    const key = raw.replace(/[^a-zA-Z0-9]/g, "");
    return Object.fromEntries(
      ["skin", "hair", "iris", "suit", "band", "cup", "halo", "heart", "boot", "soft"].map((n) => [n, `${n}${key}`]),
    );
  }, [raw]);

  useEffect(() => {
    if (!track) return;
    const svg = svgRef.current;
    if (!svg) return;
    const onMove = (e: PointerEvent) => {
      const r = svg.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height * 0.42);
      const dist = Math.hypot(dx, dy) || 1;
      const reach = Math.min(1, dist / 260);
      svg.style.setProperty("--ex", ((dx / dist) * 5 * reach).toFixed(2));
      svg.style.setProperty("--ey", ((dy / dist) * 4.5 * reach).toFixed(2));
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [track]);

  const full = variant === "full";

  return (
    <svg
      ref={svgRef}
      viewBox={full ? "8 -2 344 424" : "34 8 292 268"}
      className={cn("overflow-visible", className)}
      role="img"
      aria-label={title}
    >
      <defs>
        <linearGradient id={ids.skin} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9a5b35" />
          <stop offset="1" stopColor="#6e3a1f" />
        </linearGradient>
        <radialGradient id={ids.hair} cx="0.4" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#5b3423" />
          <stop offset="1" stopColor="#23110b" />
        </radialGradient>
        <radialGradient id={ids.iris} cx="0.5" cy="0.75" r="0.75">
          <stop offset="0" stopColor="#a4683c" />
          <stop offset="0.6" stopColor="#4a2612" />
          <stop offset="1" stopColor="#1a0c06" />
        </radialGradient>
        <linearGradient id={ids.suit} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#c7b5f2" />
        </linearGradient>
        <linearGradient id={ids.band} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#a78bfa" />
          <stop offset="0.5" stopColor="#f4eeff" />
          <stop offset="1" stopColor="#a78bfa" />
        </linearGradient>
        <linearGradient id={ids.cup} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6f0ff" />
          <stop offset="1" stopColor="#9d84ea" />
        </linearGradient>
        <linearGradient id={ids.halo} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7c3aed" />
          <stop offset="0.5" stopColor="#f3e8ff" />
          <stop offset="1" stopColor="#ec4bb8" />
        </linearGradient>
        <linearGradient id={ids.heart} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff8fd0" />
          <stop offset="1" stopColor="#e6248f" />
        </linearGradient>
        <linearGradient id={ids.boot} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#b9a4ee" />
        </linearGradient>
        <filter id={ids.soft} x="-30%" y="-80%" width="160%" height="260%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      {full && <ellipse cx="180" cy="414" rx="128" ry="10" fill="#9d5cff" opacity="0.55" filter={`url(#${ids.soft})`} />}

      {full && (
        <g transform="translate(27 39.3) scale(0.85)">
          {/* Legs */}
          {[0, 1].map((side) => (
            <g key={side} transform={side ? "translate(360 0) scale(-1 1)" : undefined}>
              <path d="M146 358 Q116 380 108 406" fill="none" stroke={`url(#${ids.suit})`} strokeWidth="42" strokeLinecap="round" />
              <path d="M90 396 q20 12 38 8" fill="none" stroke="#7c4dff" strokeWidth="4" strokeLinecap="round" />
              <ellipse cx="102" cy="418" rx="40" ry="21" fill={`url(#${ids.boot})`} />
              <path d="M64 426 q38 18 76 0" fill="none" stroke="#6d3fe0" strokeWidth="7" strokeLinecap="round" />
            </g>
          ))}
          {/* Torso */}
          <path
            d="M128 258 C108 282 100 326 110 358 C118 386 242 386 250 358 C260 326 252 282 232 258 Z"
            fill={`url(#${ids.suit})`}
          />
          <path d="M112 330 q68 26 136 0 l2 14 q-70 26 -140 0 Z" fill="#8a63e8" opacity="0.5" />
          <ellipse cx="180" cy="262" rx="54" ry="15" fill="#8e6cf0" />
          <ellipse cx="180" cy="259" rx="46" ry="9" fill="#5a2fc2" />
          {/* Chest badge */}
          <rect x="146" y="282" width="68" height="62" rx="20" fill="#2c1570" opacity="0.92" />
          <rect x="146" y="282" width="68" height="62" rx="20" fill="none" stroke="#c4a5ff" strokeWidth="2.5" />
          <path
            d="M180 330 C160 314 152 302 158 295 C164 288 175 290 180 299 C185 290 196 288 202 295 C208 302 200 314 180 330 Z"
            fill="#ff5cc0"
            opacity="0.55"
            filter={`url(#${ids.soft})`}
            className="mascot-glow"
          />
          <path
            className="mascot-heart"
            d="M180 330 C160 314 152 302 158 295 C164 288 175 290 180 299 C185 290 196 288 202 295 C208 302 200 314 180 330 Z"
            fill={`url(#${ids.heart})`}
          />
          {/* Arms */}
          {[0, 1].map((side) => (
            <g key={side} transform={side ? "translate(360 0) scale(-1 1)" : undefined}>
              <path d="M124 286 Q88 310 98 346" fill="none" stroke={`url(#${ids.suit})`} strokeWidth="34" strokeLinecap="round" />
              <path d="M84 338 q15 10 30 2" fill="none" stroke="#7c4dff" strokeWidth="6" strokeLinecap="round" />
              <circle cx="100" cy="360" r="20" fill={`url(#${ids.boot})`} />
            </g>
          ))}
        </g>
      )}

      <g transform={full ? "translate(-21.6 -31.4) scale(1.12)" : undefined}>
      <g className={full ? "mascot-head" : undefined}>
        {/* Halo, far side */}
        <path d="M64 70 A116 28 0 0 1 296 70" fill="none" stroke="#a855f7" strokeWidth="13" opacity="0.5" filter={`url(#${ids.soft})`} className="mascot-glow" />
        <path d="M64 70 A116 28 0 0 1 296 70" fill="none" stroke={`url(#${ids.halo})`} strokeWidth="6" />

        {/* Hair */}
        <ellipse cx="180" cy="142" rx="112" ry="102" fill={`url(#${ids.hair})`} />
        {CURLS.map(([cx, cy, r], i) => (
          <g key={i}>
            <circle cx={cx} cy={cy} r={r} fill={`url(#${ids.hair})`} />
            <path
              d={`M${(cx - r * 0.55).toFixed(1)} ${cy} a${(r * 0.55).toFixed(1)} ${(r * 0.55).toFixed(1)} 0 1 1 ${(r * 0.55).toFixed(1)} ${(r * 0.55).toFixed(1)}`}
              fill="none"
              stroke="#7c4b33"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.65"
            />
          </g>
        ))}

        {/* Face */}
        <path
          d="M86 168 C86 96 274 96 274 168 C274 228 226 262 180 262 C134 262 86 228 86 168 Z"
          fill={`url(#${ids.skin})`}
        />
        <ellipse cx="110" cy="218" rx="21" ry="13" fill="#ff6fa8" opacity="0.38" />
        <ellipse cx="250" cy="218" rx="21" ry="13" fill="#ff6fa8" opacity="0.38" />
        <Eye cx={136} cy={178} flip ids={ids} />
        <Eye cx={224} cy={178} ids={ids} />
        <path d="M172 212 Q180 219 188 212" fill="none" stroke="#3f2010" strokeWidth="3" strokeLinecap="round" />
        <path d="M160 228 Q180 252 200 228 Q180 236 160 228 Z" fill="#c8375f" stroke="#7c1f3c" strokeWidth="2" strokeLinejoin="round" />

        {/* Bangs */}
        {BANGS.map(([cx, cy, r], i) => (
          <g key={i}>
            <circle cx={cx} cy={cy} r={r} fill={`url(#${ids.hair})`} />
            <path
              d={`M${(cx + r * 0.5).toFixed(1)} ${cy} a${(r * 0.5).toFixed(1)} ${(r * 0.5).toFixed(1)} 0 1 0 ${(-r * 0.5).toFixed(1)} ${(r * 0.5).toFixed(1)}`}
              fill="none"
              stroke="#8a5539"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.7"
            />
          </g>
        ))}

        {/* Headphones */}
        <path d="M72 168 C60 30 300 30 288 168" fill="none" stroke={`url(#${ids.band})`} strokeWidth="13" strokeLinecap="round" />
        {[0, 1].map((side) => (
          <g key={side} transform={side ? "translate(360 0) scale(-1 1)" : undefined}>
            <rect x="50" y="130" width="50" height="94" rx="24" fill={`url(#${ids.cup})`} />
            <rect x="60" y="143" width="30" height="68" rx="15" fill="#311470" />
            <rect x="60" y="143" width="30" height="68" rx="15" fill="none" stroke="#d6a6ff" strokeWidth="3" className="mascot-glow" />
            <circle cx="75" cy="177" r="6" fill="#ff7fd0" className="mascot-glow" />
          </g>
        ))}

        {/* Halo, near side */}
        <path d="M64 70 A116 28 0 0 0 296 70" fill="none" stroke="#a855f7" strokeWidth="13" opacity="0.55" filter={`url(#${ids.soft})`} className="mascot-glow" />
        <path d="M64 70 A116 28 0 0 0 296 70" fill="none" stroke={`url(#${ids.halo})`} strokeWidth="6.5" />
      </g>
      </g>
    </svg>
  );
}
