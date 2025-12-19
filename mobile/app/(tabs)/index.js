import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
} from "react-native"
import { useState, useCallback } from "react"
// import { useNavigation } from "expo-router" // Unused
import { SafeAreaView } from "react-native-safe-area-context"
import { useFocusEffect } from "expo-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getMedications, getRecord, updateRecord } from "../../lib/db"
import { useAppStore } from "../../store/useAppStore"
import DateStrip from "../../components/DateStrip"
import MedicationCard from "../../components/MedicationCard"
import { Colors, Layout, Spacing, Typography } from "../../theme"
import { CheckCircle2, Leaf } from "lucide-react-native"

export default function HomeScreen() {
  const { selectedDate, resetToToday } = useAppStore()
  const queryClient = useQueryClient()
  const [focusedDate, setFocusedDate] = useState(selectedDate)

  // Reset to today when screen gains focus
  useFocusEffect(
    useCallback(() => {
      resetToToday()
      setFocusedDate(new Date())
    }, [resetToToday])
  )

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good Morning"
    if (hour < 18) return "Good Afternoon"
    return "Good Evening"
  }

  // Helper to format date with Today/Tomorrow/Yesterday
  const formatDateLabel = (date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const target = new Date(date)
    target.setHours(0, 0, 0, 0)

    const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24))

    const monthDay = date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    })

    if (diffDays === 0) return `Today, ${monthDay}`
    if (diffDays === 1) return `Tomorrow, ${monthDay}`
    if (diffDays === -1) return `Yesterday, ${monthDay}`

    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    })
  }

  // Fix date string to be local YYYY-MM-DD
  const dateStr = selectedDate.toLocaleDateString("en-CA")

  // 1. Fetch Config
  const { data: configData, isLoading: configLoading } = useQuery({
    queryKey: ["medications"],
    queryFn: async () => {
      return getMedications()
    },
  })

  // 2. Fetch Records for Date
  const { data: recordData, isLoading: recordLoading } = useQuery({
    queryKey: ["record", dateStr],
    queryFn: async () => {
      const data = getRecord(dateStr)
      return data || { data: {} }
    },
    placeholderData: (previousData) => previousData, // Keep showing old data while fetching
  })

  // 3. Mutation
  const mutation = useMutation({
    mutationFn: async ({ key, value }) => {
      // Get current state (handled by db update, but for optimistic update we need key/val)
      const newData = updateRecord(dateStr, key, value)
      return newData
    },
    onMutate: async ({ key, value }) => {
      // Optimistic Update
      await queryClient.cancelQueries(["record", dateStr])
      const previous = queryClient.getQueryData(["record", dateStr])

      queryClient.setQueryData(["record", dateStr], (old) => ({
        ...old,
        data: { ...old?.data, [key]: value },
      }))
      return { previous }
    },
    onError: (err, newTodo, context) => {
      queryClient.setQueryData(["record", dateStr], context.previous)
      alert("Failed to update: " + err.message)
    },
    onSettled: () => {
      queryClient.invalidateQueries(["record", dateStr])
      queryClient.invalidateQueries(["history"]) // Refresh history too
    },
  })

  // Filter Logic
  const filteredMeds =
    configData?.filter((med) => {
      // Check Start Date
      const medConfig = med.config || {}
      if (medConfig.startDate) {
        const [y, m, d] = medConfig.startDate.split("-").map(Number)
        const start = new Date(y, m - 1, d)
        // Assuming selectedDate is at midnight? Yes, likely.
        // selectedDate comes from store, usually set to midnight or current time.
        // Let's compare timestamps at midnight
        const current = new Date(selectedDate)
        current.setHours(0, 0, 0, 0)
        start.setHours(0, 0, 0, 0)
        if (current.getTime() < start.getTime()) return false
      }

      // Check Schedule Type
      if (med.type === "interval") {
        const interval = parseInt(medConfig.intervalDays) || 1
        if (interval > 1 && medConfig.startDate) {
          const [y, m, d] = medConfig.startDate.split("-").map(Number)
          const start = new Date(y, m - 1, d)
          start.setHours(0, 0, 0, 0)

          const current = new Date(selectedDate)
          current.setHours(0, 0, 0, 0)

          const diffTime = current - start
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

          return diffDays >= 0 && diffDays % interval === 0
        }
      }

      if (med.type === "cyclic") {
        const cycle = parseInt(medConfig.cycleDays) || 28
        const active = parseInt(medConfig.activeDays) || 21
        if (medConfig.startDate) {
          const [y, m, d] = medConfig.startDate.split("-").map(Number)
          const start = new Date(y, m - 1, d)
          start.setHours(0, 0, 0, 0)

          const current = new Date(selectedDate)
          current.setHours(0, 0, 0, 0)

          const diffTime = current - start
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

          if (diffDays < 0) return false

          const position = diffDays % cycle
          return position < active // Active for first X days
        }
      }

      // Daily / Custom (Days of week not implemented yet) / Course
      // We assume Course is every day until end?
      if (med.type === "course") {
        // Check end duration?
        // Not strictly asked but good to have
        if (medConfig.durationMode === "days") {
          const duration = parseInt(medConfig.courseDuration) || 1
          if (medConfig.startDate) {
            const [y, m, d] = medConfig.startDate.split("-").map(Number)
            const start = new Date(y, m - 1, d)
            start.setHours(0, 0, 0, 0)

            const current = new Date(selectedDate)
            current.setHours(0, 0, 0, 0)

            const diffTime = current - start
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
            return diffDays >= 0 && diffDays < duration
          }
        }
      }

      return true
    }) || []

  // Check if date is in the future
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const selectedMidnight = new Date(selectedDate)
  selectedMidnight.setHours(0, 0, 0, 0)

  const isFuture = selectedMidnight.getTime() > today.getTime()

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.greeting}>{getGreeting()}</Text>
        <Text style={styles.headerSubtitle}>
          {formatDateLabel(focusedDate)}
        </Text>
      </View>

      <DateStrip config={configData} onFocusedDateChange={setFocusedDate} />

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

        {filteredMeds.length > 0 ? (
          filteredMeds.map((med, index) => (
            <MedicationCard
              key={med.id || index}
              config={med}
              record={recordData}
              disabled={isFuture}
              onToggle={(key, val) => mutation.mutate({ key, value: val })}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBg}>
              <Leaf size={32} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>All Clear</Text>
            <Text style={styles.emptyDesc}>
              No medications scheduled for today.
            </Text>
          </View>
        )}

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
    flexGrow: 1, // Allow centering empty state if needed
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    opacity: 0.8,
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.surfaceHighlight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.title.fontSize,
    fontWeight: "bold",
    marginBottom: Spacing.xs,
  },
  emptyDesc: {
    color: Colors.textSecondary,
    fontSize: Typography.body.fontSize,
  },
})
