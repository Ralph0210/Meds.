import { create } from "zustand"

export const useAppStore = create((set) => ({
  selectedDate: new Date(),
  setSelectedDate: (date) => set({ selectedDate: date }),
}))
