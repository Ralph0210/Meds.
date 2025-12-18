import { useRef, useEffect, useMemo, useState, memo, useCallback } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Dimensions,
} from "react-native"
import { useQuery } from "@tanstack/react-query"
import { getRecords } from "../lib/db"
import { useAppStore } from "../store/useAppStore"
import { LinearGradient } from "expo-linear-gradient"
import { Colors, Spacing, Layout, Typography } from "../theme"
import ProgressRing from "./ProgressRing"
import {
  Calendar as CalendarIcon,
  MapPin,
  ChevronDown,
} from "lucide-react-native"
import Animated, { FadeIn, FadeOut } from "react-native-reanimated"

const ITEM_WIDTH = 48
const ITEM_MARGIN = Spacing.xs
const FULL_ITEM_WIDTH = ITEM_WIDTH + ITEM_MARGIN * 2
const PAST_DAYS = 30
const FUTURE_DAYS = 30
const VISIBLE_RANGE = 21 // Cap interaction to +/- 21 days
const CLAMP_BUFFER = 15 // Allow slight over-scroll before fighting back

function getDates(startDate, count) {
  const dates = []
  for (let i = 0; i < count; i++) {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    dates.push(d)
  }
  return dates
}

function isSameDay(d1, d2) {
  return (
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear()
  )
}

const DateItem = memo(
  ({ item, index, isSelected, isToday, config, history, onPress }) => {
    // 1. Calculate Segments
    const segments = []
    if (config && config.length > 0) {
      const dateStr = item.toLocaleDateString("en-CA")
      // Items date at midnight
      const itemTime = item.getTime()

      const record = history?.[dateStr]?.data || {}

      config.forEach((med) => {
        // Check start date
        const medConfig = med.config || {}
        let showMed = true

        if (medConfig.startDate) {
          // Parse startDate "YYYY-MM-DD"
          const [y, m, d] = medConfig.startDate.split("-").map(Number)
          const startDate = new Date(y, m - 1, d)
          if (itemTime < startDate.getTime()) {
            showMed = false
          }
        }

        if (showMed) {
          med.keys.forEach((key) => {
            segments.push({
              completed: !!record[key],
              color: med.color,
            })
          })
        }
      })
    }

    return (
      <TouchableOpacity
        onPress={() => onPress(item, index)}
        style={styles.dateItemWrapper}
      >
        <View style={[styles.dateItem, isSelected && styles.dateItemSelected]}>
          <View
            style={[
              styles.dayLabelContainer,
              isToday && styles.todayLabelContainer,
            ]}
          >
            <Text
              style={[
                styles.dayText,
                isSelected && { color: Colors.primary },
                isToday && {
                  color: Colors.background,
                  fontWeight: "bold",
                },
              ]}
            >
              {item.toLocaleDateString("en-US", { weekday: "narrow" })}
            </Text>
          </View>
          <View style={styles.ringContainer}>
            <ProgressRing segments={segments} size={36} />
            <Text
              style={[styles.dateText, isSelected && styles.dateTextSelected]}
            >
              {item.getDate()}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    )
  },
  (prev, next) => {
    return (
      prev.isSelected === next.isSelected &&
      prev.isToday === next.isToday &&
      prev.config === next.config &&
      prev.history === next.history &&
      // Item shouldn't change for same index generally, but safety check
      prev.item.getTime() === next.item.getTime()
    )
  }
)

export default function DateStrip({ config = [], onFocusedDateChange }) {
  const { selectedDate, setSelectedDate } = useAppStore()
  const flatListRef = useRef(null)
  const isProgrammatic = useRef(false)

  // Memoize dates to prevent recreation
  const { dates, todayIndex } = useMemo(() => {
    const today = new Date()
    const start = new Date(today)
    start.setDate(today.getDate() - PAST_DAYS)
    const allDates = getDates(start, PAST_DAYS + FUTURE_DAYS + 1)
    return { dates: allDates, todayIndex: PAST_DAYS }
  }, [])

  // Use local date strings for consistency with HomeScreen
  const startStr = dates[0].toLocaleDateString("en-CA")
  const endStr = dates[dates.length - 1].toLocaleDateString("en-CA")

  // Fetch Range History
  const { data: history } = useQuery({
    queryKey: ["history", startStr, endStr],
    queryFn: async () => {
      // getRecords expects YYYY-MM-DD
      return getRecords(startStr, endStr)
    },
    enabled: !!config,
  })

  // Calculate accurate center position
  // Calculate accurate center position
  const screenWidth = Dimensions.get("window").width
  const SNAP_PADDING = (screenWidth - FULL_ITEM_WIDTH) / 2

  const getCenterOffset = (index) => {
    return index * FULL_ITEM_WIDTH
  }

  // Pre-calculate limits
  const minIndex = todayIndex - VISIBLE_RANGE
  const maxIndex = todayIndex + VISIBLE_RANGE
  const minOffset = minIndex * FULL_ITEM_WIDTH
  const maxOffset = maxIndex * FULL_ITEM_WIDTH

  // Center on mount and on external selectedDate changes
  // Center on mount and on external selectedDate changes
  useEffect(() => {
    // Determine target index
    const index = dates.findIndex((d) => isSameDay(d, selectedDate))
    if (index === -1) return

    const offset = getCenterOffset(index)

    // Set guard before scrolling
    isProgrammatic.current = true

    // We use a small timeout to ensure layout is ready
    const timer = setTimeout(() => {
      flatListRef.current?.scrollToOffset({
        offset,
        animated: true,
      })

      // Reset guard after animation (approximate)
      setTimeout(() => {
        isProgrammatic.current = false
      }, 500)
    }, 100)
    return () => clearTimeout(timer)
  }, [selectedDate, dates])

  const onScroll = useCallback(
    (ev) => {
      if (isProgrammatic.current) return

      const offsetX = ev.nativeEvent.contentOffset.x

      // Soft Clamp Logic (Rubber Band simulation)
      if (offsetX < minOffset - CLAMP_BUFFER) {
        flatListRef.current?.scrollToOffset({
          offset: minOffset,
          animated: true,
        })
        return
      }
      if (offsetX > maxOffset + CLAMP_BUFFER) {
        flatListRef.current?.scrollToOffset({
          offset: maxOffset,
          animated: true,
        })
        return
      }

      const index = Math.round(offsetX / FULL_ITEM_WIDTH)

      const clampedIndex = Math.max(0, Math.min(index, dates.length - 1))
      const centerDate = dates[clampedIndex]

      if (onFocusedDateChange) {
        onFocusedDateChange(centerDate)
      }
    },
    [dates, onFocusedDateChange, minOffset, maxOffset]
  )

  const handleItemPress = useCallback(
    (item, index) => {
      // Check range
      if (Math.abs(index - todayIndex) > VISIBLE_RANGE) return

      // Just update state; let useEffect handle the scrolling to prevent double-scroll conflicts
      setSelectedDate(item)
      if (onFocusedDateChange) onFocusedDateChange(item)
    },
    [setSelectedDate, onFocusedDateChange, todayIndex]
  )

  const renderItem = ({ item, index }) => {
    return (
      <DateItem
        item={item}
        index={index}
        isSelected={isSameDay(item, selectedDate)}
        isToday={isSameDay(item, new Date())}
        config={config}
        history={history}
        onPress={handleItemPress}
      />
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.listContainer}>
        {/* Visual Indicator */}
        <View style={styles.indicatorContainer} pointerEvents="none">
          <ChevronDown size={16} color={Colors.primary} />
        </View>

        <FlatList
          ref={flatListRef}
          horizontal
          data={dates}
          keyExtractor={(item) => item.toISOString()}
          renderItem={renderItem}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: SNAP_PADDING }}
          initialScrollIndex={todayIndex}
          getItemLayout={(data, index) => ({
            length: FULL_ITEM_WIDTH,
            offset: FULL_ITEM_WIDTH * index,
            index,
          })}
          snapToInterval={FULL_ITEM_WIDTH}
          snapToAlignment="start"
          decelerationRate="fast"
          onScroll={onScroll}
          scrollEventThrottle={16} // Standard for smooth updates
          onMomentumScrollEnd={(ev) => {
            if (isProgrammatic.current) return

            const offsetX = ev.nativeEvent.contentOffset.x
            const index = Math.round(offsetX / FULL_ITEM_WIDTH)

            // Snap Back Logic
            const diff = index - todayIndex
            if (Math.abs(diff) > VISIBLE_RANGE) {
              // Out of bounds - Snap back
              const targetIndex =
                diff > 0
                  ? todayIndex + VISIBLE_RANGE
                  : todayIndex - VISIBLE_RANGE
              const offset = getCenterOffset(targetIndex)
              const targetDate = dates[targetIndex]

              isProgrammatic.current = true
              flatListRef.current?.scrollToOffset({ offset, animated: true })

              // Also force select the bound date
              setSelectedDate(targetDate)

              setTimeout(() => {
                isProgrammatic.current = false
              }, 500)
              return
            }

            const clampedIndex = Math.max(0, Math.min(index, dates.length - 1))
            const newDate = dates[clampedIndex]
            if (!isSameDay(newDate, selectedDate)) {
              setSelectedDate(newDate)
            }
          }}
          onScrollEndDrag={(ev) => {
            const offsetX = ev.nativeEvent.contentOffset.x
            let targetOffset = null
            if (offsetX < minOffset) targetOffset = minOffset
            else if (offsetX > maxOffset) targetOffset = maxOffset

            if (targetOffset !== null) {
              isProgrammatic.current = true
              flatListRef.current?.scrollToOffset({
                offset: targetOffset,
                animated: true,
              })
              setTimeout(() => {
                isProgrammatic.current = false
              }, 500)
            }
          }}
          viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
          onScrollToIndexFailed={(info) => {
            const wait = new Promise((resolve) => setTimeout(resolve, 500))
            wait.then(() => {
              flatListRef.current?.scrollToIndex({
                index: info.index,
                animated: false,
              })
            })
          }}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  indicatorContainer: {
    position: "absolute",
    top: -12,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  listContainer: {
    flex: 1,
    position: "relative",
  },
  listContent: {
    // paddingHorizontal replaced by inline style SNAP_PADDING
  },
  dateItemWrapper: {
    marginHorizontal: ITEM_MARGIN,
    borderRadius: Layout.radius.full,
    overflow: "hidden",
  },
  dateItem: {
    alignItems: "center",
    justifyContent: "center",
    width: ITEM_WIDTH,
    height: 70,
    borderRadius: Layout.radius.full,
    gap: Spacing.xs,
  },
  dateItemSelected: {
    // Intentionally empty
  },
  dayText: {
    color: Colors.textTertiary,
    fontSize: Typography.small.fontSize,
    fontWeight: "600",
  },
  ringContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  dateText: {
    position: "absolute",
    fontSize: Typography.caption.fontSize,
    fontWeight: "bold",
    color: Colors.textSecondary,
  },
  dateTextSelected: {
    color: Colors.textPrimary,
  },
  floatingButtonContainer: {
    position: "absolute",
    right: Spacing.lg, // Align with typical padding
    bottom: Spacing.lg + 10, // Slightly above bottom to avoid covering items fully? No, centered.
    // Actually, let's put it on the right edge, centered vertically
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingRight: Spacing.lg,
  },
  floatingButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Layout.radius.full,
    backgroundColor: Colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: Colors.white10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  floatingButtonText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: "600",
  },
  dayLabelContainer: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10, // Circle
  },
  todayLabelContainer: {
    backgroundColor: "white",
  },
})
