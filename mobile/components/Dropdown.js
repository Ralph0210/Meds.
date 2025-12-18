import React, { useState, useRef } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
  Dimensions,
} from "react-native"
import { ChevronDown, Check } from "lucide-react-native"
import { Colors, Spacing, Layout, Typography } from "../theme"

export default function Dropdown({
  value,
  options = [],
  onChange,
  placeholder = "Select...",
  label,
  width = 120, // Default width
  iconOnly = false,
  menuWidth = null,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [buttonLayout, setButtonLayout] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  })
  const buttonRef = useRef(null)

  const handleSelect = (option) => {
    onChange(option)
    setIsOpen(false)
  }

  const toggleDropdown = () => {
    if (buttonRef.current) {
      buttonRef.current.measureInWindow((x, y, w, h) => {
        setButtonLayout({ x, y, w, h })
        setIsOpen(!isOpen)
      })
    }
  }

  const windowWidth = Dimensions.get("window").width
  const dropdownWidth = menuWidth || Math.max(width, 80)
  // Auto-align: if it goes off screen to the right, align to right edge of button
  const shouldAlignRight = buttonLayout.x + dropdownWidth > windowWidth - 16 // 16px buffer

  return (
    <View style={[styles.container, { zIndex: isOpen ? 1000 : 1 }]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        ref={buttonRef}
        style={[
          styles.button,
          isOpen && styles.buttonActive,
          iconOnly
            ? { width: 44, justifyContent: "center", paddingHorizontal: 0 }
            : { width },
        ]}
        onPress={toggleDropdown}
        activeOpacity={0.7}
      >
        {!iconOnly && (
          <Text style={styles.buttonText}>{value || placeholder}</Text>
        )}
        <ChevronDown
          size={16}
          color={isOpen ? Colors.primary : Colors.textSecondary}
          style={{
            transform: [{ rotate: isOpen ? "180deg" : "0deg" }],
          }}
        />
      </TouchableOpacity>

      {isOpen && (
        <>
          {/* Click outside overlay */}
          <TouchableOpacity
            style={styles.overlay}
            activeOpacity={1}
            onPress={() => setIsOpen(false)}
          />

          <View
            style={[
              styles.dropdown,
              {
                position: "absolute",
                top: "100%",
                marginTop: 4,
                width: dropdownWidth,
                ...(shouldAlignRight ? { right: 0 } : { left: 0 }),
              },
            ]}
          >
            {options.map((option) => {
              const isSelected = option === value
              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.option, isSelected && styles.optionSelected]}
                  onPress={() => handleSelect(option)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      isSelected && styles.optionTextSelected,
                    ]}
                  >
                    {option}
                  </Text>
                  {isSelected && <Check size={14} color={Colors.primary} />}
                </TouchableOpacity>
              )
            })}
          </View>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  label: {
    color: Colors.textSecondary,
    fontSize: Typography.caption.fontSize,
    marginBottom: Spacing.xs,
    fontWeight: "600",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surfaceHighlight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Layout.radius.md,
    borderWidth: 1,
    borderColor: Colors.white10,
  },
  buttonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },
  buttonText: {
    color: Colors.textPrimary,
    fontSize: Typography.body.fontSize,
    fontWeight: "600",
  },
  overlay: {
    // Covers the screen to handle outside clicks
    position: "absolute",
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    zIndex: 99,
  },
  dropdown: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.radius.md,
    borderWidth: 1,
    borderColor: Colors.white10,
    padding: Spacing.xs,
    // Shadows
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 100, // Above overlay
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Layout.radius.sm,
  },
  optionSelected: {
    backgroundColor: Colors.surfaceHighlight,
  },
  optionText: {
    color: Colors.textSecondary,
    fontSize: Typography.body.fontSize,
  },
  optionTextSelected: {
    color: Colors.textPrimary,
    fontWeight: "600",
  },
})
