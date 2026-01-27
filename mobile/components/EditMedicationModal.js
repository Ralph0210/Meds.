import React, { useState, useEffect } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  Alert,
  Platform,
} from "react-native"
import DateTimePicker from "@react-native-community/datetimepicker"
import { BlurView } from "expo-blur"
import {
  X,
  Trash2,
  Check,
  ChevronRight,
  ChevronDown,
} from "lucide-react-native"
import { Colors, Spacing, Layout, Typography } from "../theme"
import { ICONS, ICON_KEYS } from "../theme/icons"
import Dropdown from "./Dropdown"

import { useMedicationForm } from "../hooks/useMedicationForm"
import {
  requestPermissions,
  hasNotificationPermission,
} from "../lib/notificationService"
import { t } from "../lib/i18n"

export default function EditMedicationModal({
  visible,
  medication,
  onClose,
  onSave,
  onDelete,
}) {
  const {
    form,
    setForm,
    isNew,
    updateConfig,
    getFinalDosage,
    SUPPORTED_COLORS,
  } = useMedicationForm(medication)

  const [personalizeExpanded, setPersonalizeExpanded] = useState(false)

  const handleSave = () => {
    if (!form.name) {
      Alert.alert(t("alert.missingName"), t("alert.enterName"))
      return
    }

    // Validation for Course Type
    if (form.type === "course") {
      if (!form.config.courseDuration) {
        Alert.alert(t("alert.missingDuration"), t("alert.enterDuration"))
        return
      }
      if (!form.config.startDate) {
        Alert.alert(t("alert.missingStartDate"), t("alert.selectStartDate"))
        return
      }
    }

    onSave({ ...medication, ...form, dosage: getFinalDosage() })
  }

  const handleDelete = () => {
    Alert.alert(t("alert.deleteMedication"), t("alert.cannotUndo"), [
      { text: t("button.cancel"), style: "cancel" },
      {
        text: t("button.delete"),
        style: "destructive",
        onPress: () => onDelete(medication),
      },
    ])
  }

  // --- Renderers for Type-Specific Forms ---

  // --- Renderers for Type-Specific Forms ---

  const renderIntervalForm = () => (
    <View style={styles.subForm}>
      <Text style={styles.sectionHeader}>{t("form.intervalSettings")}</Text>
      <View style={styles.formGroup}>
        <Text style={styles.label}>{t("form.repeatEvery")}</Text>
        <TextInput
          style={styles.input}
          placeholder={t("form.namePlaceholder")}
          keyboardType="numeric"
          placeholderTextColor={Colors.textTertiary}
          value={form.config.intervalDays}
          onChangeText={(t) => updateConfig("intervalDays", t)}
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.label}>{t("form.nextDueDate")}</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={Colors.textTertiary}
          value={form.config.nextDueDate}
          onChangeText={(t) => updateConfig("nextDueDate", t)}
        />
      </View>
    </View>
  )

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            {isNew ? t("button.addMedication") : t("button.saveMedication")}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X color={Colors.textPrimary} size={24} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {/* 1. Name */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>{t("form.name")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("form.namePlaceholder")}
              placeholderTextColor={Colors.textTertiary}
              value={form.name}
              onChangeText={(t) => setForm({ ...form, name: t })}
            />
          </View>

          {/* 2. Amount (Take [1 pill]) */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>{t("form.take")}</Text>
            <View style={{ flexDirection: "row", gap: Spacing.sm, zIndex: 10 }}>
              <View style={{ flex: 1 }}>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor={Colors.textTertiary}
                  value={form.dosageQuantity}
                  onChangeText={(t) => setForm({ ...form, dosageQuantity: t })}
                  keyboardType="default"
                />
              </View>
              <Dropdown
                value={t(`unit.${form.dosageUnit || "pill"}`)}
                options={[t("unit.pill"), t("unit.mg"), t("unit.ml")]}
                onChange={(val) => {
                  // val is translated, find key
                  const map = {
                    [t("unit.pill")]: "pill",
                    [t("unit.mg")]: "mg",
                    [t("unit.ml")]: "ml",
                  }
                  setForm({ ...form, dosageUnit: map[val] || "pill" })
                }}
                width={100}
              />
            </View>
            {/* Quick Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: Spacing.sm }}
              contentContainerStyle={{ gap: Spacing.xs }}
            >
              {(form.dosageUnit === "pill" || !form.dosageUnit
                ? ["1/4", "1/2", "1", "2", "3"]
                : ["5", "10", "20", "50", "100", "200", "500", "1000"]
              ).map((val) => {
                const isSelected = form.dosageQuantity === val
                return (
                  <TouchableOpacity
                    key={val}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => setForm({ ...form, dosageQuantity: val })}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.chipTextActive,
                      ]}
                    >
                      {val}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>

          {/* 3. Frequency & Schedule Group */}
          <View style={[styles.formGroup, { zIndex: 9 }]}>
            <Text style={styles.label}>{t("form.frequency")}</Text>

            <View
              style={{
                flexDirection: "row",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              {/* Left Column: Frequency Dropdown */}
              <View style={{ flex: 1.2 }}>
                <Dropdown
                  value={
                    form.type === "cyclic"
                      ? t("form.cyclicSchedule")
                      : form.type === "interval"
                        ? t("form.intervalSchedule")
                        : form.frequency === "1x Daily"
                          ? t("form.onceDay")
                          : form.frequency === "2x Daily"
                            ? t("form.twiceDay")
                            : form.frequency === "3x Daily"
                              ? t("form.threeDay")
                              : t("form.customSchedule")
                  }
                  options={[
                    t("form.onceDay"),
                    t("form.twiceDay"),
                    t("form.threeDay"),
                    t("form.customSchedule"),
                  ]}
                  onChange={(label) => {
                    if (false) {
                      // Cyclic removed
                    } else {
                      const newType =
                        form.type === "interval"
                          ? "daily"
                          : form.type === "cyclic"
                            ? "daily"
                            : form.type // Fallback if somehow cyclic

                      let freq = "Custom"
                      let times = [...form.times]

                      if (label === t("form.onceDay")) {
                        freq = "1x Daily"
                        times = ["Morning"]
                      } else if (label === t("form.twiceDay")) {
                        freq = "2x Daily"
                        times = ["Morning", "Night"]
                      } else if (label === t("form.threeDay")) {
                        freq = "3x Daily"
                        times = ["Morning", "Noon", "Night"]
                      }

                      setForm({
                        ...form,
                        type: newType,
                        frequency: freq,
                        times,
                      })
                    }
                  }}
                  width="100%"
                />
              </View>

              {/* Right Column: Time Slots */}
              {(form.type === "daily" || form.type === "course") && (
                <View style={{ flex: 1 }}>
                  {form.times.map((time, index) => {
                    const PRESET_KEYS = [
                      "Morning",
                      "Noon",
                      "Evening",
                      "Night",
                      "Before Meal",
                      "After Meal",
                      "Time",
                    ]
                    const PRESET_MAP = {
                      Morning: t("time.morning"),
                      Noon: t("time.noon"),
                      Evening: t("time.evening"),
                      Night: t("time.night"),
                      "Before Meal": t("time.beforeMeal"),
                      "After Meal": t("time.afterMeal"),
                      Time: t("time.time"),
                    }

                    const displayPresets = PRESET_KEYS.map((k) => PRESET_MAP[k])

                    // Check if current value is a keyword preset (English)
                    const isKeyword =
                      PRESET_KEYS.includes(time) && time !== "Time"

                    // If not a keyword, it's a specific time (or "Time" placeholder)
                    const isTimeMode = !isKeyword

                    // Helper to get Date object from string "H:MM AM"
                    const getTimeDate = (str) => {
                      const d = new Date()
                      if (!str || PRESET_KEYS.includes(str)) {
                        d.setHours(8, 0, 0, 0) // Default 8 AM
                        return d
                      }
                      const [timePart, period] = str.split(" ")
                      if (!timePart || !period) return d
                      let [h, m] = timePart.split(":").map(Number)
                      if (period === "PM" && h !== 12) h += 12
                      if (period === "AM" && h === 12) h = 0
                      d.setHours(h, m, 0, 0)
                      return d
                    }

                    return (
                      <View
                        key={index}
                        style={[
                          styles.timeSlotRow,
                          {
                            zIndex: 50 - index,
                            marginBottom: Spacing.sm,
                            flexDirection: "row",
                            gap: 12, // Match parent gap
                            alignItems: "center",
                          },
                        ]}
                      >
                        {/* Split UI: Time Mode vs Preset Mode */}
                        {isTimeMode ? (
                          form.times.length > 1 ? (
                            /* Multi-slot: Combined TimePicker + Chevron in one container */
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                height: 48,
                                backgroundColor: Colors.surfaceHighlight,
                                borderRadius: Layout.radius.md,
                                borderWidth: 1,
                                borderColor: Colors.white10,
                                paddingRight: 4,
                              }}
                            >
                              <DateTimePicker
                                value={getTimeDate(time)}
                                mode="time"
                                display="compact"
                                onChange={(e, date) => {
                                  if (date) {
                                    let h = date.getHours()
                                    const m = String(
                                      date.getMinutes(),
                                    ).padStart(2, "0")
                                    const period = h >= 12 ? "PM" : "AM"
                                    if (h > 12) h -= 12
                                    if (h === 0) h = 12
                                    const newTimeStr = `${h}:${m} ${period}`

                                    const newTimes = [...form.times]
                                    newTimes[index] = newTimeStr
                                    setForm({ ...form, times: newTimes })
                                  }
                                }}
                                themeVariant="dark"
                                style={{
                                  transform: [{ scale: 0.85 }],
                                  marginLeft: -8,
                                }}
                              />
                              <Dropdown
                                value={t("time.time")}
                                options={displayPresets}
                                iconOnly={true}
                                menuWidth={120}
                                onChange={(val) => {
                                  // val is localized. Find English key.
                                  const key = PRESET_KEYS.find(
                                    (k) => PRESET_MAP[k] === val,
                                  )
                                  const newTimes = [...form.times]
                                  if (key === "Time") {
                                    newTimes[index] = "8:00 AM"
                                  } else {
                                    newTimes[index] = key || val
                                  }
                                  setForm({ ...form, times: newTimes })
                                }}
                                width={36}
                              />
                            </View>
                          ) : (
                            /* Single-slot: Original split layout */
                            <>
                              <View
                                style={{
                                  flex: 1,
                                  height: 48,
                                  backgroundColor: Colors.surfaceHighlight,
                                  borderRadius: Layout.radius.md,
                                  borderWidth: 1,
                                  borderColor: Colors.white10,
                                  overflow: "hidden",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <DateTimePicker
                                  value={getTimeDate(time)}
                                  mode="time"
                                  display="compact"
                                  onChange={(e, date) => {
                                    if (date) {
                                      let h = date.getHours()
                                      const m = String(
                                        date.getMinutes(),
                                      ).padStart(2, "0")
                                      const period = h >= 12 ? "PM" : "AM"
                                      if (h > 12) h -= 12
                                      if (h === 0) h = 12
                                      const newTimeStr = `${h}:${m} ${period}`

                                      const newTimes = [...form.times]
                                      newTimes[index] = newTimeStr
                                      setForm({ ...form, times: newTimes })
                                    }
                                  }}
                                  themeVariant="dark"
                                  style={{
                                    transform: [{ scale: 1 }], // Original scale for single
                                  }}
                                />
                              </View>
                              {/* Revert Button */}
                              <Dropdown
                                value={t("time.time")}
                                options={displayPresets}
                                iconOnly={true}
                                menuWidth={120}
                                onChange={(val) => {
                                  const key = PRESET_KEYS.find(
                                    (k) => PRESET_MAP[k] === val,
                                  )
                                  const newTimes = [...form.times]
                                  newTimes[index] = key || val
                                  setForm({ ...form, times: newTimes })
                                }}
                                width={48} // Slightly wider for single view
                              />
                            </>
                          )
                        ) : (
                          /* Preset Mode (e.g. "Morning") */
                          <Dropdown
                            value={PRESET_MAP[time] || time}
                            options={displayPresets}
                            onChange={(val) => {
                              const key = PRESET_KEYS.find(
                                (k) => PRESET_MAP[k] === val,
                              )
                              const newTimes = [...form.times]
                              if (key === "Time") {
                                newTimes[index] = "8:00 AM" // Switch to default custom time
                              } else {
                                newTimes[index] = key || val
                              }
                              setForm({ ...form, times: newTimes })
                            }}
                            width="100%"
                          />
                        )}
                        {/* Remove Button for Multi-slot */}
                        {form.times.length > 1 && (
                          <TouchableOpacity
                            onPress={() => {
                              const newTimes = form.times.filter(
                                (_, i) => i !== index,
                              )

                              let newFreq = "Custom"
                              if (
                                newTimes.length === 1 &&
                                newTimes[0] === "Morning"
                              ) {
                                newFreq = "1x Daily"
                              } else if (
                                newTimes.length === 2 &&
                                newTimes.includes("Morning") &&
                                newTimes.includes("Night")
                              ) {
                                newFreq = "2x Daily"
                              } else if (
                                newTimes.length === 3 &&
                                newTimes.includes("Morning") &&
                                newTimes.includes("Noon") &&
                                newTimes.includes("Night")
                              ) {
                                newFreq = "3x Daily"
                              }

                              setForm({
                                ...form,
                                times: newTimes,
                                frequency: newFreq,
                              })
                            }}
                            style={{ padding: 4, marginRight: 16 }}
                          >
                            <X size={14} color={Colors.textSecondary} />
                          </TouchableOpacity>
                        )}
                      </View>
                    )
                  })}
                  {form.frequency === "Custom" && (
                    <TouchableOpacity
                      style={[styles.addSlotBtn, { padding: 8, marginTop: 0 }]}
                      onPress={() => {
                        setForm({
                          ...form,
                          times: [...form.times, "8:00 AM"],
                          frequency: "Custom",
                        })
                      }}
                    >
                      <Text style={[styles.addSlotText, { fontSize: 12 }]}>
                        + Add
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            {/* Set Duration Toggle - Full Width below row */}
            <View style={{ marginTop: Spacing.sm }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: form.type === "course" ? Spacing.sm : 0,
                }}
              >
                <Text style={[styles.label, { marginBottom: 0 }]}>
                  {t("form.setDuration")}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    setForm({
                      ...form,
                      type: form.type === "course" ? "daily" : "course",
                    })
                  }
                  style={{
                    width: 40,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor:
                      form.type === "course" ? Colors.primary : Colors.white20,
                    padding: 2,
                    alignItems:
                      form.type === "course" ? "flex-end" : "flex-start",
                  }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: "white",
                    }}
                  />
                </TouchableOpacity>
              </View>

              {form.type === "course" && (
                <View>
                  <View
                    style={{
                      flexDirection: "row",
                      gap: Spacing.sm,
                      zIndex: 20,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <TextInput
                        style={styles.input}
                        placeholder={
                          form.config.durationMode === "quantity"
                            ? t("form.durationQuantityPlaceholder")
                            : t("form.durationDaysPlaceholder")
                        }
                        keyboardType="numeric"
                        placeholderTextColor={Colors.textTertiary}
                        value={form.config.courseDuration}
                        onChangeText={(t) => updateConfig("courseDuration", t)}
                      />
                    </View>
                    <Dropdown
                      value={
                        form.config.durationMode === "quantity"
                          ? t(`unit.${form.dosageUnit || "pill"}`)
                          : t("form.days")
                      }
                      options={[
                        t(`unit.${form.dosageUnit || "pill"}`),
                        t("form.days"),
                      ]}
                      onChange={(val) =>
                        updateConfig(
                          "durationMode",
                          val === t("form.days") ? "days" : "quantity",
                        )
                      }
                      width={110}
                    />
                  </View>
                  <View style={{ marginTop: Spacing.md }}>
                    <Text style={styles.label}>{t("form.startDate")}</Text>
                    {Platform.OS === "ios" ? (
                      <View style={{ alignItems: "flex-start" }}>
                        <DateTimePicker
                          value={(() => {
                            if (form.config.startDate) {
                              const [y, m, d] = form.config.startDate
                                .split("-")
                                .map(Number)
                              return new Date(y, m - 1, d)
                            }
                            return new Date()
                          })()}
                          mode="date"
                          display="compact" // inline, compact, spinner
                          onChange={(e, selectedDate) => {
                            if (selectedDate) {
                              const y = selectedDate.getFullYear()
                              const m = String(
                                selectedDate.getMonth() + 1,
                              ).padStart(2, "0")
                              const d = String(selectedDate.getDate()).padStart(
                                2,
                                "0",
                              )
                              updateConfig("startDate", `${y}-${m}-${d}`)
                            }
                          }}
                          themeVariant="dark" // Assuming dark mode
                          style={{ marginLeft: -10 }} // Align left? DatePicker compact styling is tricky.
                        />
                      </View>
                    ) : (
                      <TextInput
                        style={styles.input}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={Colors.textTertiary}
                        value={
                          form.config.startDate ||
                          new Date().toLocaleDateString("en-CA")
                        }
                        onChangeText={(t) => updateConfig("startDate", t)}
                      />
                    )}
                  </View>
                </View>
              )}
            </View>

            {/* Cyclic Form - Nested here if selected */}
            {form.type === "cyclic" && (
              <View style={{ marginTop: Spacing.md }}>
                <View style={{ flexDirection: "row", gap: Spacing.md }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>{t("form.cycleLength")}</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="28"
                      keyboardType="numeric"
                      placeholderTextColor={Colors.textTertiary}
                      value={form.config.cycleDays}
                      onChangeText={(t) => updateConfig("cycleDays", t)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>{t("form.activeDays")}</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="21"
                      keyboardType="numeric"
                      placeholderTextColor={Colors.textTertiary}
                      value={form.config.activeDays}
                      onChangeText={(t) => updateConfig("activeDays", t)}
                    />
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Reminder Notifications */}
          <View style={styles.formGroup}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: form.notificationEnabled ? Spacing.sm : 0,
              }}
            >
              <Text style={[styles.label, { marginBottom: 0 }]}>
                {t("form.reminderNotifications")}
              </Text>
              <TouchableOpacity
                onPress={async () => {
                  if (!form.notificationEnabled) {
                    // Turning ON - check/request permissions
                    const hasPermission = await hasNotificationPermission()
                    if (!hasPermission) {
                      const granted = await requestPermissions()
                      if (!granted) {
                        Alert.alert(
                          t("alert.notificationsDisabled"),
                          t("alert.enableNotifications"),
                          [{ text: "OK" }],
                        )
                        return
                      }
                    }
                  }
                  setForm({
                    ...form,
                    notificationEnabled: !form.notificationEnabled,
                  })
                }}
                style={{
                  width: 40,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: form.notificationEnabled
                    ? Colors.primary
                    : Colors.white20,
                  padding: 2,
                  alignItems: form.notificationEnabled
                    ? "flex-end"
                    : "flex-start",
                }}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: "white",
                  }}
                />
              </TouchableOpacity>
            </View>

            {form.notificationEnabled && (
              <View>
                {form.times.map((timeSlot, index) => {
                  // Get the custom time if set, otherwise use default placeholder
                  const customTime = form.notificationTimes?.[timeSlot]
                  const displayTime = customTime || timeSlot

                  // Helper to get Date object from string
                  const getTimeDate = (str) => {
                    const d = new Date()
                    const presets = {
                      Morning: { hour: 8, minute: 0 },
                      Noon: { hour: 12, minute: 0 },
                      Evening: { hour: 18, minute: 0 },
                      Night: { hour: 21, minute: 0 },
                      "Before Meal": { hour: 7, minute: 30 },
                      "After Meal": { hour: 8, minute: 30 },
                    }

                    if (presets[str]) {
                      d.setHours(presets[str].hour, presets[str].minute, 0, 0)
                      return d
                    }

                    // Parse "H:MM AM/PM" format
                    const match = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
                    if (match) {
                      let h = parseInt(match[1], 10)
                      const m = parseInt(match[2], 10)
                      const period = match[3].toUpperCase()
                      if (period === "PM" && h !== 12) h += 12
                      if (period === "AM" && h === 12) h = 0
                      d.setHours(h, m, 0, 0)
                      return d
                    }

                    d.setHours(8, 0, 0, 0)
                    return d
                  }

                  return (
                    <View
                      key={`notify-${index}`}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        height: 48,
                        backgroundColor: Colors.surfaceHighlight,
                        borderRadius: Layout.radius.md,
                        paddingHorizontal: Spacing.md,
                        marginBottom:
                          index < form.times.length - 1 ? Spacing.sm : 0,
                        borderWidth: 1,
                        borderColor: Colors.white10,
                      }}
                    >
                      <Text
                        style={{
                          color: Colors.textPrimary,
                          fontSize: Typography.body.fontSize,
                          fontWeight: "600",
                        }}
                      >
                        {(() => {
                          const map = {
                            Morning: t("time.morning"),
                            Noon: t("time.noon"),
                            Evening: t("time.evening"),
                            Night: t("time.night"),
                            "Before Meal": t("time.beforeMeal"),
                            "After Meal": t("time.afterMeal"),
                            Time: t("time.time"),
                          }
                          return map[timeSlot] || timeSlot
                        })()}
                      </Text>
                      <DateTimePicker
                        value={getTimeDate(displayTime)}
                        mode="time"
                        display="compact"
                        onChange={(e, date) => {
                          if (date) {
                            let h = date.getHours()
                            const m = String(date.getMinutes()).padStart(2, "0")
                            const period = h >= 12 ? "PM" : "AM"
                            if (h > 12) h -= 12
                            if (h === 0) h = 12
                            const newTimeStr = `${h}:${m} ${period}`

                            setForm({
                              ...form,
                              notificationTimes: {
                                ...form.notificationTimes,
                                [timeSlot]: newTimeStr,
                              },
                            })
                          }
                        }}
                        themeVariant="dark"
                        style={{ marginRight: -8 }}
                      />
                    </View>
                  )
                })}
              </View>
            )}
          </View>

          {/* Personalize - Collapsible Section */}
          <View style={styles.formGroup}>
            <TouchableOpacity
              onPress={() => setPersonalizeExpanded(!personalizeExpanded)}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={[styles.label, { marginBottom: 0 }]}>
                {t("form.personalize")}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: Spacing.sm,
                }}
              >
                {/* Preview when collapsed */}
                {!personalizeExpanded && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: Spacing.sm,
                    }}
                  >
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        backgroundColor: form.color,
                      }}
                    />
                    {(() => {
                      const IconComp = ICONS[form.icon]
                      return IconComp ? (
                        <IconComp size={20} color={Colors.textSecondary} />
                      ) : null
                    })()}
                  </View>
                )}
                <ChevronDown
                  size={20}
                  color={Colors.textSecondary}
                  style={{
                    transform: [
                      { rotate: personalizeExpanded ? "180deg" : "0deg" },
                    ],
                  }}
                />
              </View>
            </TouchableOpacity>

            {personalizeExpanded && (
              <View style={{ marginTop: Spacing.md }}>
                {/* Color Grid */}
                <Text style={[styles.label, { fontSize: 13 }]}>
                  {t("form.color")}
                </Text>
                <View style={styles.colorGrid}>
                  {SUPPORTED_COLORS.map((c) => {
                    const isSelected = form.color === c
                    return (
                      <TouchableOpacity
                        key={c}
                        style={[
                          styles.colorCell,
                          isSelected && {
                            borderWidth: 2,
                            borderColor: Colors.primary,
                            backgroundColor: "transparent",
                            padding: 3,
                          },
                          !isSelected && { backgroundColor: c },
                        ]}
                        onPress={() => setForm({ ...form, color: c })}
                      >
                        {isSelected && (
                          <View
                            style={{
                              flex: 1,
                              width: "100%",
                              borderRadius: 999,
                              backgroundColor: c,
                            }}
                          />
                        )}
                      </TouchableOpacity>
                    )
                  })}
                </View>

                {/* Icon Grid */}
                <Text
                  style={[
                    styles.label,
                    { fontSize: 13, marginTop: Spacing.md },
                  ]}
                >
                  {t("form.icon")}
                </Text>
                <View style={styles.iconGrid}>
                  {ICON_KEYS.map((key) => {
                    const IconComp = ICONS[key]
                    const isActive = form.icon === key
                    return (
                      <TouchableOpacity
                        key={key}
                        style={[
                          styles.iconCell,
                          isActive && styles.iconCellActive,
                        ]}
                        onPress={() => setForm({ ...form, icon: key })}
                      >
                        <IconComp
                          size={24}
                          color={
                            isActive ? Colors.primary : Colors.textSecondary
                          }
                        />
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>
            )}
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>{t("button.saveMedication")}</Text>
          </TouchableOpacity>

          {!isNew && (
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <Trash2 color={Colors.danger} size={20} />
              <Text style={[styles.deleteText, { color: Colors.danger }]}>
                {t("button.deleteMedication")}
              </Text>
            </TouchableOpacity>
          )}

          <View style={{ height: Spacing.xxxl * 2 }} />
        </ScrollView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.surface,
    marginTop: 60,
    borderTopLeftRadius: Layout.radius.xl,
    borderTopRightRadius: Layout.radius.xl,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.white10,
  },
  modalTitle: {
    fontSize: Typography.title.fontSize,
    fontWeight: "bold",
    color: Colors.textPrimary,
  },
  closeBtn: {
    padding: Spacing.sm,
  },
  modalContent: {
    flex: 1,
    padding: Spacing.xl,
    paddingTop: Spacing.xxl, // Extra top breathing room
  },
  formGroup: {
    marginBottom: Spacing.xxl,
  },
  subForm: {
    backgroundColor: Colors.surfaceHighlight,
    padding: Spacing.lg,
    borderRadius: Layout.radius.lg,
    marginBottom: Spacing.xxl,
    borderColor: Colors.white10,
    borderWidth: 1,
  },
  sectionHeader: {
    color: Colors.textPrimary,
    fontWeight: "bold",
    marginBottom: Spacing.md,
    fontSize: Typography.body.fontSize,
  },
  label: {
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    fontSize: Typography.caption.fontSize,
    fontWeight: "600",
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.md,
    padding: Spacing.md,
    color: Colors.textPrimary,
    fontSize: Typography.body.fontSize,
    borderWidth: 1,
    borderColor: Colors.white10,
  },
  typeChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Layout.radius.full,
    backgroundColor: Colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: Colors.white10,
  },
  typeChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeChipText: {
    color: Colors.textSecondary,
    fontWeight: "600",
    fontSize: Typography.caption.fontSize,
  },
  typeChipTextActive: {
    color: Colors.textOnPrimary,
  },
  typeDesc: {
    marginTop: Spacing.sm,
    color: Colors.textSecondary,
    fontSize: Typography.caption.fontSize,
    backgroundColor: Colors.surfaceHighlight,
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Layout.radius.md,
    overflow: "hidden",
  },
  optionsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  optionBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.md,
    alignItems: "center",
  },
  optionBtnActive: {
    backgroundColor: Colors.primary,
  },
  optionText: {
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  optionTextActive: {
    color: Colors.textOnPrimary,
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  colorCell: {
    width: 40,
    height: 40,
    borderRadius: Layout.radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  iconCell: {
    width: 48,
    height: 48,
    borderRadius: Layout.radius.md,
    backgroundColor: Colors.surfaceHighlight,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCellActive: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
    borderRadius: Layout.radius.lg,
    alignItems: "center",
    marginTop: Spacing.lg,
  },
  saveBtnText: {
    color: Colors.textOnPrimary,
    fontWeight: "bold",
    fontSize: Typography.body.fontSize,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
    borderRadius: Layout.radius.lg,
    borderWidth: 1,
    borderColor: Colors.dangerSurface,
    backgroundColor: Colors.dangerSurface,
  },
  deleteText: {
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  timeSlotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  removeSlotBtn: {
    padding: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.md,
    height: 48,
    width: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  addSlotBtn: {
    padding: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.white20,
    borderRadius: Layout.radius.md,
    borderStyle: "dashed",
    marginTop: Spacing.sm,
  },
  addSlotText: {
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Layout.radius.full,
    backgroundColor: Colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: Colors.white10,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    color: Colors.textSecondary,
    fontSize: Typography.caption.fontSize,
    fontWeight: "600",
  },
  chipTextActive: {
    color: Colors.textOnPrimary,
  },
  unitSelector: {
    backgroundColor: Colors.surfaceHighlight,
    borderRadius: Layout.radius.md,
    borderWidth: 1,
    borderColor: Colors.white10,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
  },
  unitText: {
    color: Colors.textPrimary,
    fontWeight: "600",
    fontSize: Typography.body.fontSize,
  },
})
