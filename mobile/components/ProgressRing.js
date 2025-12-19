import React, { useEffect, memo } from "react"
import Svg, { Circle, G } from "react-native-svg"
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from "react-native-reanimated"
import { Colors } from "../theme"

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

// Animated segment component
const AnimatedSegment = memo(function AnimatedSegment({
  size,
  r,
  rotation,
  color,
  completed,
  strokeWidth,
  dashLength,
  circum,
}) {
  const progress = useSharedValue(completed ? 1 : 0)

  useEffect(() => {
    progress.value = withTiming(completed ? 1 : 0, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    })
  }, [completed, progress])

  const animatedProps = useAnimatedProps(() => {
    const currentDash = progress.value * dashLength
    return {
      strokeDasharray: [currentDash, circum - currentDash],
      strokeOpacity: 0.25 + progress.value * 0.75,
    }
  })

  return (
    <G rotation={rotation} origin={`${size / 2}, ${size / 2}`}>
      <AnimatedCircle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="transparent"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        animatedProps={animatedProps}
      />
    </G>
  )
})

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

    // Arc length for one segment
    const arcLength = circum / total
    // Only show gaps when 3+ segments, and keep them minimal
    // For 1-2 segments, no gaps needed
    const gapSize = total > 2 ? (size < 40 ? 1 : 2) : 0
    const dashLength = Math.max(0, arcLength - gapSize)

    return (
      <Svg height={size} width={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map((seg, i) => {
          const rotation = -90 + (360 / total) * i
          return (
            <AnimatedSegment
              key={i}
              size={size}
              r={r}
              rotation={rotation}
              color={seg.color || color}
              completed={seg.completed}
              strokeWidth={strokeWidth}
              dashLength={dashLength}
              circum={circum}
            />
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
