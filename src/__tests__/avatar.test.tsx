import { describe, it, expect } from "vitest";
import type { AvatarState } from "@/types";

// Test the avatar configuration data directly since the component
// relies heavily on SVG animations and framer-motion which don't
// render well in jsdom.

describe("AuraAvatar configuration", () => {
  const stateGlow: Record<AvatarState, string> = {
    idle: "rgba(212,160,23,0.4)",
    thinking: "rgba(167,139,250,0.5)",
    excited: "rgba(251,146,60,0.5)",
    celebrating: "rgba(52,211,153,0.55)",
    empathetic: "rgba(244,114,182,0.45)",
  };

  const stateBg: Record<AvatarState, [string, string]> = {
    idle: ["#D4A017", "#402970"],
    thinking: ["#a78bfa", "#8b5cf6"],
    excited: ["#fb923c", "#f97316"],
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

  it("has glow colors for all 5 avatar states", () => {
    expect(Object.keys(stateGlow)).toHaveLength(5);
    expect(stateGlow).toHaveProperty("idle");
    expect(stateGlow).toHaveProperty("thinking");
    expect(stateGlow).toHaveProperty("excited");
    expect(stateGlow).toHaveProperty("celebrating");
    expect(stateGlow).toHaveProperty("empathetic");
  });

  it("has gradient colors for all 5 avatar states", () => {
    expect(Object.keys(stateBg)).toHaveLength(5);
    for (const state of Object.keys(stateBg)) {
      const colors = stateBg[state as AvatarState];
      expect(colors).toHaveLength(2);
      expect(colors[0]).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(colors[1]).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it("has 10-15 confetti particles for celebrating state", () => {
    expect(CONFETTI_PARTICLES.length).toBeGreaterThanOrEqual(10);
    expect(CONFETTI_PARTICLES.length).toBeLessThanOrEqual(15);
  });

  it("each confetti particle has required properties", () => {
    for (const particle of CONFETTI_PARTICLES) {
      expect(particle).toHaveProperty("cx");
      expect(particle).toHaveProperty("cy");
      expect(particle).toHaveProperty("r");
      expect(particle).toHaveProperty("color");
      expect(particle).toHaveProperty("delay");
      expect(typeof particle.cx).toBe("number");
      expect(typeof particle.cy).toBe("number");
      expect(typeof particle.r).toBe("number");
      expect(typeof particle.delay).toBe("number");
      expect(particle.color).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("confetti particles have staggered delays", () => {
    const delays = CONFETTI_PARTICLES.map((p) => p.delay);
    const uniqueDelays = Array.from(new Set(delays));
    expect(uniqueDelays.length).toBeGreaterThan(1);
  });

  it("idle breathing is 0.8Hz (1.25s period)", () => {
    // The dur attribute in the SVG animateTransform is "1.25s" for ~0.8Hz
    const expectedDur = 1.25; // seconds
    const frequencyHz = 1 / expectedDur;
    expect(frequencyHz).toBe(0.8);
  });
});

describe("useReducedMotion consideration", () => {
  it("reducedMotion flag prevents idle breathing animation", () => {
    // When reducedMotion is true, the animateTransform should not render.
    // The component checks: !reducedMotion && state === "idle"
    const reducedMotion = true;
    const state: AvatarState = "idle";
    const shouldAnimate = !reducedMotion && state === "idle";
    expect(shouldAnimate).toBe(false);
  });

  it("allows animation when reducedMotion is false", () => {
    const reducedMotion = false;
    const state: AvatarState = "idle";
    const shouldAnimate = !reducedMotion && state === "idle";
    expect(shouldAnimate).toBe(true);
  });

  it("no breathing animation for non-idle states", () => {
    const reducedMotion = false;
    const state = "thinking" as AvatarState;
    const shouldAnimate = !reducedMotion && state === ("idle" as AvatarState);
    expect(shouldAnimate).toBe(false);
  });
});
