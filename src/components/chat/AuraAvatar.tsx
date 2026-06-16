"use client";

import { motion, type Variants } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { AvatarState } from "@/types";

interface AuraAvatarProps {
  state: AvatarState;
  size?: number;
}

const stateGlow: Record<AvatarState, string> = {
  idle: "rgba(212,160,23,0.4)",
  thinking: "rgba(167,139,250,0.5)",
  excited: "rgba(212,160,23,0.5)",
  celebrating: "rgba(52,211,153,0.55)",
  empathetic: "rgba(244,114,182,0.45)",
};

const stateBg: Record<AvatarState, [string, string]> = {
  idle: ["#D4A017", "#402970"],
  thinking: ["#a78bfa", "#8b5cf6"],
  excited: ["#D4A017", "#8b5cf6"],
  celebrating: ["#34d399", "#10b981"],
  empathetic: ["#f472b6", "#ec4899"],
};

const CONFETTI_PARTICLES = [
  { cx: 0.6, cy: -0.65, r: 0.05, color: "#ef4444", delay: 0 },
  { cx: -0.55, cy: -0.6, r: 0.04, color: "#3b82f6", delay: 0.1 },
  { cx: 0.7, cy: -0.3, r: 0.045, color: "#f59e0b", delay: 0.15 },
  { cx: -0.65, cy: -0.25, r: 0.04, color: "#ec4899", delay: 0.2 },
  { cx: 0.5, cy: -0.75, r: 0.035, color: "#8b5cf6", delay: 0.05 },
  { cx: -0.45, cy: -0.7, r: 0.05, color: "#10b981", delay: 0.25 },
  { cx: 0.75, cy: -0.5, r: 0.03, color: "#f97316", delay: 0.12 },
  { cx: -0.7, cy: -0.45, r: 0.04, color: "#06b6d4", delay: 0.18 },
  { cx: 0.55, cy: -0.8, r: 0.035, color: "#ef4444", delay: 0.08 },
  { cx: -0.5, cy: -0.8, r: 0.04, color: "#3b82f6", delay: 0.22 },
  { cx: 0.65, cy: -0.15, r: 0.03, color: "#f59e0b", delay: 0.3 },
  { cx: -0.6, cy: -0.1, r: 0.035, color: "#ec4899", delay: 0.14 },
];

function AuraSVG({ state, size, reducedMotion }: { state: AvatarState; size: number; reducedMotion: boolean }) {
  const s = size;
  const cx = s / 2;
  const cy = s / 2;
  const r = s * 0.42;

  const eyeY = cy - r * 0.1;
  const eyeSpacing = r * 0.32;
  const eyeR = r * 0.09;
  const mouthY = cy + r * 0.25;

  const [c1, c2] = stateBg[state];

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none">
      <defs>
        <radialGradient id={`bg-${state}-${s}`} cx="35%" cy="35%">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </radialGradient>
        <radialGradient id={`halo-${s}`} cx="50%" cy="50%">
          <stop offset="50%" stopColor="#FFD700" stopOpacity="0" />
          <stop offset="75%" stopColor="#FFD700" stopOpacity="0.2" />
          <stop offset="85%" stopColor="#D4A017" stopOpacity="0.35" />
          <stop offset="92%" stopColor="#FFD700" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
        </radialGradient>
        <filter id={`halo-glow-${s}`}>
          <feGaussianBlur stdDeviation={r * 0.06} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer glow ring */}
      {state === "idle" && (
        <circle cx={cx} cy={cy} r={r * 1.25} fill="none" stroke="#FFD700" strokeWidth={r * 0.02} strokeOpacity={0.15} filter={`url(#halo-glow-${s})`}>
          {!reducedMotion && (
            <animate attributeName="r" values={`${r * 1.22};${r * 1.28};${r * 1.22}`} dur="3s" repeatCount="indefinite" />
          )}
        </circle>
      )}

      {/* Golden halo ring */}
      {state === "idle" && (
        <circle cx={cx} cy={cy} r={r * 1.18} fill={`url(#halo-${s})`} stroke="#FFD700" strokeWidth={r * 0.05} strokeOpacity={0.45} filter={`url(#halo-glow-${s})`}>
          {!reducedMotion && (
            <animate attributeName="stroke-opacity" values="0.3;0.6;0.3" dur="3s" repeatCount="indefinite" />
          )}
        </circle>
      )}

      {/* Idle breathing group — subtle Y translate */}
      <g>
        {!reducedMotion && state === "idle" && (
          <animateTransform
            attributeName="transform"
            type="translate"
            values={`0,0;0,-${s * 0.02};0,0`}
            dur="1.25s"
            repeatCount="indefinite"
          />
        )}

        {/* Main face circle */}
        <circle cx={cx} cy={cy} r={r} fill={`url(#bg-${state}-${s})`} />

        {/* Highlight shine */}
        <ellipse
          cx={cx - r * 0.2}
          cy={cy - r * 0.25}
          rx={r * 0.22}
          ry={r * 0.15}
          fill="rgba(255,255,255,0.3)"
        />

        {/* Eyes */}
        {state === "thinking" ? (
          <>
            <line x1={cx - eyeSpacing - eyeR} y1={eyeY} x2={cx - eyeSpacing + eyeR} y2={eyeY} stroke="white" strokeWidth={r * 0.06} strokeLinecap="round" />
            <line x1={cx + eyeSpacing - eyeR} y1={eyeY} x2={cx + eyeSpacing + eyeR} y2={eyeY} stroke="white" strokeWidth={r * 0.06} strokeLinecap="round" />
          </>
        ) : state === "celebrating" ? (
          <>
            <path d={`M${cx - eyeSpacing - eyeR * 1.2},${eyeY + eyeR * 0.3} Q${cx - eyeSpacing},${eyeY - eyeR * 1.5} ${cx - eyeSpacing + eyeR * 1.2},${eyeY + eyeR * 0.3}`} stroke="white" strokeWidth={r * 0.06} fill="none" strokeLinecap="round" />
            <path d={`M${cx + eyeSpacing - eyeR * 1.2},${eyeY + eyeR * 0.3} Q${cx + eyeSpacing},${eyeY - eyeR * 1.5} ${cx + eyeSpacing + eyeR * 1.2},${eyeY + eyeR * 0.3}`} stroke="white" strokeWidth={r * 0.06} fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx={cx - eyeSpacing} cy={eyeY} r={eyeR} fill="white" />
            <circle cx={cx + eyeSpacing} cy={eyeY} r={eyeR} fill="white" />
            {state === "excited" && (
              <>
                <circle cx={cx - eyeSpacing} cy={eyeY} r={eyeR * 1.35} fill="none" stroke="white" strokeWidth={r * 0.03} opacity={0.5} />
                <circle cx={cx + eyeSpacing} cy={eyeY} r={eyeR * 1.35} fill="none" stroke="white" strokeWidth={r * 0.03} opacity={0.5} />
              </>
            )}
          </>
        )}

        {/* Mouth */}
        {state === "empathetic" ? (
          <path
            d={`M${cx - r * 0.15},${mouthY + r * 0.05} Q${cx},${mouthY - r * 0.06} ${cx + r * 0.15},${mouthY + r * 0.05}`}
            stroke="white"
            strokeWidth={r * 0.06}
            fill="none"
            strokeLinecap="round"
          />
        ) : state === "celebrating" || state === "excited" ? (
          <path
            d={`M${cx - r * 0.22},${mouthY - r * 0.06} Q${cx},${mouthY + r * 0.22} ${cx + r * 0.22},${mouthY - r * 0.06}`}
            stroke="white"
            strokeWidth={r * 0.06}
            fill="rgba(255,255,255,0.15)"
            strokeLinecap="round"
          />
        ) : (
          <path
            d={`M${cx - r * 0.18},${mouthY} Q${cx},${mouthY + r * 0.14} ${cx + r * 0.18},${mouthY}`}
            stroke="white"
            strokeWidth={r * 0.06}
            fill="none"
            strokeLinecap="round"
          />
        )}

        {/* Shopping bag icon on forehead for idle */}
        {state === "idle" && (
          <g transform={`translate(${cx - r * 0.13}, ${cy - r * 0.65}) scale(${r * 0.012})`}>
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3 6h18" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M16 10a4 4 0 01-8 0" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )}
      </g>

      {/* Sparkles for excited/celebrating */}
      {(state === "excited" || state === "celebrating") && (
        <>
          <circle cx={cx + r * 0.55} cy={cy - r * 0.55} r={r * 0.06} fill="white" opacity={0.8}>
            <animate attributeName="opacity" values="0.3;1;0.3" dur="0.8s" repeatCount="indefinite" />
          </circle>
          <circle cx={cx - r * 0.6} cy={cy - r * 0.45} r={r * 0.04} fill="white" opacity={0.6}>
            <animate attributeName="opacity" values="0.5;1;0.5" dur="1.1s" repeatCount="indefinite" />
          </circle>
          <circle cx={cx + r * 0.4} cy={cy + r * 0.6} r={r * 0.05} fill="white" opacity={0.7}>
            <animate attributeName="opacity" values="0.4;1;0.4" dur="0.9s" repeatCount="indefinite" />
          </circle>
        </>
      )}

      {/* Confetti particles for celebrating */}
      {state === "celebrating" && !reducedMotion && (
        <>
          {CONFETTI_PARTICLES.map((p, i) => (
            <circle
              key={i}
              cx={cx + r * p.cx}
              cy={cy + r * p.cy}
              r={r * p.r}
              fill={p.color}
              opacity={0.9}
            >
              <animate
                attributeName="cy"
                values={`${cy + r * p.cy};${cy + r * (p.cy + 1.6)}`}
                dur="2s"
                begin={`${p.delay}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.9;0.7;0"
                dur="2s"
                begin={`${p.delay}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="cx"
                values={`${cx + r * p.cx};${cx + r * (p.cx + (i % 2 === 0 ? 0.15 : -0.15))}`}
                dur="2s"
                begin={`${p.delay}s`}
                repeatCount="indefinite"
              />
            </circle>
          ))}
        </>
      )}

      {/* Heart for empathetic */}
      {state === "empathetic" && (
        <g transform={`translate(${cx + r * 0.4}, ${cy - r * 0.55}) scale(${r * 0.008})`}>
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="white" opacity={0.7}>
            <animate attributeName="opacity" values="0.4;0.8;0.4" dur="1.5s" repeatCount="indefinite" />
          </path>
        </g>
      )}

      {/* Thinking dots */}
      {state === "thinking" && (
        <>
          <circle cx={cx - r * 0.2} cy={mouthY + r * 0.05} r={r * 0.06} fill="white">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="1s" begin="0s" repeatCount="indefinite" />
          </circle>
          <circle cx={cx} cy={mouthY + r * 0.05} r={r * 0.06} fill="white">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="1s" begin="0.2s" repeatCount="indefinite" />
          </circle>
          <circle cx={cx + r * 0.2} cy={mouthY + r * 0.05} r={r * 0.06} fill="white">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="1s" begin="0.4s" repeatCount="indefinite" />
          </circle>
        </>
      )}
    </svg>
  );
}

export default function AuraAvatar({ state, size = 32 }: AuraAvatarProps) {
  const reducedMotion = useReducedMotion();

  const variants: Variants = reducedMotion
    ? {
        idle: {},
        thinking: { opacity: [0.85, 1] },
        excited: { opacity: 1 },
        celebrating: { opacity: 1 },
        empathetic: { opacity: 0.9 },
      }
    : {
        idle: {
          y: [0, -3, 0],
          transition: { repeat: Infinity, duration: 2.5, ease: "easeInOut" as const },
        },
        thinking: {
          scale: [1, 1.06, 1],
          rotate: [0, -2, 2, 0],
          transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut" as const },
        },
        excited: {
          scale: [1, 1.15, 1],
          y: [0, -6, 0],
          transition: { repeat: Infinity, duration: 0.5, ease: "easeInOut" as const },
        },
        celebrating: {
          rotate: [0, -8, 8, -4, 0],
          scale: [1, 1.12, 1.08, 1.12, 1],
          transition: { repeat: Infinity, duration: 1, ease: "easeInOut" as const },
        },
        empathetic: {
          scale: [1, 1.03, 1],
          transition: { repeat: Infinity, duration: 2.5, ease: "easeInOut" as const },
        },
      };

  return (
    <motion.div
      className="flex items-center justify-center rounded-full flex-shrink-0"
      style={{
        width: size,
        height: size,
        boxShadow: `0 0 ${size * 0.4}px ${stateGlow[state]}`,
      }}
      animate={state}
      variants={variants}
      aria-label={`Aura is ${state}`}
      role="img"
    >
      <AuraSVG state={state} size={size} reducedMotion={reducedMotion} />
    </motion.div>
  );
}
