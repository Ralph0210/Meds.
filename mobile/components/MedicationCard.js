import { View, Text, Pressable, StyleSheet } from "react-native"
import { Check } from "lucide-react-native"

import { LinearGradient } from "expo-linear-gradient"
import { Colors, Spacing, Layout, Typography } from "../theme"
import { ICONS } from "../theme/icons"

export default function MedicationCard({
  config,
  record,
  onViewDate,
  onToggle,
}) {
  // config: { id, name, description, type, color, bg_color, icon, config: {...}, ... }
  // record: { data: { "key1": true, "key2": false } } (or null)

  const isCompleted = (key) => record?.data?.[key] === true

  // Helper for dosage text
  const getDosageText = () => {
    if (config.dosage) return config.dosage
    const qty = config.dosageQuantity || ""
    const unit = config.dosageUnit || "pills" // Default to pills if missing
    if (!qty && !unit) return ""
    return `${qty} ${unit}`.trim()
  }

  // Wrapper Component for consistent styles
  const CardWrapper = ({ children }) => {
    // Create a gradient from background color
    const bg = config.bg_color || "#1e1f25"
    return (
      <LinearGradient
        colors={[bg, adjustColor(bg)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.card,
          {
            borderColor: "rgba(255,255,255,0.08)",
            borderWidth: 1,
          },
        ]}
      >
        {children}
      </LinearGradient>
    )
  }

  /* New Clean Daily Renderer */
  const DailyRenderer = () => {
    const hasMultiple = config.keys?.length > 1

    const renderRow = (infoKey, label, showHeader = false) => {
      const checked = isCompleted(infoKey)

      return (
        <View key={infoKey}>
          <View
            style={[
              styles.dailyRow,
              showHeader && { paddingTop: 0, minHeight: 48 },
            ]}
          >
            {showHeader ? (
              <View
                style={{ flex: 1, justifyContent: "center", minHeight: 48 }}
              >
                <Text style={styles.cardTitle}>{config.name}</Text>
                <Text style={styles.cardDesc}>
                  {getDosageText()}
                  {label ? ` • ${label}` : ""}
                </Text>
              </View>
            ) : (
              <View style={{ flex: 1 }}>
                <Text style={styles.timeLabel}>{label}</Text>
              </View>
            )}

            <Pressable
              onPress={() => onToggle(infoKey, !checked)}
              style={[
                styles.checkbox,
                checked
                  ? { backgroundColor: config.color, borderColor: config.color }
                  : styles.checkboxUnchecked,
              ]}
            >
              {checked && <Check size={20} color="white" />}
            </Pressable>
          </View>
        </View>
      )
    }

    if (hasMultiple) {
      return (
        <View>
          <View
            style={{
              marginBottom: Spacing.md,
              minHeight: 48,
              justifyContent: "center",
            }}
          >
            <Text style={styles.cardTitle}>{config.name}</Text>
            <Text style={styles.cardDesc}>{getDosageText()}</Text>
          </View>
          <View>
            {config.keys.map((k, i) => {
              const label =
                config.times?.[i] || config.schedule?.[i] || `Dose ${i + 1}`
              const checked = isCompleted(k)
              const isLast = i === config.keys.length - 1

              return (
                <View key={k}>
                  <View
                    style={[styles.dailyRow, { paddingVertical: Spacing.xs }]}
                  >
                    <Text style={styles.timeLabel}>{label}</Text>
                    <Pressable
                      onPress={() => onToggle(k, !checked)}
                      style={[
                        styles.checkbox,
                        checked
                          ? {
                              backgroundColor: config.color,
                              borderColor: config.color,
                            }
                          : styles.checkboxUnchecked,
                      ]}
                    >
                      {checked && <Check size={20} color="white" />}
                    </Pressable>
                  </View>
                  {!isLast && <View style={styles.divider} />}
                </View>
              )
            })}
          </View>
        </View>
      )
    }

    // Single Case
    const singleKey = config.keys?.[0]
    const singleLabel = config.times?.[0] || config.frequency
    return renderRow(singleKey, singleLabel, true)
  }

  const SimpleRenderer = () => {
    const key = config.keys?.[0]
    const checked = isCompleted(key)

    return (
      <View style={styles.rendererContainer}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{config.name}</Text>
          <Text style={styles.cardDesc}>{config.description}</Text>
        </View>

        <Pressable
          onPress={() => onToggle(key, !checked)}
          style={[
            styles.checkbox,
            checked ? styles.checkboxChecked : styles.checkboxUnchecked,
          ]}
        >
          {checked && <Check size={20} color="white" />}
        </Pressable>
      </View>
    )
  }

  const MultiRenderer = () => {
    return (
      <View>
        <View style={[styles.rendererContainer, { marginBottom: 16 }]}>
          <Text style={styles.cardTitle}>{config.name}</Text>
        </View>
        <View style={{ gap: 12 }}>
          {config.schedule?.map((label, index) => {
            const key = config.keys?.[index]
            const checked = isCompleted(key)
            return (
              <View key={key} style={styles.multiRow}>
                <Text style={styles.multiRowLabel}>{label}</Text>
                <Pressable
                  onPress={() => onToggle(key, !checked)}
                  style={[
                    styles.checkboxSmall,
                    checked
                      ? styles.checkboxSmallChecked
                      : styles.checkboxUnchecked,
                    { backgroundColor: checked ? "white" : "transparent" },
                  ]}
                >
                  {checked && <Check size={16} color="black" />}
                </Pressable>
              </View>
            )
          })}
        </View>
      </View>
    )
  }

  /* Course Renderer with Progress */
  const CourseRenderer = () => {
    const medConfig = config.config || {}

    // 1. Calculate Time-Based Baseline
    let start = new Date()
    start.setHours(0, 0, 0, 0)

    if (medConfig.startDate) {
      const [y, m, d] = medConfig.startDate.split("-").map(Number)
      start = new Date(y, m - 1, d)
      start.setHours(0, 0, 0, 0)
    }

    const now = new Date()
    now.setHours(0, 0, 0, 0)

    const diffTime = now - start
    const daysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    const currentDay = daysPassed + 1

    // 2. Determine Progress & Badge Text
    let valCurrent, valTotal, labelText, progress

    if (medConfig.durationMode === "quantity") {
      const unit = config.dosageUnit || "pills"
      valTotal = parseInt(medConfig.courseDuration) || 1

      const dosesPerDay = config.keys?.length || 1

      // Calculate past doses accurately
      let pastDoses = 0
      if (daysPassed > 0) {
        pastDoses = daysPassed * dosesPerDay
      }

      // Get today's completion count
      const takenToday =
        config.keys?.reduce((acc, k) => acc + (isCompleted(k) ? 1 : 0), 0) || 0

      valCurrent = pastDoses + takenToday

      // Clamp visuals
      progress = Math.min(valCurrent / valTotal, 1)

      const Unit = unit.charAt(0).toUpperCase() + unit.slice(1)
      labelText = `${Unit} ${valCurrent} of ${valTotal}`
    } else {
      // Days Mode
      valTotal = parseInt(medConfig.courseDuration) || 1
      valCurrent = currentDay

      progress = Math.min(Math.max(daysPassed / valTotal, 0), 1)

      labelText = `Day ${valCurrent} of ${valTotal}`
    }

    return (
      <View>
        <View style={{ marginBottom: Spacing.md }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: Spacing.xs,
            }}
          >
            <View>
              <Text style={styles.cardTitle}>{config.name}</Text>
              <Text style={styles.cardDesc}>{getDosageText()}</Text>
            </View>
            <View style={styles.courseBadge}>
              <Text style={styles.courseBadgeText}>{labelText}</Text>
            </View>
          </View>

          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${progress * 100}%`, backgroundColor: config.color },
              ]}
            />
          </View>
        </View>

        <View style={{ gap: Spacing.md }}>
          {(!config.keys || config.keys.length === 0) && (
            <Text style={{ color: Colors.textSecondary }}>No schedule set</Text>
          )}

          {config.keys?.map((k, i) => {
            const label =
              config.times?.[i] || config.schedule?.[i] || `Dose ${i + 1}`
            const checked = isCompleted(k)
            const isLast = i === config.keys?.length - 1

            return (
              <View key={k}>
                <View
                  style={[styles.dailyRow, { paddingVertical: Spacing.xs }]}
                >
                  <Text style={styles.timeLabel}>{label}</Text>
                  <Pressable
                    onPress={() => onToggle(k, !checked)}
                    style={[
                      styles.checkbox,
                      checked
                        ? {
                            backgroundColor: config.color,
                            borderColor: config.color,
                          }
                        : styles.checkboxUnchecked,
                    ]}
                  >
                    {checked && <Check size={20} color="white" />}
                  </Pressable>
                </View>
                {!isLast && <View style={styles.divider} />}
              </View>
            )
          })}
        </View>
      </View>
    )
  }

  return (
    <CardWrapper>
      <View style={styles.contentRow}>
        <View
          style={[styles.iconBox, { backgroundColor: `${config.color}20` }]}
        >
          {(() => {
            const IconComponent = ICONS[config.icon] || ICONS.Pill
            return <IconComponent size={24} color={config.color} />
          })()}
        </View>

        <View style={{ flex: 1 }}>
          {config.type === "daily" && <DailyRenderer />}

          {config.type === "simple" && <SimpleRenderer />}
          {config.type === "multi" && <MultiRenderer />}
          {config.type === "course" && <CourseRenderer />}

          {!["simple", "daily", "multi", "course"].includes(config.type) && (
            <View style={styles.rendererContainer}>
              <View>
                <Text style={styles.cardTitle}>{config.name}</Text>
                <Text style={styles.cardDesc}>
                  {config.type} - Tracking coming soon
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </CardWrapper>
  )
}

function adjustColor(color) {
  return color
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Layout.radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.lg,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: Layout.radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginVertical: Spacing.sm,
  },
  iconText: {
    fontSize: 20,
    fontWeight: "bold",
  },
  rendererContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.subtitle.fontSize,
    fontWeight: "bold",
  },
  cardDesc: {
    color: Colors.white60,
  },
  checkbox: {
    width: 40,
    height: 40,
    borderRadius: Layout.radius.full,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: Colors.white20,
    borderColor: Colors.textPrimary,
  },
  checkboxUnchecked: {
    borderColor: "rgba(255,255,255,0.3)",
  },
  checkboxSmall: {
    width: 32,
    height: 32,
    borderRadius: Layout.radius.sm,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSmallChecked: {
    backgroundColor: Colors.textPrimary,
    borderColor: Colors.textPrimary,
  },
  multiRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.1)",
    padding: Spacing.md,
    borderRadius: Layout.radius.md,
  },
  multiRowLabel: {
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
  },
  progressBarBg: {
    height: 8,
    backgroundColor: Colors.black20,
    borderRadius: Layout.radius.full,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  dailyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timeLabel: {
    color: Colors.textPrimary,
    fontSize: Typography.subtitle.fontSize,
    fontWeight: "600",
  },
  courseBadge: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  courseBadgeText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
})
