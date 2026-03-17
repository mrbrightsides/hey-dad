# 🔌 API Documentation

**Hey Dad** uses a combination of a local Express server and Google's Gemini 3.1 Pro API to provide its core functionality.

## 🤖 AI Integration (Gemini)

The AI logic is handled in `src/services/gemini.ts`.

### `getDadResponse(message, history, language, profile)`
- **Purpose:** Generates a conversational response from "Dad".
- **Parameters:**
  - `message` (string): User's input.
  - `history` (array): Previous chat messages for context.
  - `language` ('en' | 'id'): Preferred language.
  - `profile` (UserProfile): User's interests, goals, and challenges.
- **Output:** A string containing the AI's response, prefixed with an `[EMOTION: <emotion>]` tag.

### `getProactiveAdvice(timeOfDay, recentActivity, language, profile)`
- **Purpose:** Generates a timely greeting and advice based on current context.
- **Parameters:**
  - `timeOfDay` (string): Current time period (morning, afternoon, etc.).
  - `recentActivity` (string): Summary of user's recent goals or journal entries.
- **Output:** A short, proactive advice string.

### `breakDownGoal(goalTitle, language)`
- **Purpose:** Breaks a large goal into 3-5 actionable steps.
- **Output:** A JSON array of step objects.

## 🖥️ Backend Routes (Express)

The backend server is defined in `server.ts`.

### `GET /api/health`
- **Purpose:** Health check for the server.
- **Response:** `{ "status": "ok" }`

### `GET /api/auth/url`
- **Purpose:** (Optional) Returns the OAuth authorization URL for external integrations.

## 🗄️ Data Models (SQLite)

The application uses **SQLite** for persistence, managed via `better-sqlite3`.

### `UserProfile`
- `interests`: string (comma-separated)
- `goals`: string (comma-separated)
- `challenges`: string (comma-separated)
- `personality`: 'mentor' | 'playful' | 'wise elder'
- `favorite_jokes`: string

### `Goal`
- `id`: integer (primary key)
- `title`: string
- `category`: string
- `priority`: integer
- `steps`: string (JSON-serialized array)

### `Memory`
- `id`: integer (primary key)
- `content`: string
- `date`: ISO 8601 string
- `category`: string

### `JournalEntry`
- `id`: integer (primary key)
- `title`: string
- `content`: string
- `date`: ISO 8601 string
- `category`: string

---

**Questions?** Reach out via [Telegram](https://t.me/khudriakhmad) or email [khudri@binadarma.ac.id](mailto:khudri@binadarma.ac.id).
