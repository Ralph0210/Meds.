import { useState, useEffect } from "react"
import { ICON_KEYS } from "../theme/icons"

const SUPPORTED_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEEAD",
  "#D4A5A5",
  "#9B59B6",
  "#3498DB",
  "#1ABC9C",
  "#F1C40F",
]

export const useMedicationForm = (medication) => {
  const isNew = !medication?.id

  const [form, setForm] = useState({
    name: "",
    dosageQuantity: "",
    dosageUnit: "pill",
    type: "daily",
    frequency: "1x Daily", // For Daily
    times: ["Morning"], // For Daily
    config: {}, // For other types
    color: SUPPORTED_COLORS[0],
    icon: ICON_KEYS[0],
  })

  // Load existing medication data
  useEffect(() => {
    if (medication) {
      setForm({
        name: medication.name || "",
        dosageQuantity: medication.dosage
          ? medication.dosage.replace(/[a-zA-Z\s]/g, "")
          : "",
        dosageUnit:
          medication.dosage && medication.dosage.includes("mg")
            ? "mg"
            : medication.dosage && medication.dosage.includes("ml")
              ? "ml"
              : "pill",
        type: medication.type || "daily",
        frequency: medication.frequency || "1x Daily",
        times: medication.times || ["Morning"],
        config: medication.config || {},
        color: medication.color || SUPPORTED_COLORS[0],
        icon: medication.icon || ICON_KEYS[0],
      })
    } else {
      // Reset to defaults for new medication
      setForm({
        name: "",
        dosageQuantity: "",
        dosageUnit: "pill",
        type: "daily",
        frequency: "1x Daily",
        times: ["Morning"],
        config: { startDate: new Date().toLocaleDateString("en-CA") },
        color: SUPPORTED_COLORS[0],
        icon: ICON_KEYS[0],
      })
    }
  }, [medication])

  const updateConfig = (key, value) => {
    setForm((prev) => ({
      ...prev,
      config: { ...prev.config, [key]: value },
    }))
  }

  const getFinalDosage = () => {
    if (!form.dosageQuantity) return ""
    const qty = form.dosageQuantity
    const unit = form.dosageUnit
    // Add space for non-pill units or explicitly "pill(s)"
    // If unit is pill, we want "1 pill" or "2 pills"
    if (unit === "pill") {
      const isPlural = parseInt(qty) !== 1
      return `${qty} pill${isPlural ? "s" : ""}`
    }
    return `${qty} ${unit}`
  }

  return {
    form,
    setForm,
    isNew,
    updateConfig,
    getFinalDosage,
    SUPPORTED_COLORS,
  }
}
