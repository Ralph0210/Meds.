/**
 * AnimatedCheckbox - Medication dosage mark-off with microinteraction
 *
 * Features:
 * - Scale pop animation on toggle
 * - Haptic feedback
 * - Smooth color transition
 */
import { useEffect } from "react"
import { Pressable, StyleSheet, Platform } from "react-native"
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
} from "react-native-reanimated"
import * as Haptics from "expo-haptics"
import { Check } from "lucide-react-native"
import { Colors } from "../theme"

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

export default function AnimatedCheckbox({
  checked,
  onPress,
  color = Colors.primary,
  size = 32,
}) {
  const scale = useSharedValue(1)
  const progress = useSharedValue(checked ? 1 : 0)

  // Animate when checked state changes
  useEffect(() => {
    progress.value = withTiming(checked ? 1 : 0, { duration: 200 })
  }, [checked])

  const handlePress = () => {
    // Haptic feedback
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    }

    // Scale pop animation
    scale.value = withSpring(1.15, { damping: 10, stiffness: 400 }, () => {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 })
    })

    onPress?.()
  }

  const animatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      progress.value,
      [0, 1],
      ["transparent", color]
    )
    const borderColor = interpolateColor(
      progress.value,
      [0, 1],
      [Colors.surfaceLight, color]
    )

    return {
      transform: [{ scale: scale.value }],
      backgroundColor,
      borderColor,
    }
  })

  const checkmarkStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: progress.value }],
  }))

  return (
    <AnimatedPressable
      onPress={handlePress}
      style={[
        styles.checkbox,
        { width: size, height: size, borderRadius: size / 2 },
        animatedStyle,
      ]}
    >
      <Animated.View style={checkmarkStyle}>
        <Check size={size * 0.625} color="white" strokeWidth={3} />
      </Animated.View>
    </AnimatedPressable>
  )
}

const styles = StyleSheet.create({
  checkbox: {
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
})
