
interface Message {
  role: 'user' | 'model';
  content: string;
  id: string;
  rating?: number;
}

interface GoalStep {
  id: number;
  goal_id: number;
  content: string;
  completed: number;
  order_index: number;
}

interface Goal {
  id: number;
  title: string;
  description: string;
  status: string;
  created_at: string;
  steps: GoalStep[];
}

interface JournalEntry {
  id: number;
  title: string;
  content: string;
  date: string;
  category: string;
}

interface Skill {
  id: number;
  name: string;
  description: string;
  completed: number;
}

interface EmergencyContact {
  id: number;
  name: string;
  phone: string;
  relationship: string;
}

interface CalendarEvent {
  id: number;
  title: string;
  date: string;
  type: string;
}

interface Memory {
  id: number;
  content: string;
  source: string;
  date: string;
}

interface UserProfile {
  interests: string;
  goals: string;
  challenges: string;
  personality: string;
  has_onboarded?: number;
}

interface EmotionalCheckin {
  id: number;
  date: string;
  feeling: string;
  notes: string;
}

interface EngagementStats {
  engagement: { feature: string; count: number }[];
  masteredSkills: number;
  totalSkills: number;
}

const STORAGE_KEYS = {
  CHAT: 'dad_chat_history',
  SKILLS: 'dad_skills',
  JOURNAL: 'dad_journal',
  GOALS: 'dad_goals',
  EMERGENCY: 'dad_emergency_contacts',
  CALENDAR: 'dad_calendar_events',
  MEMORIES: 'dad_memories',
  PROFILE: 'dad_user_profile',
  CHECKINS: 'dad_emotional_checkins',
  STATS: 'dad_engagement_stats',
  JOKES: 'dad_daily_jokes'
};

const INITIAL_SKILLS: Skill[] = [
  { id: 1, name: "Tie a Tie", description: "Learn the Four-in-Hand knot for any formal occasion.", completed: 0 },
  { id: 2, name: "Check Tire Pressure", description: "Safety first! Keep those wheels rolling smoothly.", completed: 0 },
  { id: 3, name: "Cook a Perfect Egg", description: "A basic skill every person should have in the kitchen.", completed: 0 },
  { id: 4, name: "Basic Budgeting", description: "How to make your money work for you, not against you.", completed: 0 },
  { id: 5, name: "Change a Flat Tire", description: "Step-by-step guide to getting back on the road safely.", completed: 0 },
  { id: 6, name: "Simple Pasta Sauce", description: "A hearty, homemade meal that beats anything from a jar.", completed: 0 },
  { id: 7, name: "Understanding Credit Scores", description: "What they are, why they matter, and how to improve yours.", completed: 0 },
  { id: 8, name: "Basic Home Repair", description: "Fixing a leaky faucet or a squeaky door like a pro.", completed: 0 }
];

const get = <T>(key: string, defaultValue: T): T => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : defaultValue;
};

const set = <T>(key: string, value: T): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const storage = {
  // Chat
  getChatHistory: () => get<Message[]>(STORAGE_KEYS.CHAT, []),
  saveChatMessage: (role: 'user' | 'model', content: string) => {
    const history = storage.getChatHistory();
    const newMessage: Message = { role, content, id: Date.now().toString() };
    set(STORAGE_KEYS.CHAT, [...history, newMessage]);
    return newMessage;
  },
  deleteChatMessage: (id: string) => {
    const history = storage.getChatHistory();
    set(STORAGE_KEYS.CHAT, history.filter(m => m.id !== id));
  },

  // Skills
  getSkills: () => get<Skill[]>(STORAGE_KEYS.SKILLS, INITIAL_SKILLS),
  completeSkill: (id: number) => {
    const skills = storage.getSkills();
    set(STORAGE_KEYS.SKILLS, skills.map(s => s.id === id ? { ...s, completed: 1 } : s));
  },
  getSkillOfTheWeek: () => {
    const skills = storage.getSkills();
    const today = new Date();
    const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
    const pastDaysOfYear = (today.getTime() - firstDayOfYear.getTime()) / 86400000;
    const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    const skillIndex = weekNum % skills.length;
    return { skill: skills[skillIndex], weekNum };
  },

  // Journal
  getJournal: () => get<JournalEntry[]>(STORAGE_KEYS.JOURNAL, []),
  addJournalEntry: (entry: Omit<JournalEntry, 'id'>) => {
    const journal = storage.getJournal();
    const newEntry = { ...entry, id: Date.now() };
    set(STORAGE_KEYS.JOURNAL, [newEntry, ...journal]);
    return newEntry;
  },

  // Goals
  getGoals: () => get<Goal[]>(STORAGE_KEYS.GOALS, []),
  addGoal: (title: string, description: string, stepContents: string[]) => {
    const goals = storage.getGoals();
    const goalId = Date.now();
    const newGoal: Goal = {
      id: goalId,
      title,
      description,
      status: 'active',
      created_at: new Date().toISOString(),
      steps: stepContents.map((content, index) => ({
        id: Date.now() + index,
        goal_id: goalId,
        content,
        completed: 0,
        order_index: index
      }))
    };
    set(STORAGE_KEYS.GOALS, [...goals, newGoal]);
    return newGoal;
  },
  toggleGoalStep: (stepId: number, completed: boolean) => {
    const goals = storage.getGoals();
    const updatedGoals = goals.map(g => ({
      ...g,
      steps: g.steps.map(s => s.id === stepId ? { ...s, completed: completed ? 1 : 0 } : s)
    }));
    set(STORAGE_KEYS.GOALS, updatedGoals);
  },
  deleteGoal: (id: number) => {
    const goals = storage.getGoals();
    set(STORAGE_KEYS.GOALS, goals.filter(g => g.id !== id));
  },

  // Emergency Contacts
  getEmergencyContacts: () => get<EmergencyContact[]>(STORAGE_KEYS.EMERGENCY, []),
  addEmergencyContact: (contact: Omit<EmergencyContact, 'id'>) => {
    const contacts = storage.getEmergencyContacts();
    const newContact = { ...contact, id: Date.now() };
    set(STORAGE_KEYS.EMERGENCY, [...contacts, newContact]);
    return newContact;
  },
  deleteEmergencyContact: (id: number) => {
    const contacts = storage.getEmergencyContacts();
    set(STORAGE_KEYS.EMERGENCY, contacts.filter(c => c.id !== id));
  },

  // Calendar
  getCalendarEvents: () => get<CalendarEvent[]>(STORAGE_KEYS.CALENDAR, []),
  addCalendarEvent: (event: Omit<CalendarEvent, 'id'>) => {
    const events = storage.getCalendarEvents();
    const newEvent = { ...event, id: Date.now() };
    set(STORAGE_KEYS.CALENDAR, [...events, newEvent]);
    return newEvent;
  },
  deleteCalendarEvent: (id: number) => {
    const events = storage.getCalendarEvents();
    set(STORAGE_KEYS.CALENDAR, events.filter(e => e.id !== id));
  },

  // Memories
  getMemories: () => get<Memory[]>(STORAGE_KEYS.MEMORIES, []),
  addMemory: (content: string, source: string) => {
    const memories = storage.getMemories();
    const newMemory = { id: Date.now(), content, source, date: new Date().toISOString() };
    set(STORAGE_KEYS.MEMORIES, [newMemory, ...memories]);
    return newMemory;
  },
  deleteMemory: (id: number) => {
    const memories = storage.getMemories();
    set(STORAGE_KEYS.MEMORIES, memories.filter(m => m.id !== id));
  },

  // Profile
  getProfile: () => get<UserProfile>(STORAGE_KEYS.PROFILE, { interests: '', goals: '', challenges: '', personality: 'wise elder', has_onboarded: 0 }),
  updateProfile: (profile: UserProfile) => set(STORAGE_KEYS.PROFILE, profile),

  // Checkins
  getCheckins: () => get<EmotionalCheckin[]>(STORAGE_KEYS.CHECKINS, []),
  addCheckin: (checkin: { feeling: string; notes: string }) => {
    const checkins = storage.getCheckins();
    const newCheckin = { id: Date.now(), ...checkin, date: new Date().toISOString() };
    set(STORAGE_KEYS.CHECKINS, [newCheckin, ...checkins]);
    return newCheckin;
  },

  // Stats
  getStats: () => {
    const stats = get<EngagementStats>(STORAGE_KEYS.STATS, { engagement: [], masteredSkills: 0, totalSkills: INITIAL_SKILLS.length });
    const skills = storage.getSkills();
    stats.masteredSkills = skills.filter(s => s.completed).length;
    stats.totalSkills = skills.length;
    return stats;
  },
  logEngagement: (feature: string) => {
    const stats = storage.getStats();
    const existing = stats.engagement.find(e => e.feature === feature);
    if (existing) {
      existing.count += 1;
    } else {
      stats.engagement.push({ feature, count: 1 });
    }
    set(STORAGE_KEYS.STATS, stats);
  },

  // Jokes
  getDailyJoke: async () => {
    const jokes = get<{ joke: string, date: string }[]>(STORAGE_KEYS.JOKES, []);
    const today = new Date().toISOString().split('T')[0];
    const existing = jokes.find(j => j.date === today);
    if (existing) return existing.joke;
    return null; // App will fetch from Gemini if null
  },
  saveDailyJoke: (joke: string) => {
    const jokes = get<{ joke: string, date: string }[]>(STORAGE_KEYS.JOKES, []);
    const today = new Date().toISOString().split('T')[0];
    set(STORAGE_KEYS.JOKES, [...jokes.filter(j => j.date === today), { joke, date: today }]);
  }
};
