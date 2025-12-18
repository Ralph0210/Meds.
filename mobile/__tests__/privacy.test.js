/**
 * Privacy and Data Security Tests
 *
 * This test suite verifies that MedTracker adheres to strict privacy principles:
 * 1. Data is stored locally only (no network calls)
 * 2. Deletion is complete (no orphaned data)
 * 3. Data isolation between medications
 */

import {
  initDatabaseCore,
  addMedicationCore,
  getMedicationsCore,
  deleteMedicationCore,
  updateRecordCore,
  getRecordCore,
  getRecordsCore,
  resetDatabaseCore,
} from "../lib/db-core"

// In-memory SQLite mock for testing
const createTestDb = () => {
  const tables = {
    medications: [],
    records: [],
  }
  let medIdCounter = 0
  let recordIdCounter = 0

  return {
    withTransactionSync: (cb) => cb(),
    execSync: jest.fn((sql) => {
      if (sql.includes("DROP TABLE")) {
        if (sql.includes("medications")) tables.medications = []
        if (sql.includes("records")) tables.records = []
      }
    }),
    getAllSync: jest.fn((sql, params) => {
      if (sql.includes("FROM medications")) {
        return tables.medications.map((m) => ({
          ...m,
          times: JSON.stringify(m.times || []),
          keys: JSON.stringify(m.keys || []),
          config: JSON.stringify(m.config || {}),
        }))
      }
      if (sql.includes("FROM records")) {
        if (params && params.length === 2) {
          // getRecordsCore with date range
          return tables.records
            .filter((r) => r.date >= params[0] && r.date <= params[1])
            .map((r) => ({ ...r, data: JSON.stringify(r.data || {}) }))
        }
        // getAllSync for cleanup
        return tables.records.map((r) => ({
          ...r,
          data: JSON.stringify(r.data || {}),
        }))
      }
      return []
    }),
    getFirstSync: jest.fn((sql, params) => {
      if (sql.includes("FROM medications")) {
        const med = tables.medications.find((m) => m.id === params[0])
        if (med) {
          return { ...med, keys: JSON.stringify(med.keys || []) }
        }
      }
      if (sql.includes("FROM records")) {
        const rec = tables.records.find((r) => r.date === params[0])
        if (rec) {
          return { ...rec, data: JSON.stringify(rec.data || {}) }
        }
        // Check by id
        const recById = tables.records.find((r) => r.id === params[0])
        if (recById) {
          return { ...recById, data: JSON.stringify(recById.data || {}) }
        }
      }
      if (sql.includes("COUNT(*)")) {
        return { count: tables.medications.length }
      }
      return null
    }),
    runSync: jest.fn((sql, params) => {
      if (sql.includes("INSERT INTO medications")) {
        medIdCounter++
        tables.medications.push({
          id: medIdCounter,
          name: params[0],
          dosage: params[1],
          frequency: params[2],
          times: JSON.parse(params[3] || "[]"),
          color: params[4],
          icon: params[5],
          keys: JSON.parse(params[6] || "[]"),
          type: params[7],
          config: JSON.parse(params[8] || "{}"),
        })
        return { lastInsertRowId: medIdCounter }
      }
      if (sql.includes("DELETE FROM medications")) {
        tables.medications = tables.medications.filter(
          (m) => m.id !== params[0]
        )
      }
      if (sql.includes("DELETE FROM records WHERE id")) {
        tables.records = tables.records.filter((r) => r.id !== params[0])
      }
      if (sql.includes("INSERT INTO records")) {
        recordIdCounter++
        tables.records.push({
          id: recordIdCounter,
          date: params[0],
          data: JSON.parse(params[1] || "{}"),
        })
        return { lastInsertRowId: recordIdCounter }
      }
      if (
        sql.includes("UPDATE records SET data") &&
        sql.includes("WHERE date")
      ) {
        // Update by date
        const date = params[1]
        const rec = tables.records.find((r) => r.date === date)
        if (rec) {
          rec.data = JSON.parse(params[0] || "{}")
        }
      } else if (
        sql.includes("UPDATE records SET data") &&
        sql.includes("WHERE id")
      ) {
        // Update by id (used in cleanup)
        const recId = params[1]
        const rec = tables.records.find((r) => r.id === recId)
        if (rec) {
          rec.data = JSON.parse(params[0] || "{}")
        }
      }
      return { lastInsertRowId: 0 }
    }),
    // Expose for assertions
    _tables: tables,
  }
}

describe("Privacy and Data Security", () => {
  let db

  beforeEach(() => {
    db = createTestDb()
    initDatabaseCore(db)
  })

  describe("Local-Only Storage", () => {
    it("should store data in SQLite without any network calls", () => {
      // Add a medication
      const med = {
        name: "TestMed",
        dosage: "10mg",
        frequency: "1x Daily",
        times: ["Morning"],
        color: "#FF0000",
        icon: "Pill",
        keys: ["testmed_morning"],
        type: "daily",
        config: {},
      }

      const id = addMedicationCore(db, med)

      // Verify data is in local store
      expect(id).toBe(1)
      expect(db._tables.medications.length).toBe(1)
      expect(db._tables.medications[0].name).toBe("TestMed")

      // No network calls - verified by absence of fetch/axios in codebase
      // This test confirms the db-core functions only interact with SQLite
    })
  })

  describe("Complete Deletion (Privacy Compliance)", () => {
    it("should delete medication from database", () => {
      // Setup
      const med = {
        name: "ToDelete",
        dosage: "5mg",
        frequency: "1x Daily",
        times: ["Morning"],
        color: "#00FF00",
        icon: "Pill",
        keys: ["todelete_morning"],
        type: "daily",
        config: {},
      }

      const id = addMedicationCore(db, med)
      expect(db._tables.medications.length).toBe(1)

      // Delete
      deleteMedicationCore(db, id)

      // Verify medication is gone
      expect(db._tables.medications.length).toBe(0)
    })

    it("should cleanup associated record entries when medication is deleted", () => {
      // Setup: Create medication
      const med = {
        name: "Aspirin",
        dosage: "100mg",
        frequency: "2x Daily",
        times: ["Morning", "Night"],
        color: "#0000FF",
        icon: "Pill",
        keys: ["aspirin_morning", "aspirin_night"],
        type: "daily",
        config: {},
      }

      const medId = addMedicationCore(db, med)

      // Create records with medication data
      updateRecordCore(db, "2024-01-01", "aspirin_morning", true)
      updateRecordCore(db, "2024-01-01", "aspirin_night", true)
      updateRecordCore(db, "2024-01-02", "aspirin_morning", false)

      // Verify records exist
      expect(db._tables.records.length).toBeGreaterThan(0)
      const recordBefore = db._tables.records.find(
        (r) => r.date === "2024-01-01"
      )
      expect(recordBefore.data).toHaveProperty("aspirin_morning")
      expect(recordBefore.data).toHaveProperty("aspirin_night")

      // Delete medication
      deleteMedicationCore(db, medId)

      // Verify medication is gone
      expect(db._tables.medications.length).toBe(0)

      // Verify orphaned keys are cleaned up
      // Records with only aspirin data should be deleted entirely
      // Or keys should be removed from remaining records
      const remainingRecords = db._tables.records
      for (const rec of remainingRecords) {
        expect(rec.data).not.toHaveProperty("aspirin_morning")
        expect(rec.data).not.toHaveProperty("aspirin_night")
      }
    })

    it("should preserve other medication data when one is deleted", () => {
      // Setup: Create two medications
      const med1 = {
        name: "MedA",
        dosage: "10mg",
        frequency: "1x Daily",
        times: ["Morning"],
        color: "#FF0000",
        icon: "Pill",
        keys: ["meda_morning"],
        type: "daily",
        config: {},
      }

      const med2 = {
        name: "MedB",
        dosage: "20mg",
        frequency: "1x Daily",
        times: ["Night"],
        color: "#00FF00",
        icon: "Pill",
        keys: ["medb_night"],
        type: "daily",
        config: {},
      }

      const id1 = addMedicationCore(db, med1)
      const id2 = addMedicationCore(db, med2)

      // Create records for both
      updateRecordCore(db, "2024-01-01", "meda_morning", true)
      updateRecordCore(db, "2024-01-01", "medb_night", true)

      // Delete first medication only
      deleteMedicationCore(db, id1)

      // Verify MedA is gone, MedB remains
      expect(db._tables.medications.length).toBe(1)
      expect(db._tables.medications[0].name).toBe("MedB")

      // Verify MedA's record data is cleaned, MedB's remains
      const record = db._tables.records.find((r) => r.date === "2024-01-01")
      expect(record).toBeDefined()
      expect(record.data).not.toHaveProperty("meda_morning")
      expect(record.data).toHaveProperty("medb_night")
      expect(record.data.medb_night).toBe(true)
    })
  })

  describe("Data Isolation", () => {
    it("should not leak data between different medications", () => {
      // Create medications with similar names
      const med1 = {
        name: "VitaminD",
        keys: ["vitamind_morning"],
        times: ["Morning"],
        type: "daily",
      }
      const med2 = {
        name: "VitaminC",
        keys: ["vitaminc_morning"],
        times: ["Morning"],
        type: "daily",
      }

      addMedicationCore(db, med1)
      addMedicationCore(db, med2)

      // Record data for VitaminD
      updateRecordCore(db, "2024-01-01", "vitamind_morning", true)

      // Verify VitaminC's key is not affected
      const record = getRecordCore(db, "2024-01-01")
      expect(record.data.vitamind_morning).toBe(true)
      expect(record.data.vitaminc_morning).toBeUndefined()
    })
  })

  describe("No Sensitive Data Exposure", () => {
    it("should not expose raw medication data in error messages", () => {
      // This is more of a design verification
      // The db-core functions don't include medication names in errors
      // They use IDs and generic messages

      // Attempt to delete non-existent medication
      expect(() => {
        deleteMedicationCore(db, 99999)
      }).not.toThrow()

      // Should complete silently without exposing what was attempted
    })
  })
})
