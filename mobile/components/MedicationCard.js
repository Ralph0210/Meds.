import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
} from "react-native"
import { Check } from "lucide-react-native"

import { LinearGradient } from "expo-linear-gradient"

export default function MedicationCard({
  config,
  record,
  onViewDate,
  onToggle,
}) {
  // config: { id, name, description, type, color, bg_color, icon, ... }
  // record: { data: { "key1": true, "key2": false } } (or null)

  const isCompleted = (key) => record?.data?.[key] === true

  // Wrapper Component for consistent styles
  const CardWrapper = ({ children }) => {
    // Create a gradient from background color
    // We'll trust the bg_color but if it's missing use a default
    const bg = config.bg_color || "#1e1f25"
    return (
      <LinearGradient
        colors={[bg, adjustColor(bg, 20)]}
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

  // ... (Keep Renderers Logic same, but update their styles slightly if needed)

  // Re-define renderers to use cleaner styles?
  // For now let's just keep the logic but wrap the return.

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

  const CourseRenderer = () => {
    return (
      <View>
        <View style={[styles.rendererContainer, { marginBottom: 8 }]}>
          <Text style={styles.cardTitle}>{config.name}</Text>
          <Text style={styles.cardDesc}>Target: {config.total || 20}</Text>
        </View>
        {/* Progress Bar Stub - Make it look better */}
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              { width: "33%", backgroundColor: config.color },
            ]}
          />
        </View>

        <View style={{ gap: 8 }}>
          {config.schedule?.map((label, index) => {
            const key = config.keys?.[index]
            const checked = isCompleted(key)
            return (
              <TouchableOpacity
                key={key}
                onPress={() => onToggle(key, !checked)}
                style={[
                  styles.courseButton,
                  checked
                    ? styles.courseButtonChecked
                    : styles.courseButtonUnchecked,
                ]}
              >
                {checked && <Check size={18} color="black" />}
                <Text
                  style={
                    checked
                      ? styles.courseTextChecked
                      : styles.courseTextUnchecked
                  }
                >
                  {checked ? "Taken" : `Take ${label} Dose`}
                </Text>
              </TouchableOpacity>
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
          style={[
            styles.iconBox,
            { backgroundColor: "rgba(255,255,255,0.15)" },
          ]}
        >
          <Text style={[styles.iconText, { color: config.color }]}>
            {config.icon || (config.name ? config.name[0] : "?")}
          </Text>
        </View>

        <View style={{ flex: 1 }}>
          {config.type === "simple" && <SimpleRenderer />}
          {config.type === "multi" && <MultiRenderer />}
          {config.type === "course" && <CourseRenderer />}
        </View>
      </View>
    </CardWrapper>
  )
}

// Helper to slightly vary the gradient
function adjustColor(color) {
  // Since we don't have a color manipulation library,
  // we will return the same color. The LinearGradient will still
  // do a subtle shift if we used different opacity, but here
  // we rely on the border and natural lighting of the UI.
  // Ideally, this would darken or lighten the color.
  return color
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
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
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  cardDesc: {
    color: "rgba(255,255,255,0.6)",
  },
  checkbox: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderColor: "white",
  },
  checkboxUnchecked: {
    borderColor: "rgba(255,255,255,0.3)",
  },
  checkboxSmall: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSmallChecked: {
    backgroundColor: "white",
    borderColor: "white",
  },
  multiRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(0,0,0,0.1)",
    padding: 12,
    borderRadius: 12,
  },
  multiRowLabel: {
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
  },
  progressBarBg: {
    height: 8,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 999,
    marginBottom: 16,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  courseButton: {
    padding: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  courseButtonChecked: {
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  courseButtonUnchecked: {
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  courseTextChecked: {
    color: "black",
    fontWeight: "bold",
  },
  courseTextUnchecked: {
    color: "white",
    fontWeight: "500",
  },
})
