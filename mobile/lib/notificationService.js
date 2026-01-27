import * as Notifications from "expo-notifications"
import * as Device from "expo-device"
import { getMedications } from "./db"

// Configure how notifications should be handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

// Default times for preset time slots (24-hour format)
const DEFAULT_TIMES = {
  Morning: { hour: 8, minute: 0 },
  Noon: { hour: 12, minute: 0 },
  Evening: { hour: 18, minute: 0 },
  Night: { hour: 21, minute: 0 },
  "Before Meal": { hour: 7, minute: 30 },
  "After Meal": { hour: 8, minute: 30 },
}

/**
 * Parse a time string like "9:30 AM" into { hour, minute }
 */
const parseTimeString = (timeStr) => {
  if (!timeStr) return DEFAULT_TIMES.Morning

  // Check if it's a preset
  if (DEFAULT_TIMES[timeStr]) {
    return DEFAULT_TIMES[timeStr]
  }

  // Parse "H:MM AM/PM" format
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return DEFAULT_TIMES.Morning

  let hour = parseInt(match[1], 10)
  const minute = parseInt(match[2], 10)
  const period = match[3].toUpperCase()

  if (period === "PM" && hour !== 12) hour += 12
  if (period === "AM" && hour === 12) hour = 0

  return { hour, minute }
}

/**
 * Create a unique key for a specific time (hour:minute)
 */
const getTimeKey = (hour, minute) =>
  `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`

/**
 * Request notification permissions
 * Should be called when user first enables notifications
 * @returns {Promise<boolean>} Whether permissions were granted
 */
export const requestPermissions = async () => {
  if (!Device.isDevice) {
    console.log("Notifications require a physical device")
    return false
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== "granted") {
    console.log("Notification permissions not granted")
    return false
  }

  return true
}

/**
 * Check if notifications are permitted
 * @returns {Promise<boolean>}
 */
export const hasNotificationPermission = async () => {
  const { status } = await Notifications.getPermissionsAsync()
  return status === "granted"
}

/**
 * Cancel all medication reminder notifications
 */
const cancelAllMedicationNotifications = async () => {
  const allNotifications =
    await Notifications.getAllScheduledNotificationsAsync()
  const medNotifications = allNotifications.filter(
    (n) => n.identifier && n.identifier.startsWith("med_reminder_"),
  )

  for (const notification of medNotifications) {
    await Notifications.cancelScheduledNotificationAsync(
      notification.identifier,
    )
  }
}

/**
 * Rebuild all medication notifications from scratch
 * This consolidates multiple medications at the same time into a single notification
 */
export const rebuildAllNotifications = async () => {
  const hasPermission = await hasNotificationPermission()
  if (!hasPermission) {
    console.log("Cannot schedule notifications: permission not granted")
    return
  }

  // Cancel all existing medication notifications
  await cancelAllMedicationNotifications()

  // Get all medications
  const medications = await getMedications()

  // Group medications by their notification time
  // Key: "HH:MM" -> Value: [{ name, dosage }, ...]
  const timeGroups = {}

  for (const med of medications) {
    if (!med.notificationEnabled) continue

    for (const timeSlot of med.times) {
      // Get the notification time - use custom time if set, otherwise parse the time slot
      const customTime = med.notificationTimes?.[timeSlot]
      const { hour, minute } = customTime
        ? parseTimeString(customTime)
        : parseTimeString(timeSlot)

      const timeKey = getTimeKey(hour, minute)

      if (!timeGroups[timeKey]) {
        timeGroups[timeKey] = {
          hour,
          minute,
          medications: [],
        }
      }

      timeGroups[timeKey].medications.push({
        id: med.id,
        name: med.name,
        dosage: med.dosage,
      })
    }
  }

  // Schedule one notification per unique time
  for (const [timeKey, group] of Object.entries(timeGroups)) {
    const { hour, minute, medications: meds } = group

    // Build the notification body
    let body
    if (meds.length === 1) {
      const med = meds[0]
      body = `Take ${med.name}${med.dosage ? ` (${med.dosage})` : ""}`
    } else if (meds.length === 2) {
      body = `Take ${meds[0].name} and ${meds[1].name}`
    } else {
      const firstTwo = meds
        .slice(0, 2)
        .map((m) => m.name)
        .join(", ")
      body = `Take ${firstTwo}, and ${meds.length - 2} more`
    }

    const notificationId = `med_reminder_${timeKey}`

    try {
      await Notifications.scheduleNotificationAsync({
        identifier: notificationId,
        content: {
          title: "Medication Reminder",
          body,
          data: {
            type: "medication_reminder",
            timeKey,
            medicationIds: meds.map((m) => m.id),
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      })
    } catch (error) {
      console.error(`Failed to schedule notification for ${timeKey}:`, error)
    }
  }
}

/**
 * Schedule notifications for a medication (triggers full rebuild)
 * @param {Object} medication - The medication object
 */
export const scheduleNotificationsForMedication = async (medication) => {
  if (!medication.notificationEnabled) {
    return
  }
  await rebuildAllNotifications()
}

/**
 * Cancel all notifications for a medication (triggers full rebuild)
 * @param {number} medicationId - The medication ID
 */
export const cancelNotificationsForMedication = async (medicationId) => {
  await rebuildAllNotifications()
}

/**
 * Reschedule notifications for a medication (triggers full rebuild)
 * @param {Object} medication - The medication object
 */
export const rescheduleNotificationsForMedication = async (medication) => {
  await rebuildAllNotifications()
}

/**
 * Get all scheduled notifications (for debugging)
 */
export const getAllScheduledNotifications = async () => {
  return await Notifications.getAllScheduledNotificationsAsync()
}

/**
 * Cancel all notifications (for debugging/reset)
 */
export const cancelAllNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync()
}
