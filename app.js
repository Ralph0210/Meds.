const START_DATE = new Date("2025-12-11")

// --- Supabase Init ---
const SUPABASE_URL = "https://xwroyevtqrklwqhbarat.supabase.co"
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3cm95ZXZ0cXJrbHdxaGJhcmF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3NDQyOTYsImV4cCI6MjA4MTMyMDI5Nn0.ZyKMiRMX5P9jxt15IAk4Ew78XmEeFVQAmGYHYc3ahrk"
let supabase
try {
  supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
} catch (e) {
  console.error("Supabase init failed", e)
}

const DOM = {
  currentDate: document.getElementById("current-date"),
  prevBtn: document.getElementById("prev-date"),
  nextBtn: document.getElementById("next-date"),
  medList: document.getElementById("med-list"),
  calMonthYear: document.getElementById("cal-month-year"),
  calGrid: document.getElementById("calendar-grid"),
  settingsBtn: document.getElementById("settings-btn"),
  modalOverlay: document.getElementById("modal-overlay"),
  modalTitle: document.getElementById("modal-title"),
  modalBody: document.getElementById("modal-body"),
  modalClose: document.getElementById("modal-close"),
}

// --- Default Configuration (Migration Support) ---
const DEFAULT_MEDS = [
  {
    id: "finasteride",
    name: "Finasteride",
    description: "1 tablet per day",
    type: "simple", // simple (1 checkbox), multi (named checkboxes), course (progress + checkboxes)
    schedule: ["Daily"], // label for the checkbox if simple, else list of labels
    keys: ["fin"], // binding keys in the daily record
    color: "#d0bcff",
    bgColor: "#4f378b",
    items: 1, // for simple
    icon: "F",
  },
  {
    id: "minoxidil",
    name: "Minoxidil",
    description: "Morning & Night",
    type: "multi",
    schedule: ["Morning", "Night"],
    keys: ["minoxMorn", "minoxNight"],
    color: "#ffb74d",
    bgColor: "#5d4000",
    icon: "M",
  },
  {
    id: "antibiotics",
    name: "Antibiotics",
    description: "20 Tablets Course",
    type: "course",
    total: 20,
    schedule: ["Morning", "Night"],
    keys: ["antiMorn", "antiNight"],
    color: "#6dd58c",
    bgColor: "#00532a",
    icon: "A",
  },
]

const initialState = {
  config: {
    startDateStr: "2025-12-11",
    medications: JSON.parse(JSON.stringify(DEFAULT_MEDS)),
  },
  state: {
    records: {},
  },
}

let appState = loadState()
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
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function generateId() {
  return "med_" + Math.random().toString(36).substr(2, 9)
}

// --- State Management ---

function loadState() {
  const stored = localStorage.getItem("medTrackerStateV2")
  if (!stored) {
    return JSON.parse(JSON.stringify(initialState))
  }
  const parsed = JSON.parse(stored)
  // Migration: If no medications config, add default
  if (!parsed.config.medications) {
    parsed.config.medications = JSON.parse(JSON.stringify(DEFAULT_MEDS))
  }
  return parsed
}

function saveState() {
  localStorage.setItem("medTrackerStateV2", JSON.stringify(appState))
  render()
}

function getRecord(dateStr) {
  if (!appState.state.records[dateStr]) {
    return {}
  }
  return appState.state.records[dateStr]
}

function updateRecord(dateStr, key, value) {
  if (!appState.state.records[dateStr]) {
    appState.state.records[dateStr] = {}
  }
  appState.state.records[dateStr][key] = value
  saveState()
}

// --- Logic for Course Progress ---

function calculateCourseProgress(med) {
  let count = 0
  Object.values(appState.state.records).forEach((rec) => {
    med.keys.forEach((key) => {
      if (rec[key]) count++
    })
  })
  return count
}

// --- DOM Generation ---

function createMedCard(med) {
  const dateStr = toDateString(currentViewDate)
  const record = getRecord(dateStr)

  const card = document.createElement("div")
  card.className = "med-card"

  // Header
  const header = document.createElement("div")
  header.className = "card-header"

  const icon = document.createElement("div")
  icon.className = "icon-box"
  icon.textContent = med.icon
  icon.style.backgroundColor = med.bgColor
  icon.style.color = med.color

  const info = document.createElement("div")
  info.className = "med-info"
  const title = document.createElement("h2")
  title.textContent = med.name
  const desc = document.createElement("p")

  // Specific Logic for Course Description
  if (med.type === "course") {
    const taken = calculateCourseProgress(med)
    desc.textContent = `${taken}/${med.total} Taken`
    desc.id = `prog-text-${med.id}` // Marker for updates? Nah, we re-render whole list usually.
  } else {
    desc.textContent = med.description
  }

  info.appendChild(title)
  info.appendChild(desc)
  header.appendChild(icon)
  header.appendChild(info)
  card.appendChild(header)

  // Body Content
  if (med.type === "course") {
    const taken = calculateCourseProgress(med)
    const progressContainer = document.createElement("div")
    progressContainer.className = "progress-container"
    const bar = document.createElement("div")
    bar.className = "progress-bar"
    bar.style.backgroundColor = med.color
    const pct = Math.min((taken / med.total) * 100, 100)
    bar.style.width = `${pct}%`
    progressContainer.appendChild(bar)
    card.appendChild(progressContainer)

    if (taken >= med.total) {
      const msg = document.createElement("div")
      msg.id = "course-completed-msg"
      msg.textContent = "Course Completed 🎉"
      msg.style.color = med.color
      msg.style.backgroundColor = `${med.color}20` // 20 hex opacity ~ 12%
      card.appendChild(msg)
    }
  }

  // Controls
  const controls = document.createElement("div")
  if (med.type === "simple") {
    // Single Checkbox aligned right in header usually?
    // Existing design put it below or right.
    // Let's use the standard "dose-row" style if we want consistent padding,
    // OR put it in top right. Old design had it in top right for Finasteride.
    // Let's use standard layout for consistency: Simple = 1 row.

    // Wait, Finasteride card had checkbox in the header-equivalent row?
    // Actually it was below header in wrapper.
    // Let's make a generic container.

    const wrapper = document.createElement("div")
    wrapper.className = "checkbox-wrapper"
    wrapper.style.marginLeft = "auto" // Push to right if in flex row
    // Actually let's put it in a separate row if it's the only one,
    // or absolute position it?
    // "Finasteride" card structure: Header, then checkbox-wrapper (flex col).
    // Let's just append logic.

    const checkbox = createCheckbox(
      med.keys[0],
      record[med.keys[0]],
      med.color,
      med.bgColor,
      (checked) => {
        updateRecord(dateStr, med.keys[0], checked)
      }
    )

    // For Fin logic specifically, the design was Header | Checkbox.
    // Let's mimic that layout by appending checkbox to header?
    header.appendChild(checkbox) // Flex container handles it
    checkbox.style.marginLeft = "auto"
  } else {
    // Multi / Course (Morning/Night)
    controls.className = "anti-controls"

    med.schedule.forEach((label, index) => {
      const key = med.keys[index]
      const isTaken = !!record[key]

      const row = document.createElement("div")
      row.className = "dose-row"
      const lbl = document.createElement("span")
      lbl.textContent = label

      const cb = createCheckbox(
        key,
        isTaken,
        med.color,
        med.bgColor,
        (checked) => {
          updateRecord(dateStr, key, checked)
        }
      )

      row.appendChild(lbl)
      row.appendChild(cb)
      controls.appendChild(row)
    })
    card.appendChild(controls)
  }

  return card
}

function createCheckbox(id, checked, color, bgColor, onChange) {
  const wrapper = document.createElement("div")
  wrapper.className = "checkbox-wrapper"

  const input = document.createElement("input")
  input.type = "checkbox"
  input.checked = checked
  input.addEventListener("change", (e) => onChange(e.target.checked))

  const custom = document.createElement("label")
  custom.className = "custom-checkbox"

  // Inject dynamic styles for THIS instance
  // We can't use pseudo-elements easily with inline styles for the ::after
  // So we'll use a <style> block or CSS variable injection on the wrapper?
  // CSS variables are best.
  wrapper.style.setProperty("--curr-color", color)
  wrapper.style.setProperty("--curr-bg", bgColor)

  // We need to override the generic CSS that uses var(--color-fin-primary) etc.
  // The CSS uses:
  // .checkbox-wrapper input:checked + .custom-checkbox { background-color: var(--color-success); ... }
  // We can set style="..." on the custom element to override.

  // Logic:
  // When checked, background = color, border = color.
  // Tick color = bgColor.

  // To handle the `::after` (tick), we use a CSS variable `--tick-color`.
  // We can add a generic rule in CSS:
  // .custom-checkbox::after { border-color: var(--tick-color, var(--md-sys-color-surface)) }

  // But we didn't add that yet.
  // Let's stick to the generated CSS classes or add a small style helper.
  // For now, let's just make it green (default) or try to adhere to theme.

  // Update: I will modify the style logic here to use inline styles for the active state
  // by interacting with a class or just relying on existing CSS and maybe
  // replacing the "var(--color-fin...)" with a scoped variable.

  // HACK: We can use a unique class for this med color?
  // Better: Just set `--color-success` locally on the wrapper!
  // The CSS uses `var(--color-success)` for generic checked state.
  wrapper.style.setProperty("--color-success", color)
  // And for the tick color (which is usually surface color),
  // Finasteride used a custom dark purple tick.
  // If we want that, we need to override the tick color.
  // The CSS selector is `.custom-checkbox::after`.
  // We can't style that inline.
  // Let's just accept the default surface color tick (black/dark) which usually looks fine on bright colors.
  // If bgColor is provided, maybe we want that?

  wrapper.appendChild(input)
  wrapper.appendChild(custom)
  return wrapper
}

// --- Render Main ---

function render() {
  DOM.medList.innerHTML = ""

  // Header Info
  DOM.currentDate.textContent = getPrettyDate(currentViewDate)
  const startObj = normalizeDate(START_DATE)
  const currentObj = normalizeDate(currentViewDate)
  DOM.prevBtn.disabled = currentObj.getTime() <= startObj.getTime()

  // Med Cards
  appState.config.medications.forEach((med) => {
    const card = createMedCard(med)
    DOM.medList.appendChild(card)
  })

  renderCalendar()
}

function updateViewDate(delta) {
  const newDate = new Date(currentViewDate)
  newDate.setDate(newDate.getDate() + delta)
  const startObj = normalizeDate(START_DATE)
  const checkObj = normalizeDate(newDate)
  if (checkObj < startObj) return
  currentViewDate = newDate
  render()
}

// --- Calendar ---

function renderCalendar() {
  DOM.calGrid.innerHTML = ""
  const year = currentViewDate.getFullYear()
  const month = currentViewDate.getMonth()

  DOM.calMonthYear.textContent = currentViewDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startDayOfWeek = firstDay.getDay()

  for (let i = 0; i < startDayOfWeek; i++) {
    const div = document.createElement("div")
    div.className = "cal-day empty"
    DOM.calGrid.appendChild(div)
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d)
    const dateStr = toDateString(dateObj)
    const record = getRecord(dateStr)

    const div = document.createElement("div")
    div.className = "cal-day"
    div.innerHTML = `<span class="day-num">${d}</span>`

    // Gradient Generation
    // We iterate through ALL meds and ALL their keys
    let totalSegments = 0
    const segments = []

    appState.config.medications.forEach((med) => {
      med.keys.forEach((key) => {
        totalSegments++
        segments.push({
          taken: !!record[key],
          color: med.color,
        })
      })
    })

    if (totalSegments > 0) {
      const SEGMENT_DEG = 360 / totalSegments
      const GAP = 4
      const FILL = SEGMENT_DEG - GAP
      const TRACK = "rgba(255, 255, 255, 0.08)"

      const parts = segments.map((seg, i) => {
        const start = i * SEGMENT_DEG
        const endFill = start + FILL
        const endSeg = (i + 1) * SEGMENT_DEG
        const c = seg.taken ? seg.color : TRACK
        return `${c} ${start}deg ${endFill}deg, transparent ${endFill}deg ${endSeg}deg`
      })
      div.style.setProperty(
        "--day-gradient",
        `conic-gradient(${parts.join(", ")})`
      )
    }

    if (dateStr === toDateString(currentViewDate))
      div.classList.add("active-day")
    if (dateStr === toDateString(new Date())) div.classList.add("status-today")

    if (dateObj >= START_DATE) {
      div.addEventListener("click", () => {
        currentViewDate = dateObj
        render()
      })
    } else {
      div.classList.add("empty")
      div.style.cursor = "default"
    }

    DOM.calGrid.appendChild(div)
  }
}

// --- Settings Modal Logic ---

function openSettings() {
  DOM.modalOverlay.classList.add("open")
  renderSettingsHome()
}

function closeSettings() {
  DOM.modalOverlay.classList.remove("open")
}

function renderSettingsHome() {
  DOM.modalTitle.textContent = "Manage Medications"
  DOM.modalBody.innerHTML = ""

  // Validate config just in case
  if (!appState.config.medications) appState.config.medications = []

  const list = document.createElement("div")
  list.style.display = "flex"
  list.style.flexDirection = "column"
  list.style.gap = "12px"

  appState.config.medications.forEach((med, index) => {
    const item = document.createElement("div")
    item.className = "settings-med-item"
    // Make the whole item clickable to edit, except maybe the specific edit button if we want to separate?
    // Let's make the whole row clickable for better UX
    item.onclick = (e) => {
      // If clicked directly on the button, don't double trigger?
      // Actually, logic below puts onclick on editBtn.
      // Let's just make the whole item trigger edit.
      renderEditMed(index)
    }

    const info = document.createElement("div")
    info.className = "settings-med-info"
    const icon = document.createElement("div")
    icon.className = "mini-icon"
    icon.textContent = med.icon
    icon.style.backgroundColor = med.bgColor
    icon.style.color = med.color

    const name = document.createElement("span")
    name.className = "med-name-text" // Use new class
    name.textContent = med.name

    info.appendChild(icon)
    info.appendChild(name)

    const editBtn = document.createElement("button")
    editBtn.className = "icon-btn"
    // Use a chevron for "Go" indication
    editBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>`
    // editBtn.onclick is not needed if row is clickable, but keeping it as a visual indicator

    item.appendChild(info)
    item.appendChild(editBtn)
    list.appendChild(item)
  })

  const addBtn = document.createElement("button")
  addBtn.className = "btn-primary"
  addBtn.style.marginTop = "24px"
  addBtn.textContent = "+ Add New Medication"
  addBtn.onclick = () => renderEditMed(-1) // -1 for new

  // --- Cloud Migration Section ---
  const cloudSection = document.createElement("div")
  cloudSection.style.marginTop = "32px"
  cloudSection.style.paddingTop = "24px"
  cloudSection.style.borderTop = "1px solid rgba(255,255,255,0.1)"

  const cloudTitle = document.createElement("h3")
  cloudTitle.textContent = "Cloud Sync (Migration)"
  cloudTitle.style.fontSize = "1rem"
  cloudTitle.style.marginBottom = "12px"
  cloudTitle.style.color = "var(--md-sys-color-on-surface)"

  const syncBtn = document.createElement("button")
  syncBtn.className = "btn-secondary"
  syncBtn.innerHTML = "☁️ Login & Back Up Data"
  syncBtn.onclick = () => renderLoginScreen()

  cloudSection.appendChild(cloudTitle)
  cloudSection.appendChild(syncBtn)

  DOM.modalBody.appendChild(list)
  DOM.modalBody.appendChild(addBtn)
  DOM.modalBody.appendChild(cloudSection)
}

function renderLoginScreen() {
  DOM.modalTitle.textContent = "Supabase Login"
  DOM.modalBody.innerHTML = ""

  const form = document.createElement("div")
  form.className = "form-group"
  form.style.gap = "16px"

  const emailInput = document.createElement("input")
  emailInput.className = "form-input"
  emailInput.placeholder = "Enter Email"
  emailInput.type = "email"

  const passInput = document.createElement("input")
  passInput.className = "form-input"
  passInput.placeholder = "Password (min 6 chars)"
  passInput.type = "password"

  const loginBtn = document.createElement("button")
  loginBtn.className = "btn-primary"
  loginBtn.textContent = "Log In / Sign Up"
  loginBtn.onclick = async () => {
    const email = emailInput.value
    const pass = passInput.value
    if (!email || !pass) return alert("Please fill all fields")

    loginBtn.textContent = "Authenticating..."
    loginBtn.disabled = true

    // Try Login
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    })
    if (error) {
      // Try Signup if login fails? Or just show error?
      // Let's try signup
      console.log("Login failed, trying signup", error)
      const { data: sData, error: sError } = await supabase.auth.signUp({
        email,
        password: pass,
      })
      if (sError) {
        alert("Error: " + sError.message)
        loginBtn.textContent = "Log In / Sign Up"
        loginBtn.disabled = false
        return
      }
      alert(
        "Account created! Please check your email to confirm, then log in again."
      )
      loginBtn.textContent = "Check Email & Retry Login"
      loginBtn.disabled = false
      return
    }

    // Success
    await performMigration(data.user)
  }

  form.appendChild(document.createTextNode("Email"))
  form.appendChild(emailInput)
  form.appendChild(document.createTextNode("Password"))
  form.appendChild(passInput)
  form.appendChild(loginBtn)

  DOM.modalBody.appendChild(form)
}

async function performMigration(user) {
  DOM.modalTitle.textContent = "Syncing Data..."
  DOM.modalBody.innerHTML = "<p>Please wait, uploading records...</p>"

  try {
    const userId = user.id
    const config = appState.config.medications
    const records = appState.state.records

    // 1. Upsert Config
    // We'll just insert/update each med.
    // Since local IDs are random strings like "med_xxx" or "finasteride",
    // we might not match UUIDs. Ideally we should have UUIDs.
    // The table expects UUID for ID. "finasteride" is not UUID.
    // We might need to generate UUIDs for them if they don't have one,
    // OR change table schema to allow text ID.
    // Let's assume we change table schema or generate new IDs.
    // For simple migration: Generate new UUIDs for meds if needed,
    // but wait! we need to Map old text IDs to new UUIDs for the records!

    // STRATEGY:
    // We will just upload the config as is, BUT the 'medications_config' table
    // has 'id' as UUID in my SQL.
    // Check my SQL: `id uuid default uuid_generate_v4() primary key`.
    // Using "finasteride" string will fail.

    // Correct approach:
    // We will generate a new config entry for each local med.
    // We will map LocalID -> NewRemoteID.
    // Then we update the records to use keys derived from NewRemoteID?
    // Actually, the records use keys like "fin_daily" or "med_xyz_morn".
    // The `keys` array in config stores these.
    // The `medication_records` table stores `data` jsonb which is just { "fin_daily": true }.
    // So we DON'T need to change the record keys as long as the Config `keys` array matches!
    // We just need to insert the Config rows with NEW UUIDs, but keep the `keys` content same.

    // Upload Configs
    for (const med of config) {
      // We strip the local ID and let Supabase generate one?
      // Or we just store the local data.
      const payload = {
        user_id: userId,
        name: med.name,
        description: med.description,
        type: med.type,
        keys: med.keys,
        schedule: med.schedule,
        color: med.color,
        bg_color: med.bgColor,
        icon: med.icon,
      }

      const { error } = await supabase
        .from("medications_config")
        .insert(payload)
      if (error) throw error
    }

    // 2. Upsert Records
    // format: { "2023-10-27": { ... } }
    // needs to turn into rows: [ {date: "2023-10-27", data: {...}, user_id: ...} ]

    const rows = Object.entries(records).map(([dateStr, dataObj]) => ({
      user_id: userId,
      date: dateStr,
      data: dataObj,
    }))

    if (rows.length > 0) {
      // Split into chunks if too big?
      const { error: rError } = await supabase
        .from("medication_records")
        .upsert(rows, { onConflict: "user_id, date" })
      if (rError) throw rError
    }

    alert("Migration Success! Data is now on Supabase.")
    closeSettings()
  } catch (err) {
    console.error(err)
    alert("Migration Failed: " + err.message)
    renderSettingsHome()
  }
}

function renderEditMed(index) {
  const isNew = index === -1
  const med = isNew
    ? {
        schedule: ["Daily"],
        keys: [],
        color: "#d0bcff",
        bgColor: "#4f378b",
        icon: "P",
      }
    : JSON.parse(JSON.stringify(appState.config.medications[index]))

  DOM.modalTitle.textContent = isNew ? "Add Medication" : "Edit Medication"
  DOM.modalBody.innerHTML = ""

  const form = document.createElement("div")
  form.style.display = "flex"
  form.style.flexDirection = "column"
  form.style.gap = "20px" // Increased gap

  // Name
  form.appendChild(
    createInput("Medication Name", med.name, (val) => (med.name = val))
  )

  // Description
  form.appendChild(
    createInput(
      "Description (e.g. 1 pill daily)",
      med.description,
      (val) => (med.description = val)
    )
  )

  // Type Select
  const typeGroup = document.createElement("div")
  typeGroup.className = "form-group"
  const typeLabel = document.createElement("label")
  typeLabel.textContent = "Tracking Type"
  const typeSelect = document.createElement("select")
  typeSelect.className = "form-select"
  ;[
    { v: "simple", l: "Simple (Check Once)" },
    { v: "multi", l: "Twice Daily (Morning/Night)" },
    { v: "course", l: "Antibiotic Course" },
  ].forEach((opt) => {
    const o = document.createElement("option")
    o.value = opt.v
    o.textContent = opt.l
    if (med.type === opt.v) o.selected = true
    typeSelect.appendChild(o)
  })
  typeSelect.onchange = (e) => {
    med.type = e.target.value
    // Reset defaults logic could go here
  }
  typeGroup.appendChild(typeLabel)
  typeGroup.appendChild(typeSelect)
  form.appendChild(typeGroup)

  // Color Picker
  const colors = [
    { c: "#d0bcff", bg: "#4f378b" }, // Purple
    { c: "#ffb74d", bg: "#5d4000" }, // Orange
    { c: "#6dd58c", bg: "#00532a" }, // Green
    { c: "#ffb4ab", bg: "#690005" }, // Red
    { c: "#5ab3f0", bg: "#00325b" }, // Blue
  ]
  const colorGroup = document.createElement("div")
  colorGroup.className = "form-group"
  const colorLabel = document.createElement("label")
  colorLabel.textContent = "Color Theme"
  const picker = document.createElement("div")
  picker.className = "color-picker"

  colors.forEach((theme) => {
    const dot = document.createElement("div")
    dot.className = "color-option"
    dot.style.backgroundColor = theme.c
    // Set 'color' property so box-shadow currentColor works
    dot.style.color = theme.c

    if (med.color === theme.c) dot.classList.add("selected")
    dot.onclick = () => {
      med.color = theme.c
      med.bgColor = theme.bg
      Array.from(picker.children).forEach((c) => c.classList.remove("selected"))
      dot.classList.add("selected")
    }
    picker.appendChild(dot)
  })

  colorGroup.appendChild(colorLabel)
  colorGroup.appendChild(picker)
  form.appendChild(colorGroup)

  // Action Buttons Container
  const actionRow = document.createElement("div")
  actionRow.style.display = "flex"
  actionRow.style.gap = "12px"
  actionRow.style.marginTop = "12px"

  const saveBtn = document.createElement("button")
  saveBtn.className = "btn-primary"
  saveBtn.textContent = "Save Changes"
  saveBtn.onclick = () => {
    if (isNew) {
      med.id = generateId()
      if (med.type === "simple") {
        med.keys = [med.id + "_daily"]
        med.schedule = ["Daily"]
        med.items = 1
      } else if (med.type === "multi" || med.type === "course") {
        med.keys = [med.id + "_morn", med.id + "_night"]
        med.schedule = ["Morning", "Night"]
        if (med.type === "course") med.total = 20
      }
    }
    saveMedication(index, med)
    renderSettingsHome()
  }

  const backBtn = document.createElement("button")
  backBtn.className = "btn-secondary"
  backBtn.textContent = "Cancel"
  backBtn.onclick = renderSettingsHome

  actionRow.appendChild(saveBtn)
  actionRow.appendChild(backBtn)
  form.appendChild(actionRow)

  if (!isNew) {
    const delBtn = document.createElement("button")
    delBtn.className = "btn-danger"
    delBtn.textContent = "Delete Medication"
    delBtn.onclick = () => {
      // Native confirm is okay, but we could do custom. Using Native for speed.
      if (confirm("Delete this medication? Past records will be kept safe.")) {
        deleteMedication(index)
        renderSettingsHome()
      }
    }
    form.appendChild(delBtn)
  }

  DOM.modalBody.appendChild(form)
}

function createInput(label, value, onChange) {
  const g = document.createElement("div")
  g.className = "form-group"
  const l = document.createElement("label")
  l.textContent = label
  const i = document.createElement("input")
  i.className = "form-input"
  i.value = value || ""
  i.oninput = (e) => onChange(e.target.value)
  g.appendChild(l)
  g.appendChild(i)
  return g
}

function saveMedication(index, medData) {
  if (index === -1) {
    appState.config.medications.push(medData)
  } else {
    appState.config.medications[index] = medData
  }
  saveState()
}

function deleteMedication(index) {
  appState.config.medications.splice(index, 1)
  saveState()
}

// --- Events ---
DOM.prevBtn.addEventListener("click", () => updateViewDate(-1))
DOM.nextBtn.addEventListener("click", () => updateViewDate(1))

DOM.settingsBtn.addEventListener("click", openSettings)
DOM.modalClose.addEventListener("click", closeSettings)
DOM.modalOverlay.addEventListener("click", (e) => {
  if (e.target === DOM.modalOverlay) closeSettings()
})

// Init
if (currentViewDate < START_DATE) currentViewDate = new Date(START_DATE)
render()
