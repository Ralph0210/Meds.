import React from "react"
import Svg, { Circle, G } from "react-native-svg"
import { Colors } from "../theme"

export default function ProgressRing({
  progress, // 0 to 1 (Legacy support)
  segments = [], // Array of { color, completed } (New segmented mode)
  size = 36,
  strokeWidth = 3,
  color = Colors.primary, // Fallback color
}) {
  const r = (size - strokeWidth) / 2
  const circum = 2 * Math.PI * r

  // -- Segmented Mode --
  // If segments provided (even if empty, meaning no meds), render segments or empty track
  if (Array.isArray(segments)) {
    if (segments.length === 0) {
      // Empty State: Just the track
      return (
        <Svg height={size} width={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="transparent"
            stroke={Colors.surfaceLight} // Subtle gray
            strokeOpacity={0.3}
            strokeWidth={strokeWidth}
          />
        </Svg>
      )
    }

    const total = segments.length
    const gap = total > 1 ? 0.1 : 0

    // Arc length for one segment
    const arcLength = circum / total
    // Visual gap size (pixels)
    const gapSize = total > 1 ? (size < 40 ? 2 : 4) : 0
    const dashLength = Math.max(0, arcLength - gapSize)

    return (
      <Svg height={size} width={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map((seg, i) => {
          const rotation = -90 + (360 / total) * i
          return (
            <G key={i} rotation={rotation} origin={`${size / 2}, ${size / 2}`}>
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="transparent"
                stroke={seg.color || color}
                strokeOpacity={seg.completed ? 1 : 0.25}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dashLength} ${circum - dashLength}`}
                strokeLinecap="round"
              />
            </G>
          )
        })}
      </Svg>
    )
  }

  // -- Legacy Mode (Single Progress) --
  const strokeDashoffset = circum - progress * circum

  return (
    <Svg height={size} width={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Track */}
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="transparent"
        stroke={color}
        strokeOpacity={0.2}
        strokeWidth={strokeWidth}
      />
      {/* Progress */}
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="transparent"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${circum} ${circum}`}
        strokeDashoffset={strokeDashoffset}
        rotation="-90"
        origin={`${size / 2}, ${size / 2}`}
        strokeLinecap="round"
      />
    </Svg>
  )
}
