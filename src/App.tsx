/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, 
  Wrench, 
  BookOpen, 
  Send, 
  User, 
  Paperclip,
  CheckCircle2, 
  Smile,
  Info,
  ChevronRight,
  Target,
  Sparkles,
  Trash2,
  Circle,
  CheckCircle,
  MessageCircle,
  Languages,
  Mic,
  History,
  ThumbsUp,
  ThumbsDown,
  Star,
  X,
  Shield,
  Phone,
  Mail,
  Plus,
  AlertTriangle,
  Calendar as CalendarIcon,
  Wind,
  Timer,
  Play,
  Pause,
  RotateCcw,
  GripVertical,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { 
  getDadResponse, 
  analyzeImageWithDad, 
  getAffirmation, 
  breakdownGoal, 
  getChatSummary,
  getProactiveAdvice,
  getDailyJoke
} from './services/gemini';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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

interface CalendarEvent {
  id: number;
  title: string;
  date: string;
  type: string;
}

type Emotion = 'HAPPY' | 'SAD' | 'PROUD' | 'CONCERNED' | 'NEUTRAL';

const DadAvatar = ({ isThinking, emotion = 'NEUTRAL' }: { isThinking?: boolean, emotion?: Emotion }) => {
  const getEmotionStyles = () => {
    switch (emotion) {
      case 'HAPPY': return { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] };
      case 'SAD': return { rotate: [-5, 5, -5], y: [0, 2, 0] };
      case 'PROUD': return { scale: [1, 1.15, 1], y: [0, -5, 0] };
      case 'CONCERNED': return { x: [-1, 1, -1] };
      default: return {};
    }
  };

  return (
    <div className="relative w-12 h-12 md:w-16 md:h-16">
      <motion.div
        animate={isThinking ? {
          scale: [1, 1.05, 1],
          rotate: [-1, 1, -1],
        } : getEmotionStyles()}
        transition={{ duration: isThinking ? 2 : 3, repeat: Infinity }}
        className={cn(
          "w-full h-full rounded-full flex items-center justify-center text-white shadow-lg relative overflow-hidden transition-colors duration-500",
          emotion === 'SAD' ? "bg-gradient-to-br from-blue-600 to-indigo-700" : 
          emotion === 'PROUD' ? "bg-gradient-to-br from-emerald-500 to-teal-600" :
          emotion === 'CONCERNED' ? "bg-gradient-to-br from-amber-600 to-orange-700" :
          "bg-gradient-to-br from-[#5A5A40] to-[#7a7a5a]"
        )}
      >
        <Smile size={32} className={cn("md:w-10 md:h-10 transition-transform", emotion === 'SAD' && "rotate-180")} />
        
        {/* Blinking eyes effect */}
        <motion.div 
          className="absolute top-[35%] left-[30%] w-1.5 h-1.5 bg-white rounded-full"
          animate={{ scaleY: emotion === 'SAD' ? [1, 0.5, 1] : [1, 0.1, 1] }}
          transition={{ duration: 0.2, repeat: Infinity, repeatDelay: emotion === 'SAD' ? 1 : 4 }}
        />
        <motion.div 
          className="absolute top-[35%] right-[30%] w-1.5 h-1.5 bg-white rounded-full"
          animate={{ scaleY: emotion === 'SAD' ? [1, 0.5, 1] : [1, 0.1, 1] }}
          transition={{ duration: 0.2, repeat: Infinity, repeatDelay: emotion === 'SAD' ? 1 : 4 }}
        />

        {emotion === 'PROUD' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-white/20"
          />
        )}
      </motion.div>
      
      {(isThinking || emotion === 'PROUD') && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute -top-1 -right-1 bg-white rounded-full p-1 shadow-md"
        >
          <Sparkles size={12} className={cn(emotion === 'PROUD' ? "text-emerald-500" : "text-orange-500", "animate-pulse")} />
        </motion.div>
      )}
    </div>
  );
};

interface EmergencyContact {
  id: number;
  name: string;
  phone: string;
  relationship: string;
}

interface Skill {
  id: number;
  name: string;
  description: string;
  completed: number;
}

interface JournalEntry {
  id: number;
  title: string;
  content: string;
  date: string;
  category: string;
}

interface Goal {
  id: number;
  title: string;
  description: string;
  status: string;
  created_at: string;
  steps: GoalStep[];
}

const TRANSLATIONS = {
  en: {
    appName: "Hey Dad",
    tagline: "Always here for you",
    chat: "Chat",
    toolbox: "Life Skills",
    goals: "Goals",
    calendar: "Calendar",
    memoryBox: "Memory Box",
    journal: "Journal",
    askDad: "Ask Dad anything...",
    needBoost: "Need a boost?",
    toolboxTitle: "Practical Life Skills",
    toolboxDesc: "Essential modules from Dad. Step-by-step guides for car maintenance, cooking, and more.",
    skillOfTheWeek: "Skill of the Week",
    skillOfTheWeekDesc: "Dad's special pick for you this week. Master this and you'll be one step closer to being a pro!",
    mastered: "Mastered",
    markLearned: "Mark as learned",
    learnThis: "Learn this",
    goalsTitle: "Life Goals",
    goalsDesc: "Tell Dad what you want to achieve, and he'll help you get there. Drag to prioritize steps.",
    goalPlaceholder: "e.g., Start a small business...",
    setGoal: "Set Goal",
    started: "Started",
    calendarTitle: "Dad's Calendar",
    calendarDesc: "Keep track of important dates. Dad never forgets a birthday!",
    addEvent: "Add Event",
    eventTitle: "Event Title",
    eventDate: "Date",
    eventType: "Event Type",
    eventPersonal: "Personal",
    eventAdvice: "Dad's Advice",
    eventSkill: "Skill Learning",
    noEvents: "No events scheduled. Add one to stay organized!",
    memoryBoxTitle: "Memory Box",
    memoryBoxDesc: "Cherished memories and wise advice from Dad. Keep them close to your heart.",
    saveToMemoryBox: "Save to Memory Box",
    memorySaved: "Memory saved to your box!",
    noMemories: "Your memory box is empty. Save some advice or memories to see them here.",
    journalTitle: "Growth Journal",
    journalDesc: "A record of your journey and achievements.",
    journalEntryTitle: "Entry Title",
    journalEntryContent: "What happened today?",
    journalEntryCategory: "Category",
    addEntry: "Add Entry",
    journalPersonal: "Personal",
    journalAchievement: "Achievement",
    journalLearning: "Learning",
    noJournal: "No entries yet. Start chatting with Dad or mastering skills to fill your journal!",
    footerNote: "Remember: Dad is here to help, but always consult professionals for serious matters.",
    footerBuild: "Built with love by Akhmad Khudri",
    initialGreeting: "Hey kiddo! I'm so glad you're here. What's on your mind today? Whether you need to fix something, learn a new skill, or just want to talk, I'm all ears.",
    errorMsg: "I'm having a bit of trouble connecting right now. Maybe we can try again in a minute?",
    lostThought: "Sorry kiddo, I lost my train of thought. What were we saying?",
    attachFile: "Attach file",
    breakingDown: "Breaking down...",
    masteredJournalTitle: "Mastered: {skill}",
    masteredJournalContent: "Today I learned how to {skill}. Dad would be proud!",
    goalBrokenDesc: "Broken down by Dad",
    affirmationDefault: "You're doing great, kiddo.",
    summary: "Summary",
    getSummary: "Get Summary",
    summarizing: "Summarizing...",
    feedbackSent: "Feedback sent! Thanks, kiddo.",
    rateResponse: "Rate this response",
    voiceInput: "Voice Input",
    listening: "Listening...",
    close: "Close",
    safety: "Safety",
    safetyTitle: "Safety Net",
    safetyDesc: "Set up emergency contacts for quick access when you need immediate support.",
    addContact: "Add Contact",
    contactName: "Name",
    contactPhone: "Phone Number",
    contactRel: "Relationship (e.g., Friend, Aunt)",
    noContacts: "No emergency contacts set up yet. Add someone you trust.",
    callNow: "Call Now",
    emergencyWarning: "If you are in immediate danger, please call emergency services (911) right away.",
    dailyJoke: "Dad's Daily Joke",
    getJoke: "Tell me a joke, Dad!",
    newJoke: "New Joke",
    proactiveGreeting: "Good {time}, kiddo!",
    morning: "morning",
    afternoon: "afternoon",
    evening: "evening",
    night: "night",
    resetData: "Reset All Data",
    resetConfirm: "Are you sure? This will clear all your progress, chat history, and goals. Dad will miss our memories, but sometimes a fresh start is good.",
    resetSuccess: "Fresh start! Everything's cleared.",
    quotaReached: "Quota Reached",
    quotaLimitMsg: "Hey kiddo, I think we've talked enough for today. Let's save some energy for tomorrow, okay? Get some rest!"
  },
  id: {
    appName: "Halo Ayah",
    tagline: "Selalu ada untukmu",
    chat: "Obrolan",
    toolbox: "Keterampilan Hidup",
    goals: "Target",
    calendar: "Kalender",
    memoryBox: "Kotak Kenangan",
    journal: "Jurnal",
    askDad: "Tanya Ayah apa saja...",
    needBoost: "Butuh semangat?",
    toolboxTitle: "Keterampilan Hidup Praktis",
    toolboxDesc: "Modul penting dari Ayah. Panduan langkah demi langkah untuk perawatan mobil, memasak, dan lainnya.",
    skillOfTheWeek: "Keahlian Minggu Ini",
    skillOfTheWeekDesc: "Pilihan khusus Ayah untukmu minggu ini. Kuasai ini dan kamu akan selangkah lebih dekat menjadi ahli!",
    mastered: "Dikuasai",
    markLearned: "Tandai sudah dipelajari",
    learnThis: "Pelajari ini",
    goalsTitle: "Target Hidup",
    goalsDesc: "Beri tahu Ayah apa yang ingin kamu capai, dan Ayah akan membantumu sampai di sana. Seret untuk mengatur prioritas.",
    goalPlaceholder: "misal, Memulai bisnis kecil...",
    setGoal: "Atur Target",
    started: "Dimulai",
    calendarTitle: "Kalender Ayah",
    calendarDesc: "Catat tanggal-tanggal penting. Ayah tidak pernah lupa ulang tahun!",
    addEvent: "Tambah Acara",
    eventTitle: "Judul Acara",
    eventDate: "Tanggal",
    eventType: "Jenis Acara",
    eventPersonal: "Pribadi",
    eventAdvice: "Nasihat Ayah",
    eventSkill: "Belajar Keahlian",
    noEvents: "Belum ada acara. Tambahkan satu agar tetap teratur!",
    memoryBoxTitle: "Kotak Kenangan",
    memoryBoxDesc: "Kenangan berharga dan nasihat bijak dari Ayah. Simpanlah dekat di hatimu.",
    saveToMemoryBox: "Simpan ke Kotak Kenangan",
    memorySaved: "Kenangan disimpan ke kotakmu!",
    noMemories: "Kotak kenanganmu kosong. Simpan beberapa nasihat atau kenangan untuk melihatnya di sini.",
    journalTitle: "Jurnal Pertumbuhan",
    journalDesc: "Catatan perjalanan dan pencapaianmu.",
    journalEntryTitle: "Judul Entri",
    journalEntryContent: "Apa yang terjadi hari ini?",
    journalEntryCategory: "Kategori",
    addEntry: "Tambah Entri",
    journalPersonal: "Pribadi",
    journalAchievement: "Pencapaian",
    journalLearning: "Pembelajaran",
    noJournal: "Belum ada entri. Mulailah mengobrol dengan Ayah atau kuasai keterampilan untuk mengisi jurnalmu!",
    footerNote: "Ingat: Ayah di sini untuk membantu, tetapi selalu konsultasikan dengan profesional untuk masalah serius.",
    footerBuild: "Dibuat dengan cinta untuk Next-Level Product Sprint 2026",
    initialGreeting: "Halo nak! Ayah senang kamu di sini. Apa yang sedang kamu pikirkan hari ini? Apakah kamu perlu memperbaiki sesuatu, mempelajari keterampilan baru, atau hanya ingin mengobrol, Ayah siap mendengarkan.",
    errorMsg: "Ayah sedang kesulitan terhubung sekarang. Mungkin kita bisa coba lagi sebentar lagi?",
    lostThought: "Maaf nak, Ayah lupa tadi kita bicara apa. Apa yang sedang kita bicarakan?",
    attachFile: "Lampirkan file",
    breakingDown: "Memecah target...",
    masteredJournalTitle: "Menguasai: {skill}",
    masteredJournalContent: "Hari ini aku belajar cara {skill}. Ayah pasti bangga!",
    goalBrokenDesc: "Dipecah oleh Ayah",
    affirmationDefault: "Kamu melakukan yang terbaik, nak.",
    summary: "Ringkasan",
    getSummary: "Dapatkan Ringkasan",
    summarizing: "Meringkas...",
    feedbackSent: "Umpan balik terkirim! Terima kasih, nak.",
    rateResponse: "Nilai tanggapan ini",
    voiceInput: "Input Suara",
    listening: "Mendengarkan...",
    close: "Tutup",
    safety: "Keamanan",
    safetyTitle: "Jaring Pengaman",
    safetyDesc: "Atur kontak darurat untuk akses cepat saat kamu membutuhkan dukungan segera.",
    addContact: "Tambah Kontak",
    contactName: "Nama",
    contactPhone: "Nomor Telepon",
    contactRel: "Hubungan (misal, Teman, Bibi)",
    noContacts: "Belum ada kontak darurat. Tambahkan seseorang yang kamu percayai.",
    callNow: "Hubungi Sekarang",
    emergencyWarning: "Jika kamu dalam bahaya segera, harap hubungi layanan darurat (112) sekarang juga.",
    dailyJoke: "Candaan Harian Ayah",
    getJoke: "Kasih candaan dong, Yah!",
    newJoke: "Candaan Baru",
    proactiveGreeting: "Selamat {time}, nak!",
    morning: "pagi",
    afternoon: "siang",
    evening: "sore",
    night: "malam",
    resetData: "Hapus Semua Data",
    resetConfirm: "Apakah kamu yakin? Ini akan menghapus semua kemajuan, riwayat obrolan, dan targetmu. Ayah akan merindukan kenangan kita, tapi terkadang awal yang baru itu bagus.",
    resetSuccess: "Awal yang baru! Semuanya telah dihapus.",
    quotaReached: "Kuota Terpenuhi",
    quotaLimitMsg: "Hei nak, Ayah rasa kita sudah cukup banyak bicara hari ini. Mari simpan energi untuk besok, ya? Istirahatlah!"
  }
};

// Sound effects URLs (using public, subtle sounds)
const SOUNDS = {
  send: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3', // Subtle pop
  receive: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3', // Soft chime
  success: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3', // Achievement chime
};

interface Memory {
  id: number;
  content: string;
  source: string;
  date: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'toolbox' | 'goals' | 'journal' | 'calendar' | 'memoryBox' | 'safety'>('chat');
  const [language, setLanguage] = useState<'en' | 'id'>('en');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [newJournalEntry, setNewJournalEntry] = useState({ title: '', content: '', category: 'Personal', date: new Date().toISOString().split('T')[0] });
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [isBreakingDownGoal, setIsBreakingDownGoal] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryContent, setSummaryContent] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [newContact, setNewContact] = useState({ name: '', phone: '', relationship: '' });
  const [currentEmotion, setCurrentEmotion] = useState<Emotion>('NEUTRAL');
  const [dailyJoke, setDailyJoke] = useState<string | null>(null);
  const [isFetchingJoke, setIsFetchingJoke] = useState(false);
  
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', type: 'event' });
  
  const [memories, setMemories] = useState<Memory[]>([]);
  const [skillOfTheWeek, setSkillOfTheWeek] = useState<Skill | null>(null);
  const [isSavingMemory, setIsSavingMemory] = useState(false);
  
  const t = TRANSLATIONS[language];
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    fetchSkills();
    fetchJournal();
    fetchGoals();
    fetchChatHistory();
    fetchEmergencyContacts();
    fetchDailyJoke();
    fetchCalendarEvents();
    fetchMemories();
    fetchSkillOfTheWeek();
    handleProactiveGreeting();
  }, []);

  const fetchMemories = async () => {
    try {
      const res = await fetch('/api/memories');
      const data = await res.json();
      setMemories(data);
    } catch (e) {
      console.error("Failed to fetch memories", e);
    }
  };

  const fetchSkillOfTheWeek = async () => {
    try {
      const res = await fetch('/api/skill-of-the-week');
      const data = await res.json();
      setSkillOfTheWeek(data.skill);
    } catch (e) {
      console.error("Failed to fetch skill of the week", e);
    }
  };

  const checkAndIncrementQuota = async () => {
    try {
      const res = await fetch('/api/quota');
      const data = await res.json();
      if (data.count >= data.limit) {
        return false;
      }
      await fetch('/api/quota/increment', { method: 'POST' });
      return true;
    } catch (e) {
      console.error("Quota check failed", e);
      return true;
    }
  };

  const saveMemory = async (content: string, source: string = 'advice') => {
    setIsSavingMemory(true);
    try {
      await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, source })
      });
      fetchMemories();
      playSound('success');
    } catch (e) {
      console.error("Failed to save memory", e);
    } finally {
      setIsSavingMemory(false);
    }
  };

  const deleteMemory = async (id: number) => {
    try {
      await fetch(`/api/memories/${id}`, { method: 'DELETE' });
      setMemories(memories.filter(m => m.id !== id));
    } catch (e) {
      console.error("Failed to delete memory", e);
    }
  };

  const fetchCalendarEvents = async () => {
    try {
      const res = await fetch('/api/calendar');
      const data = await res.json();
      setCalendarEvents(data);
    } catch (e) {
      console.error("Failed to fetch calendar events", e);
    }
  };

  const addCalendarEvent = async () => {
    if (!newEvent.title || !newEvent.date) return;
    try {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEvent)
      });
      const data = await res.json();
      setCalendarEvents([...calendarEvents, { ...newEvent, id: data.id }]);
      setNewEvent({ title: '', date: '', type: 'event' });
    } catch (e) {
      console.error("Failed to add calendar event", e);
    }
  };

  const deleteCalendarEvent = async (id: number) => {
    try {
      await fetch(`/api/calendar/${id}`, { method: 'DELETE' });
      setCalendarEvents(calendarEvents.filter(e => e.id !== id));
    } catch (e) {
      console.error("Failed to delete calendar event", e);
    }
  };

  const resetAllData = async () => {
    if (!window.confirm(t.resetConfirm)) return;
    try {
      await fetch('/api/reset', { method: 'POST' });
      alert(t.resetSuccess);
      window.location.reload();
    } catch (e) {
      console.error("Failed to reset data", e);
    }
  };

  const reorderSteps = async (goalId: number, newSteps: GoalStep[]) => {
    const updatedSteps = newSteps.map((s, i) => ({ ...s, order_index: i }));
    // Update local state
    setGoals(goals.map(g => g.id === goalId ? { ...g, steps: updatedSteps } : g));
    
    // Update backend
    try {
      await fetch('/api/goals/steps/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps: updatedSteps.map(s => ({ id: s.id, order_index: s.order_index })) })
      });
    } catch (e) {
      console.error("Failed to reorder steps", e);
    }
  };

  const reorderGoals = async (newGoals: Goal[]) => {
    const updatedGoals = newGoals.map((g, i) => ({ ...g, order_index: i }));
    setGoals(updatedGoals);
    
    try {
      await fetch('/api/goals/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goals: updatedGoals.map(g => ({ id: g.id, order_index: g.order_index })) })
      });
    } catch (e) {
      console.error("Failed to reorder goals", e);
    }
  };

  const fetchDailyJoke = async () => {
    try {
      const res = await fetch('/api/daily-joke');
      const data = await res.json();
      if (data.joke) {
        setDailyJoke(data.joke);
      } else {
        // Fetch from Gemini if not in DB
        const allowed = await checkAndIncrementQuota();
        if (!allowed) return;
        
        const joke = await getDailyJoke(language);
        if (joke) {
          setDailyJoke(joke);
          // Save to DB
          await fetch('/api/daily-joke', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ joke })
          });
        }
      }
    } catch (e) {
      console.error("Failed to fetch daily joke", e);
    }
  };

  const handleProactiveGreeting = async () => {
    // Check if we already have messages today
    const res = await fetch('/api/chat');
    const history = await res.json();
    if (history.length > 0) return;

    const now = new Date();
    const hour = now.getHours();
    let timeOfDay = t.morning;
    if (hour >= 12 && hour < 17) timeOfDay = t.afternoon;
    else if (hour >= 17 && hour < 21) timeOfDay = t.evening;
    else if (hour >= 21 || hour < 5) timeOfDay = t.night;

    // Gather recent activity for better context
    let recentActivity = "";
    if (goals.length > 0) {
      const latestGoal = goals[0];
      const completedSteps = latestGoal.steps?.filter(s => s.completed === 1).length || 0;
      recentActivity += `Working on goal: "${latestGoal.title}" (${completedSteps}/${latestGoal.steps?.length} steps done). `;
    }
    if (journal.length > 0) {
      recentActivity += `Last journal entry: "${journal[0].title}". `;
    }
    if (calendarEvents.length > 0) {
      const upcoming = calendarEvents.find(e => new Date(e.date) >= now);
      if (upcoming) {
        recentActivity += `Upcoming event: "${upcoming.title}" on ${upcoming.date}. `;
      }
    }

    const allowed = await checkAndIncrementQuota();
    if (!allowed) return;

    try {
      const advice = await getProactiveAdvice(timeOfDay, recentActivity, language);
      if (advice) {
        const greeting = t.proactiveGreeting.replace('{time}', timeOfDay);
        const fullGreeting = `${greeting}\n\n${advice}`;
        const id = 'proactive';
        setMessages([{ role: 'model', content: '', id }]);
        await typeMessage(fullGreeting, id);
        saveChatMessage('model', fullGreeting);
      }
    } catch (e) {
      console.error("Failed to get proactive advice", e);
    }
  };

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const commonEmojis = ['😊', '👍', '❤️', '🙌', '💪', '🏠', '👨‍🔧', '💡', '✨', '🙏'];

  const addEmoji = (emoji: string) => {
    setInput(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const playSound = (type: keyof typeof SOUNDS) => {
    const audio = new Audio(SOUNDS[type]);
    audio.volume = 0.3;
    audio.play().catch(e => console.log("Audio play blocked", e));
  };

  const fetchChatHistory = async () => {
    try {
      const res = await fetch('/api/chat');
      if (res.ok) {
        const data = await res.json();
        if (data.length === 0) {
          setMessages([{ role: 'model', content: t.initialGreeting, id: 'initial' }]);
        } else {
          setMessages(data.map((m: any, i: number) => ({ ...m, id: `hist-${i}` })));
        }
      }
    } catch (e) {
      console.error("Failed to fetch chat history", e);
    }
  };

  const saveChatMessage = async (role: 'user' | 'model', content: string) => {
    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, content })
      });
    } catch (e) {
      console.error("Failed to save chat message", e);
    }
  };

  const fetchSkills = async () => {
    try {
      const res = await fetch('/api/skills');
      if (res.ok) {
        const data = await res.json();
        setSkills(data);
      }
    } catch (e) {
      console.error("Failed to fetch skills", e);
    }
  };

  const fetchJournal = async () => {
    try {
      const res = await fetch('/api/journal');
      if (res.ok) {
        const data = await res.json();
        setJournal(data);
      }
    } catch (e) {
      console.error("Failed to fetch journal", e);
    }
  };

  const addJournalEntry = async () => {
    if (!newJournalEntry.title || !newJournalEntry.content) return;
    try {
      const res = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newJournalEntry)
      });
      if (res.ok) {
        setNewJournalEntry({ title: '', content: '', category: 'Personal', date: new Date().toISOString().split('T')[0] });
        fetchJournal();
        playSound('success');
      }
    } catch (e) {
      console.error("Failed to add journal entry", e);
    }
  };

  const fetchGoals = async () => {
    try {
      const res = await fetch('/api/goals');
      if (res.ok) {
        const data = await res.json();
        setGoals(data);
      }
    } catch (e) {
      console.error("Failed to fetch goals", e);
    }
  };

  const fetchEmergencyContacts = async () => {
    try {
      const res = await fetch('/api/emergency-contacts');
      if (res.ok) {
        const data = await res.json();
        setEmergencyContacts(data);
      }
    } catch (e) {
      console.error("Failed to fetch emergency contacts", e);
    }
  };

  const addEmergencyContact = async () => {
    if (!newContact.name || !newContact.phone) return;
    try {
      const res = await fetch('/api/emergency-contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newContact)
      });
      if (res.ok) {
        setNewContact({ name: '', phone: '', relationship: '' });
        fetchEmergencyContacts();
        playSound('success');
      }
    } catch (e) {
      console.error("Failed to add contact", e);
    }
  };

  const deleteEmergencyContact = async (id: number) => {
    try {
      const res = await fetch(`/api/emergency-contacts/${id}`, { method: 'DELETE' });
      if (res.ok) fetchEmergencyContacts();
    } catch (e) {
      console.error("Failed to delete contact", e);
    }
  };

  const typeMessage = async (content: string, id: string) => {
    const parts = content.split(/(\s+)/);
    let currentContent = '';
    for (let i = 0; i < parts.length; i++) {
      currentContent += parts[i];
      setMessages(prev => prev.map(m => m.id === id ? { ...m, content: currentContent } : m));
      if (parts[i].trim().length > 0) {
        const delay = 15 + Math.random() * 25;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const allowed = await checkAndIncrementQuota();
    if (!allowed) {
      const dadMessage: Message = { role: 'model', content: t.quotaLimitMsg, id: Date.now().toString() };
      setMessages(prev => [...prev, { role: 'user', content: input, id: (Date.now() - 1).toString() }, dadMessage]);
      setInput('');
      return;
    }

    const userContent = input;
    const userMessage: Message = { role: 'user', content: userContent, id: Date.now().toString() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    playSound('send');
    saveChatMessage('user', userContent);

    try {
      const response = await getDadResponse(userContent, messages.slice(-20), language);
      let dadContent = response || t.lostThought;
      
      // Parse emotion
      const emotionMatch = dadContent.match(/\[EMOTION: (HAPPY|SAD|PROUD|CONCERNED|NEUTRAL)\]/);
      if (emotionMatch) {
        setCurrentEmotion(emotionMatch[1] as Emotion);
        dadContent = dadContent.replace(/\[EMOTION: (HAPPY|SAD|PROUD|CONCERNED|NEUTRAL)\]/, '').trim();
      } else {
        setCurrentEmotion('NEUTRAL');
      }

      const dadMessage: Message = { role: 'model', content: '', id: (Date.now() + 1).toString() };
      setMessages(prev => [...prev, dadMessage]);
      setIsLoading(false);
      await typeMessage(dadContent, dadMessage.id);
      playSound('receive');
      saveChatMessage('model', dadContent);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', content: t.errorMsg, id: 'error' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const insertFormatting = (prefix: string, suffix: string = prefix) => {
    const start = inputRef.current?.selectionStart || 0;
    const end = inputRef.current?.selectionEnd || 0;
    const selectedText = input.substring(start, end);
    const newText = input.substring(0, start) + prefix + selectedText + suffix + input.substring(end);
    setInput(newText);
    // Focus back and set selection
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  const handleAffirmation = async () => {
    const allowed = await checkAndIncrementQuota();
    if (!allowed) {
      setMessages(prev => [...prev, { role: 'model', content: t.quotaLimitMsg, id: Date.now().toString() }]);
      return;
    }
    setIsLoading(true);
    try {
      const response = await getAffirmation(language);
      const content = response || t.affirmationDefault;
      const id = Date.now().toString();
      setMessages(prev => [...prev, { role: 'model', content: '', id }]);
      setIsLoading(false);
      await typeMessage(content, id);
      playSound('receive');
      saveChatMessage('model', content);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceInputStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Voice recognition not supported in this browser.");
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = language === 'en' ? 'en-US' : 'id-ID';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; ++i) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const handleVoiceInputEnd = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setTimeout(() => {
        if (input.trim()) {
          handleSend();
        }
      }, 500);
    }
  };

  const handleGetSummary = async () => {
    if (messages.length < 2) return;
    const allowed = await checkAndIncrementQuota();
    if (!allowed) {
      alert(t.quotaLimitMsg);
      return;
    }
    setIsSummarizing(true);
    setShowSummary(true);
    try {
      const summary = await getChatSummary(messages, language);
      setSummaryContent(summary || "No summary available.");
    } catch (e) {
      console.error(e);
      setSummaryContent("Failed to generate summary.");
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleRating = (messageId: string, rating: number, content: string) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, rating } : m));
    
    // Open mailto for feedback
    const ratingText = rating === 1 ? "Helpful" : "Not Helpful";
    const subject = encodeURIComponent(`Feedback for Dad's Response - ${ratingText}`);
    const body = encodeURIComponent(`Message ID: ${messageId}\nDad's Response: ${content}\nFeedback: ${ratingText}\n\nSuggestions for improvement:`);
    window.location.href = `mailto:khudri@binadarma.ac.id?subject=${subject}&body=${body}`;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = await checkAndIncrementQuota();
    if (!allowed) {
      alert(t.quotaLimitMsg);
      return;
    }

    const isImage = file.type.startsWith('image/');
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const userContent = isImage ? "Dad, can you take a look at this?" : `Dad, I've attached a file: ${file.name}. Can you help me with it?`;
      const userMessage: Message = { role: 'user', content: userContent, id: Date.now().toString() };
      setMessages(prev => [...prev, userMessage]);
      setIsLoading(true);
      playSound('send');
      saveChatMessage('user', userContent);

      try {
        let dadContent = "";
        if (isImage) {
          const response = await analyzeImageWithDad(base64, "What do you see here, Dad? Give me some advice or explain what it is.", language);
          dadContent = response || "That's interesting! Tell me more about it.";
        } else {
          const response = await getDadResponse(`The user shared a file named "${file.name}". Please acknowledge it and ask how you can help.`, messages.slice(-5), language);
          dadContent = response || "I see you've shared a file. How can I help you with it?";
        }
        
        const dadMessage: Message = { role: 'model', content: '', id: (Date.now() + 1).toString() };
        setMessages(prev => [...prev, dadMessage]);
        setIsLoading(false);
        await typeMessage(dadContent, dadMessage.id);
        playSound('receive');
        saveChatMessage('model', dadContent);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (isImage) {
      reader.readAsDataURL(file);
    } else {
      // For non-images, we just acknowledge the file for now as we can't easily "read" all docs client-side without more libs
      reader.readAsText(file.slice(0, 1000)); // Just read a bit to trigger onloadend
    }
  };

  const completeSkill = async (id: number) => {
    await fetch(`/api/skills/${id}/complete`, { method: 'POST' });
    playSound('success');
    fetchSkills();
    const skill = skills.find(s => s.id === id);
    if (skill) {
      await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: t.masteredJournalTitle.replace('{skill}', skill.name),
          content: t.masteredJournalContent.replace('{skill}', skill.name.toLowerCase()),
          category: 'Skill'
        })
      });
      fetchJournal();
    }
  };

  const createGoal = async () => {
    if (!newGoalTitle.trim() || isBreakingDownGoal) return;
    const allowed = await checkAndIncrementQuota();
    if (!allowed) {
      alert(t.quotaLimitMsg);
      return;
    }
    setIsBreakingDownGoal(true);
    try {
      const breakdown = await breakdownGoal(newGoalTitle, language);
      const steps = breakdown.split('\n').filter(s => s.trim().length > 0).map(s => s.replace(/^\d+\.\s*/, '').trim());
      
      await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newGoalTitle, description: t.goalBrokenDesc, steps })
      });
      
      setNewGoalTitle('');
      fetchGoals();
      playSound('success');
    } catch (e) {
      console.error(e);
    } finally {
      setIsBreakingDownGoal(false);
    }
  };

  const toggleStep = async (stepId: number, completed: boolean) => {
    await fetch(`/api/goals/steps/${stepId}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed })
    });
    if (completed) playSound('success');
    fetchGoals();
  };

  const deleteGoal = async (id: number) => {
    await fetch(`/api/goals/${id}`, { method: 'DELETE' });
    fetchGoals();
  };

  return (
    <div className="min-h-screen bg-[#fdfcf0] text-[#3a3a2e] font-serif pb-20 md:pb-0">
      {/* Header - Hidden on Mobile, shown on Desktop */}
      <header className="hidden md:block bg-white border-b border-[#e5e5d5] py-6 px-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DadAvatar emotion={currentEmotion} isThinking={isLoading} />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#5A5A40]">{t.appName}</h1>
              <p className="text-xs uppercase tracking-widest text-[#8a8a7a] font-sans font-semibold">{t.tagline}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setLanguage(l => l === 'en' ? 'id' : 'en')}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#f5f5f0] rounded-full text-xs font-sans font-bold text-[#5A5A40] hover:bg-[#e5e5d5] transition-colors"
            >
              <Languages size={14} />
              {language === 'en' ? 'Bahasa Indonesia' : 'English'}
            </button>
            <nav className="flex gap-1 bg-[#f0f0e5] p-1 rounded-full font-sans text-xs font-medium">
              <button 
                onClick={() => setActiveTab('chat')}
                className={cn("px-4 py-2 rounded-full transition-all whitespace-nowrap", activeTab === 'chat' ? "bg-white text-[#5A5A40] shadow-sm" : "text-[#8a8a7a] hover:text-[#5A5A40]")}
              >
                {t.chat}
              </button>
              <button 
                onClick={() => setActiveTab('toolbox')}
                className={cn("px-4 py-2 rounded-full transition-all whitespace-nowrap", activeTab === 'toolbox' ? "bg-white text-[#5A5A40] shadow-sm" : "text-[#8a8a7a] hover:text-[#5A5A40]")}
              >
                {t.toolbox}
              </button>
              <button 
                onClick={() => setActiveTab('goals')}
                className={cn("px-4 py-2 rounded-full transition-all whitespace-nowrap", activeTab === 'goals' ? "bg-white text-[#5A5A40] shadow-sm" : "text-[#8a8a7a] hover:text-[#5A5A40]")}
              >
                {t.goals}
              </button>
              <button 
                onClick={() => setActiveTab('journal')}
                className={cn("px-4 py-2 rounded-full transition-all whitespace-nowrap", activeTab === 'journal' ? "bg-white text-[#5A5A40] shadow-sm" : "text-[#8a8a7a] hover:text-[#5A5A40]")}
              >
                {t.journal}
              </button>
              <button 
                onClick={() => setActiveTab('calendar')}
                className={cn("px-4 py-2 rounded-full transition-all whitespace-nowrap", activeTab === 'calendar' ? "bg-white text-[#5A5A40] shadow-sm" : "text-[#8a8a7a] hover:text-[#5A5A40]")}
              >
                {t.calendar}
              </button>
              <button 
                onClick={() => setActiveTab('memoryBox')}
                className={cn("px-4 py-2 rounded-full transition-all whitespace-nowrap", activeTab === 'memoryBox' ? "bg-white text-[#5A5A40] shadow-sm" : "text-[#8a8a7a] hover:text-[#5A5A40]")}
              >
                {t.memoryBox}
              </button>
              <button 
                onClick={() => setActiveTab('safety')}
                className={cn("px-4 py-2 rounded-full transition-all whitespace-nowrap", activeTab === 'safety' ? "bg-white text-[#5A5A40] shadow-sm" : "text-[#8a8a7a] hover:text-[#5A5A40]")}
              >
                {t.safety}
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-[#e5e5d5] sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto py-4 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DadAvatar emotion={currentEmotion} isThinking={isLoading} />
            <h1 className="text-lg font-bold tracking-tight text-[#5A5A40]">{t.appName}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleGetSummary}
              className="p-2 text-[#5A5A40] hover:bg-[#f5f5f0] rounded-full transition-all"
              title={t.summary}
            >
              <History size={20} />
            </button>
            <button 
              onClick={() => setLanguage(l => l === 'en' ? 'id' : 'en')}
              className="p-2 text-[#5A5A40] hover:bg-[#f5f5f0] rounded-full transition-all"
            >
              <Languages size={20} />
            </button>
            <button 
              onClick={handleAffirmation}
              disabled={isLoading}
              className="p-2 text-[#5A5A40] hover:bg-[#f5f5f0] rounded-full transition-all"
            >
              <Sparkles size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-8">
        <AnimatePresence mode="wait">
          {activeTab === 'chat' && (
            <motion.div 
              key="chat"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col h-[calc(100vh-160px)] md:h-[calc(100vh-200px)]"
            >
              <div className="flex-1 overflow-y-auto mb-4 space-y-6 pr-2 custom-scrollbar">
                {/* Daily Joke Card */}
                {dailyJoke && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-2xl border border-orange-100 shadow-sm mb-4 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                      <Smile size={48} />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles size={16} className="text-orange-500" />
                      <h3 className="text-xs font-sans font-bold uppercase tracking-widest text-orange-700">{t.dailyJoke}</h3>
                    </div>
                    <p className="text-sm md:text-base text-orange-900 italic leading-relaxed">"{dailyJoke}"</p>
                  </motion.div>
                )}

                {messages.map((msg) => (
                  <div key={msg.id} className={cn("flex gap-3 md:gap-4", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                    <div className={cn(
                      "w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                      msg.role === 'user' ? "bg-indigo-100 text-indigo-600" : "bg-[#5A5A40] text-white"
                    )}>
                      {msg.role === 'user' ? <User size={16} className="md:w-5 md:h-5" /> : <Smile size={16} className="md:w-5 md:h-5" />}
                    </div>
                    <div className={cn(
                      "max-w-[85%] md:max-w-[80%] p-3 md:p-4 rounded-2xl shadow-sm relative group/msg",
                      msg.role === 'user' ? "bg-white rounded-tr-none border border-indigo-50" : "bg-[#f0f0e8] rounded-tl-none border border-[#e5e5d5]"
                    )}>
                      <div className="prose prose-stone prose-sm max-w-none text-sm md:text-base">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                      
                      {msg.role === 'model' && (
                        <div className="mt-2 pt-2 border-t border-[#e5e5d5] flex items-center justify-between opacity-0 group-hover/msg:opacity-100 transition-opacity">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => saveMemory(msg.content)}
                              disabled={isSavingMemory}
                              className="text-[10px] uppercase tracking-wider font-bold text-gray-400 hover:text-[#5A5A40] flex items-center gap-1 transition-colors"
                            >
                              <Star size={12} className={isSavingMemory ? "animate-spin" : ""} />
                              {t.saveToMemoryBox}
                            </button>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleRating(msg.id, 1, msg.content)}
                              className={cn(
                                "p-1.5 rounded-lg transition-all",
                                msg.rating === 1 ? "bg-emerald-100 text-emerald-600" : "text-[#d5d5c5] hover:text-emerald-500 hover:bg-emerald-50"
                              )}
                              title="Helpful"
                            >
                              <ThumbsUp size={14} fill={msg.rating === 1 ? "currentColor" : "none"} />
                            </button>
                            <button 
                              onClick={() => handleRating(msg.id, -1, msg.content)}
                              className={cn(
                                "p-1.5 rounded-lg transition-all",
                                msg.rating === -1 ? "bg-red-100 text-red-600" : "text-[#d5d5c5] hover:text-red-500 hover:bg-red-50"
                              )}
                              title="Not Helpful"
                            >
                              <ThumbsDown size={14} fill={msg.rating === -1 ? "currentColor" : "none"} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3 md:gap-4">
                    <DadAvatar emotion={currentEmotion} isThinking />
                    <div className="bg-[#f0f0e8] p-3 md:p-4 rounded-2xl rounded-tl-none shadow-sm flex gap-1 items-center border border-[#e5e5d5]">
                      <div className="w-1 h-1 md:w-1.5 md:h-1.5 bg-[#5A5A40] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1 h-1 md:w-1.5 md:h-1.5 bg-[#5A5A40] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1 h-1 md:w-1.5 md:h-1.5 bg-[#5A5A40] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="flex flex-col gap-2">
                {/* Rich Text Toolbar */}
                <div className="flex gap-1 px-2 mb-1 items-center justify-between">
                  <div className="flex gap-1">
                    <button onClick={() => insertFormatting('**')} className="p-1.5 text-xs font-bold bg-white border border-[#e5e5d5] rounded hover:bg-[#f5f5f0] transition-colors shadow-sm">B</button>
                    <button onClick={() => insertFormatting('*')} className="p-1.5 text-xs italic bg-white border border-[#e5e5d5] rounded hover:bg-[#f5f5f0] transition-colors shadow-sm">I</button>
                    <button onClick={() => insertFormatting('- ')} className="p-1.5 text-xs bg-white border border-[#e5e5d5] rounded hover:bg-[#f5f5f0] transition-colors shadow-sm">List</button>
                  </div>
                  <button 
                    onClick={handleGetSummary}
                    className="hidden md:flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-white border border-[#e5e5d5] rounded-full hover:bg-[#f5f5f0] transition-colors shadow-sm text-[#5A5A40]"
                  >
                    <History size={14} />
                    {t.summary}
                  </button>
                </div>

                <form onSubmit={handleSend} className="relative">
                  <div className="flex gap-2 items-center bg-white p-1.5 md:p-2 rounded-2xl shadow-lg border border-[#e5e5d5]">
                    <div className="relative">
                      <button 
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="p-1.5 md:p-2 text-[#8a8a7a] hover:text-[#5A5A40] hover:bg-[#f5f5f0] rounded-xl transition-colors"
                      >
                        <Smile size={18} className="md:w-5 md:h-5" />
                      </button>
                      <AnimatePresence>
                        {showEmojiPicker && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute bottom-full mb-2 left-0 bg-white border border-[#e5e5d5] rounded-2xl shadow-xl p-2 flex flex-wrap gap-1 w-40 z-50"
                          >
                            {commonEmojis.map(emoji => (
                              <button 
                                key={emoji}
                                type="button"
                                onClick={() => addEmoji(emoji)}
                                className="w-8 h-8 flex items-center justify-center hover:bg-[#f5f5f0] rounded-lg transition-colors text-xl"
                              >
                                {emoji}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <input 
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={isListening ? t.listening : t.askDad}
                      className="flex-1 bg-transparent border-none focus:ring-0 py-2 md:py-3 px-1 md:px-2 font-sans text-base md:text-lg"
                    />
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-1.5 md:p-2 text-[#8a8a7a] hover:text-[#5A5A40] hover:bg-[#f5f5f0] rounded-xl transition-colors"
                      title={t.attachFile}
                    >
                      <Paperclip size={18} className="md:w-5 md:h-5" />
                    </button>
                    {input.trim() ? (
                      <button 
                        type="submit"
                        disabled={isLoading}
                        className="bg-gradient-to-r from-[#5A5A40] to-[#7a7a5a] text-white p-2 md:p-2.5 rounded-xl hover:shadow-md transition-all shadow-md active:scale-95"
                      >
                        <Send size={18} className="md:w-5 md:h-5" />
                      </button>
                    ) : (
                      <button 
                        type="button"
                        onMouseDown={handleVoiceInputStart}
                        onMouseUp={handleVoiceInputEnd}
                        onMouseLeave={handleVoiceInputEnd}
                        onTouchStart={handleVoiceInputStart}
                        onTouchEnd={handleVoiceInputEnd}
                        className={cn(
                          "p-2 md:p-2.5 rounded-xl transition-all shadow-md active:scale-95",
                          isListening 
                            ? "bg-red-500 text-white animate-pulse scale-110" 
                            : "bg-gradient-to-r from-[#5A5A40] to-[#7a7a5a] text-white"
                        )}
                        title={t.voiceInput}
                      >
                        <Mic size={18} className="md:w-5 md:h-5" />
                      </button>
                    )}
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    className="hidden" 
                  />
                </form>
              </div>
            </motion.div>
          )}

          {activeTab === 'toolbox' && (
            <motion.div 
              key="toolbox"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6"
            >
              <div className="col-span-full mb-2 md:mb-4">
                <h2 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2 text-[#5A5A40]">{t.toolboxTitle}</h2>
                <p className="text-sm md:text-base text-[#8a8a7a]">{t.toolboxDesc}</p>
              </div>

              {/* Skill of the Week */}
              {skillOfTheWeek && (
                <div className="col-span-full bg-gradient-to-br from-[#5A5A40] to-[#7a7a5a] p-6 md:p-8 rounded-3xl text-white shadow-xl mb-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Sparkles size={120} />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                      <Star size={20} className="text-amber-400 fill-amber-400" />
                      <span className="text-xs font-sans font-bold uppercase tracking-widest text-amber-200">{t.skillOfTheWeek}</span>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold mb-2">{skillOfTheWeek.name}</h3>
                    <p className="text-sm md:text-base text-gray-100 mb-6 max-w-xl">{t.skillOfTheWeekDesc}</p>
                    <button 
                      onClick={() => {
                        setActiveTab('chat');
                        setInput(language === 'en' ? `Dad, can you teach me how to ${skillOfTheWeek.name.toLowerCase()}?` : `Ayah, bisa ajari aku cara ${skillOfTheWeek.name.toLowerCase()}?`);
                      }}
                      className="bg-white text-[#5A5A40] px-6 py-3 rounded-xl font-sans font-bold hover:bg-gray-100 transition-all flex items-center gap-2 w-fit"
                    >
                      {t.learnThis} <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )}
              {skills.map((skill) => (
                <div key={skill.id} className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-[#e5e5d5] hover:shadow-md hover:border-orange-100 transition-all group">
                  <div className="flex justify-between items-start mb-3 md:mb-4">
                    <div className="p-2 md:p-3 bg-orange-50 rounded-xl md:rounded-2xl text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                      <Wrench size={20} className="md:w-6 md:h-6" />
                    </div>
                    {skill.completed ? (
                      <div className="flex items-center gap-1 text-emerald-600 font-sans text-[10px] md:text-xs font-bold uppercase tracking-wider">
                        <CheckCircle2 size={14} className="md:w-4 md:h-4" /> {t.mastered}
                      </div>
                    ) : (
                      <button 
                        onClick={() => completeSkill(skill.id)}
                        className="text-[10px] md:text-xs font-sans font-bold uppercase tracking-wider text-[#8a8a7a] hover:text-orange-600 transition-colors"
                      >
                        {t.markLearned}
                      </button>
                    )}
                  </div>
                  <h3 className="text-lg md:text-xl font-bold mb-1 md:mb-2">{skill.name}</h3>
                  <p className="text-xs md:text-sm text-[#8a8a7a] mb-3 md:mb-4">{skill.description}</p>
                  <button 
                    onClick={() => {
                      setActiveTab('chat');
                      setInput(language === 'en' ? `Dad, can you teach me how to ${skill.name.toLowerCase()}?` : `Ayah, bisa ajari aku cara ${skill.name.toLowerCase()}?`);
                    }}
                    className="flex items-center gap-2 text-orange-600 font-sans text-xs md:text-sm font-bold group-hover:translate-x-1 transition-transform"
                  >
                    {t.learnThis} <ChevronRight size={14} className="md:w-4 md:h-4" />
                  </button>
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === 'goals' && (
            <motion.div 
              key="goals"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6 md:space-y-8"
            >
              <div className="mb-4 md:mb-8">
                <h2 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2 text-[#5A5A40]">{t.goalsTitle}</h2>
                <p className="text-sm md:text-base text-[#8a8a7a]">{t.goalsDesc}</p>
              </div>

              <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-[#e5e5d5] mb-6 md:mb-8">
                <div className="flex flex-col md:flex-row gap-2">
                  <input 
                    type="text" 
                    value={newGoalTitle}
                    onChange={(e) => setNewGoalTitle(e.target.value)}
                    placeholder={t.goalPlaceholder}
                    className="flex-1 bg-[#f5f5f0] border-none focus:ring-0 rounded-xl px-4 py-3 font-sans text-sm md:text-base"
                  />
                  <button 
                    onClick={createGoal}
                    disabled={!newGoalTitle.trim() || isBreakingDownGoal}
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-3 rounded-xl font-sans font-bold flex items-center justify-center gap-2 disabled:opacity-50 text-sm md:text-base shadow-md hover:shadow-lg transition-all"
                  >
                    {isBreakingDownGoal ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Target size={18} className="md:w-5 md:h-5" />}
                    {isBreakingDownGoal ? t.breakingDown : t.setGoal}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:gap-6">
                <Reorder.Group axis="y" values={goals} onReorder={reorderGoals} className="space-y-4 md:space-y-6">
                  {goals.map((goal) => (
                    <Reorder.Item 
                      key={goal.id} 
                      value={goal}
                      className="bg-white p-5 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border border-[#e5e5d5] hover:border-indigo-100 transition-colors cursor-default"
                    >
                      <div className="flex justify-between items-start mb-4 md:mb-6">
                        <div className="flex items-start gap-3">
                          <div className="mt-1 text-[#d5d5c5] cursor-grab active:cursor-grabbing">
                            <GripVertical size={20} />
                          </div>
                          <div>
                            <h3 className="text-xl md:text-2xl font-bold mb-1 text-indigo-900">{goal.title}</h3>
                            <p className="text-[10px] md:text-xs font-sans text-[#8a8a7a] uppercase tracking-widest">{t.started} {new Date(goal.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <button onClick={() => deleteGoal(goal.id)} className="text-[#8a8a7a] hover:text-red-500 transition-colors p-1">
                          <Trash2 size={18} className="md:w-5 md:h-5" />
                        </button>
                      </div>
                      <div className="space-y-3 md:space-y-4">
                        <Reorder.Group axis="y" values={goal.steps} onReorder={(newSteps) => reorderSteps(goal.id, newSteps)}>
                          {goal.steps.map((step) => (
                            <Reorder.Item 
                              key={step.id} 
                              value={step}
                              className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl hover:bg-indigo-50 cursor-pointer transition-colors group"
                            >
                              <div className="text-[#d5d5c5] cursor-grab active:cursor-grabbing">
                                <GripVertical size={16} />
                              </div>
                              <div 
                                onClick={() => toggleStep(step.id, !step.completed)}
                                className={cn("shrink-0 transition-colors", step.completed ? "text-emerald-500" : "text-[#8a8a7a] group-hover:text-indigo-500")}
                              >
                                {step.completed ? <CheckCircle size={20} className="md:w-6 md:h-6" /> : <Circle size={20} className="md:w-6 md:h-6" />}
                              </div>
                              <span 
                                onClick={() => toggleStep(step.id, !step.completed)}
                                className={cn("font-sans text-base md:text-lg transition-all flex-1", step.completed && "line-through text-[#8a8a7a] opacity-50")}
                              >
                                {step.content}
                              </span>
                            </Reorder.Item>
                          ))}
                        </Reorder.Group>
                      </div>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              </div>
            </motion.div>
          )}

          {activeTab === 'calendar' && (
            <motion.div 
              key="calendar"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6 md:space-y-8"
            >
              <div className="mb-4 md:mb-8">
                <h2 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2 text-[#5A5A40]">{t.calendarTitle}</h2>
                <p className="text-sm md:text-base text-[#8a8a7a]">{t.calendarDesc}</p>
              </div>

              <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-[#e5e5d5]">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                  <input 
                    type="text" 
                    placeholder={t.eventTitle}
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                    className="bg-[#f5f5f0] border-none focus:ring-0 rounded-xl px-4 py-3 font-sans text-sm"
                  />
                  <input 
                    type="date" 
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                    className="bg-[#f5f5f0] border-none focus:ring-0 rounded-xl px-4 py-3 font-sans text-sm"
                  />
                  <select 
                    value={newEvent.type}
                    onChange={(e) => setNewEvent({...newEvent, type: e.target.value})}
                    className="bg-[#f5f5f0] border-none focus:ring-0 rounded-xl px-4 py-3 font-sans text-sm"
                  >
                    <option value="event">{t.eventPersonal}</option>
                    <option value="advice">{t.eventAdvice}</option>
                    <option value="skill">{t.eventSkill}</option>
                  </select>
                  <button 
                    onClick={addCalendarEvent}
                    disabled={!newEvent.title || !newEvent.date}
                    className="bg-amber-500 text-white px-6 py-3 rounded-xl font-sans font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-md hover:bg-amber-600 transition-all"
                  >
                    <Plus size={18} />
                    {t.addEvent}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {calendarEvents.length === 0 ? (
                  <div className="py-12 text-center bg-white rounded-3xl border border-dashed border-[#e5e5d5]">
                    <CalendarIcon size={48} className="mx-auto mb-4 text-[#d5d5c5]" />
                    <p className="text-[#8a8a7a] font-sans">{t.noEvents}</p>
                  </div>
                ) : (
                  calendarEvents.map((event) => (
                    <div key={event.id} className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-[#e5e5d5] flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center",
                          event.type === 'advice' ? "bg-blue-50 text-blue-600" : 
                          event.type === 'skill' ? "bg-emerald-50 text-emerald-600" : 
                          "bg-amber-50 text-amber-600"
                        )}>
                          <CalendarIcon size={24} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg">{event.title}</h3>
                            <span className={cn(
                              "text-[8px] md:text-[10px] font-sans font-bold uppercase tracking-widest px-2 py-0.5 rounded-full",
                              event.type === 'advice' ? "bg-blue-100 text-blue-700" : 
                              event.type === 'skill' ? "bg-emerald-100 text-emerald-700" : 
                              "bg-amber-100 text-amber-700"
                            )}>
                              {event.type === 'advice' ? t.eventAdvice : 
                               event.type === 'skill' ? t.eventSkill : 
                               t.eventPersonal}
                            </span>
                          </div>
                          <p className="text-xs text-[#8a8a7a] font-sans uppercase tracking-widest">
                            {new Date(event.date).toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID', { month: 'long', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => deleteCalendarEvent(event.id)}
                        className="p-3 text-[#8a8a7a] hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'memoryBox' && (
            <motion.div 
              key="memoryBox"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6 md:space-y-8"
            >
              <div className="mb-4 md:mb-8">
                <h2 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2 text-[#5A5A40]">{t.memoryBoxTitle}</h2>
                <p className="text-sm md:text-base text-[#8a8a7a]">{t.memoryBoxDesc}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <AnimatePresence mode="popLayout">
                  {memories.length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-[#e5e5d5]">
                      <Star size={48} className="mx-auto mb-4 text-[#d5d5c5]" />
                      <p className="text-[#8a8a7a] font-sans">{t.noMemories}</p>
                    </div>
                  ) : (
                    memories.map((memory) => (
                      <motion.div 
                        key={memory.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-white p-5 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-[#e5e5d5] group relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => deleteMemory(memory.id)}
                            className="p-2 text-[#8a8a7a] hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center text-amber-600 shrink-0">
                            <Star size={20} />
                          </div>
                          <div className="flex-1">
                            <div className="text-[10px] text-[#8a8a7a] font-sans uppercase tracking-widest mb-2">
                              {new Date(memory.date).toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID', { month: 'long', day: 'numeric', year: 'numeric' })}
                            </div>
                            <div className="prose prose-stone prose-sm max-w-none text-sm md:text-base text-[#5a5a4a] italic leading-relaxed">
                              <ReactMarkdown>{memory.content}</ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {activeTab === 'journal' && (
            <motion.div 
              key="journal"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 md:space-y-8"
            >
              <div className="flex justify-between items-end mb-6 md:mb-8">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2 text-[#5A5A40]">{t.journalTitle}</h2>
                  <p className="text-sm md:text-base text-[#8a8a7a]">{t.journalDesc}</p>
                </div>
                <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white shadow-lg rotate-12">
                  <BookOpen size={24} className="md:w-8 md:h-8" />
                </div>
              </div>

              <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-[#e5e5d5]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  <input 
                    type="text" 
                    placeholder={t.journalEntryTitle}
                    value={newJournalEntry.title}
                    onChange={(e) => setNewJournalEntry({...newJournalEntry, title: e.target.value})}
                    className="bg-[#f5f5f0] border-none focus:ring-0 rounded-xl px-4 py-3 font-sans text-sm"
                  />
                  <input 
                    type="date" 
                    value={newJournalEntry.date}
                    onChange={(e) => setNewJournalEntry({...newJournalEntry, date: e.target.value})}
                    className="bg-[#f5f5f0] border-none focus:ring-0 rounded-xl px-4 py-3 font-sans text-sm"
                  />
                  <select 
                    value={newJournalEntry.category}
                    onChange={(e) => setNewJournalEntry({...newJournalEntry, category: e.target.value})}
                    className="bg-[#f5f5f0] border-none focus:ring-0 rounded-xl px-4 py-3 font-sans text-sm"
                  >
                    <option value="Personal">{t.journalPersonal}</option>
                    <option value="Achievement">{t.journalAchievement}</option>
                    <option value="Learning">{t.journalLearning}</option>
                  </select>
                </div>
                <textarea 
                  placeholder={t.journalEntryContent}
                  value={newJournalEntry.content}
                  onChange={(e) => setNewJournalEntry({...newJournalEntry, content: e.target.value})}
                  className="w-full bg-[#f5f5f0] border-none focus:ring-0 rounded-xl px-4 py-3 font-sans text-sm mb-4 min-h-[100px]"
                />
                <button 
                  onClick={addJournalEntry}
                  disabled={!newJournalEntry.title || !newJournalEntry.content}
                  className="bg-emerald-500 text-white px-6 py-3 rounded-xl font-sans font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-md hover:bg-emerald-600 transition-all w-full md:w-auto"
                >
                  <Plus size={18} />
                  {t.addEntry}
                </button>
              </div>

              {journal.length === 0 ? (
                <div className="bg-white p-8 md:p-12 rounded-2xl md:rounded-3xl text-center border-2 border-dashed border-[#e5e5d5]">
                  <p className="text-sm md:text-base text-[#8a8a7a] italic">{t.noJournal}</p>
                </div>
              ) : (
                <div className="space-y-4 md:space-y-6">
                  {journal.map((entry) => (
                    <div key={entry.id} className="bg-white p-6 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border-l-4 md:border-l-8 border-emerald-500 relative overflow-hidden hover:shadow-md transition-shadow">
                      <div className="absolute top-0 right-0 p-2 md:p-4 opacity-5">
                        <Heart size={60} className="md:w-20 md:h-20" />
                      </div>
                      <div className="flex justify-between items-start mb-3 md:mb-4">
                        <span className="px-2 py-0.5 md:px-3 md:py-1 bg-emerald-50 rounded-full text-[8px] md:text-[10px] font-sans font-bold uppercase tracking-widest text-emerald-600">
                          {entry.category}
                        </span>
                        <span className="text-[10px] md:text-xs font-sans text-[#8a8a7a]">
                          {new Date(entry.date).toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <h3 className="text-lg md:text-2xl font-bold mb-2 md:mb-3 text-emerald-900">{entry.title}</h3>
                      <p className="text-sm md:text-base text-[#5a5a4a] leading-relaxed italic">"{entry.content}"</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'safety' && (
            <motion.div 
              key="safety"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6 md:space-y-8"
            >
              <div className="mb-4 md:mb-8">
                <h2 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2 text-[#5A5A40]">{t.safetyTitle}</h2>
                <p className="text-sm md:text-base text-[#8a8a7a]">{t.safetyDesc}</p>
              </div>

              <div className="bg-red-50 border border-red-100 p-4 md:p-6 rounded-2xl md:rounded-3xl flex gap-3 md:gap-4 items-start">
                <AlertTriangle className="text-red-500 shrink-0" size={24} />
                <p className="text-sm md:text-base text-red-700 font-sans font-medium">{t.emergencyWarning}</p>
              </div>

              <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-[#e5e5d5]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  <input 
                    type="text" 
                    placeholder={t.contactName}
                    value={newContact.name}
                    onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                    className="bg-[#f5f5f0] border-none focus:ring-0 rounded-xl px-4 py-3 font-sans text-sm"
                  />
                  <input 
                    type="text" 
                    placeholder={t.contactPhone}
                    value={newContact.phone}
                    onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                    className="bg-[#f5f5f0] border-none focus:ring-0 rounded-xl px-4 py-3 font-sans text-sm"
                  />
                  <input 
                    type="text" 
                    placeholder={t.contactRel}
                    value={newContact.relationship}
                    onChange={(e) => setNewContact({...newContact, relationship: e.target.value})}
                    className="bg-[#f5f5f0] border-none focus:ring-0 rounded-xl px-4 py-3 font-sans text-sm"
                  />
                </div>
                <button 
                  onClick={addEmergencyContact}
                  disabled={!newContact.name || !newContact.phone}
                  className="w-full bg-[#5A5A40] text-white px-6 py-3 rounded-xl font-sans font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-md hover:bg-[#4a4a35] transition-all"
                >
                  <Plus size={18} />
                  {t.addContact}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {emergencyContacts.length === 0 ? (
                  <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-dashed border-[#e5e5d5]">
                    <Shield size={48} className="mx-auto mb-4 text-[#d5d5c5]" />
                    <p className="text-[#8a8a7a] font-sans">{t.noContacts}</p>
                  </div>
                ) : (
                  emergencyContacts.map((contact) => (
                    <div key={contact.id} className="bg-white p-5 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-[#e5e5d5] flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#f5f5f0] rounded-full flex items-center justify-center text-[#5A4040]">
                          <User size={24} />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{contact.name}</h3>
                          <p className="text-xs text-[#8a8a7a] font-sans uppercase tracking-widest">{contact.relationship}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <a 
                          href={`tel:${contact.phone}`}
                          className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                          title={t.callNow}
                        >
                          <Phone size={20} />
                        </a>
                        <button 
                          onClick={() => deleteEmergencyContact(contact.id)}
                          className="p-3 text-[#8a8a7a] hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-8 border-t border-[#e5e5d5]">
                <div className="bg-orange-50 border border-orange-100 p-6 rounded-3xl">
                  <div className="flex items-center gap-3 mb-4 text-orange-700">
                    <Settings size={24} />
                    <h3 className="text-xl font-bold">{t.resetData}</h3>
                  </div>
                  <p className="text-sm text-orange-800 mb-6 leading-relaxed">{t.resetConfirm}</p>
                  <button 
                    onClick={resetAllData}
                    className="bg-orange-600 text-white px-8 py-3 rounded-xl font-sans font-bold shadow-md hover:bg-orange-700 transition-all flex items-center gap-2"
                  >
                    <Trash2 size={18} />
                    {t.resetData}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-white/80 backdrop-blur-md border-t border-[#e5e5d5] px-2 py-3 flex justify-around items-center z-20 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <button onClick={() => setActiveTab('chat')} className={cn("flex flex-col items-center p-2 rounded-2xl transition-all", activeTab === 'chat' ? "text-[#5A5A40] bg-[#5A5A40]/10 ring-2 ring-[#5A5A40]" : "text-[#8a8a7a]")}>
          <MessageCircle size={24} />
        </button>
        <button onClick={() => setActiveTab('toolbox')} className={cn("flex flex-col items-center p-2 rounded-2xl transition-all", activeTab === 'toolbox' ? "text-orange-700 bg-orange-100 ring-2 ring-orange-700" : "text-[#8a8a7a]")}>
          <Wrench size={24} />
        </button>
        <button onClick={() => setActiveTab('goals')} className={cn("flex flex-col items-center p-2 rounded-2xl transition-all", activeTab === 'goals' ? "text-indigo-700 bg-indigo-100 ring-2 ring-indigo-700" : "text-[#8a8a7a]")}>
          <Target size={24} />
        </button>
        <button onClick={() => setActiveTab('journal')} className={cn("flex flex-col items-center p-2 rounded-2xl transition-all", activeTab === 'journal' ? "text-emerald-700 bg-emerald-100 ring-2 ring-emerald-700" : "text-[#8a8a7a]")}>
          <BookOpen size={24} />
        </button>
        <button onClick={() => setActiveTab('calendar')} className={cn("flex flex-col items-center p-2 rounded-2xl transition-all", activeTab === 'calendar' ? "text-amber-700 bg-amber-100 ring-2 ring-amber-700" : "text-[#8a8a7a]")}>
          <CalendarIcon size={24} />
        </button>
        <button onClick={() => setActiveTab('memoryBox')} className={cn("flex flex-col items-center p-2 rounded-2xl transition-all", activeTab === 'memoryBox' ? "text-amber-600 bg-amber-50 ring-2 ring-amber-600" : "text-[#8a8a7a]")}>
          <Star size={24} />
        </button>
        <button onClick={() => setActiveTab('safety')} className={cn("flex flex-col items-center p-2 rounded-2xl transition-all", activeTab === 'safety' ? "text-red-700 bg-red-100 ring-2 ring-red-700" : "text-[#8a8a7a]")}>
          <Shield size={24} />
        </button>
      </nav>

      <footer className="max-w-2xl mx-auto p-8 mt-12 border-t border-[#e5e5d5] text-center">
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 text-[#8a8a7a] text-sm font-sans mb-6">
          <div className="flex items-center gap-2">
            <Info size={16} />
            <span>{t.footerNote}</span>
          </div>
          <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-[#e5e5d5] pt-4 md:pt-0 md:pl-8">
            <a href="mailto:khudri@binadarma.ac.id" className="hover:text-[#5A5A40] transition-colors flex items-center gap-1">
              <Mail size={14} />
              Contact Us
            </a>
            <a href="https://github.com/mrbrightsides" target="_blank" rel="noopener noreferrer" className="hover:text-[#5A5A40] transition-colors flex items-center gap-1">
              <Shield size={14} />
              Privacy Policy
            </a>
          </div>
        </div>
        <p className="text-[#8a8a7a] text-[10px] md:text-xs font-sans uppercase tracking-widest">{t.footerBuild}</p>
      </footer>

      {/* Summary Modal */}
      <AnimatePresence>
        {showSummary && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-[#e5e5d5] flex items-center justify-between bg-gradient-to-r from-[#5A5A40] to-[#7a7a5a] text-white">
                <div className="flex items-center gap-3">
                  <History size={24} />
                  <h2 className="text-xl font-bold">{t.summary}</h2>
                </div>
                <button onClick={() => setShowSummary(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {isSummarizing ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <div className="w-12 h-12 border-4 border-[#5A5A40] border-t-transparent rounded-full animate-spin" />
                    <p className="text-[#8a8a7a] font-sans animate-pulse">{t.summarizing}</p>
                  </div>
                ) : (
                  <div className="prose prose-stone prose-sm max-w-none">
                    <ReactMarkdown>{summaryContent}</ReactMarkdown>
                  </div>
                )}
              </div>
              <div className="p-4 bg-[#f5f5f0] border-t border-[#e5e5d5] flex justify-end">
                <button 
                  onClick={() => setShowSummary(false)}
                  className="px-6 py-2 bg-[#5A5A40] text-white rounded-xl font-sans font-bold hover:bg-[#4a4a35] transition-all shadow-md"
                >
                  {t.close}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d5d5c5;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #5A5A40;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}