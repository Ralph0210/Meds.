import React, { useState } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "expo-router"
import Svg, { Circle } from "react-native-svg"
import { ChevronLeft, ChevronRight } from "lucide-react-native"
import { getRecords, getMedications } from "../../lib/db"
import { useAppStore } from "../../store/useAppStore"
import CalendarGrid from "../../components/CalendarGrid"
import { Colors, Spacing, Typography } from "../../theme"

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"]

export default function HistoryScreen() {
  const router = useRouter()
  const { setSelectedDate } = useAppStore()
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const startOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  )
  const endOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  )

  // Fetch Data
  const { data: records } = useQuery({
    queryKey: ["history", startOfMonth.toISOString(), endOfMonth.toISOString()], // Query key can stay ISO or change, but payload matters
    queryFn: async () => {
      const s = startOfMonth.toLocaleDateString("en-CA")
      const e = endOfMonth.toLocaleDateString("en-CA")
      return getRecords(s, e)
    },
  })

  // We need config to know total checkboxes per day to calculate progress
  const { data: config } = useQuery({
    queryKey: ["medications"],
    queryFn: async () => {
      return getMedications()
    },
  })

  const getDaySegments = (day) => {
    if (!config) return []
    const dateStr = day.toLocaleDateString("en-CA")
    const rec = records?.[dateStr]?.data || {}

    const segments = []

    // Day-specific timestamps for check
    const dayTime = new Date(day)
    dayTime.setHours(0, 0, 0, 0)

    config.forEach((med) => {
      // 1. FILTERING LOGIC (Must match HomeScreen)
      const medConfig = med.config || {}

      // Check Start Date
      if (medConfig.startDate) {
        const [y, m, d] = medConfig.startDate.split("-").map(Number)
        const start = new Date(y, m - 1, d)
        start.setHours(0, 0, 0, 0)
        if (dayTime.getTime() < start.getTime()) return
      }

      // Check Interval
      if (med.type === "interval") {
        const interval = parseInt(medConfig.intervalDays) || 1
        if (interval > 1 && medConfig.startDate) {
          const [y, m, d] = medConfig.startDate.split("-").map(Number)
          const start = new Date(y, m - 1, d)
          start.setHours(0, 0, 0, 0)
          const diffTime = dayTime - start
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          if (diffDays < 0 || diffDays % interval !== 0) return
        }
      }

      // Check Cyclic
      if (med.type === "cyclic") {
        const cycle = parseInt(medConfig.cycleDays) || 28
        const active = parseInt(medConfig.activeDays) || 21
        if (medConfig.startDate) {
          const [y, m, d] = medConfig.startDate.split("-").map(Number)
          const start = new Date(y, m - 1, d)
          start.setHours(0, 0, 0, 0)
          const diffTime = dayTime - start
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
          if (diffDays < 0) return

          const position = diffDays % cycle
          if (position >= active) return
        }
      }

      // Check Course Duration
      if (med.type === "course") {
        if (medConfig.durationMode === "days") {
          const duration = parseInt(medConfig.courseDuration) || 1
          if (medConfig.startDate) {
            const [y, m, d] = medConfig.startDate.split("-").map(Number)
            const start = new Date(y, m - 1, d)
            start.setHours(0, 0, 0, 0)
            const diffTime = dayTime - start
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
            if (diffDays < 0 || diffDays >= duration) return
          }
        }
      }

      // 2. Add Segments
      med.keys.forEach((key) => {
        segments.push({
          color: med.color || Colors.primary,
          completed: !!rec[key],
        })
      })
    })
    return segments
  }

  const changeMonth = (delta) => {
    const newDate = new Date(currentMonth)
    newDate.setMonth(newDate.getMonth() + delta)
    setCurrentMonth(newDate)
  }

  const handleDayPress = (day) => {
    setSelectedDate(day)
    router.push("/(tabs)")
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navBtn}>
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {currentMonth.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </Text>
        <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navBtn}>
          <ChevronRight color="#fff" size={24} />
        </TouchableOpacity>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((d, i) => (
          <Text key={i} style={styles.weekdayText}>
            {d}
          </Text>
        ))}
      </View>

      <CalendarGrid
        startOfMonth={startOfMonth}
        endOfMonth={endOfMonth}
        getDaySegments={getDaySegments}
        onDayPress={handleDayPress}
      />
    </SafeAreaView>
  )
}

const { width } = Dimensions.get("window")
const CELL_SIZE = (width - 32) / 7

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  monthTitle: {
    fontSize: Typography.title.fontSize,
    fontWeight: "bold",
    color: Colors.textPrimary,
  },
  navBtn: {
    padding: Spacing.sm,
  },
  weekRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  weekdayText: {
    width: CELL_SIZE,
    textAlign: "center",
    color: Colors.textTertiary,
    fontWeight: "bold",
  },
  dayNum: {
    color: Colors.textSecondary,
    fontWeight: "600",
    zIndex: 1,
  },
  todayText: {
    color: Colors.textPrimary,
    fontWeight: "bold",
  },
})
