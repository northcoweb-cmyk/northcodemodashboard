"use client"

import { MeshGradient } from "@paper-design/shaders-react"
import { motion } from "framer-motion"
import { useEffect, useId, useRef, useState } from "react"

const DEFAULT_COLORS = [
  "#FFB3D9", // Pastel pink
  "#87CEEB", // Sky blue
  "#4A90E2", // Medium blue
  "#2C3E50", // Dark blue-gray
  "#1A1A2E", // Very dark blue
]

export function MeshGradientSVG({
  colors = DEFAULT_COLORS,
  className = "relative w-full max-w-sm mx-auto p-8 rounded-lg",
  eyeColor = "currentColor",
  speed = 1,
  bob = true,
}: {
  colors?: string[]
  className?: string
  eyeColor?: string
  speed?: number
  /** The little up-and-down squish. */
  bob?: boolean
}) {
  const clipId = useId().replace(/:/g, "")
  const svgRef = useRef<SVGSVGElement>(null)
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const rect = svgRef.current?.getBoundingClientRect()
      if (!rect) return
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const maxOffset = 8
      // Rounded to half a unit so a still pointer doesn't re-render every agent.
      const clamp = (v: number) => Math.round(Math.max(-maxOffset, Math.min(maxOffset, v)) * 2) / 2
      const x = clamp((e.clientX - centerX) * 0.08)
      const y = clamp((e.clientY - centerY) * 0.08)
      setEyeOffset((p) => (p.x === x && p.y === y ? p : { x, y }))
    }
    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  return (
    <motion.div
      className={className}
      animate={bob ? { y: [0, -8, 0], scaleY: [1, 1.08, 1] } : undefined}
      transition={{ duration: 2.8, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      style={{ transformOrigin: "top center" }}
    >
      <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" width="231" height="289" viewBox="0 0 231 289" className="h-auto w-full">
        <defs>
          <clipPath id={clipId}>
            <path d="M230.809 115.385V249.411C230.809 269.923 214.985 287.282 194.495 288.411C184.544 288.949 175.364 285.718 168.26 280C159.746 273.154 147.769 273.461 139.178 280.23C132.638 285.384 124.381 288.462 115.379 288.462C106.377 288.462 98.1451 285.384 91.6055 280.23C82.912 273.385 70.9353 273.385 62.2415 280.23C55.7532 285.334 47.598 288.411 38.7246 288.462C17.4132 288.615 0 270.667 0 249.359V115.385C0 51.6667 51.6756 0 115.404 0C179.134 0 230.809 51.6667 230.809 115.385Z" />
          </clipPath>
        </defs>

        <foreignObject width="231" height="289" clipPath={`url(#${clipId})`}>
          <div className="h-full w-full">
            <MeshGradient colors={colors} className="h-full w-full" speed={speed} />
          </div>
        </foreignObject>

        <motion.ellipse rx="20" ry="30" fill={eyeColor} className="animate-blink" animate={{ cx: 80 + eyeOffset.x, cy: 120 + eyeOffset.y }} transition={{ type: "spring", stiffness: 150, damping: 15 }} />
        <motion.ellipse rx="20" ry="30" fill={eyeColor} className="animate-blink" animate={{ cx: 150 + eyeOffset.x, cy: 120 + eyeOffset.y }} transition={{ type: "spring", stiffness: 150, damping: 15 }} />
      </svg>

      <style jsx>{`
        .animate-blink {
          animation: blink 3s infinite ease-in-out;
        }

        @keyframes blink {
          0%,
          90%,
          100% {
            ry: 30;
          }
          95% {
            ry: 3;
          }
        }
      `}</style>
    </motion.div>
  )
}

