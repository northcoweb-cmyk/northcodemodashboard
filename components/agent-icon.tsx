"use client";

import { MeshGradientSVG } from "@/components/ui/shader-svg";

const mix = (hex: string, to: number, amt: number) => {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (to - v) * amt));
  return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
};

/** Light-to-dark mesh built from one agent color, so each agent has its own ghost. */
export const agentPalette = (c: string) => [mix(c, 255, 0.6), mix(c, 255, 0.28), c, mix(c, 0, 0.38), mix(c, 0, 0.62)];

/** The agent's mesh-gradient ghost. `size` is the height in px. */
export function AgentIcon({ color, size = 32, bob = true }: { color: string; size?: number; bob?: boolean }) {
  return (
    <span className="inline-flex shrink-0 items-end justify-center" style={{ width: size * 0.8, height: size }} aria-hidden>
      <MeshGradientSVG colors={agentPalette(color)} className="relative w-full" eyeColor="#ffffff" speed={0.6} bob={bob} />
    </span>
  );
}
