# Meds. - Technical Documentation

> Detailed architecture and development guide for the Meds iOS app.

## 🔒 Privacy First

**Your data never leaves your device.**

| Principle             | Implementation                                    |
| --------------------- | ------------------------------------------------- |
| **Local Storage**     | SQLite database stored on-device only             |
| **No Network**        | Zero API calls, no cloud sync                     |
| **No Tracking**       | No analytics, no telemetry                        |
| **Complete Deletion** | Deleting a medication removes ALL associated data |

📖 **[Read our full privacy documentation →](https://www.ralphchang.com/blog/meds-privacy)**

### Data Architecture

```
┌─────────────────────────────────────────┐
│              Meds. App                  │
├─────────────────────────────────────────┤
│  UI Components (React Native)           │
│           ↓                             │
│  lib/db.js (API Layer)                  │
│           ↓                             │
│  lib/db-core.js (Pure Logic)            │
│           ↓                             │
│  expo-sqlite (Local Database)           │
│           ↓                             │
│  medtracker.db (On-Device File)         │
└─────────────────────────────────────────┘
```

## 🏗️ Architecture Principles

### 1. Maintainability (Hooks)

- **Separation of Concerns**: UI components are decoupled from data logic
- **Dependency Injection**: `db-core.js` accepts DB instance, enabling easy testing
- **Reusable Hooks**: Custom hooks for common patterns

### 2. Reliability (Tests)

- **Unit Tests**: Core database operations covered
- **Privacy Tests**: Verify complete data deletion
- **Mock Database**: In-memory SQLite mock for fast, isolated tests

```bash
npm test                          # Run all tests
npm test -- --testPathPatterns=privacy   # Privacy tests only
```

### 3. Scalability (Modular Structure)

```
mobile/
├── app/                 # Expo Router pages
│   └── (tabs)/          # Tab navigation
├── components/          # Reusable UI components
├── lib/                 # Data layer
│   ├── db.js            # Platform-specific DB wrapper
│   └── db-core.js       # Pure business logic
├── hooks/               # Custom React hooks
├── theme/               # Design tokens
└── __tests__/           # Test suite
```

### 4. Performance (Optimized Logic)

- **Transactions**: All multi-step operations are atomic
- **Batch Operations**: Record cleanup on deletion is batched
- **Lazy Loading**: Components load data on-demand

## 🔄 Database Migrations

Version-tracked migrations ensure safe updates:

```javascript
// In db-core.js - add new migrations to MIGRATIONS array
const MIGRATIONS = [
  // v1: Initial schema
  (db) => { ... },
  // v2: Add notes column (example)
  (db) => {
    db.execSync("ALTER TABLE medications ADD COLUMN notes TEXT");
  },
];
```

- Migrations run exactly once, in order
- Schema version tracked in `schema_version` table
- Safe for existing users - data never lost

## 🗄️ Database Schema

### medications

| Column    | Type    | Description                 |
| --------- | ------- | --------------------------- |
| id        | INTEGER | Primary key                 |
| name      | TEXT    | Medication name             |
| dosage    | TEXT    | Dosage info                 |
| frequency | TEXT    | e.g., "2x Daily"            |
| times     | TEXT    | JSON array of time slots    |
| keys      | TEXT    | JSON array of tracking keys |
| type      | TEXT    | daily, prn, course, etc.    |
| config    | TEXT    | Type-specific JSON config   |

### records

| Column | Type    | Description                |
| ------ | ------- | -------------------------- |
| id     | INTEGER | Primary key                |
| date   | TEXT    | Date string (YYYY-MM-DD)   |
| data   | TEXT    | JSON map of {key: boolean} |

## 🧪 Testing

### Test Coverage

- `db.test.js` - Core CRUD operations
- `privacy.test.js` - Privacy compliance
- `db-reliability.test.js` - Edge cases and reliability

### Running Tests

```bash
npm test                    # All tests
npm test -- --watch         # Watch mode
npm test -- --coverage      # With coverage report
```

## 🚀 Development

```bash
# Install dependencies
npm install

# Start development server
npx expo start

# Run on iOS simulator
npx expo start --ios

# Run tests
npm test
```

## License

MIT License - see [LICENSE](../LICENSE) for details.
