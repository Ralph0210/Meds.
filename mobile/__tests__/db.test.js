import { addMedicationCore, getMedicationsCore } from "../lib/db-core"

// Mock DB implementation
const createMockDb = () => {
  const store = {
    medications: [],
  }
  return {
    withTransactionSync: (cb) => cb(),
    execSync: jest.fn(),
    getAllSync: jest.fn(() => store.medications),
    runSync: jest.fn((query, args) => {
      if (query.includes("INSERT")) {
        // Simple mock push
        store.medications.push({
          id: store.medications.length + 1,
          name: args[0],
          // ... other fields for basic verification
        })
        return { lastInsertRowId: store.medications.length }
      }
      return { lastInsertRowId: 0 }
    }),
  }
}

describe("Database Core", () => {
  let mockDb

  beforeEach(() => {
    mockDb = createMockDb()
  })

  it("adds a medication correctly", () => {
    const med = {
      name: "Test Med",
      frequency: "1x Daily",
      times: ["Morning"],
      color: "red",
      icon: "Pill",
      type: "daily",
    }
    const id = addMedicationCore(mockDb, med)
    expect(id).toBe(1)
    expect(mockDb.runSync).toHaveBeenCalled()
  })

  it("retrieves medications", () => {
    const meds = getMedicationsCore(mockDb)
    expect(Array.isArray(meds)).toBe(true)
  })
})
