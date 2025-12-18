/**
 * Database Reliability Tests
 *
 * Tests for edge cases, error handling, and data integrity
 * following the four principles:
 * - Maintainability: Testable architecture
 * - Reliability: Edge case coverage
 * - Scalability: Consistent behavior at scale
 * - Performance: Efficient operations
 */

import {
  initDatabaseCore,
  addMedicationCore,
  getMedicationsCore,
  updateMedicationCore,
  deleteMedicationCore,
  updateRecordCore,
  getRecordCore,
  getRecordsCore,
  resetDatabaseCore,
  seedDefaultsCore,
} from "../lib/db-core"

// Reusable test database factory
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
      if (sql.includes("DROP TABLE IF EXISTS medications")) {
        tables.medications = []
        medIdCounter = 0
      }
      if (sql.includes("DROP TABLE IF EXISTS records")) {
        tables.records = []
        recordIdCounter = 0
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
          return tables.records
            .filter((r) => r.date >= params[0] && r.date <= params[1])
            .map((r) => ({ ...r, data: JSON.stringify(r.data || {}) }))
        }
        return tables.records.map((r) => ({
          ...r,
          data: JSON.stringify(r.data || {}),
        }))
      }
      return []
    }),
    getFirstSync: jest.fn((sql, params) => {
      if (sql.includes("FROM medications WHERE id")) {
        const med = tables.medications.find((m) => m.id === params[0])
        if (med) {
          return { ...med, keys: JSON.stringify(med.keys || []) }
        }
      }
      if (sql.includes("FROM records WHERE date")) {
        const rec = tables.records.find((r) => r.date === params[0])
        if (rec) {
          return { ...rec, data: JSON.stringify(rec.data || {}) }
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
      if (sql.includes("UPDATE medications SET")) {
        const id = params[9]
        const idx = tables.medications.findIndex((m) => m.id === id)
        if (idx !== -1) {
          tables.medications[idx] = {
            id,
            name: params[0],
            dosage: params[1],
            frequency: params[2],
            times: JSON.parse(params[3] || "[]"),
            color: params[4],
            icon: params[5],
            keys: JSON.parse(params[6] || "[]"),
            type: params[7],
            config: JSON.parse(params[8] || "{}"),
          }
        }
      }
      if (sql.includes("DELETE FROM medications WHERE id")) {
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
        const date = params[1]
        const rec = tables.records.find((r) => r.date === date)
        if (rec) {
          rec.data = JSON.parse(params[0] || "{}")
        }
      } else if (
        sql.includes("UPDATE records SET data") &&
        sql.includes("WHERE id")
      ) {
        const recId = params[1]
        const rec = tables.records.find((r) => r.id === recId)
        if (rec) {
          rec.data = JSON.parse(params[0] || "{}")
        }
      }
      return { lastInsertRowId: 0 }
    }),
    _tables: tables,
  }
}

describe("Database Reliability", () => {
  let db

  beforeEach(() => {
    db = createTestDb()
    initDatabaseCore(db)
  })

  describe("CRUD Operations", () => {
    it("should add multiple medications with unique IDs", () => {
      const med1 = { name: "Med1", times: [], keys: [], type: "daily" }
      const med2 = { name: "Med2", times: [], keys: [], type: "daily" }
      const med3 = { name: "Med3", times: [], keys: [], type: "daily" }

      const id1 = addMedicationCore(db, med1)
      const id2 = addMedicationCore(db, med2)
      const id3 = addMedicationCore(db, med3)

      expect(id1).toBe(1)
      expect(id2).toBe(2)
      expect(id3).toBe(3)
      expect(db._tables.medications.length).toBe(3)
    })

    it("should update medication properties correctly", () => {
      const med = {
        name: "Original",
        dosage: "10mg",
        frequency: "1x Daily",
        times: ["Morning"],
        keys: ["original_morning"],
        type: "daily",
        config: {},
      }

      const id = addMedicationCore(db, med)

      updateMedicationCore(db, {
        id,
        name: "Updated",
        dosage: "20mg",
        frequency: "2x Daily",
        times: ["Morning", "Night"],
        keys: ["updated_morning", "updated_night"],
        type: "daily",
        config: {},
      })

      expect(db._tables.medications[0].name).toBe("Updated")
      expect(db._tables.medications[0].dosage).toBe("20mg")
      expect(db._tables.medications[0].times).toEqual(["Morning", "Night"])
    })

    it("should retrieve all medications in order", () => {
      addMedicationCore(db, { name: "A", times: [], keys: [], type: "daily" })
      addMedicationCore(db, { name: "B", times: [], keys: [], type: "daily" })

      const meds = getMedicationsCore(db)

      expect(meds.length).toBe(2)
      expect(meds[0].name).toBe("A")
      expect(meds[1].name).toBe("B")
    })
  })

  describe("Record Management", () => {
    it("should create new record for new date", () => {
      updateRecordCore(db, "2024-01-01", "med_morning", true)

      expect(db._tables.records.length).toBe(1)
      expect(db._tables.records[0].date).toBe("2024-01-01")
      expect(db._tables.records[0].data.med_morning).toBe(true)
    })

    it("should update existing record for same date", () => {
      updateRecordCore(db, "2024-01-01", "med_morning", true)
      updateRecordCore(db, "2024-01-01", "med_night", false)

      expect(db._tables.records.length).toBe(1)
      expect(db._tables.records[0].data.med_morning).toBe(true)
      expect(db._tables.records[0].data.med_night).toBe(false)
    })

    it("should retrieve record by date", () => {
      updateRecordCore(db, "2024-01-15", "vitamin_morning", true)

      const record = getRecordCore(db, "2024-01-15")

      expect(record).not.toBeNull()
      expect(record.data.vitamin_morning).toBe(true)
    })

    it("should return null for non-existent date", () => {
      const record = getRecordCore(db, "1999-01-01")

      expect(record).toBeNull()
    })

    it("should retrieve records within date range", () => {
      updateRecordCore(db, "2024-01-01", "med_a", true)
      updateRecordCore(db, "2024-01-15", "med_b", true)
      updateRecordCore(db, "2024-01-31", "med_c", true)

      const records = getRecordsCore(db, "2024-01-01", "2024-01-31")

      expect(Object.keys(records).length).toBe(3)
      expect(records["2024-01-01"]).toBeDefined()
      expect(records["2024-01-15"]).toBeDefined()
      expect(records["2024-01-31"]).toBeDefined()
    })
  })

  describe("Edge Cases", () => {
    it("should handle empty times and keys arrays", () => {
      const med = {
        name: "NoTimes",
        times: [],
        keys: [],
        type: "prn",
      }

      const id = addMedicationCore(db, med)
      const meds = getMedicationsCore(db)

      expect(meds[0].times).toEqual([])
      expect(meds[0].keys).toEqual([])
    })

    it("should handle null/undefined config gracefully", () => {
      const med = {
        name: "NoConfig",
        times: ["Morning"],
        keys: ["noconfig_morning"],
        type: "daily",
        config: null,
      }

      expect(() => addMedicationCore(db, med)).not.toThrow()
    })

    it("should handle special characters in medication names", () => {
      const med = {
        name: "Vitamin D3 (1000IU) - Daily",
        times: ["Morning"],
        keys: ["vitamind3_morning"],
        type: "daily",
      }

      addMedicationCore(db, med)

      expect(db._tables.medications[0].name).toBe("Vitamin D3 (1000IU) - Daily")
    })

    it("should handle deleting non-existent medication gracefully", () => {
      expect(() => deleteMedicationCore(db, 99999)).not.toThrow()
    })

    it("should handle updating record with boolean toggle", () => {
      updateRecordCore(db, "2024-01-01", "med_morning", true)
      updateRecordCore(db, "2024-01-01", "med_morning", false)

      expect(db._tables.records[0].data.med_morning).toBe(false)
    })
  })

  describe("Reset and Seed", () => {
    it("should reset database completely", () => {
      addMedicationCore(db, {
        name: "Test",
        times: [],
        keys: [],
        type: "daily",
      })
      updateRecordCore(db, "2024-01-01", "test_key", true)

      resetDatabaseCore(db, initDatabaseCore)

      expect(db._tables.medications.length).toBe(0)
      expect(db._tables.records.length).toBe(0)
    })

    it("should seed defaults only when database is empty", () => {
      seedDefaultsCore(db, addMedicationCore)

      const countBefore = db._tables.medications.length
      expect(countBefore).toBe(2) // Default meds

      // Try to seed again
      seedDefaultsCore(db, addMedicationCore)

      expect(db._tables.medications.length).toBe(2) // Should not duplicate
    })
  })

  describe("Data Integrity", () => {
    it("should maintain referential integrity after operations", () => {
      // Add medication
      const med = {
        name: "IntegrityTest",
        times: ["Morning"],
        keys: ["integritytest_morning"],
        type: "daily",
      }
      const medId = addMedicationCore(db, med)

      // Record some data
      updateRecordCore(db, "2024-01-01", "integritytest_morning", true)
      updateRecordCore(db, "2024-01-02", "integritytest_morning", false)

      // Delete medication
      deleteMedicationCore(db, medId)

      // Verify complete cleanup
      expect(db._tables.medications.length).toBe(0)
      for (const rec of db._tables.records) {
        expect(rec.data).not.toHaveProperty("integritytest_morning")
      }
    })

    it("should handle concurrent-like operations safely", () => {
      // Simulate rapid operations
      for (let i = 0; i < 10; i++) {
        addMedicationCore(db, {
          name: `Med${i}`,
          times: ["Morning"],
          keys: [`med${i}_morning`],
          type: "daily",
        })
        updateRecordCore(db, "2024-01-01", `med${i}_morning`, i % 2 === 0)
      }

      expect(db._tables.medications.length).toBe(10)
      expect(db._tables.records.length).toBe(1)
      expect(Object.keys(db._tables.records[0].data).length).toBe(10)
    })
  })
})
