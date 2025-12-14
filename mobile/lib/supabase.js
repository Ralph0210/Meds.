import 'react-native-url-polyfill/auto'
import { AppState } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = "https://xwroyevtqrklwqhbarat.supabase.co"
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3cm95ZXZ0cXJrbHdxaGJhcmF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3NDQyOTYsImV4cCI6MjA4MTMyMDI5Nn0.ZyKMiRMX5P9jxt15IAk4Ew78XmEeFVQAmGYHYc3ahrk"

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh()
  } else {
    supabase.auth.stopAutoRefresh()
  }
})
