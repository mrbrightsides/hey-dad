import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(path.join(DATA_DIR, "dad.db"));

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS journal (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    content TEXT,
    date TEXT,
    category TEXT
  );
  
  CREATE TABLE IF NOT EXISTS skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    description TEXT,
    completed INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    description TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT,
    order_index INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS goal_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id INTEGER,
    content TEXT,
    completed INTEGER DEFAULT 0,
    order_index INTEGER DEFAULT 0,
    FOREIGN KEY(goal_id) REFERENCES goals(id)
  );

  CREATE TABLE IF NOT EXISTS chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT,
    content TEXT,
    timestamp TEXT
  );

  CREATE TABLE IF NOT EXISTS emergency_contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    phone TEXT,
    relationship TEXT
  );

  CREATE TABLE IF NOT EXISTS daily_jokes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    joke TEXT,
    date TEXT
  );

  CREATE TABLE IF NOT EXISTS calendar_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    date TEXT,
    type TEXT DEFAULT 'event'
  );

  CREATE TABLE IF NOT EXISTS memories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT,
    source TEXT, -- 'advice' or 'memory'
    date TEXT
  );

  CREATE TABLE IF NOT EXISTS skill_of_the_week (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    skill_id INTEGER,
    week_start TEXT,
    FOREIGN KEY(skill_id) REFERENCES skills(id)
  );

  CREATE TABLE IF NOT EXISTS api_usage (
    date TEXT PRIMARY KEY,
    count INTEGER DEFAULT 0
  );
`);

// Migration: Ensure order_index exists in goals and goal_steps, and type in calendar_events
const migrations = [
  { table: 'goals', column: 'order_index', type: 'INTEGER DEFAULT 0' },
  { table: 'goal_steps', column: 'order_index', type: 'INTEGER DEFAULT 0' },
  { table: 'calendar_events', column: 'type', type: "TEXT DEFAULT 'event'" }
];

for (const m of migrations) {
  const columns = db.prepare(`PRAGMA table_info(${m.table})`).all() as any[];
  const hasColumn = columns.some(col => col.name === m.column);
  if (!hasColumn) {
    try {
      db.exec(`ALTER TABLE ${m.table} ADD COLUMN ${m.column} ${m.type}`);
      console.log(`Added ${m.column} column to ${m.table}`);
    } catch (e) {
      console.error(`Failed to add ${m.column} to ${m.table}`, e);
    }
  }
}

// Seed initial skills if empty
const skillsCount = db.prepare("SELECT COUNT(*) as count FROM skills").get() as { count: number };
if (skillsCount.count === 0) {
  const insertSkill = db.prepare("INSERT INTO skills (name, description) VALUES (?, ?)");
  insertSkill.run("Tie a Tie", "Learn the Four-in-Hand knot for any formal occasion.");
  insertSkill.run("Check Tire Pressure", "Safety first! Keep those wheels rolling smoothly.");
  insertSkill.run("Cook a Perfect Egg", "A basic skill every person should have in the kitchen.");
  insertSkill.run("Basic Budgeting", "How to make your money work for you, not against you.");
  insertSkill.run("Change a Flat Tire", "Step-by-step guide to getting back on the road safely.");
  insertSkill.run("Simple Pasta Sauce", "A hearty, homemade meal that beats anything from a jar.");
  insertSkill.run("Understanding Credit Scores", "What they are, why they matter, and how to improve yours.");
  insertSkill.run("Basic Home Repair", "Fixing a leaky faucet or a squeaky door like a pro.");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/skills", (req, res) => {
    const skills = db.prepare("SELECT * FROM skills").all();
    res.json(skills);
  });

  app.get("/api/skill-of-the-week", (req, res) => {
    const today = new Date();
    const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
    const pastDaysOfYear = (today.getTime() - firstDayOfYear.getTime()) / 86400000;
    const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    
    const skills = db.prepare("SELECT * FROM skills").all() as any[];
    if (skills.length === 0) return res.json({ skill: null });
    
    // Deterministic selection based on week number
    const skillIndex = weekNum % skills.length;
    res.json({ skill: skills[skillIndex], weekNum });
  });

  app.post("/api/skills/:id/complete", (req, res) => {
    const { id } = req.params;
    db.prepare("UPDATE skills SET completed = 1 WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.get("/api/journal", (req, res) => {
    const entries = db.prepare("SELECT * FROM journal ORDER BY date DESC").all();
    res.json(entries);
  });

  app.post("/api/journal", (req, res) => {
    const { title, content, category, date: bodyDate } = req.body;
    const date = bodyDate || new Date().toISOString();
    db.prepare("INSERT INTO journal (title, content, date, category) VALUES (?, ?, ?, ?)").run(title, content, date, category);
    res.json({ success: true });
  });

  // Memory Box API
  app.get("/api/memories", (req, res) => {
    const memories = db.prepare("SELECT * FROM memories ORDER BY date DESC").all();
    res.json(memories);
  });

  app.post("/api/memories", (req, res) => {
    const { content, source } = req.body;
    const date = new Date().toISOString();
    db.prepare("INSERT INTO memories (content, source, date) VALUES (?, ?, ?)").run(content, source, date);
    res.json({ success: true });
  });

  app.delete("/api/memories/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM memories WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Goals API
  app.get("/api/goals", (req, res) => {
    const goals = db.prepare("SELECT * FROM goals ORDER BY order_index ASC, created_at DESC").all();
    const goalsWithSteps = goals.map((goal: any) => {
      const steps = db.prepare("SELECT * FROM goal_steps WHERE goal_id = ? ORDER BY order_index ASC").all(goal.id);
      return { ...goal, steps };
    });
    res.json(goalsWithSteps);
  });

  app.post("/api/goals", (req, res) => {
    const { title, description, steps } = req.body;
    const createdAt = new Date().toISOString();
    
    // Get max order index
    const maxOrder = db.prepare("SELECT MAX(order_index) as max_order FROM goals").get() as { max_order: number | null };
    const nextOrder = (maxOrder.max_order || 0) + 1;

    const info = db.prepare("INSERT INTO goals (title, description, created_at, order_index) VALUES (?, ?, ?, ?)").run(title, description, createdAt, nextOrder);
    const goalId = info.lastInsertRowid;

    if (steps && Array.isArray(steps)) {
      const insertStep = db.prepare("INSERT INTO goal_steps (goal_id, content, order_index) VALUES (?, ?, ?)");
      steps.forEach((step: string, index: number) => insertStep.run(goalId, step, index));
    }
    res.json({ id: goalId });
  });

  app.post("/api/goals/reorder", (req, res) => {
    const { goals } = req.body; // Array of { id, order_index }
    const update = db.prepare("UPDATE goals SET order_index = ? WHERE id = ?");
    const transaction = db.transaction((goals) => {
      for (const goal of goals) update.run(goal.order_index, goal.id);
    });
    transaction(goals);
    res.json({ success: true });
  });

  app.post("/api/goals/steps/reorder", (req, res) => {
    const { steps } = req.body; // Array of { id, order_index }
    const update = db.prepare("UPDATE goal_steps SET order_index = ? WHERE id = ?");
    const transaction = db.transaction((steps) => {
      for (const step of steps) update.run(step.order_index, step.id);
    });
    transaction(steps);
    res.json({ success: true });
  });

  app.post("/api/goals/steps/:id/toggle", (req, res) => {
    const { id } = req.params;
    const { completed } = req.body;
    db.prepare("UPDATE goal_steps SET completed = ? WHERE id = ?").run(completed ? 1 : 0, id);
    res.json({ success: true });
  });

  app.delete("/api/goals/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM goal_steps WHERE goal_id = ?").run(id);
    db.prepare("DELETE FROM goals WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Chat History API
  app.get("/api/chat", (req, res) => {
    const history = db.prepare("SELECT role, content FROM chat_history ORDER BY id ASC LIMIT 50").all();
    res.json(history);
  });

  app.post("/api/chat", (req, res) => {
    const { role, content } = req.body;
    const timestamp = new Date().toISOString();
    db.prepare("INSERT INTO chat_history (role, content, timestamp) VALUES (?, ?, ?)").run(role, content, timestamp);
    res.json({ success: true });
  });

  // Emergency Contacts API
  app.get("/api/emergency-contacts", (req, res) => {
    const contacts = db.prepare("SELECT * FROM emergency_contacts").all();
    res.json(contacts);
  });

  app.post("/api/emergency-contacts", (req, res) => {
    const { name, phone, relationship } = req.body;
    const info = db.prepare("INSERT INTO emergency_contacts (name, phone, relationship) VALUES (?, ?, ?)").run(name, phone, relationship);
    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/emergency-contacts/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM emergency_contacts WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Daily Joke API
  app.get("/api/daily-joke", (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const joke = db.prepare("SELECT * FROM daily_jokes WHERE date = ?").get(today) as { joke: string } | undefined;
    res.json(joke || { joke: null });
  });

  app.post("/api/daily-joke", (req, res) => {
    const { joke } = req.body;
    const today = new Date().toISOString().split('T')[0];
    db.prepare("INSERT INTO daily_jokes (joke, date) VALUES (?, ?)").run(joke, today);
    res.json({ success: true });
  });

  // Calendar API
  app.get("/api/calendar", (req, res) => {
    const events = db.prepare("SELECT * FROM calendar_events ORDER BY date ASC").all();
    res.json(events);
  });

  app.post("/api/calendar", (req, res) => {
    const { title, date, type } = req.body;
    const info = db.prepare("INSERT INTO calendar_events (title, date, type) VALUES (?, ?, ?)").run(title, date, type);
    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/calendar/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM calendar_events WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Quota API
  app.get("/api/quota", (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    let usage = db.prepare("SELECT count FROM api_usage WHERE date = ?").get(today) as { count: number } | undefined;
    if (!usage) {
      db.prepare("INSERT INTO api_usage (date, count) VALUES (?, 0)").run(today);
      usage = { count: 0 };
    }
    res.json({ count: usage.count, limit: 50 });
  });

  app.post("/api/quota/increment", (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    db.prepare("INSERT INTO api_usage (date, count) VALUES (?, 1) ON CONFLICT(date) DO UPDATE SET count = count + 1").run(today);
    res.json({ success: true });
  });

  // Reset Data API
  app.post("/api/reset", (req, res) => {
    db.prepare("DELETE FROM chat_history").run();
    db.prepare("DELETE FROM journal").run();
    db.prepare("DELETE FROM goals").run();
    db.prepare("DELETE FROM goal_steps").run();
    db.prepare("DELETE FROM emergency_contacts").run();
    db.prepare("DELETE FROM calendar_events").run();
    db.prepare("DELETE FROM memories").run();
    // Reset skills completion
    db.prepare("UPDATE skills SET completed = 0").run();
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
