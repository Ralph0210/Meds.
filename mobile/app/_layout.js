import { Slot, Redirect, useSegments } from "expo-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { StatusBar } from "expo-status-bar"
import { useEffect } from "react"
import { View, ActivityIndicator, StyleSheet } from "react-native"
import { initDatabase } from "../lib/db"
import { OnboardingProvider, useOnboarding } from "../hooks/useOnboarding"
import { Colors } from "../theme"

const queryClient = new QueryClient()

function RootLayoutNav() {
  const { hasSeenOnboarding, isLoading } = useOnboarding()
  const segments = useSegments()

  useEffect(() => {
    initDatabase()
  }, [])

  // Show loading while checking onboarding status
  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  // Determine current route
  const inOnboarding = segments[0] === "onboarding"

  // Redirect logic using declarative Redirect component
  // If not seen onboarding and not on onboarding screen -> go to onboarding
  if (!hasSeenOnboarding && !inOnboarding) {
    return <Redirect href="/onboarding" />
  }

  // If seen onboarding but still on onboarding screen -> go to app
  if (hasSeenOnboarding && inOnboarding) {
    return <Redirect href="/(tabs)" />
  }

  return (
    <>
      <Slot />
      <StatusBar style="light" />
    </>
  )
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <OnboardingProvider>
          <RootLayoutNav />
        </OnboardingProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  )
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
})
