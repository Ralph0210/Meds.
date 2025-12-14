import { useRef, useEffect } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from "react-native"
import Svg, { Circle, Path, G } from "react-native-svg"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "../lib/supabase"
import { useAppStore } from "../store/useAppStore"
import { LinearGradient } from "expo-linear-gradient"

const DAYS_TO_SHOW = 14

function getDates(startDate, count) {
  const dates = []
  for (let i = 0; i < count; i++) {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    dates.push(d)
  }
  return dates
}

export default function DateStrip({ config = [] }) {
  const { selectedDate, setSelectedDate } = useAppStore()
  const flatListRef = useRef(null)

  const today = new Date()
  const start = new Date(today)
  start.setDate(today.getDate() - 3)
  const dates = getDates(start, DAYS_TO_SHOW)

  const startStr = dates[0].toISOString().split("T")[0]
  const endStr = dates[dates.length - 1].toISOString().split("T")[0]

  // Fetch Range History
  const { data: history } = useQuery({
    queryKey: ["history", startStr, endStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medication_records")
        .select("*")
        .gte("date", startStr)
        .lte("date", endStr)

      if (error) throw error
      // Transform to map
      const map = {}
      data.forEach((r) => (map[r.date] = r))
      return map
    },
    enabled: !!config, // Only fetch if we have config? or always?
  })

  const getProgress = (date) => {
    if (!config || config.length === 0) return 0

    const dateStr = date.toISOString().split("T")[0]
    const record = history?.[dateStr]
    const data = record?.data || {}

    let total = 0
    let taken = 0

    config.forEach((med) => {
      med.keys.forEach((key) => {
        total++
        if (data[key]) taken++
      })
    })

    return total === 0 ? 0 : taken / total
  }

  // Helper for SVG Arcs
  function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    }
  }

  function describeArc(x, y, radius, startAngle, endAngle) {
    const start = polarToCartesian(x, y, radius, endAngle)
    const end = polarToCartesian(x, y, radius, startAngle)
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1"
    const d = [
      "M",
      start.x,
      start.y,
      "A",
      radius,
      radius,
      0,
      largeArcFlag,
      0,
      end.x,
      end.y,
    ].join(" ")
    return d
  }

  // ... DateStrip Component ...
  const renderItem = ({ item }) => {
    const isSelected = isSameDay(item, selectedDate)

    // 1. Calculate Segments
    const segments = []
    if (config && config.length > 0) {
      const dateStr = item.toISOString().split("T")[0]
      const record = history?.[dateStr]?.data || {}

      config.forEach((med) => {
        med.keys.forEach((key) => {
          segments.push({
            taken: !!record[key],
            color: med.color,
            count: 1,
          })
        })
      })
    }

    // 2. Generate Paths
    const size = 36
    const center = size / 2
    const radius = 14
    const strokeWidth = 3

    let paths = []
    const total = segments.length

    if (total > 0) {
      const gap = 4 // degrees gap
      const totalGap = gap * total
      const availableDeg = 360 - totalGap
      const segmentDeg = availableDeg / total

      segments.forEach((seg, i) => {
        const startAngle = i * (segmentDeg + gap)
        const endAngle = startAngle + segmentDeg

        // If only 1 segment (gap doesn't make sense if full circle?),
        // but we usually have multiple. If 1, we can do 359.9 or handled by loop.
        // If total is 1, let's just do full circle minus slight gap or full?
        // Web uses gaps even for 1 item sometimes or usually multiple.

        // Check for valid arcs
        const d = describeArc(center, center, radius, startAngle, endAngle)
        const color = seg.taken ? seg.color : "rgba(255,255,255,0.1)" // Track color

        paths.push(
          <Path
            key={i}
            d={d}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
          />
        )
      })
    } else {
      // No meds? Empty track
      paths.push(
        <Circle
          key="empty"
          cx={center}
          cy={center}
          r={radius}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
          fill="none"
        />
      )
    }

    const Background = isSelected ? (
      <LinearGradient
        colors={["#27272a", "#3f3f46"]}
        style={styles.dateItemBg}
      />
    ) : null

    return (
      <TouchableOpacity
        onPress={() => setSelectedDate(item)}
        style={styles.dateItemWrapper}
      >
        <View style={[styles.dateItem, isSelected && styles.dateItemSelected]}>
          <Text style={[styles.dayText, isSelected && { color: "#d0bcff" }]}>
            {item.toLocaleDateString("en-US", { weekday: "narrow" })}
          </Text>

          <View style={styles.ringContainer}>
            <Svg height={size} width={size}>
              {paths}
            </Svg>
            <Text
              style={[styles.dateText, isSelected && styles.dateTextSelected]}
            >
              {item.getDate()}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        horizontal
        data={dates}
        keyExtractor={(item) => item.toISOString()}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  )
}

function isSameDay(d1, d2) {
  return (
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear()
  )
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  dateItemWrapper: {
    marginHorizontal: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
  dateItemBg: {
    ...StyleSheet.absoluteFillObject,
  },
  dateItem: {
    alignItems: "center",
    justifyContent: "center",
    width: 48,
    height: 64,
    borderRadius: 999,
  },
  dateItemSelected: {
    // Intentionally empty if using LinearGradient
  },
  dayText: {
    color: "#71717a",
    fontSize: 12,
    marginBottom: 4,
    fontWeight: "600",
  },
  ringContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  dateText: {
    position: "absolute",
    fontSize: 14,
    fontWeight: "bold",
    color: "#a1a1aa",
  },
  dateTextSelected: {
    color: "#ffffff",
  },
})
