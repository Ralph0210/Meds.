/**
 * Onboarding Context Provider
 *
 * Provides shared onboarding state to entire app.
 * Uses Context pattern from expo-router auth docs.
 */
import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useCallback,
} from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { Platform } from "react-native"

const ONBOARDING_KEY = "hasSeenOnboarding"

// Context with proper typing
const OnboardingContext = createContext({
  hasSeenOnboarding: false,
  isLoading: true,
  completeOnboarding: () => {},
  resetOnboarding: () => {},
})

// Hook to access onboarding state - all components share same state
export function useOnboarding() {
  const value = useContext(OnboardingContext)
  if (!value) {
    throw new Error("useOnboarding must be wrapped in OnboardingProvider")
  }
  return value
}

// Async state hook pattern from expo-router docs
function useAsyncState(initialValue = [true, false]) {
  return useReducer((state, action) => [false, action], initialValue)
}

// Storage helper
async function setStorageItemAsync(key, value) {
  if (Platform.OS === "web") {
    if (value === null) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, value)
    }
  } else {
    await AsyncStorage.setItem(key, value)
  }
}

// Provider component - wrap your app with this
export function OnboardingProvider({ children }) {
  // [isLoading, hasSeenOnboarding]
  const [[isLoading, hasSeenOnboarding], setOnboarding] = useAsyncState([
    true,
    false,
  ])

  // Load onboarding state on mount
  useEffect(() => {
    const loadOnboarding = async () => {
      let value = false
      if (Platform.OS === "web") {
        value = localStorage.getItem(ONBOARDING_KEY) === "true"
      } else {
        const stored = await AsyncStorage.getItem(ONBOARDING_KEY)
        value = stored === "true"
      }
      setOnboarding(value)
    }
    loadOnboarding()
  }, [])

  const completeOnboarding = useCallback(async () => {
    setOnboarding(true)
    await setStorageItemAsync(ONBOARDING_KEY, "true")
  }, [])

  const resetOnboarding = useCallback(async () => {
    setOnboarding(false)
    await AsyncStorage.removeItem(ONBOARDING_KEY)
  }, [])

  return (
    <OnboardingContext.Provider
      value={{
        hasSeenOnboarding,
        isLoading,
        completeOnboarding,
        resetOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  )
}
