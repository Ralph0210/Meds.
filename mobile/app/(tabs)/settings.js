import React, { useState } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getMedications,
  addMedication,
  updateMedication,
  deleteMedication,
  resetDatabase,
} from "../../lib/db"
import { Plus, ChevronRight } from "lucide-react-native"
import { Colors, Spacing, Layout, Typography } from "../../theme"
import { ICONS } from "../../theme/icons"
import EditMedicationModal from "../../components/EditMedicationModal"

export default function SettingsScreen() {
  const queryClient = useQueryClient()
  const [editingMed, setEditingMed] = useState(null)
  const [isModalVisible, setIsModalVisible] = useState(false)

  // Fetch Config
  const { data: meds, isLoading } = useQuery({
    queryKey: ["medications"],
    queryFn: async () => {
      return getMedications()
    },
  })

  const handleEdit = (med) => {
    setEditingMed({ ...med })
    setIsModalVisible(true)
  }

  const handleNewLine = () => {
    setEditingMed(null) // null signals new
    setIsModalVisible(true)
  }

  const handleClose = () => {
    setIsModalVisible(false)
    setEditingMed(null)
  }

  const handleSaveMedication = async (medData) => {
    try {
      const isNew = !medData.id
      const payload = { ...medData }

      // Generate keys if they don't exist (critical for tracker)
      if (!payload.keys || payload.keys.length !== payload.times.length) {
        const baseId = Math.random().toString(36).substr(2, 9)
        payload.keys = payload.times.map((t, i) => `med_${baseId}_${i}`)
      }

      if (isNew) {
        delete payload.id
        await addMedication(payload)
      } else {
        await updateMedication(payload)
      }

      queryClient.invalidateQueries(["medications"])
      handleClose()
    } catch (err) {
      Alert.alert("Error", err.message)
    }
  }

  const handleDeleteMedication = async (med) => {
    try {
      if (med.id) {
        await deleteMedication(med.id)
        queryClient.invalidateQueries(["medications"])
        handleClose()
      }
    } catch (err) {
      Alert.alert("Error", "Failed to delete")
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Manager</Text>
      </View>

      <ScrollView style={styles.content}>
        {isLoading && <ActivityIndicator color={Colors.primary} />}
        {meds?.map((med, index) => (
          <TouchableOpacity
            key={med.id || index}
            style={styles.item}
            onPress={() => handleEdit(med)}
          >
            <View
              style={[
                styles.iconBox,
                { backgroundColor: `${med.color || Colors.primary}20` },
              ]}
            >
              {(() => {
                const IconComp = ICONS[med.icon] || ICONS.Pill
                return (
                  <IconComp size={24} color={med.color || Colors.primary} />
                )
              })()}
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>
                {med.name || "Unnamed Medication"}
              </Text>
              <Text style={styles.itemDesc}>{med.dosage || med.frequency}</Text>
            </View>
            <ChevronRight color={Colors.textTertiary} size={20} />
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.addBtn} onPress={handleNewLine}>
          <Plus color={Colors.textOnPrimary} size={24} />
          <Text style={styles.addBtnText}>Add Medication</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.deleteBtn,
            {
              marginTop: Spacing.xxxl,
              backgroundColor: Colors.dangerSurface,
              alignSelf: "center",
              width: "100%",
            },
          ]}
          onPress={() => {
            Alert.alert(
              "Reset Everything?",
              "This will delete all data and reset to defaults.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Reset",
                  style: "destructive",
                  onPress: () => {
                    resetDatabase()
                    queryClient.invalidateQueries()
                  },
                },
              ]
            )
          }}
        >
          <Text style={[styles.deleteText, { color: Colors.danger }]}>
            Reset All Data (Dev)
          </Text>
        </TouchableOpacity>
        <View style={{ height: 100 }} />
      </ScrollView>

      <EditMedicationModal
        visible={isModalVisible}
        medication={editingMed}
        onClose={handleClose}
        onSave={handleSaveMedication}
        onDelete={handleDeleteMedication}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  headerTitle: {
    fontSize: Typography.header.fontSize,
    fontWeight: "bold",
    color: Colors.textPrimary,
  },
  content: {
    paddingHorizontal: Spacing.xl,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceHighlight,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: Layout.radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.lg,
  },
  iconText: {
    fontWeight: "bold",
    fontSize: 18,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    color: Colors.textPrimary,
    fontSize: Typography.subtitle.fontSize,
    fontWeight: "600",
  },
  itemDesc: {
    color: Colors.textSecondary,
    fontSize: Typography.caption.fontSize,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
    borderRadius: Layout.radius.lg,
    marginTop: Spacing.xxl,
  },
  addBtnText: {
    color: Colors.textOnPrimary,
    fontWeight: "bold",
    fontSize: Typography.body.fontSize,
    marginLeft: Spacing.sm,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    borderRadius: Layout.radius.lg,
  },
  deleteText: {
    fontWeight: "bold",
    marginLeft: Spacing.sm,
  },
})
