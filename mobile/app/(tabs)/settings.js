import React, { useState } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  Linking,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getMedications,
  addMedication,
  updateMedication,
  deleteMedication,
} from "../../lib/db"
import {
  Plus,
  ChevronRight,
  MessageSquare,
  Shield,
  Info,
  Lock,
  UserX,
  BarChart3,
  Trash2,
  Heart,
  ExternalLink,
} from "lucide-react-native"
import { Colors, Spacing, Layout, Typography } from "../../theme"
import { ICONS } from "../../theme/icons"
import EditMedicationModal from "../../components/EditMedicationModal"

export default function SettingsScreen() {
  const queryClient = useQueryClient()
  const [editingMed, setEditingMed] = useState(null)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false)
  const [aboutModalVisible, setAboutModalVisible] = useState(false)

  // Placeholder - user will provide the actual URL
  const FEEDBACK_URL =
    "https://docs.google.com/forms/d/e/1FAIpQLScwpJBmzQLoayctrKH54pNFc9kmrxBxRkF7AFPg-wjoHhV3ag/viewform?usp=dialog"
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

        {/* Settings Section */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionHeader}>Settings</Text>

          <TouchableOpacity
            style={styles.settingsItem}
            onPress={() => Linking.openURL(FEEDBACK_URL)}
          >
            <View
              style={[
                styles.settingsIconBox,
                { backgroundColor: Colors.primary + "20" },
              ]}
            >
              <MessageSquare size={20} color={Colors.primary} />
            </View>
            <Text style={styles.settingsLabel}>Send Feedback</Text>
            <ChevronRight size={18} color={Colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingsItem}
            onPress={() => setPrivacyModalVisible(true)}
          >
            <View
              style={[
                styles.settingsIconBox,
                { backgroundColor: "#4CAF50" + "20" },
              ]}
            >
              <Shield size={20} color="#4CAF50" />
            </View>
            <Text style={styles.settingsLabel}>Privacy</Text>
            <ChevronRight size={18} color={Colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingsItem, { borderBottomWidth: 0 }]}
            onPress={() => setAboutModalVisible(true)}
          >
            <View
              style={[
                styles.settingsIconBox,
                { backgroundColor: Colors.textSecondary + "20" },
              ]}
            >
              <Info size={20} color={Colors.textSecondary} />
            </View>
            <Text style={styles.settingsLabel}>About</Text>
            <ChevronRight size={18} color={Colors.textTertiary} />
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <EditMedicationModal
        visible={isModalVisible}
        medication={editingMed}
        onClose={handleClose}
        onSave={handleSaveMedication}
        onDelete={handleDeleteMedication}
      />

      {/* Privacy Modal */}
      <Modal
        visible={privacyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPrivacyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Shield size={32} color={Colors.primary} />
              <Text style={styles.modalTitle}>Your Privacy</Text>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.privacyRow}>
                <Lock
                  size={20}
                  color={Colors.primary}
                  style={styles.privacyIcon}
                />
                <View style={styles.privacyTextContainer}>
                  <Text style={styles.privacyBold}>100% Local Storage</Text>
                  <Text style={styles.privacyDesc}>
                    All your data stays on your device. Nothing is uploaded to
                    any server.
                  </Text>
                </View>
              </View>

              <View style={styles.privacyRow}>
                <UserX
                  size={20}
                  color={Colors.primary}
                  style={styles.privacyIcon}
                />
                <View style={styles.privacyTextContainer}>
                  <Text style={styles.privacyBold}>No Accounts Required</Text>
                  <Text style={styles.privacyDesc}>
                    Use the app without signing up or providing any personal
                    information.
                  </Text>
                </View>
              </View>

              <View style={styles.privacyRow}>
                <BarChart3
                  size={20}
                  color={Colors.primary}
                  style={styles.privacyIcon}
                />
                <View style={styles.privacyTextContainer}>
                  <Text style={styles.privacyBold}>
                    No Analytics or Tracking
                  </Text>
                  <Text style={styles.privacyDesc}>
                    We don't collect usage data, crash reports, or analytics.
                  </Text>
                </View>
              </View>

              <View style={styles.privacyRow}>
                <Trash2
                  size={20}
                  color={Colors.primary}
                  style={styles.privacyIcon}
                />
                <View style={styles.privacyTextContainer}>
                  <Text style={styles.privacyBold}>
                    Your Data, Your Control
                  </Text>
                  <Text style={styles.privacyDesc}>
                    Delete the app and all your data is gone. No backups, no
                    traces.
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.learnMoreButton}
              onPress={() =>
                Linking.openURL("https://www.ralphchang.com/blog/meds-privacy")
              }
            >
              <Text style={styles.learnMoreText}>
                Learn more about your privacy
              </Text>
              <ExternalLink size={14} color={Colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setPrivacyModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* About Modal */}
      <Modal
        visible={aboutModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAboutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.appName}>Meds.</Text>
              <Text style={styles.appVersion}>Version 1.0.0</Text>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.aboutText}>
                A simple, private medication tracker.
              </Text>

              <Text style={[styles.aboutText, { marginTop: Spacing.md }]}>
                Made with{" "}
                <Heart size={14} color={Colors.primary} fill={Colors.primary} />{" "}
                for people who value their privacy.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setAboutModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  // Settings Section
  settingsSection: {
    marginTop: Spacing.xxl,
    backgroundColor: Colors.surfaceHighlight,
    borderRadius: Layout.radius.lg,
    overflow: "hidden",
  },
  sectionHeader: {
    color: Colors.textSecondary,
    fontSize: Typography.caption.fontSize,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background,
  },
  settingsIconBox: {
    width: 36,
    height: 36,
    borderRadius: Layout.radius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  settingsLabel: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: Typography.body.fontSize,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Layout.radius.xl,
    borderTopRightRadius: Layout.radius.xl,
    padding: Spacing.xl,
    paddingBottom: Spacing.xxl + Spacing.lg,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.title.fontSize,
    fontWeight: "bold",
    marginTop: Spacing.sm,
  },
  modalBody: {
    marginBottom: Spacing.xl,
  },
  privacyRow: {
    flexDirection: "row",
    marginBottom: Spacing.lg,
  },
  privacyIcon: {
    marginRight: Spacing.md,
    marginTop: 2,
  },
  privacyTextContainer: {
    flex: 1,
  },
  privacyBold: {
    color: Colors.textPrimary,
    fontWeight: "600",
    fontSize: Typography.body.fontSize,
    marginBottom: 2,
  },
  privacyDesc: {
    color: Colors.textSecondary,
    fontSize: Typography.caption.fontSize,
    lineHeight: 18,
  },
  learnMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  learnMoreText: {
    color: Colors.primary,
    fontSize: Typography.caption.fontSize,
  },
  modalButton: {
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
    borderRadius: Layout.radius.lg,
    alignItems: "center",
  },
  modalButtonText: {
    color: Colors.textOnPrimary,
    fontWeight: "bold",
    fontSize: Typography.body.fontSize,
  },
  appName: {
    color: Colors.textPrimary,
    fontSize: 28,
    fontWeight: "bold",
  },
  appVersion: {
    color: Colors.textSecondary,
    fontSize: Typography.body.fontSize,
    marginTop: Spacing.xs,
  },
  aboutText: {
    color: Colors.textSecondary,
    fontSize: Typography.body.fontSize,
    textAlign: "center",
    lineHeight: 22,
  },
})
