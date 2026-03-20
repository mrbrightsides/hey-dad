
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  onSnapshot,
  getDocFromServer
} from 'firebase/firestore';
import { db, auth } from '../firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface Message {
  role: 'user' | 'model';
  content: string;
  id: string;
  rating?: number;
  timestamp: number;
}

export interface GoalStep {
  id: number;
  goal_id: number;
  content: string;
  completed: number;
  order_index: number;
}

export interface Goal {
  id: number;
  title: string;
  description: string;
  status: string;
  created_at: string;
  steps: GoalStep[];
}

export interface JournalEntry {
  id: number;
  title: string;
  content: string;
  date: string;
  category: string;
}

export interface Skill {
  id: number;
  name: string;
  description: string;
  completed: number;
}

export interface EmergencyContact {
  id: number;
  name: string;
  phone: string;
  relationship: string;
}

export interface CalendarEvent {
  id: number;
  title: string;
  date: string;
  type: string;
}

export interface Memory {
  id: number;
  content: string;
  source: string;
  date: string;
}

export interface UserProfile {
  preferredName?: string;
  interests: string;
  goals: string;
  challenges: string;
  personality: string;
  has_onboarded?: number;
  notifications_enabled?: number;
  notify_calendar?: number;
  notify_journal?: number;
  favorite_jokes?: string;
}

export interface EmotionalCheckin {
  id: number;
  date: string;
  feeling: string;
  notes: string;
}

export interface EngagementStats {
  engagement: { feature: string; count: number }[];
  masteredSkills: number;
  totalSkills: number;
}

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

export const storage = {
  testConnection: async () => {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (error) {
      if(error instanceof Error && error.message.includes('the client is offline')) {
        console.error("Please check your Firebase configuration. ");
      }
    }
  },

  // Chat
  subscribeChatHistory: (callback: (messages: Message[]) => void) => {
    if (!auth.currentUser) return () => {};
    const path = `users/${auth.currentUser.uid}/chatHistory`;
    const q = query(collection(db, path), orderBy('timestamp', 'asc'));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => doc.data() as Message));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },
  saveChatMessage: async (role: 'user' | 'model', content: string) => {
    if (!auth.currentUser) return;
    const path = `users/${auth.currentUser.uid}/chatHistory`;
    const id = Date.now().toString();
    const newMessage: Message = { role, content, id, timestamp: Date.now() };
    try {
      await setDoc(doc(db, path, id), newMessage);
      return newMessage;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },
  updateMessageRating: async (id: string, rating: number) => {
    if (!auth.currentUser) return;
    const path = `users/${auth.currentUser.uid}/chatHistory`;
    try {
      await updateDoc(doc(db, path, id), { rating });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },
  deleteChatMessage: async (id: string) => {
    if (!auth.currentUser) return;
    const path = `users/${auth.currentUser.uid}/chatHistory`;
    try {
      await deleteDoc(doc(db, path, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Skills
  subscribeSkills: (callback: (skills: Skill[]) => void) => {
    if (!auth.currentUser) return () => {};
    const path = `users/${auth.currentUser.uid}/skills`;
    return onSnapshot(collection(db, path), async (snapshot) => {
      if (snapshot.empty) {
        // Initialize skills if empty
        for (const skill of INITIAL_SKILLS) {
          await setDoc(doc(db, path, skill.id.toString()), skill);
        }
      } else {
        callback(snapshot.docs.map(doc => doc.data() as Skill).sort((a, b) => a.id - b.id));
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },
  completeSkill: async (id: number) => {
    if (!auth.currentUser) return;
    const path = `users/${auth.currentUser.uid}/skills`;
    try {
      await updateDoc(doc(db, path, id.toString()), { completed: 1 });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  // Journal
  subscribeJournal: (callback: (entries: JournalEntry[]) => void) => {
    if (!auth.currentUser) return () => {};
    const path = `users/${auth.currentUser.uid}/journal`;
    const q = query(collection(db, path), orderBy('id', 'desc'));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => doc.data() as JournalEntry));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },
  addJournalEntry: async (entry: Omit<JournalEntry, 'id'>) => {
    if (!auth.currentUser) return;
    const path = `users/${auth.currentUser.uid}/journal`;
    const id = Date.now();
    const newEntry = { ...entry, id };
    try {
      await setDoc(doc(db, path, id.toString()), newEntry);
      return newEntry;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  // Goals
  subscribeGoals: (callback: (goals: Goal[]) => void) => {
    if (!auth.currentUser) return () => {};
    const path = `users/${auth.currentUser.uid}/goals`;
    return onSnapshot(collection(db, path), (snapshot) => {
      callback(snapshot.docs.map(doc => doc.data() as Goal));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },
  addGoal: async (title: string, description: string, stepContents: string[]) => {
    if (!auth.currentUser) return;
    const path = `users/${auth.currentUser.uid}/goals`;
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
    try {
      await setDoc(doc(db, path, goalId.toString()), newGoal);
      return newGoal;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },
  toggleGoalStep: async (goalId: number, stepId: number, completed: boolean) => {
    if (!auth.currentUser) return;
    const path = `users/${auth.currentUser.uid}/goals`;
    try {
      const goalRef = doc(db, path, goalId.toString());
      const goalSnap = await getDoc(goalRef);
      if (goalSnap.exists()) {
        const goal = goalSnap.data() as Goal;
        const updatedSteps = goal.steps.map(s => s.id === stepId ? { ...s, completed: completed ? 1 : 0 } : s);
        await updateDoc(goalRef, { steps: updatedSteps });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },
  updateGoal: async (goal: Goal) => {
    if (!auth.currentUser) return;
    const path = `users/${auth.currentUser.uid}/goals`;
    try {
      await setDoc(doc(db, path, goal.id.toString()), goal);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },
  deleteGoal: async (id: number) => {
    if (!auth.currentUser) return;
    const path = `users/${auth.currentUser.uid}/goals`;
    try {
      await deleteDoc(doc(db, path, id.toString()));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Emergency Contacts
  subscribeEmergencyContacts: (callback: (contacts: EmergencyContact[]) => void) => {
    if (!auth.currentUser) return () => {};
    const path = `users/${auth.currentUser.uid}/emergencyContacts`;
    return onSnapshot(collection(db, path), (snapshot) => {
      callback(snapshot.docs.map(doc => doc.data() as EmergencyContact));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },
  addEmergencyContact: async (contact: Omit<EmergencyContact, 'id'>) => {
    if (!auth.currentUser) return;
    const path = `users/${auth.currentUser.uid}/emergencyContacts`;
    const id = Date.now();
    const newContact = { ...contact, id };
    try {
      await setDoc(doc(db, path, id.toString()), newContact);
      return newContact;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },
  deleteEmergencyContact: async (id: number) => {
    if (!auth.currentUser) return;
    const path = `users/${auth.currentUser.uid}/emergencyContacts`;
    try {
      await deleteDoc(doc(db, path, id.toString()));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Calendar
  subscribeCalendarEvents: (callback: (events: CalendarEvent[]) => void) => {
    if (!auth.currentUser) return () => {};
    const path = `users/${auth.currentUser.uid}/calendarEvents`;
    return onSnapshot(collection(db, path), (snapshot) => {
      callback(snapshot.docs.map(doc => doc.data() as CalendarEvent));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },
  addCalendarEvent: async (event: Omit<CalendarEvent, 'id'>) => {
    if (!auth.currentUser) return;
    const path = `users/${auth.currentUser.uid}/calendarEvents`;
    const id = Date.now();
    const newEvent = { ...event, id };
    try {
      await setDoc(doc(db, path, id.toString()), newEvent);
      return newEvent;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },
  deleteCalendarEvent: async (id: number) => {
    if (!auth.currentUser) return;
    const path = `users/${auth.currentUser.uid}/calendarEvents`;
    try {
      await deleteDoc(doc(db, path, id.toString()));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Memories
  subscribeMemories: (callback: (memories: Memory[]) => void) => {
    if (!auth.currentUser) return () => {};
    const path = `users/${auth.currentUser.uid}/memories`;
    const q = query(collection(db, path), orderBy('id', 'desc'));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => doc.data() as Memory));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },
  addMemory: async (content: string, source: string) => {
    if (!auth.currentUser) return;
    const path = `users/${auth.currentUser.uid}/memories`;
    const id = Date.now();
    const newMemory = { id, content, source, date: new Date().toISOString() };
    try {
      await setDoc(doc(db, path, id.toString()), newMemory);
      return newMemory;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },
  deleteMemory: async (id: number) => {
    if (!auth.currentUser) return;
    const path = `users/${auth.currentUser.uid}/memories`;
    try {
      await deleteDoc(doc(db, path, id.toString()));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Profile
  subscribeProfile: (callback: (profile: UserProfile) => void) => {
    if (!auth.currentUser) return () => {};
    const path = `users/${auth.currentUser.uid}`;
    return onSnapshot(doc(db, path), (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as UserProfile);
      } else {
        // Default profile
        callback({ 
          preferredName: '',
          interests: '', 
          goals: '', 
          challenges: '', 
          personality: 'wise elder', 
          has_onboarded: 0,
          notifications_enabled: 0,
          notify_calendar: 1,
          notify_journal: 1,
          favorite_jokes: ''
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },
  updateProfile: async (profile: UserProfile) => {
    if (!auth.currentUser) return;
    const path = `users/${auth.currentUser.uid}`;
    try {
      await setDoc(doc(db, path), profile, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  // Checkins
  subscribeCheckins: (callback: (checkins: EmotionalCheckin[]) => void) => {
    if (!auth.currentUser) return () => {};
    const path = `users/${auth.currentUser.uid}/checkins`;
    const q = query(collection(db, path), orderBy('id', 'desc'));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => doc.data() as EmotionalCheckin));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
  },
  addCheckin: async (checkin: { feeling: string; notes: string }) => {
    if (!auth.currentUser) return;
    const path = `users/${auth.currentUser.uid}/checkins`;
    const id = Date.now();
    const newCheckin = { id, ...checkin, date: new Date().toISOString() };
    try {
      await setDoc(doc(db, path, id.toString()), newCheckin);
      return newCheckin;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  // Stats (Derived from other collections)
  getStats: (skills: Skill[]) => {
    return {
      engagement: [], // Could be implemented with a separate collection if needed
      masteredSkills: skills.filter(s => s.completed).length,
      totalSkills: skills.length
    };
  },

  getSkillOfTheWeek: (skills: Skill[]) => {
    if (skills.length === 0) return null;
    const weekNumber = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
    return skills[weekNumber % skills.length];
  },

  getDailyJoke: async () => {
    if (!auth.currentUser) return null;
    const path = `users/${auth.currentUser.uid}`;
    const snap = await getDoc(doc(db, path));
    if (snap.exists()) {
      const data = snap.data();
      if (data.daily_joke_date === new Date().toISOString().split('T')[0]) {
        return data.daily_joke;
      }
    }
    return null;
  },

  saveDailyJoke: async (joke: string) => {
    if (!auth.currentUser) return;
    const path = `users/${auth.currentUser.uid}`;
    try {
      await setDoc(doc(db, path), {
        daily_joke: joke,
        daily_joke_date: new Date().toISOString().split('T')[0]
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  logEngagement: async (feature: string) => {
    if (!auth.currentUser) return;
    const path = `users/${auth.currentUser.uid}/engagement`;
    const id = feature;
    const docRef = doc(db, path, id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      await updateDoc(docRef, { count: (snap.data().count || 0) + 1 });
    } else {
      await setDoc(docRef, { feature, count: 1 });
    }
  },

  // Reset
  resetAllData: async () => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const collections = [
      'chatHistory', 'skills', 'journal', 'goals', 
      'emergencyContacts', 'calendarEvents', 'memories', 'checkins'
    ];
    
    for (const col of collections) {
      const path = `users/${uid}/${col}`;
      const snap = await getDocs(collection(db, path));
      for (const d of snap.docs) {
        await deleteDoc(doc(db, path, d.id));
      }
    }
    await deleteDoc(doc(db, 'users', uid));
  }
};
