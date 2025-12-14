import { useEffect, useState } from "react"
import { View, ActivityIndicator } from "react-native"
import { useRouter, useSegments } from "expo-router"
import { supabase } from "../lib/supabase"

export default function Index() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (loading) return

    const inAuthGroup = segments[0] === "(auth)"

    if (!session && !inAuthGroup) {
      // Redirect to login if no session
      router.replace("/(auth)/login")
    } else if (session && inAuthGroup) {
      // Redirect to tabs if logged in
      router.replace("/(tabs)")
    } else if (session && segments.length === 0) {
      // Redirect to tabs if at root and logged in
      router.replace("/(tabs)")
    }
  }, [session, loading, segments])

  return (
    <View className="flex-1 bg-background items-center justify-center">
      <ActivityIndicator size="large" color="#d0bcff" />
    </View>
  )
}
