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
import { supabase } from "../../lib/supabase"
import { useAppStore } from "../../store/useAppStore"

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
    queryKey: ["history", startOfMonth.toISOString(), endOfMonth.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medication_records")
        .select("*")
        .gte("date", startOfMonth.toISOString().split("T")[0])
        .lte("date", endOfMonth.toISOString().split("T")[0])
      if (error) throw error
      const map = {}
      data.forEach((r) => (map[r.date] = r))
      return map
    },
  })

  const { data: config } = useQuery({
    queryKey: ["medications_config"],
    queryFn: async () => {
      const { data } = await supabase.from("medications_config").select("keys")
      return data
    },
  })

  const getDayProgress = (day) => {
    if (!config) return 0
    const dateStr = day.toISOString().split("T")[0]
    const rec = records?.[dateStr]?.data || {}

    let total = 0
    let taken = 0
    config.forEach((med) => {
      med.keys.forEach((key) => {
        total++
        if (rec[key]) taken++
      })
    })
    return total === 0 ? 0 : taken / total
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

  // Grid Generation
  const daysInMonth = endOfMonth.getDate()
  const startDay = startOfMonth.getDay() // 0 = Sun
  const totalSlots = Math.ceil((daysInMonth + startDay) / 7) * 7

  const grid = []
  for (let i = 0; i < totalSlots; i++) {
    if (i < startDay || i >= startDay + daysInMonth) {
      grid.push(null)
    } else {
      const d = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth(),
        i - startDay + 1
      )
      grid.push(d)
    }
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

      <View style={styles.grid}>
        {grid.map((day, i) => {
          const progress = day ? getDayProgress(day) : 0
          return (
            <View key={i} style={styles.cellWrapper}>
              {day && (
                <TouchableOpacity
                  style={styles.cell}
                  onPress={() => handleDayPress(day)}
                >
                  <View style={styles.ring}>
                    {progress > 0 && <Ring progress={progress} />}
                  </View>
                  <Text
                    style={[styles.dayNum, isToday(day) && styles.todayText]}
                  >
                    {day.getDate()}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )
        })}
      </View>
    </SafeAreaView>
  )
}

function Ring({ progress }) {
  const r = 16
  const circum = 2 * Math.PI * r
  const strokeDashoffset = circum - progress * circum

  return (
    <Svg height="36" width="36" viewBox="0 0 36 36">
      <Circle
        cx="18"
        cy="18"
        r={r}
        fill="transparent"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="3"
      />
      <Circle
        cx="18"
        cy="18"
        r={r}
        fill="transparent"
        stroke={progress === 1 ? "#d0bcff" : "#71717a"}
        strokeWidth="3"
        strokeDasharray={`${circum} ${circum}`}
        strokeDashoffset={strokeDashoffset}
        rotation="-90"
        origin="18, 18"
        strokeLinecap="round"
      />
    </Svg>
  )
}

function isToday(date) {
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

const { width } = Dimensions.get("window")
const CELL_SIZE = (width - 32) / 7

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0c0e",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  navBtn: {
    padding: 8,
  },
  weekRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  weekdayText: {
    width: CELL_SIZE,
    textAlign: "center",
    color: "#71717a",
    fontWeight: "bold",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
  },
  cellWrapper: {
    width: CELL_SIZE,
    height: CELL_SIZE + 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cell: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    top: 2,
    left: 2,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNum: {
    color: "#a1a1aa",
    fontWeight: "600",
    zIndex: 1,
  },
  todayText: {
    color: "#fff",
    fontWeight: "bold",
  },
})
