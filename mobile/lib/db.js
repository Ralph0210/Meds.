import * as SQLite from "expo-sqlite"
import { Platform } from "react-native"
import {
  initDatabaseCore,
  getMedicationsCore,
  addMedicationCore,
  updateMedicationCore,
  deleteMedicationCore,
  getRecordCore,
  getRecordsCore,
  updateRecordCore,
  seedDefaultsCore,
  resetDatabaseCore,
} from "./db-core"

let db

if (Platform.OS !== "web") {
  db = SQLite.openDatabaseSync("medtracker.db")
} else {
  // Mock DB for Web/Storybook to prevent crashes
  db = {
    withTransactionSync: (cb) => cb(),
    execSync: () => {},
    getAllSync: () => [],
    getFirstSync: () => null,
    runSync: () => ({ lastInsertRowId: 0 }),
  }
}

export const initDatabase = () => initDatabaseCore(db)

export const getMedications = () => getMedicationsCore(db)

export const addMedication = (med) => addMedicationCore(db, med)

export const updateMedication = (med) => updateMedicationCore(db, med)

export const deleteMedication = (id) => deleteMedicationCore(db, id)

export const getRecord = (date) => getRecordCore(db, date)

export const getRecords = (startDate, endDate) =>
  getRecordsCore(db, startDate, endDate)

export const updateRecord = (date, key, value) =>
  updateRecordCore(db, date, key, value)

export const seedDefaults = () => seedDefaultsCore(db, addMedicationCore)

export const resetDatabase = () => resetDatabaseCore(db, initDatabaseCore)
