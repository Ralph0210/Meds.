import React, { useState } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "../../lib/supabase"
import { Plus, X, Trash2, Check, ChevronRight } from "lucide-react-native"

export default function SettingsScreen() {
  const queryClient = useQueryClient()
  const [editingMed, setEditingMed] = useState(null) // null = list, {} = new, obj = edit
  const [isModalVisible, setIsModalVisible] = useState(false)

  // Fetch Config
  const { data: meds, isLoading } = useQuery({
    queryKey: ["medications_config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medications_config")
        .select("*")
        .order("created_at")
      if (error) throw error
      return data
    },
  })

  const handleEdit = (med) => {
    setEditingMed({ ...med }) // copy
    setIsModalVisible(true)
  }

  const handleNewLine = () => {
    setEditingMed({
      name: "",
      description: "",
      type: "simple",
      color: "#d0bcff",
      bg_color: "#4f378b",
      keys: [], // Will generate on save
      schedule: ["Daily"],
      icon: "P",
    })
    setIsModalVisible(true)
  }

  const handleClose = () => {
    setIsModalVisible(false)
    setEditingMed(null)
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Manager</Text>
      </View>

      <ScrollView style={styles.content}>
        {isLoading && <ActivityIndicator color="#d0bcff" />}

        {meds?.map((med, index) => (
          <TouchableOpacity
            key={med.id || index}
            style={styles.item}
            onPress={() => handleEdit(med)}
          >
            <View
              style={[
                styles.iconBox,
                { backgroundColor: "rgba(255,255,255,0.1)" },
              ]}
            >
              <Text style={[styles.iconText, { color: med.color }]}>
                {med.icon || (med.name ? med.name[0] : "?")}
              </Text>
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>
                {med.name || "Unnamed Medication"}
              </Text>
              <Text style={styles.itemDesc}>{med.description}</Text>
            </View>
            <ChevronRight color="#52525b" size={20} />
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.addBtn} onPress={handleNewLine}>
          <Plus color="#15161a" size={24} />
          <Text style={styles.addBtnText}>Add Medication</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      <EditModal
        visible={isModalVisible}
        med={editingMed}
        onClose={handleClose}
        queryClient={queryClient}
      />
    </SafeAreaView>
  )
}

function EditModal({ visible, med, onClose, queryClient }) {
  const [formState, setFormState] = useState(med || {})

  // Sync prop to state when opening
  React.useEffect(() => {
    if (med) setFormState({ ...med })
  }, [med])

  const isNew = !formState.id

  const mutation = useMutation({
    mutationFn: async (newData) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      // Generate keys if missing
      if (!newData.keys || newData.keys.length === 0) {
        if (newData.type === "simple") {
          newData.keys = [`med_${Math.random().toString(36).substr(2, 9)}`]
          newData.schedule = ["Daily"]
        } else if (newData.type === "multi") {
          // Default to Morning/Night for simplicity in this MVP
          newData.schedule = ["Morning", "Night"]
          newData.keys = [
            `med_${Math.random().toString(36).substr(2, 9)}_morn`,
            `med_${Math.random().toString(36).substr(2, 9)}_night`,
          ]
        } else {
          // Course
          newData.schedule = ["Dose"]
          newData.keys = [
            `med_${Math.random().toString(36).substr(2, 9)}_course`,
          ]
          newData.total = 20
        }
      }

      const payload = {
        user_id: user.id,
        ...newData,
      }
      delete payload.id // Don't send undefined ID for new math
      delete payload.created_at

      if (!isNew) {
        const { error } = await supabase
          .from("medications_config")
          .update(payload)
          .eq("id", formState.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from("medications_config")
          .insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["medications_config"])
      onClose()
    },
    onError: (err) => {
      Alert.alert("Error", err.message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("medications_config")
        .delete()
        .eq("id", formState.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["medications_config"])
      onClose()
    },
  })

  const confirmDelete = () => {
    Alert.alert("Delete?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteMutation.mutate(),
      },
    ])
  }

  const colors = [
    { c: "#d0bcff", bg: "#4f378b" }, // Purple
    { c: "#ffb74d", bg: "#5d4000" }, // Orange
    { c: "#6dd58c", bg: "#00532a" }, // Green
    { c: "#ffb4ab", bg: "#690005" }, // Red
    { c: "#5ab3f0", bg: "#00325b" }, // Blue
  ]

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>
            {isNew ? "New Medication" : "Edit Medication"}
          </Text>
          <TouchableOpacity
            onPress={() => {
              if (!formState.name?.trim()) {
                Alert.alert(
                  "Validation Error",
                  "Please enter a medication name."
                )
                return
              }
              mutation.mutate(formState)
            }}
            disabled={mutation.isPending}
          >
            <Text style={styles.saveText}>
              {mutation.isPending ? "..." : "Save"}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <Label>Name</Label>
          <TextInput
            style={styles.input}
            value={formState.name}
            onChangeText={(t) => setFormState((s) => ({ ...s, name: t }))}
            placeholder="Ex. Finasteride"
            placeholderTextColor="#52525b"
          />

          <Label>Description</Label>
          <TextInput
            style={styles.input}
            value={formState.description}
            onChangeText={(t) =>
              setFormState((s) => ({ ...s, description: t }))
            }
            placeholder="Ex. 1mg daily"
            placeholderTextColor="#52525b"
          />

          <Label>Type</Label>
          <View style={styles.row}>
            {["simple", "multi", "course"].map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setFormState((s) => ({ ...s, type: t }))}
                style={[
                  styles.typeBtn,
                  formState.type === t && styles.typeBtnSelected,
                ]}
              >
                <Text
                  style={[
                    styles.typeBtnText,
                    formState.type === t && styles.typeBtnTextSelected,
                  ]}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Label>Color Identity</Label>
          <View style={styles.row}>
            {colors.map((c, i) => (
              <TouchableOpacity
                key={i}
                onPress={() =>
                  setFormState((s) => ({ ...s, color: c.c, bg_color: c.bg }))
                }
                style={[
                  styles.colorDot,
                  { backgroundColor: c.c },
                  formState.color === c.c && styles.colorDotSelected,
                ]}
              >
                {formState.color === c.c && <Check size={16} color="#000" />}
              </TouchableOpacity>
            ))}
          </View>

          {!isNew && (
            <TouchableOpacity style={styles.deleteBtn} onPress={confirmDelete}>
              <Trash2 color="#ef4444" size={20} />
              <Text style={styles.deleteText}>Delete Medication</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    </Modal>
  )
}

function Label({ children }) {
  return <Text style={styles.label}>{children}</Text>
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0c0e",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#ffffff",
  },
  content: {
    paddingHorizontal: 20,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#27272a",
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  iconText: {
    fontWeight: "bold",
    fontSize: 18,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  itemDesc: {
    color: "#a1a1aa",
    fontSize: 14,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#d0bcff",
    padding: 16,
    borderRadius: 16,
    marginTop: 24,
  },
  addBtnText: {
    color: "#15161a",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 8,
  },
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: "#15161a",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#27272a",
  },
  cancelText: {
    color: "#a1a1aa",
    fontSize: 16,
  },
  saveText: {
    color: "#d0bcff",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  modalContent: {
    padding: 20,
  },
  label: {
    color: "#a1a1aa",
    fontSize: 14,
    marginBottom: 8,
    marginTop: 16,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#27272a",
    borderRadius: 12,
    padding: 16,
    color: "#fff",
    fontSize: 16,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  typeBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#3f3f46",
  },
  typeBtnSelected: {
    backgroundColor: "#d0bcff",
    borderColor: "#d0bcff",
  },
  typeBtnText: {
    color: "#fff",
  },
  typeBtnTextSelected: {
    color: "#15161a",
    fontWeight: "bold",
  },
  colorDot: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: "#fff",
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 48,
    padding: 16,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: 12,
  },
  deleteText: {
    color: "#ef4444",
    fontWeight: "bold",
    marginLeft: 8,
  },
})
