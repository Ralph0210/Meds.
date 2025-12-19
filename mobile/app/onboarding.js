import { useState, useRef } from "react"
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  Pressable,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { Pill, Check, Shield } from "lucide-react-native"
import { Colors, Spacing, Typography, Layout } from "../theme"
import { useOnboarding } from "../hooks/useOnboarding"

const { width } = Dimensions.get("window")

const SLIDES = [
  {
    id: "1",
    title: "Track your meds, your way",
    body: "A simple tool to help you remember. No accounts, no tracking, no ads.",
    button: "Get started",
    Icon: Pill,
  },
  {
    id: "2",
    title: "How it works",
    body: null, // Custom content
    button: "Continue",
    Icon: Check,
    steps: [
      "Add your medications in settings",
      "Mark them as taken",
      "That's it",
    ],
  },
  {
    id: "3",
    title: "Your data stays yours",
    body: "Everything is stored on your device. We can't see your data—it's yours alone.",
    button: "Start using the app",
    Icon: Shield,
  },
]

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const currentIndexRef = useRef(0)
  const flatListRef = useRef(null)
  const { completeOnboarding } = useOnboarding()

  const handleNext = async () => {
    const idx = currentIndexRef.current

    if (idx < SLIDES.length - 1) {
      const nextIndex = idx + 1
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      })
      currentIndexRef.current = nextIndex
      setCurrentIndex(nextIndex)
    } else {
      // Last slide - complete onboarding and navigate
      await completeOnboarding()
      router.replace("/(tabs)")
    }
  }

  const onMomentumScrollEnd = (event) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width)
    if (slideIndex >= 0 && slideIndex < SLIDES.length) {
      currentIndexRef.current = slideIndex
      setCurrentIndex(slideIndex)
    }
  }

  const renderSlide = ({ item }) => (
    <View style={styles.slide}>
      {/* Icon Placeholder */}
      <View style={styles.iconContainer}>
        <item.Icon size={80} color={Colors.primary} strokeWidth={1.5} />
      </View>

      {/* Title */}
      <Text style={styles.title}>{item.title}</Text>

      {/* Body or Steps */}
      {item.steps ? (
        <View style={styles.stepsContainer}>
          {item.steps.map((step, index) => (
            <View key={index} style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.body}>{item.body}</Text>
      )}
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
      />

      {/* Pagination Dots */}
      <View style={styles.pagination}>
        {SLIDES.map((_, index) => (
          <View
            key={index}
            style={[styles.dot, index === currentIndex && styles.dotActive]}
          />
        ))}
      </View>

      {/* Button */}
      <View style={styles.buttonContainer}>
        <Pressable
          style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }]}
          onPress={handleNext}
        >
          <Text style={styles.buttonText}>{SLIDES[currentIndex].button}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  slide: {
    width,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xxl,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Colors.surfaceHighlight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xxxl,
  },
  title: {
    ...Typography.header,
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  body: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: Spacing.lg,
  },
  stepsContainer: {
    width: "100%",
    gap: Spacing.lg,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    ...Typography.body,
    fontWeight: "700",
    color: Colors.textOnPrimary,
  },
  stepText: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceLight,
  },
  dotActive: {
    backgroundColor: Colors.primary,
    width: 24,
  },
  buttonContainer: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xxl,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.lg,
    borderRadius: Layout.radius.lg,
    alignItems: "center",
  },
  buttonText: {
    ...Typography.body,
    fontWeight: "600",
    color: Colors.textOnPrimary,
  },
})
