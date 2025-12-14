import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "../../lib/supabase"
import { useAppStore } from "../../store/useAppStore"
import DateStrip from "../../components/DateStrip"
import MedicationCard from "../../components/MedicationCard"

export default function HomeScreen() {
  const { selectedDate } = useAppStore()
  const queryClient = useQueryClient()
  const dateStr = selectedDate.toISOString().split("T")[0]

  // 1. Fetch Config
  const { data: configData, isLoading: configLoading } = useQuery({
    queryKey: ["medications_config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medications_config")
        .select("*")
        .order("created_at")
      if (error) throw error
      return data
    },
  })

  // 2. Fetch Records for Date
  const { data: recordData, isLoading: recordLoading } = useQuery({
    queryKey: ["medication_records", dateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medication_records")
        .select("*")
        .eq("date", dateStr)
        .maybeSingle()

      if (error) throw error
      return data || { data: {} }
    },
  })

  // 3. Mutation
  const mutation = useMutation({
    mutationFn: async ({ key, value }) => {
      // Get current state
      const currentData = recordData?.data || {}
      const newData = { ...currentData, [key]: value }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { error } = await supabase.from("medication_records").upsert(
        {
          user_id: user.id,
          date: dateStr,
          data: newData,
        },
        { onConflict: "user_id, date" }
      )

      if (error) throw error
      return newData
    },
    onMutate: async ({ key, value }) => {
      // Optimistic Update
      await queryClient.cancelQueries(["medication_records", dateStr])
      const previous = queryClient.getQueryData(["medication_records", dateStr])

      queryClient.setQueryData(["medication_records", dateStr], (old) => ({
        ...old,
        data: { ...old.data, [key]: value },
      }))
      return { previous }
    },
    onError: (err, newTodo, context) => {
      queryClient.setQueryData(
        ["medication_records", dateStr],
        context.previous
      )
      alert("Failed to update: " + err.message)
    },
    onSettled: () => {
      queryClient.invalidateQueries(["medication_records", dateStr])
    },
  })

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Good Afternoon, Ralph</Text>
        <Text style={styles.headerSubtitle}>
          {selectedDate.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </Text>
      </View>

      <DateStrip config={configData} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={configLoading || recordLoading}
            onRefresh={() => queryClient.invalidateQueries()}
            tintColor="#fff"
          />
        }
      >
        {configLoading && (
          <Text style={{ color: "white" }}>Loading config...</Text>
        )}

        {configData?.map((med, index) => (
          <MedicationCard
            key={med.id || index}
            config={med}
            record={recordData}
            onToggle={(key, val) => mutation.mutate({ key, value: val })}
          />
        ))}

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0c0e",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#a1a1aa",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  scrollView: {
    flex: 1,
    marginTop: 16,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
})
