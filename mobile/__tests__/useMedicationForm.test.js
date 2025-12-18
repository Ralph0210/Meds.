import { renderHook, act } from "@testing-library/react-native"
import { useMedicationForm } from "../hooks/useMedicationForm"

describe("useMedicationForm", () => {
  it("initializes with default values when no medication is provided", () => {
    const { result } = renderHook(() => useMedicationForm(null))

    expect(result.current.isNew).toBe(true)
    expect(result.current.form.name).toBe("")
    expect(result.current.form.type).toBe("daily")
  })

  it("initializes with provided medication data", () => {
    const mockMed = {
      id: 1,
      name: "Aspirin",
      dosage: "10mg",
      frequency: "1x Daily",
      type: "daily",
      times: ["Morning"],
    }
    const { result } = renderHook(() => useMedicationForm(mockMed))

    expect(result.current.isNew).toBe(false)
    expect(result.current.form.name).toBe("Aspirin")
    expect(result.current.form.dosageQuantity).toBe("10")
    expect(result.current.form.dosageUnit).toBe("mg")
  })

  it("updates config correctly", () => {
    const { result } = renderHook(() => useMedicationForm(null))

    act(() => {
      result.current.updateConfig("testKey", "testValue")
    })

    expect(result.current.form.config.testKey).toBe("testValue")
  })
})
