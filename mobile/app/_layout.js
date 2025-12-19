import { Slot, Redirect, useSegments } from "expo-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { StatusBar } from "expo-status-bar"
import { useEffect, useCallback, useRef } from "react"
import { View, StyleSheet, AppState } from "react-native"
import * as SplashScreen from "expo-splash-screen"
import { initDatabase } from "../lib/db"
import { OnboardingProvider, useOnboarding } from "../hooks/useOnboarding"
import { useAppStore } from "../store/useAppStore"
import { Colors } from "../theme"

// Keep splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync()

const queryClient = new QueryClient()

function RootLayoutNav() {
  const { hasSeenOnboarding, isLoading } = useOnboarding()
  const segments = useSegments()
  const resetToToday = useAppStore((state) => state.resetToToday)
  const appState = useRef(AppState.currentState)

  useEffect(() => {
    initDatabase()
  }, [])

  // Reset to today when app comes from background
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        resetToToday()
      }
      appState.current = nextAppState
    })
    return () => subscription.remove()
  }, [resetToToday])

  // Hide splash screen when loading is complete
  const onLayoutRootView = useCallback(async () => {
    if (!isLoading) {
      await SplashScreen.hideAsync()
    }
  }, [isLoading])

  // Keep splash visible while loading
  if (isLoading) {
    return null
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
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <Slot />
      <StatusBar style="light" />
    </View>
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
