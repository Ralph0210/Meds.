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
} from "react-native"
import { BlurView } from "expo-blur"
import { X, Trash2, Check, ChevronRight } from "lucide-react-native"
import { Colors, Spacing, Layout, Typography } from "../theme"
import { ICONS, ICON_KEYS } from "../theme/icons"
import Dropdown from "./Dropdown"

import { useMedicationForm } from "../hooks/useMedicationForm"

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

  const handleSave = () => {
    if (!form.name) return
    onSave({ ...medication, ...form, dosage: getFinalDosage() })
  }

  const handleDelete = () => {
    Alert.alert("Delete Medication?", "This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => onDelete(medication),
      },
    ])
  }

  // --- Renderers for Type-Specific Forms ---

  // --- Renderers for Type-Specific Forms ---

  const renderIntervalForm = () => (
    <View style={styles.subForm}>
      <Text style={styles.sectionHeader}>Interval Settings</Text>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Repeat Every (Days)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 2"
          keyboardType="numeric"
          placeholderTextColor={Colors.textTertiary}
          value={form.config.intervalDays}
          onChangeText={(t) => updateConfig("intervalDays", t)}
        />
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Next Due Date</Text>
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
            {isNew ? "Add Medication" : "Edit Medication"}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X color={Colors.textPrimary} size={24} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {/* 1. Name */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Metformin"
              placeholderTextColor={Colors.textTertiary}
              value={form.name}
              onChangeText={(t) => setForm({ ...form, name: t })}
            />
          </View>

          {/* 2. Amount (Take [1 pill]) */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Take</Text>
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
                value={form.dosageUnit}
                options={["pill", "mg", "ml"]}
                onChange={(val) => setForm({ ...form, dosageUnit: val })}
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
              {(form.dosageUnit === "pill"
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
            {/* Frequency and Times - Side by Side Row */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: Spacing.md,
              }}
            >
              {/* Left Column: Frequency Dropdown */}
              <View style={{ flex: 1.2 }}>
                <Text style={styles.label}>Frequency</Text>
                <Dropdown
                  value={
                    form.type === "cyclic"
                      ? "On and off (Cyclic)"
                      : form.type === "interval"
                        ? "Every X Days"
                        : form.frequency === "1x Daily"
                          ? "Once a day"
                          : form.frequency === "2x Daily"
                            ? "Twice a day"
                            : form.frequency === "3x Daily"
                              ? "3 times a day"
                              : "Custom Schedule"
                  }
                  options={[
                    "Once a day",
                    "Twice a day",
                    "3 times a day",
                    "Custom Schedule",
                    "On and off (Cyclic)",
                  ]}
                  onChange={(label) => {
                    if (label === "On and off (Cyclic)") {
                      setForm({ ...form, type: "cyclic" })
                    } else {
                      const newType =
                        form.type === "cyclic" || form.type === "interval"
                          ? "daily"
                          : form.type

                      let freq = "Custom"
                      let times = [...form.times]

                      if (label === "Once a day") {
                        freq = "1x Daily"
                        times = ["Morning"]
                      } else if (label === "Twice a day") {
                        freq = "2x Daily"
                        times = ["Morning", "Night"]
                      } else if (label === "3 times a day") {
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
                <View style={{ flex: 1, marginTop: 24 }}>
                  {/* marginTop 24 aligns with Label height (~20) + small margin to align with Input top */}
                  {form.times.map((time, index) => {
                    let timeValue = ""
                    let timePeriod = "AM"
                    const presets = [
                      "Morning",
                      "Noon",
                      "Evening",
                      "Night",
                      "Before Meal",
                      "After Meal",
                    ]
                    if (presets.includes(time)) {
                      timePeriod = time
                    } else {
                      const parts = time.split(" ")
                      if (
                        parts.length > 1 &&
                        ["AM", "PM"].includes(parts[parts.length - 1])
                      ) {
                        timePeriod = parts.pop()
                        timeValue = parts.join(" ")
                      } else {
                        timeValue = time
                      }
                    }

                    const updateTime = (val, period) => {
                      const newTimeStr = presets.includes(period)
                        ? period
                        : val
                          ? `${val} ${period}`
                          : period
                      const newTimes = [...form.times]
                      newTimes[index] = newTimeStr
                      setForm({ ...form, times: newTimes })
                    }
                    const isPreset = presets.includes(timePeriod)

                    return (
                      <View
                        key={index}
                        style={[
                          styles.timeSlotRow,
                          { zIndex: 50 - index, marginBottom: Spacing.sm },
                        ]}
                      >
                        {!isPreset && (
                          <View style={{ flex: 1 }}>
                            <TextInput
                              style={[styles.input, { paddingHorizontal: 8 }]} // Compact padding
                              value={timeValue}
                              placeholder="00:00"
                              placeholderTextColor={Colors.textTertiary}
                              onChangeText={(text) =>
                                updateTime(text, timePeriod)
                              }
                            />
                          </View>
                        )}
                        <View
                          style={{
                            flex: isPreset ? 1 : 0,
                            width: isPreset ? "auto" : 70,
                          }}
                        >
                          <Dropdown
                            value={timePeriod}
                            options={presets}
                            onChange={(period) => {
                              let newVal = timeValue
                              if (presets.includes(period)) newVal = ""
                              updateTime(newVal, period)
                            }}
                            width="100%"
                          />
                        </View>
                        {form.times.length > 1 && (
                          <TouchableOpacity
                            onPress={() => {
                              const newTimes = form.times.filter(
                                (_, i) => i !== index
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
                            style={{ padding: 4 }}
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
                  Set Duration
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
                      form.type === "course" ? Colors.primary : Colors.black20,
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
                            ? "e.g. 30"
                            : "e.g. 10"
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
                          ? form.dosageUnit || "pill"
                          : "days"
                      }
                      options={[form.dosageUnit || "pill", "days"]}
                      onChange={(val) =>
                        updateConfig(
                          "durationMode",
                          val === "days" ? "days" : "quantity"
                        )
                      }
                      width={110}
                    />
                  </View>
                  <View style={{ marginTop: Spacing.md }}>
                    <Text style={styles.label}>Start Date</Text>
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
                  </View>
                </View>
              )}
            </View>

            {/* Cyclic Form - Nested here if selected */}
            {form.type === "cyclic" && (
              <View style={{ marginTop: Spacing.md }}>
                <View style={{ flexDirection: "row", gap: Spacing.md }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Cycle Length (Days)</Text>
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
                    <Text style={styles.label}>Active Days</Text>
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

          {/* Color/Icon */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Color Tag</Text>
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
                        padding: 3, // Creates the gap
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
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Icon</Text>
            <View style={styles.iconGrid}>
              {ICON_KEYS.map((key) => {
                const IconComp = ICONS[key]
                const isActive = form.icon === key
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.iconCell, isActive && styles.iconCellActive]}
                    onPress={() => setForm({ ...form, icon: key })}
                  >
                    <IconComp
                      size={24}
                      color={isActive ? Colors.primary : Colors.textSecondary}
                    />
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Save Medication</Text>
          </TouchableOpacity>

          {!isNew && (
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <Trash2 color={Colors.danger} size={20} />
              <Text style={[styles.deleteText, { color: Colors.danger }]}>
                Delete Medication
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
