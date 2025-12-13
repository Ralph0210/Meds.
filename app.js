const START_DATE = new Date("2025-12-11")
const TOTAL_ANTIBIOTICS = 20

const DOM = {
  currentDate: document.getElementById("current-date"),
  prevBtn: document.getElementById("prev-date"),
  nextBtn: document.getElementById("next-date"),
  finCheck: document.getElementById("fin-check"),
  antiMorn: document.getElementById("anti-morn"),
  antiNight: document.getElementById("anti-night"),
  antiProgress: document.getElementById("anti-progress"),
  courseMsg: document.getElementById("course-completed-msg"),
  historyList: document.getElementById("history-list"), // Kept if we want to show list, though nav replaces it mostly. Leaving empty for now.
  antiControls: document.querySelector(".anti-controls"),
  calMonthYear: document.getElementById("cal-month-year"),
  calGrid: document.getElementById("calendar-grid"),
}

// Initial State Skeleton
// "records" is a map: "YYYY-MM-DD" -> { fin: bool, antiMorn: bool, antiNight: bool }
const initialState = {
  config: {
    antibioticsTotal: TOTAL_ANTIBIOTICS,
    startDateStr: "2025-12-11",
  },
  state: {
    records: {},
  },
}

let appState = loadState()
// Always start viewing Today
let currentViewDate = new Date()

// --- Helpers ---

function toDateString(date) {
  const d = new Date(date)
  const offset = d.getTimezoneOffset()
  const localDate = new Date(d.getTime() - offset * 60000)
  return localDate.toISOString().split("T")[0]
}

function getPrettyDate(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function normalizeDate(date) {
  // Return a new date object set to midnight local time to avoid time shifts
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

// --- Logic ---

function loadState() {
  const stored = localStorage.getItem("medTrackerStateV2")
  if (!stored) {
    // Migration or Init
    return JSON.parse(JSON.stringify(initialState))
  }
  return JSON.parse(stored)
}

function saveState() {
  localStorage.setItem("medTrackerStateV2", JSON.stringify(appState))
  render() // Updates UI including derived states
}

function getRecord(dateStr) {
  if (!appState.state.records[dateStr]) {
    return { fin: false, antiMorn: false, antiNight: false }
  }
  return appState.state.records[dateStr]
}

function updateRecord(dateStr, key, value) {
  if (!appState.state.records[dateStr]) {
    appState.state.records[dateStr] = {
      fin: false,
      antiMorn: false,
      antiNight: false,
    }
  }
  appState.state.records[dateStr][key] = value
  saveState()
}

function calculateAntibioticsTaken() {
  let count = 0
  Object.values(appState.state.records).forEach((rec) => {
    if (rec.antiMorn) count++
    if (rec.antiNight) count++
  })
  return Math.min(count, TOTAL_ANTIBIOTICS)
}

// --- Calendar Logic ---

function getDayStatus(dateStr) {
  // 1. Future check
  const todayStr = toDateString(new Date())
  if (dateStr > todayStr) return "future"

  // 2. Before Start Date check?
  // If strict, 'none'. If mostly tracking since then, 'none'.
  const dateObj = new Date(dateStr)
  if (dateObj < START_DATE) return "none"

  // 3. Meds Check
  const record = getRecord(dateStr)
  let count = 0
  if (record.fin) count++
  if (record.antiMorn) count++
  if (record.antiNight) count++

  if (count === 3) return "perfect"
  if (count > 0) return "partial"
  return "missed"
}

function renderCalendar() {
  if (!DOM.calGrid) return

  DOM.calGrid.innerHTML = ""

  // Use currentViewDate to determine Month
  const year = currentViewDate.getFullYear()
  const month = currentViewDate.getMonth()

  // Header
  const monthName = currentViewDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })
  if (DOM.calMonthYear) DOM.calMonthYear.textContent = monthName

  // Grid Generation
  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const daysInMonth = lastDayOfMonth.getDate()
  const startDayOfWeek = firstDayOfMonth.getDay() // 0 is Sunday

  // Padding for prev month
  for (let i = 0; i < startDayOfWeek; i++) {
    const div = document.createElement("div")
    div.className = "cal-day empty"
    DOM.calGrid.appendChild(div)
  }

  // Days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d)
    const dateStr = toDateString(dateObj)

    // Check Meds
    const record = getRecord(dateStr)
    // Calc flags
    const takenFin = record.fin
    const antiCount = (record.antiMorn ? 1 : 0) + (record.antiNight ? 1 : 0)

    const div = document.createElement("div")
    div.className = "cal-day" // No status-perfect/partial classes anymore
    div.innerHTML = `<span class="day-num">${d}</span>`

    // Container for indicators
    const dotsContainer = document.createElement("div")
    dotsContainer.className = "cal-dots"

    if (takenFin) {
      const dot = document.createElement("span")
      dot.className = "dot-ind dot-fin"
      dotsContainer.appendChild(dot)
    }

    // Antibiotics: Show green dots for count? Or one dot if any?
    // User said "how many". So let's show distinct dots.
    if (record.antiMorn) {
      const dot = document.createElement("span")
      dot.className = "dot-ind dot-anti"
      dotsContainer.appendChild(dot)
    }
    if (record.antiNight) {
      const dot = document.createElement("span")
      dot.className = "dot-ind dot-anti"
      dotsContainer.appendChild(dot)
    }

    div.appendChild(dotsContainer)

    // Highlight active day
    if (dateStr === toDateString(currentViewDate)) {
      div.classList.add("active-day")
    }

    // Highlight actual today
    if (dateStr === toDateString(new Date())) {
      div.classList.add("status-today")
    }

    // Interactions
    if (dateObj >= START_DATE) {
      div.addEventListener("click", () => {
        currentViewDate = dateObj
        render()
      })
    } else {
      div.classList.add("empty") // Style as empty/disabled if before start
      div.style.cursor = "default"
    }

    DOM.calGrid.appendChild(div)
  }
}

// --- Navigation ---

function updateViewDate(delta) {
  const newDate = new Date(currentViewDate)
  newDate.setDate(newDate.getDate() + delta)

  // Constraint: Start Date
  const startObj = normalizeDate(START_DATE)
  const checkObj = normalizeDate(newDate)

  if (checkObj < startObj) return // Can't go before start

  // Optional: Constraint Future? User didn't specify, but usually can't log future.
  // Let's allow looking at tomorrow but maybe disable input?
  // For now, allow any future navigation (useful to see blank state).

  currentViewDate = newDate
  render()
}

// --- Render ---

function render() {
  const dateStr = toDateString(currentViewDate)
  const record = getRecord(dateStr)
  const antiCount = calculateAntibioticsTaken()
  const isCourseDone = antiCount >= TOTAL_ANTIBIOTICS

  // Header
  DOM.currentDate.textContent = getPrettyDate(currentViewDate)

  // Navigation Buttons
  const startObj = normalizeDate(START_DATE)
  const currentObj = normalizeDate(currentViewDate)
  DOM.prevBtn.disabled = currentObj.getTime() <= startObj.getTime()

  // Inputs
  DOM.finCheck.checked = record.fin
  DOM.antiMorn.checked = record.antiMorn
  DOM.antiNight.checked = record.antiNight

  // Antibiotic Logic
  DOM.antiProgress.textContent = `${antiCount}/${TOTAL_ANTIBIOTICS} Tablets Taken`
  const progressPct = Math.min((antiCount / TOTAL_ANTIBIOTICS) * 100, 100)
  const progressBar = document.getElementById("anti-progress-bar")
  if (progressBar) progressBar.style.width = `${progressPct}%`

  // Course Completion
  if (isCourseDone) {
    DOM.courseMsg.classList.remove("hidden")
    // Only disable if we are trying to ADD more.
    // If unchecking, we should allow it to reduce count.
    // Actually simplest is just visual warning if full, but strictly enforcing 20 means:
    // If 20 taken, and current checkbox is unchecked, disable it to prevent taking more?
    // No, if 20 taken, disable unchecked boxes. Allow unchecking checked ones.

    DOM.antiMorn.disabled = !record.antiMorn
    DOM.antiNight.disabled = !record.antiNight
  } else {
    DOM.courseMsg.classList.add("hidden")
    DOM.antiMorn.disabled = false
    DOM.antiNight.disabled = false
  }

  // Hide history list container as we have navigation now,
  // or we could render 'all past records' there.
  // Let's hide it to keep UI clean as requested "nav back and forth".
  if (DOM.historyList) DOM.historyList.parentElement.style.display = "none"

  renderCalendar()
}

// --- Events ---

DOM.prevBtn.addEventListener("click", () => updateViewDate(-1))
DOM.nextBtn.addEventListener("click", () => updateViewDate(1))

DOM.finCheck.addEventListener("change", (e) => {
  updateRecord(toDateString(currentViewDate), "fin", e.target.checked)
})

DOM.antiMorn.addEventListener("change", (e) => {
  updateRecord(toDateString(currentViewDate), "antiMorn", e.target.checked)
})

DOM.antiNight.addEventListener("change", (e) => {
  updateRecord(toDateString(currentViewDate), "antiNight", e.target.checked)
})

// Init
// Ensure we start at least at start date or today
if (currentViewDate < START_DATE) currentViewDate = new Date(START_DATE)
render()
