"use client";

import { memo } from "react";

const LEAF_COUNT = 12;
const LOTUS_COUNT = 5;

const leaves = Array.from({ length: LEAF_COUNT }, (_, i) => ({
  id: i,
  left: `${5 + ((i * 37 + 13) % 90)}%`,
  size: 10 + (i % 4) * 4,
  delay: `${(i * 1.7) % 8}s`,
  duration: `${6 + (i % 5) * 2}s`,
  rotation: (i * 47) % 360,
  drift: (i % 2 === 0 ? 1 : -1) * (20 + (i % 3) * 15),
}));

const lotusPositions = Array.from({ length: LOTUS_COUNT }, (_, i) => ({
  id: i,
  left: `${10 + ((i * 43 + 7) % 80)}%`,
  top: `${15 + ((i * 31 + 11) % 60)}%`,
  size: 24 + (i % 3) * 8,
  delay: `${(i * 2.3) % 10}s`,
  duration: `${12 + (i % 4) * 3}s`,
  opacity: 0.04 + (i % 3) * 0.01,
}));

function GoldenTreeBackground() {
  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden z-0"
      aria-hidden="true"
    >
      {/* Warm golden ambient glow */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 60% 50% at 50% 85%, rgba(212,160,23,0.10) 0%, transparent 70%),
            radial-gradient(ellipse 40% 35% at 50% 40%, rgba(255,215,0,0.06) 0%, transparent 60%),
            radial-gradient(ellipse 30% 25% at 70% 30%, rgba(194,120,3,0.04) 0%, transparent 50%)
          `,
        }}
      />

      {/* Detailed golden tree SVG — centered watermark */}
      <svg
        className="absolute bottom-0 left-1/2 -translate-x-1/2 opacity-[0.06] dark:opacity-[0.04]"
        width="600"
        height="700"
        viewBox="0 0 600 700"
        fill="none"
        style={{ maxWidth: "90vw", maxHeight: "85%" }}
      >
        <defs>
          <radialGradient id="canopyGold" cx="50%" cy="40%" r="50%">
            <stop offset="0%" stopColor="#FFD700" stopOpacity="1" />
            <stop offset="45%" stopColor="#D4A017" stopOpacity="0.9" />
            <stop offset="75%" stopColor="#B8860B" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#8B6914" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="canopyInner" cx="50%" cy="35%" r="40%">
            <stop offset="0%" stopColor="#FFE44D" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#D4A017" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#B8860B" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="trunkGold" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#D4A017" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#8B6914" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#6B4F10" stopOpacity="0.6" />
          </linearGradient>
          <radialGradient id="groundGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#D4A017" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#D4A017" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="rootGrad" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#8B6914" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#6B4F10" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* Ground scatter — fallen leaves */}
        <ellipse cx="300" cy="660" rx="250" ry="20" fill="url(#groundGlow)" />

        {/* Root system */}
        <path d="M280 540 Q240 570 180 590 Q200 580 220 560 Q250 545 275 535" fill="url(#rootGrad)" />
        <path d="M320 540 Q360 570 420 590 Q400 580 380 560 Q350 545 325 535" fill="url(#rootGrad)" />
        <path d="M290 545 Q260 580 230 620 Q250 600 270 570 Q280 555 288 543" fill="url(#rootGrad)" />
        <path d="M310 545 Q340 580 370 620 Q350 600 330 570 Q320 555 312 543" fill="url(#rootGrad)" />
        <path d="M300 545 Q300 590 300 640 Q305 600 302 560" fill="url(#rootGrad)" />

        {/* Main trunk — thick, slightly twisted */}
        <path
          d="M285 540 Q278 480 282 420 Q288 360 290 320 L310 320 Q312 360 318 420 Q322 480 315 540 Z"
          fill="url(#trunkGold)"
        />

        {/* Major branches */}
        <path d="M290 380 Q260 350 210 300 Q230 320 255 345 Q275 365 290 378" fill="url(#trunkGold)" />
        <path d="M310 380 Q340 350 390 300 Q370 320 345 345 Q325 365 310 378" fill="url(#trunkGold)" />
        <path d="M295 340 Q270 310 230 260 Q255 290 280 320" fill="url(#trunkGold)" />
        <path d="M305 340 Q330 310 370 260 Q345 290 320 320" fill="url(#trunkGold)" />
        <path d="M292 360 Q250 340 195 330 Q230 345 265 358" fill="url(#trunkGold)" />
        <path d="M308 360 Q350 340 405 330 Q370 345 335 358" fill="url(#trunkGold)" />

        {/* Secondary branches */}
        <path d="M240 310 Q220 280 190 240" stroke="#B8860B" strokeWidth="3" fill="none" opacity="0.5" />
        <path d="M360 310 Q380 280 410 240" stroke="#B8860B" strokeWidth="3" fill="none" opacity="0.5" />
        <path d="M230 280 Q200 250 170 220" stroke="#B8860B" strokeWidth="2" fill="none" opacity="0.4" />
        <path d="M370 280 Q400 250 430 220" stroke="#B8860B" strokeWidth="2" fill="none" opacity="0.4" />
        <path d="M255 330 Q230 310 200 280" stroke="#B8860B" strokeWidth="2" fill="none" opacity="0.4" />
        <path d="M345 330 Q370 310 400 280" stroke="#B8860B" strokeWidth="2" fill="none" opacity="0.4" />

        {/* Upper branches */}
        <path d="M298 320 Q290 280 270 230" stroke="#B8860B" strokeWidth="2.5" fill="none" opacity="0.4" />
        <path d="M302 320 Q310 280 330 230" stroke="#B8860B" strokeWidth="2.5" fill="none" opacity="0.4" />
        <path d="M295 300 Q280 260 260 200" stroke="#B8860B" strokeWidth="2" fill="none" opacity="0.3" />
        <path d="M305 300 Q320 260 340 200" stroke="#B8860B" strokeWidth="2" fill="none" opacity="0.3" />

        {/* Canopy layers — outer */}
        <ellipse cx="300" cy="230" rx="190" ry="170" fill="url(#canopyGold)" />
        {/* Canopy — mid-layer with richer color */}
        <ellipse cx="300" cy="210" rx="155" ry="140" fill="url(#canopyInner)" />
        {/* Canopy — top highlight */}
        <ellipse cx="300" cy="180" rx="100" ry="90" fill="url(#canopyInner)" opacity="0.6" />

        {/* Canopy texture — leaf clusters as circles */}
        {[
          [200, 230, 35], [250, 170, 30], [300, 140, 35], [350, 170, 30], [400, 230, 35],
          [170, 260, 25], [230, 200, 28], [370, 200, 28], [430, 260, 25],
          [220, 280, 22], [300, 190, 32], [380, 280, 22],
          [260, 130, 20], [340, 130, 20], [190, 200, 22], [410, 200, 22],
        ].map(([cx, cy, r], i) => (
          <circle
            key={`leaf-cluster-${i}`}
            cx={cx}
            cy={cy}
            r={r}
            fill="#D4A017"
            opacity={0.15 + (i % 3) * 0.05}
          />
        ))}

        {/* Golden glow at the crown */}
        <circle cx="300" cy="180" r="60" fill="#FFD700" opacity="0.12" />
      </svg>

      {/* Falling golden leaves */}
      {leaves.map((leaf) => (
        <div
          key={leaf.id}
          className="falling-leaf absolute"
          style={{
            left: leaf.left,
            top: "-5%",
            width: leaf.size,
            height: leaf.size,
            animationDelay: leaf.delay,
            animationDuration: leaf.duration,
            ["--leaf-drift" as string]: `${leaf.drift}px`,
            ["--leaf-rotation" as string]: `${leaf.rotation}deg`,
          }}
        >
          <svg
            width={leaf.size}
            height={leaf.size}
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M12 2C8 6 4 10 4 14c0 4 3.5 8 8 8s8-4 8-8c0-4-4-8-8-12z"
              fill="rgba(212,160,23,0.6)"
            />
            <path
              d="M12 6v12M9 10c2 1 4 3 5 6"
              stroke="rgba(139,105,20,0.4)"
              strokeWidth="0.7"
              fill="none"
            />
          </svg>
        </div>
      ))}

      {/* Subtle lotus flower motifs — Sri Lankan national flower */}
      {lotusPositions.map((lotus) => (
        <svg
          key={`lotus-${lotus.id}`}
          className="absolute pointer-events-none"
          style={{
            left: lotus.left,
            top: lotus.top,
            width: lotus.size,
            height: lotus.size,
            opacity: lotus.opacity,
            animation: `lotusFloat ${lotus.duration} ease-in-out ${lotus.delay} infinite alternate`,
          }}
          viewBox="0 0 64 64"
          fill="none"
        >
          {/* Center petal */}
          <path
            d="M32 8c-4 8-12 16-12 24s8 16 12 20c4-4 12-12 12-20S36 16 32 8z"
            stroke="rgba(212,160,23,0.4)"
            strokeWidth="1"
            fill="none"
          />
          {/* Side petals */}
          <path
            d="M32 12c-8 4-16 12-20 16 4 4 12 8 20 8s16-4 20-8c-4-4-12-12-20-16z"
            stroke="rgba(212,160,23,0.3)"
            strokeWidth="1"
            fill="none"
          />
          {/* Base */}
          <ellipse
            cx="32"
            cy="44"
            rx="8"
            ry="3"
            stroke="rgba(212,160,23,0.25)"
            strokeWidth="0.5"
            fill="none"
          />
        </svg>
      ))}
    </div>
  );
}

export default memo(GoldenTreeBackground);
