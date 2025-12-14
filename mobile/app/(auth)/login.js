import React, { useState } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native"
import { useRouter } from "expo-router"
import { supabase } from "../../lib/supabase"
import { Mail, Lock, ArrowRight } from "lucide-react-native"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function signInWithEmail() {
    setLoading(true)

    console.log("Attempting login with:", email)
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      })

    if (signInError) {
      console.log("Login error:", signInError)
      // Attempt signup if login fails
      console.log("Attempting signup...")
      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email,
          password,
        })

      if (signUpError) {
        console.log("Signup error:", signUpError)
        Alert.alert("Error", signUpError.message)
      } else {
        console.log("Signup success:", signUpData)
        Alert.alert(
          "Account Created",
          "Please check your email for the confirmation link."
        )
      }
    } else {
      console.log("Login success:", signInData)
    }
    setLoading(false)
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome</Text>
        <Text style={styles.subtitle}>Sign in to sync your meds.</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Mail color="#9ca3af" size={20} />
          <TextInput
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor="#9ca3af"
            style={styles.input}
          />
        </View>

        <View style={styles.inputContainer}>
          <Lock color="#9ca3af" size={20} />
          <TextInput
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor="#9ca3af"
            style={styles.input}
          />
        </View>

        <TouchableOpacity
          onPress={signInWithEmail}
          disabled={loading}
          style={styles.button}
        >
          {loading ? (
            <ActivityIndicator color="#15161a" />
          ) : (
            <>
              <Text style={styles.buttonText}>Continue</Text>
              <ArrowRight color="#15161a" size={20} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0c0e",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  header: {
    marginBottom: 48,
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 8,
  },
  subtitle: {
    color: "#a1a1aa",
    fontSize: 18,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    backgroundColor: "#15161a",
    padding: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#27272a",
  },
  input: {
    flex: 1,
    marginLeft: 12,
    color: "#ffffff",
    fontSize: 16,
  },
  button: {
    backgroundColor: "#d0bcff",
    padding: 16,
    borderRadius: 9999,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  buttonText: {
    color: "#15161a",
    fontWeight: "bold",
    fontSize: 18,
    marginRight: 8,
  },
})
