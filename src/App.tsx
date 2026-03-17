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
  ChevronDown,
  ChevronUp,
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
  Settings,
  BarChart3,
  BrainCircuit,
  Activity,
  Save,
  Moon,
  Sun,
  Share2,
  RefreshCw,
  Users,
  Download,
  Bell,
  BellOff
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { jsPDF } from 'jspdf';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { storage } from './services/storage';
import { 
  getDadResponse, 
  getDadResponseStream,
  analyzeImageWithDad, 
  getAffirmation, 
  breakdownGoal, 
  getChatSummary,
  getProactiveAdvice,
  getDailyJoke,
  getJournalPrompt as fetchJournalPrompt,
  speakResponse,
  QuotaExhaustedError
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

type Emotion = 'HAPPY' | 'SAD' | 'PROUD' | 'CONCERNED' | 'NEUTRAL' | 'WISE';

const DadAvatar = ({ isThinking, emotion = 'NEUTRAL' }: { isThinking?: boolean, emotion?: Emotion }) => {
  const getEmotionStyles = () => {
    switch (emotion) {
      case 'HAPPY': return { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] };
      case 'SAD': return { rotate: [-5, 5, -5], y: [0, 2, 0] };
      case 'PROUD': return { scale: [1, 1.15, 1], y: [0, -5, 0] };
      case 'WISE': return { scale: [1, 1.05, 1], rotate: [0, 2, -2, 0] };
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
          emotion === 'WISE' ? "bg-gradient-to-br from-indigo-600 to-purple-700" :
          emotion === 'CONCERNED' ? "bg-gradient-to-br from-amber-600 to-orange-700" :
          "bg-gradient-to-br from-[#5A5A40] to-[#7a7a5a] dark:from-emerald-600 dark:to-emerald-800"
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
          className="absolute -top-1 -right-1 bg-white dark:bg-zinc-800 rounded-full p-1 shadow-md transition-colors"
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

interface UserProfile {
  preferredName?: string;
  interests: string;
  goals: string;
  challenges: string;
  personality: string;
  favorite_jokes?: string;
  has_onboarded?: number;
  notifications_enabled?: number;
  notify_calendar?: number;
  notify_journal?: number;
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
    shareSocial: "Share to Social Media",
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
    morning: "morning",
    afternoon: "afternoon",
    evening: "evening",
    night: "night",
    showTutorial: "Show Tutorial",
    resetData: "Reset All Data",
    resetConfirm: "Are you sure? This will clear all your progress, chat history, and goals. Dad will miss our memories, but sometimes a fresh start is good.",
    resetSuccess: "Fresh start! Everything's cleared.",
    quotaReached: "Quota Reached",
    quotaLimitMsg: "Hey kiddo, I think we've talked enough for today. Let's save some energy for tomorrow, okay? Get some rest!",
    profile: "Profile",
    progress: "Progress",
    checkin: "Check-in",
    interests: "Interests",
    challenges: "Challenges",
    dadPersonality: "Dad's Personality",
    preferredNameLabel: "What do you want to be called?",
    mentor: "Mentor",
    playful: "Playful",
    wiseElder: "Wise Elder",
    checkinQuestion: "How are you feeling today, kiddo?",
    checkinPlaceholder: "Tell Dad how your day was...",
    saveProfile: "Save Profile",
    profileSaved: "Profile updated! Dad knows you a bit better now.",
    aboutMe: "About Me",
    myGoals: "My Goals",
    safetyNet: "Safety Net",
    skillsProgress: "Skills Progress",
    engagementStats: "Engagement Stats",
    checkinHistory: "Check-in History",
    feeling: "Feeling",
    notes: "Notes",
    submitCheckin: "Submit Check-in",
    checkinSuccess: "Thanks for sharing, kiddo. Dad's here for you.",
    getPrompt: "Get Prompt",
    prompting: "Prompting...",
    celebrationTitle: "Great Job, Kiddo!",
    celebrationDesc: "You've mastered a new skill. Dad is so proud of your progress!",
    darkMode: "Dark Mode",
    lightMode: "Light Mode",
    archetypeMentor: "Mentor - Focused on growth and discipline",
    archetypePlayful: "Playful - Lots of jokes and lightheartedness",
    archetypeWiseElder: "Wise Elder - Deep perspective and stories",
    onboardingWelcome: "Welcome Home, Kiddo",
    onboardingIntro: "I'm Dad. I'm here to help you grow, learn, and navigate this big world. Think of me as your patient mentor, your practical guide, and your biggest fan.",
    onboardingStep1Title: "Who is Dad?",
    onboardingStep1Desc: "I'm an AI companion designed to provide fatherly guidance. Whether you need to learn how to fix a leaky faucet, break down a massive goal, or just need a supportive ear, I'm always here.",
    onboardingStep2Title: "Personalize Your Experience",
    onboardingStep2Desc: "Tell me a bit about yourself so I can give you better advice. What are you interested in? What are your current challenges?",
    onboardingStep3Title: "Explore Your Toolbox",
    onboardingStep3Desc: "From practical skills to goal setting and journaling, I've got a whole set of tools to help you succeed. Let's get started!",
    getStarted: "Get Started",
    next: "Next",
    back: "Back",
    finish: "Finish",
    privacyPolicyTitle: "Privacy Policy",
    privacyPolicy: "Dad values your privacy. Your data stays on your device and is only used to help Dad understand you better. We don't sell your info to anyone. You can reset all your data at any time in the Profile settings.",
    exportChat: "Export Chat History",
    exportSuccess: "Chat history exported successfully!",
    exportMemories: "Export Memories",
    exportTXT: "Export as TXT",
    exportPDF: "Export as PDF",
    favoriteJokes: "Favorite Dad Jokes",
    favoriteJokesDesc: "Tell Dad your favorite jokes so he can share them back!",
    jokesPlaceholder: "Enter your favorite jokes here...",
    notifications: "Notifications",
    enableNotifications: "Enable Local Notifications",
    notifyEvents: "Remind me about calendar events",
    notifyJournal: "Encourage me to write in journal",
    settings: "Settings",
    notificationPermissionDenied: "Notification permission denied. Please enable it in your browser settings.",
    notificationEventTitle: "Upcoming Event",
    notificationEventBody: "Hey kiddo, you have an event: {title} coming up soon!",
    notificationJournalTitle: "Time for a Journal Entry?",
    notificationJournalBody: "It's been a while since your last entry. Want to share something with Dad?",
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
    shareSocial: "Bagikan ke Media Sosial",
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
    morning: "pagi",
    afternoon: "siang",
    evening: "sore",
    night: "malam",
    showTutorial: "Tampilkan Tutorial",
    resetData: "Hapus Semua Data",
    resetConfirm: "Apakah kamu yakin? Ini akan menghapus semua kemajuan, riwayat obrolan, dan targetmu. Ayah akan merindukan kenangan kita, tapi terkadang awal yang baru itu bagus.",
    resetSuccess: "Awal yang baru! Semuanya telah dihapus.",
    quotaReached: "Kuota Terpenuhi",
    quotaLimitMsg: "Hei nak, Ayah rasa kita sudah cukup banyak bicara hari ini. Mari simpan energi untuk besok, ya? Istirahatlah!",
    profile: "Profil",
    progress: "Kemajuan",
    checkin: "Cek-in",
    interests: "Minat",
    challenges: "Tantangan",
    dadPersonality: "Kepribadian Ayah",
    preferredNameLabel: "Kamu ingin dipanggil apa?",
    mentor: "Mentor",
    playful: "Ceria",
    wiseElder: "Tetua Bijak",
    checkinQuestion: "Bagaimana perasaanmu hari ini, nak?",
    checkinPlaceholder: "Ceritakan pada Ayah bagaimana harimu...",
    saveProfile: "Simpan Profil",
    profileSaved: "Profil diperbarui! Ayah sekarang sedikit lebih mengenalmu.",
    aboutMe: "Tentang Saya",
    myGoals: "Target Saya",
    safetyNet: "Jaring Pengaman",
    skillsProgress: "Kemajuan Keahlian",
    engagementStats: "Statistik Keterlibatan",
    checkinHistory: "Riwayat Cek-in",
    feeling: "Perasaan",
    notes: "Catatan",
    submitCheckin: "Kirim Cek-in",
    checkinSuccess: "Terima kasih sudah berbagi, nak. Ayah ada di sini untukmu.",
    getPrompt: "Dapatkan Prompt",
    prompting: "Mencari Prompt...",
    celebrationTitle: "Luar Biasa, Nak!",
    celebrationDesc: "Kamu telah menguasai keahlian baru. Ayah sangat bangga dengan kemajuanmu!",
    darkMode: "Mode Gelap",
    lightMode: "Mode Terang",
    archetypeMentor: "Mentor - Fokus pada pertumbuhan dan disiplin",
    archetypePlayful: "Ceria - Banyak lelucon dan kegembiraan",
    archetypeWiseElder: "Tetua Bijak - Perspektif mendalam dan cerita",
    onboardingWelcome: "Selamat Datang di Rumah, Nak",
    onboardingIntro: "Ayah di sini. Ayah ada untuk membantumu tumbuh, belajar, dan mengarungi dunia yang luas ini. Anggap Ayah sebagai mentormu yang sabar, panduan praktismu, dan penggemar terbesarmu.",
    onboardingStep1Title: "Siapa itu Ayah?",
    onboardingStep1Desc: "Ayah adalah pendamping AI yang dirancang untuk memberikan bimbingan kebapakan. Baik kamu perlu belajar cara memperbaiki keran yang bocor, memecah target besar, atau sekadar butuh pendengar yang mendukung, Ayah selalu ada.",
    onboardingStep2Title: "Personalisasi Pengalamanmu",
    onboardingStep2Desc: "Beri tahu Ayah sedikit tentang dirimu agar Ayah bisa memberimu nasihat yang lebih baik. Apa minatmu? Apa tantanganmu saat ini?",
    onboardingStep3Title: "Jelajahi Kotak Alatmu",
    onboardingStep3Desc: "Dari keterampilan praktis hingga penetapan target dan penjurnalan, Ayah punya serangkaian alat untuk membantumu sukses. Mari kita mulai!",
    getStarted: "Mulai",
    next: "Lanjut",
    back: "Kembali",
    finish: "Selesai",
    privacyPolicyTitle: "Kebijakan Privasi",
    privacyPolicy: "Ayah menghargai privasimu. Datamu tetap ada di perangkatmu dan hanya digunakan untuk membantu Ayah memahamimu lebih baik. Kami tidak menjual informasimu kepada siapa pun. Kamu dapat menghapus semua datamu kapan saja di pengaturan Profil.",
    exportChat: "Ekspor Riwayat Obrolan",
    exportSuccess: "Riwayat obrolan berhasil diekspor!",
    exportMemories: "Ekspor Kenangan",
    exportTXT: "Ekspor sebagai TXT",
    exportPDF: "Ekspor sebagai PDF",
    favoriteJokes: "Lelucon Ayah Favorit",
    favoriteJokesDesc: "Beritahu Ayah lelucon favoritmu agar dia bisa membagikannya kembali!",
    jokesPlaceholder: "Masukkan lelucon favoritmu di sini...",
    notifications: "Notifikasi",
    enableNotifications: "Aktifkan Notifikasi Lokal",
    notifyEvents: "Ingatkan saya tentang acara kalender",
    notifyJournal: "Dorong saya untuk menulis di jurnal",
    settings: "Pengaturan",
    notificationPermissionDenied: "Izin notifikasi ditolak. Harap aktifkan di pengaturan browser Anda.",
    notificationEventTitle: "Acara Mendatang",
    notificationEventBody: "Halo nak, kamu punya acara: {title} yang akan segera datang!",
    notificationJournalTitle: "Waktunya Menulis Jurnal?",
    notificationJournalBody: "Sudah lama sejak entri terakhirmu. Ingin berbagi sesuatu dengan Ayah?",
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
  const [activeTab, setActiveTab] = useState<'chat' | 'toolbox' | 'journal' | 'calendar' | 'memoryBox' | 'profile'>('chat');
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
  const [isJokeCollapsed, setIsJokeCollapsed] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [isFetchingJoke, setIsFetchingJoke] = useState(false);
  
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', type: 'event' });
  
  const [memories, setMemories] = useState<Memory[]>([]);
  const [skillOfTheWeek, setSkillOfTheWeek] = useState<Skill | null>(null);
  const [isSavingMemory, setIsSavingMemory] = useState(false);
  
  const [profile, setProfile] = useState<UserProfile>({ interests: '', goals: '', challenges: '', personality: 'wise elder', has_onboarded: 1 });
  const [checkins, setCheckins] = useState<EmotionalCheckin[]>([]);
  const [stats, setStats] = useState<EngagementStats | null>(null);
  const [newCheckin, setNewCheckin] = useState({ feeling: 'Happy', notes: '' });
  const [isSubmittingCheckin, setIsSubmittingCheckin] = useState(false);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [isPrompting, setIsPrompting] = useState(false);
  const [profileSubTab, setProfileSubTab] = useState<'about' | 'goals' | 'safety' | 'progress' | 'settings'>('about');
  
  const lastNotifiedEventId = useRef<number | null>(null);
  const lastJournalReminderDate = useRef<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    const isDark = theme === 'dark';
    root.classList.toggle('dark', isDark);
    document.body.classList.toggle('dark', isDark);
    root.style.colorScheme = isDark ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
    document.getElementById('theme-meta')?.setAttribute('content', isDark ? '#18181b' : '#f5f5f0');
    document.getElementById('apple-theme-meta')?.setAttribute('content', isDark ? 'black' : 'default');
  }, [theme]);

  useEffect(() => {
    if (profile.notifications_enabled) {
      const interval = setInterval(() => {
        checkNotifications();
      }, 60000); // Check every minute
      return () => clearInterval(interval);
    }
  }, [profile.notifications_enabled, calendarEvents, journal]);

  const checkNotifications = () => {
    if (!profile.notifications_enabled) return;

    // Check Calendar Events
    if (profile.notify_calendar) {
      const now = new Date();
      const upcoming = calendarEvents.find(event => {
        const eventDate = new Date(event.date);
        const diff = eventDate.getTime() - now.getTime();
        // Notify if event is in the next 30 minutes and not notified yet
        return diff > 0 && diff < 30 * 60 * 1000 && lastNotifiedEventId.current !== event.id;
      });

      if (upcoming) {
        showNotification(
          t.notificationEventTitle,
          t.notificationEventBody.replace('{title}', upcoming.title)
        );
        lastNotifiedEventId.current = upcoming.id;
      }
    }

    // Check Journal
    if (profile.notify_journal) {
      const today = new Date().toISOString().split('T')[0];
      if (lastJournalReminderDate.current !== today) {
        const lastEntry = journal[0];
        const now = new Date();
        const lastDate = lastEntry ? new Date(lastEntry.date) : new Date(0);
        const diff = now.getTime() - lastDate.getTime();

        // If no entry today and it's evening (after 6 PM)
        if (diff > 24 * 60 * 60 * 1000 && now.getHours() >= 18) {
          showNotification(
            t.notificationJournalTitle,
            t.notificationJournalBody
          );
          lastJournalReminderDate.current = today;
        }
      }
    }
  };

  const showNotification = (title: string, body: string) => {
    if (!("Notification" in window)) return;

    if (Notification.permission === "granted") {
      new Notification(title, { body, icon: '/favicon.ico' });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          new Notification(title, { body, icon: '/favicon.ico' });
        }
      });
    }
  };

  const handleExportChat = () => {
    const history = storage.getChatHistory();
    if (history.length === 0) return;

    const content = history.map(m => {
      const role = m.role === 'user' ? 'Me' : 'Dad';
      return `[${role}]: ${m.content}\n`;
    }).join('\n---\n\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-with-dad-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    playSound('success');
  };

  const handleExportMemories = (format: 'txt' | 'pdf') => {
    if (memories.length === 0) return;

    const title = t.memoryBoxTitle;
    const dateStr = new Date().toISOString().split('T')[0];

    if (format === 'txt') {
      const memoryText = memories.map(m => `[${new Date(m.date).toLocaleDateString()}] ${m.content}`).join('\n\n---\n\n');
      const blob = new Blob([memoryText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dad-memories-${dateStr}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text(title, 20, 20);
      doc.setFontSize(12);
      
      let y = 40;
      memories.forEach((m, i) => {
        const date = new Date(m.date).toLocaleDateString();
        const content = m.content;
        
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        
        doc.setFont("helvetica", "bold");
        doc.text(`${i + 1}. ${date}`, 20, y);
        y += 7;
        
        doc.setFont("helvetica", "normal");
        const splitText = doc.splitTextToSize(content, 170);
        doc.text(splitText, 20, y);
        y += (splitText.length * 7) + 10;
      });
      
      doc.save(`dad-memories-${dateStr}.pdf`);
    }
  };

  const t = TRANSLATIONS[language];
  const isDarkMode = theme === 'dark';
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Hide splash screen
    const splash = document.getElementById('splash-screen');
    if (splash) {
      splash.style.opacity = '0';
      setTimeout(() => splash.remove(), 500);
    }

    fetchSkills();
    fetchJournal();
    fetchGoals();
    fetchChatHistory();
    fetchEmergencyContacts();
    fetchCalendarEvents();
    fetchMemories();
    fetchSkillOfTheWeek();
    fetchProfile();
    fetchCheckins();
    fetchStats();
    handleProactiveGreeting();
  }, []);

  const handleShare = async (title: string, text: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: text,
          url: window.location.href,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${title}\n\n${text}`);
        alert('Copied to clipboard!');
      } catch (err) {
        console.error('Error copying:', err);
      }
    }
  };

  const fetchProfile = async () => {
    const data = storage.getProfile();
    setProfile(data);
    const hasSeenOnboardingLocal = localStorage.getItem('has_seen_onboarding');
    if (data.has_onboarded === 0 && !hasSeenOnboardingLocal) {
      setShowOnboarding(true);
    }
  };

  const fetchCheckins = async () => {
    const data = storage.getCheckins();
    setCheckins(data);
  };

  const fetchStats = async () => {
    const data = storage.getStats();
    setStats(data);
  };

  const completeOnboarding = async () => {
    localStorage.setItem('has_seen_onboarding', 'true');
    const updatedProfile = { ...profile, has_onboarded: 1 };
    storage.updateProfile(updatedProfile);
    setProfile(updatedProfile);
    setShowOnboarding(false);
  };

  const getJournalPrompt = async () => {
    if (isPrompting) return;
    const allowed = await checkAndIncrementQuota();
    if (!allowed) {
      alert(t.quotaLimitMsg);
      return;
    }
    setIsPrompting(true);
    try {
      const prompt = await fetchJournalPrompt(language, profile);
      setNewJournalEntry({ ...newJournalEntry, content: prompt });
    } catch (e) {
      if (e instanceof QuotaExhaustedError) {
        alert(t.quotaLimitMsg);
      } else {
        console.error("Failed to get journal prompt", e);
      }
    } finally {
      setIsPrompting(false);
    }
  };

  const updateProfile = async () => {
    storage.updateProfile(profile);
    playSound('success');
    alert(t.profileSaved);
  };

  const submitCheckin = async () => {
    setIsSubmittingCheckin(true);
    storage.addCheckin(newCheckin);
    storage.logEngagement('checkin');
    
    setNewCheckin({ feeling: 'Happy', notes: '' });
    setShowCheckinModal(false);
    fetchCheckins();
    fetchStats();
    playSound('success');
    
    // Get Dad's response to checkin
    const id = Date.now().toString();
    setMessages(prev => [...prev, { role: 'model', content: '', id }]);
    
    const dadResponse = await getDadResponseStream(
      `I just did an emotional check-in. I'm feeling ${newCheckin.feeling}. ${newCheckin.notes ? `I noted: ${newCheckin.notes}` : ''}`,
      messages.slice(-5),
      language,
      profile,
      (text) => {
        let dadContent = text;
        const emotionMatch = dadContent.match(/\[EMOTION: (HAPPY|SAD|PROUD|CONCERNED|NEUTRAL)\]/);
        if (emotionMatch) {
          setCurrentEmotion(emotionMatch[1] as Emotion);
          dadContent = dadContent.replace(/\[EMOTION: (HAPPY|SAD|PROUD|CONCERNED|NEUTRAL)\]/, '').trim();
        }
        setMessages(prev => prev.map(m => m.id === id ? { ...m, content: dadContent } : m));
      }
    );
    
    let finalDadContent = dadResponse || t.lostThought;
    const emotionMatch = finalDadContent.match(/\[EMOTION: (HAPPY|SAD|PROUD|CONCERNED|NEUTRAL)\]/);
    if (emotionMatch) {
      finalDadContent = finalDadContent.replace(/\[EMOTION: (HAPPY|SAD|PROUD|CONCERNED|NEUTRAL)\]/, '').trim();
    }

    saveChatMessage('model', finalDadContent);
    setIsSubmittingCheckin(false);
  };

  const logEngagement = async (feature: string) => {
    storage.logEngagement(feature);
    fetchStats();
  };

  const fetchMemories = async () => {
    const data = storage.getMemories();
    setMemories(data);
  };

  const fetchSkillOfTheWeek = async () => {
    const data = storage.getSkillOfTheWeek();
    setSkillOfTheWeek(data.skill);
  };

  const checkAndIncrementQuota = async () => {
    const today = new Date().toISOString().split('T')[0];
    const quotaData = JSON.parse(localStorage.getItem('dad_quota') || '{"date":"","count":0}');
    
    if (quotaData.date !== today) {
      quotaData.date = today;
      quotaData.count = 0;
    }

    const LIMIT = 50; // Daily limit for local storage
    if (quotaData.count >= LIMIT) {
      return false;
    }

    quotaData.count += 1;
    localStorage.setItem('dad_quota', JSON.stringify(quotaData));
    return true;
  };

  const saveMemory = async (content: string, source: string = 'advice') => {
    setIsSavingMemory(true);
    storage.addMemory(content, source);
    fetchMemories();
    playSound('success');
    setIsSavingMemory(false);
  };

  const deleteMemory = async (id: number) => {
    storage.deleteMemory(id);
    setMemories(memories.filter(m => m.id !== id));
  };

  const fetchCalendarEvents = async () => {
    const data = storage.getCalendarEvents();
    setCalendarEvents(data);
  };

  const addCalendarEvent = async () => {
    if (!newEvent.title || !newEvent.date) return;
    storage.addCalendarEvent(newEvent);
    setNewEvent({ title: '', date: '', type: 'event' });
    fetchCalendarEvents();
    playSound('success');
  };

  const deleteCalendarEvent = async (id: number) => {
    storage.deleteCalendarEvent(id);
    fetchCalendarEvents();
  };

  const resetAllData = async () => {
    if (!window.confirm(t.resetConfirm)) return;
    localStorage.clear();
    alert(t.resetSuccess);
    window.location.reload();
  };

  const reorderSteps = async (goalId: number, newSteps: GoalStep[]) => {
    const updatedSteps = newSteps.map((s, i) => ({ ...s, order_index: i }));
    // Update local state
    setGoals(goals.map(g => g.id === goalId ? { ...g, steps: updatedSteps } : g));
    
    // Update storage
    const goalsData = storage.getGoals();
    const updatedGoals = goalsData.map(g => {
      if (g.id === goalId) {
        return { ...g, steps: updatedSteps };
      }
      return g;
    });
    localStorage.setItem('dad_goals', JSON.stringify(updatedGoals));
  };

  const reorderGoals = async (newGoals: Goal[]) => {
    const updatedGoals = newGoals.map((g, i) => ({ ...g, order_index: i }));
    setGoals(updatedGoals);
    localStorage.setItem('dad_goals', JSON.stringify(updatedGoals));
  };

  const fetchDailyJoke = async () => {
    setIsFetchingJoke(true);
    try {
      const existing = await storage.getDailyJoke();
      if (existing) {
        setDailyJoke(existing);
      } else {
        // Fetch from Gemini if not in storage
        const allowed = await checkAndIncrementQuota();
        if (!allowed) return;
        
        try {
          const joke = await getDailyJoke(language, profile);
          if (joke) {
            setDailyJoke(joke);
            storage.saveDailyJoke(joke);
          }
        } catch (e) {
          if (e instanceof QuotaExhaustedError) {
            setDailyJoke("Dad's a bit tired for jokes right now. Let's try again tomorrow!");
          } else {
            throw e;
          }
        }
      }
    } catch (e) {
      console.error("Failed to fetch daily joke", e);
    } finally {
      setIsFetchingJoke(false);
    }
  };

  const handleProactiveGreeting = async () => {
    // Check if we already have messages today
    const history = storage.getChatHistory();
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
      const advice = await getProactiveAdvice(timeOfDay, recentActivity, language, profile);
      if (advice) {
        const fullGreeting = advice;
        const id = 'proactive';
        setMessages([{ role: 'model', content: '', id }]);
        await typeMessage(fullGreeting, id);
        saveChatMessage('model', fullGreeting);
      }
    } catch (e) {
      if (e instanceof QuotaExhaustedError) {
        const id = 'quota-error';
        setMessages([{ role: 'model', content: t.quotaLimitMsg, id }]);
      } else {
        console.error("Failed to get proactive advice", e);
      }
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
    const data = storage.getChatHistory();
    if (data.length === 0) {
      setMessages([{ role: 'model', content: t.initialGreeting, id: 'initial' }]);
    } else {
      setMessages(data);
    }
  };

  const saveChatMessage = async (role: 'user' | 'model', content: string) => {
    const newMessage = storage.saveChatMessage(role, content);
    return newMessage.id;
  };

  const deleteChatMessage = async (id: string) => {
    if (id === 'initial' || id.startsWith('quota-') || id === 'error') return;
    storage.deleteChatMessage(id);
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  const fetchSkills = async () => {
    const data = storage.getSkills();
    setSkills(data);
  };

  const fetchJournal = async () => {
    const data = storage.getJournal();
    setJournal(data);
  };

  const addJournalEntry = async () => {
    if (!newJournalEntry.title || !newJournalEntry.content) return;
    storage.addJournalEntry(newJournalEntry);
    setNewJournalEntry({ title: '', content: '', category: 'Personal', date: new Date().toISOString().split('T')[0] });
    fetchJournal();
    playSound('success');
  };

  const fetchGoals = async () => {
    const data = storage.getGoals();
    setGoals(data);
  };

  const fetchEmergencyContacts = async () => {
    const data = storage.getEmergencyContacts();
    setEmergencyContacts(data);
  };

  const addEmergencyContact = async () => {
    if (!newContact.name || !newContact.phone) return;
    storage.addEmergencyContact(newContact);
    setNewContact({ name: '', phone: '', relationship: '' });
    fetchEmergencyContacts();
    playSound('success');
  };

  const deleteEmergencyContact = async (id: number) => {
    storage.deleteEmergencyContact(id);
    fetchEmergencyContacts();
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

  const handleSpeak = async (text: string) => {
    try {
      const base64 = await speakResponse(text, language);
      if (base64) {
        // Gemini TTS returns raw PCM 16-bit mono at 24kHz.
        // We need to add a WAV header for the browser to play it.
        const pcmData = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        const sampleRate = 24000;
        const numChannels = 1;
        const bitsPerSample = 16;
        
        const header = new ArrayBuffer(44);
        const view = new DataView(header);
        
        // RIFF identifier
        view.setUint32(0, 0x52494646, false); // "RIFF"
        // file length
        view.setUint32(4, 36 + pcmData.length, true);
        // RIFF type
        view.setUint32(8, 0x57415645, false); // "WAVE"
        // format chunk identifier
        view.setUint32(12, 0x666d7420, false); // "fmt "
        // format chunk length
        view.setUint32(16, 16, true);
        // sample format (raw PCM = 1)
        view.setUint16(20, 1, true);
        // channel count
        view.setUint16(22, numChannels, true);
        // sample rate
        view.setUint32(24, sampleRate, true);
        // byte rate (sample rate * block align)
        view.setUint32(28, sampleRate * numChannels * bitsPerSample / 8, true);
        // block align (channel count * bytes per sample)
        view.setUint16(32, numChannels * bitsPerSample / 8, true);
        // bits per sample
        view.setUint16(34, bitsPerSample, true);
        // data chunk identifier
        view.setUint32(36, 0x64617461, false); // "data"
        // data chunk length
        view.setUint32(40, pcmData.length, true);
        
        const wavData = new Uint8Array(header.byteLength + pcmData.byteLength);
        wavData.set(new Uint8Array(header), 0);
        wavData.set(pcmData, header.byteLength);
        
        const blob = new Blob([wavData], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => URL.revokeObjectURL(url);
        audio.play();
      }
    } catch (e) {
      console.error("Failed to speak", e);
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
    const tempUserId = Date.now().toString();
    const userMessage: Message = { role: 'user', content: userContent, id: tempUserId };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    playSound('send');
    
    saveChatMessage('user', userContent).then(realId => {
      if (realId) {
        setMessages(prev => prev.map(m => m.id === tempUserId ? { ...m, id: realId.toString() } : m));
      }
    });

    try {
      const tempDadId = (Date.now() + 1).toString();
      const dadMessage: Message = { role: 'model', content: '', id: tempDadId };
      setMessages(prev => [...prev, dadMessage]);
      setIsLoading(true);

      const response = await getDadResponseStream(
        userContent, 
        messages.slice(-20), 
        language, 
        profile,
        (text) => {
          let dadContent = text;
          // Parse emotion from the stream
          const emotionMatch = dadContent.match(/\[EMOTION: (HAPPY|SAD|PROUD|CONCERNED|NEUTRAL)\]/);
          if (emotionMatch) {
            setCurrentEmotion(emotionMatch[1] as Emotion);
            dadContent = dadContent.replace(/\[EMOTION: (HAPPY|SAD|PROUD|CONCERNED|NEUTRAL)\]/, '').trim();
          }
          setMessages(prev => prev.map(m => m.id === tempDadId ? { ...m, content: dadContent } : m));
        }
      );

      let finalDadContent = response || t.lostThought;
      const emotionMatch = finalDadContent.match(/\[EMOTION: (HAPPY|SAD|PROUD|CONCERNED|NEUTRAL)\]/);
      if (emotionMatch) {
        finalDadContent = finalDadContent.replace(/\[EMOTION: (HAPPY|SAD|PROUD|CONCERNED|NEUTRAL)\]/, '').trim();
      }

      setIsLoading(false);
      playSound('receive');
      
      saveChatMessage('model', finalDadContent).then(realId => {
        if (realId) {
          setMessages(prev => prev.map(m => m.id === tempDadId ? { ...m, id: realId.toString() } : m));
        }
      });
    } catch (error) {
      if (error instanceof QuotaExhaustedError) {
        setMessages(prev => [...prev, { role: 'model', content: t.quotaLimitMsg, id: 'quota-error' }]);
      } else {
        console.error(error);
        setMessages(prev => [...prev, { role: 'model', content: t.errorMsg, id: 'error' }]);
      }
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
      const response = await getAffirmation(language, profile);
      const content = response || t.affirmationDefault;
      const id = Date.now().toString();
      setMessages(prev => [...prev, { role: 'model', content: '', id }]);
      setIsLoading(false);
      await typeMessage(content, id);
      playSound('receive');
      saveChatMessage('model', content);
      logEngagement('affirmation');
    } catch (e) {
      if (e instanceof QuotaExhaustedError) {
        setMessages(prev => [...prev, { role: 'model', content: t.quotaLimitMsg, id: 'quota-error' }]);
      } else {
        console.error(e);
      }
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
      const summary = await getChatSummary(messages, language, profile);
      setSummaryContent(summary || "No summary available.");
    } catch (e) {
      if (e instanceof QuotaExhaustedError) {
        setSummaryContent(t.quotaLimitMsg);
      } else {
        console.error(e);
        setSummaryContent("Failed to generate summary.");
      }
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
        const tempDadId = (Date.now() + 1).toString();
        const dadMessage: Message = { role: 'model', content: '', id: tempDadId };
        setMessages(prev => [...prev, dadMessage]);
        setIsLoading(true);

        let finalDadContent = "";
        if (isImage) {
          const response = await analyzeImageWithDad(base64, "What do you see here, Dad? Give me some advice or explain what it is.", language, profile);
          finalDadContent = response || "That's interesting! Tell me more about it.";
          setMessages(prev => prev.map(m => m.id === tempDadId ? { ...m, content: finalDadContent } : m));
        } else {
          const response = await getDadResponseStream(
            `The user shared a file named "${file.name}". Please acknowledge it and ask how you can help.`, 
            messages.slice(-5), 
            language, 
            profile,
            (text) => {
              setMessages(prev => prev.map(m => m.id === tempDadId ? { ...m, content: text } : m));
            }
          );
          finalDadContent = response || "I see you've shared a file. How can I help you with it?";
        }
        
        setIsLoading(false);
        playSound('receive');
        saveChatMessage('model', finalDadContent);
      } catch (error) {
        if (error instanceof QuotaExhaustedError) {
          setMessages(prev => [...prev, { role: 'model', content: t.quotaLimitMsg, id: 'quota-error' }]);
        } else {
          console.error(error);
        }
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
    storage.completeSkill(id);
    playSound('success');
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 5000);
    fetchSkills();
    const skill = skills.find(s => s.id === id);
    if (skill) {
      storage.addJournalEntry({
        title: t.masteredJournalTitle.replace('{skill}', skill.name),
        content: t.masteredJournalContent.replace('{skill}', skill.name.toLowerCase()),
        category: 'Skill',
        date: new Date().toISOString().split('T')[0]
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
      const breakdown = await breakdownGoal(newGoalTitle, language, profile);
      const steps = breakdown.split('\n').filter(s => s.trim().length > 0).map(s => s.replace(/^\d+\.\s*/, '').trim());
      
      storage.addGoal(newGoalTitle, t.goalBrokenDesc, steps);
      
      setNewGoalTitle('');
      fetchGoals();
      playSound('success');
    } catch (e) {
      if (e instanceof QuotaExhaustedError) {
        alert(t.quotaLimitMsg);
      } else {
        console.error(e);
      }
    } finally {
      setIsBreakingDownGoal(false);
    }
  };

  const toggleStep = async (stepId: number, completed: boolean) => {
    storage.toggleGoalStep(stepId, completed);
    if (completed) playSound('success');
    fetchGoals();
  };

  const deleteGoal = async (id: number) => {
    storage.deleteGoal(id);
    fetchGoals();
  };

  return (
    <div className="min-h-screen bg-[#fdfcf0] dark:bg-zinc-950 text-[#3a3a2e] dark:text-zinc-100 font-serif pb-20 md:pb-0 transition-colors duration-300 overflow-x-hidden">
      {/* Header - Hidden on Mobile, shown on Desktop */}
      <header className="hidden md:block bg-white dark:bg-zinc-900 border-b border-[#e5e5d5] dark:border-zinc-800 py-6 px-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DadAvatar emotion={currentEmotion} isThinking={isLoading} />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#5A5A40] dark:text-emerald-400">{t.appName}</h1>
              <p className="text-xs uppercase tracking-widest text-[#8a8a7a] dark:text-zinc-400 font-sans font-semibold">{t.tagline}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2 bg-[#f5f5f0] dark:bg-zinc-800 rounded-full text-[#5A5A40] dark:text-emerald-400 hover:bg-[#e5e5d5] dark:hover:bg-zinc-700 transition-colors"
              title={theme === 'light' ? t.darkMode : t.lightMode}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button 
              onClick={() => setLanguage(l => l === 'en' ? 'id' : 'en')}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#f5f5f0] dark:bg-zinc-800 rounded-full text-xs font-sans font-bold text-[#5A5A40] dark:text-emerald-400 hover:bg-[#e5e5d5] dark:hover:bg-zinc-700 transition-colors"
            >
              <Languages size={14} />
              {language === 'en' ? 'Bahasa Indonesia' : 'English'}
            </button>
            <button 
              onClick={handleExportChat}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#f5f5f0] dark:bg-zinc-800 rounded-full text-xs font-sans font-bold text-[#5A5A40] dark:text-emerald-400 hover:bg-[#e5e5d5] dark:hover:bg-zinc-700 transition-colors"
              title={t.exportChat}
            >
              <Download size={14} />
              {t.exportChat}
            </button>
            <nav className="flex gap-1 bg-[#f0f0e5] dark:bg-zinc-800 p-1 rounded-full font-sans text-xs font-medium transition-colors">
              <button 
                onClick={() => setActiveTab('chat')}
                className={cn("px-4 py-2 rounded-full transition-all whitespace-nowrap", activeTab === 'chat' ? "bg-white dark:bg-zinc-700 text-[#5A5A40] dark:text-emerald-400 shadow-sm" : "text-[#8a8a7a] dark:text-zinc-400 hover:text-[#5A5A40] dark:hover:text-emerald-400")}
              >
                {t.chat}
              </button>
              <button 
                onClick={() => setActiveTab('toolbox')}
                className={cn("px-4 py-2 rounded-full transition-all whitespace-nowrap", activeTab === 'toolbox' ? "bg-white dark:bg-zinc-700 text-[#5A5A40] dark:text-emerald-400 shadow-sm" : "text-[#8a8a7a] dark:text-zinc-400 hover:text-[#5A5A40] dark:hover:text-emerald-400")}
              >
                {t.toolbox}
              </button>
              <button 
                onClick={() => setActiveTab('journal')}
                className={cn("px-4 py-2 rounded-full transition-all whitespace-nowrap", activeTab === 'journal' ? "bg-white dark:bg-zinc-700 text-[#5A5A40] dark:text-emerald-400 shadow-sm" : "text-[#8a8a7a] dark:text-zinc-400 hover:text-[#5A5A40] dark:hover:text-emerald-400")}
              >
                {t.journal}
              </button>
              <button 
                onClick={() => setActiveTab('calendar')}
                className={cn("px-4 py-2 rounded-full transition-all whitespace-nowrap", activeTab === 'calendar' ? "bg-white dark:bg-zinc-700 text-[#5A5A40] dark:text-emerald-400 shadow-sm" : "text-[#8a8a7a] dark:text-zinc-400 hover:text-[#5A5A40] dark:hover:text-emerald-400")}
              >
                {t.calendar}
              </button>
              <button 
                onClick={() => setActiveTab('memoryBox')}
                className={cn("px-4 py-2 rounded-full transition-all whitespace-nowrap", activeTab === 'memoryBox' ? "bg-white dark:bg-zinc-700 text-[#5A5A40] dark:text-emerald-400 shadow-sm" : "text-[#8a8a7a] dark:text-zinc-400 hover:text-[#5A5A40] dark:hover:text-emerald-400")}
              >
                {t.memoryBox}
              </button>
              <button 
                onClick={() => setActiveTab('profile')}
                className={cn("px-4 py-2 rounded-full transition-all whitespace-nowrap", activeTab === 'profile' ? "bg-white dark:bg-zinc-700 text-[#5A5A40] dark:text-emerald-400 shadow-sm" : "text-[#8a8a7a] dark:text-zinc-400 hover:text-[#5A5A40] dark:hover:text-emerald-400")}
              >
                {t.profile}
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="md:hidden bg-white dark:bg-zinc-900 border-b border-[#e5e5d5] dark:border-zinc-800 sticky top-0 z-10 shadow-sm transition-colors">
        <div className="max-w-5xl mx-auto py-4 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DadAvatar emotion={currentEmotion} isThinking={isLoading} />
            <h1 className="text-lg font-bold tracking-tight text-[#5A5A40] dark:text-emerald-400">{t.appName}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2 text-[#5A5A40] dark:text-emerald-400 hover:bg-[#f5f5f0] dark:hover:bg-zinc-800 rounded-full transition-all"
              title={theme === 'light' ? t.darkMode : t.lightMode}
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <button 
              onClick={handleGetSummary}
              className="p-2 text-[#5A5A40] dark:text-emerald-400 hover:bg-[#f5f5f0] dark:hover:bg-zinc-800 rounded-full transition-all"
              title={t.summary}
            >
              <History size={20} />
            </button>
            <button 
              onClick={() => setLanguage(l => l === 'en' ? 'id' : 'en')}
              className="p-2 text-[#5A5A40] dark:text-emerald-400 hover:bg-[#f5f5f0] dark:hover:bg-zinc-800 rounded-full transition-all"
            >
              <Languages size={20} />
            </button>
            <button 
              onClick={() => setShowCheckinModal(true)}
              className="p-2 text-[#5A5A40] dark:text-emerald-400 hover:bg-[#f5f5f0] dark:hover:bg-zinc-800 rounded-full transition-all"
              title={t.checkin}
            >
              <Activity size={20} />
            </button>
            <button 
              onClick={handleAffirmation}
              disabled={isLoading}
              className="p-2 text-[#5A5A40] dark:text-emerald-400 hover:bg-[#f5f5f0] dark:hover:bg-zinc-800 rounded-full transition-all"
            >
              <Sparkles size={20} />
            </button>
            <button 
              onClick={handleExportChat}
              className="p-2 text-[#5A5A40] dark:text-emerald-400 hover:bg-[#f5f5f0] dark:hover:bg-zinc-800 rounded-full transition-all"
              title={t.exportChat}
            >
              <Download size={20} />
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
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/10 dark:to-amber-900/10 p-4 rounded-2xl border border-orange-100 dark:border-orange-900/30 shadow-sm mb-4 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-2 opacity-10">
                    <Smile size={48} className="dark:text-orange-400" />
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} className="text-orange-500 dark:text-orange-400" />
                      <h3 className="text-xs font-sans font-bold uppercase tracking-widest text-orange-700 dark:text-orange-400">{t.dailyJoke}</h3>
                    </div>
                    {dailyJoke && (
                      <button 
                        onClick={() => setIsJokeCollapsed(!isJokeCollapsed)}
                        className="p-1 hover:bg-orange-200/50 dark:hover:bg-orange-900/30 rounded-lg transition-colors text-orange-700 dark:text-orange-400 z-10"
                        title={isJokeCollapsed ? "Expand" : "Collapse"}
                      >
                        {isJokeCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                      </button>
                    )}
                  </div>
                  
                  {!dailyJoke ? (
                    <div className="flex flex-col items-center gap-3 py-2">
                      <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">{t.needBoost}</p>
                      <button
                        onClick={fetchDailyJoke}
                        disabled={isFetchingJoke}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-full text-xs font-bold shadow-md transition-all active:scale-95 disabled:opacity-50"
                      >
                        {isFetchingJoke ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Smile size={14} />
                        )}
                        {t.getJoke}
                      </button>
                    </div>
                  ) : (
                    <AnimatePresence initial={false}>
                      {!isJokeCollapsed && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="relative"
                        >
                          <p className="text-sm md:text-base text-orange-900 dark:text-orange-200 italic leading-relaxed pt-1">"{dailyJoke}"</p>
                          <button 
                            onClick={fetchDailyJoke}
                            disabled={isFetchingJoke}
                            className="mt-3 text-[10px] font-bold uppercase tracking-widest text-orange-600 dark:text-orange-400 hover:text-orange-700 flex items-center gap-1 transition-colors"
                          >
                            <RefreshCw size={10} className={isFetchingJoke ? "animate-spin" : ""} />
                            {t.newJoke}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                </motion.div>

                <AnimatePresence initial={false}>
                  {messages.map((msg) => (
                    <motion.div 
                      key={msg.id} 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, x: msg.role === 'user' ? 20 : -20, scale: 0.95, transition: { duration: 0.2 } }}
                      layout
                      className={cn("flex gap-3 md:gap-4", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}
                    >
                      <div className={cn(
                        "w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                        msg.role === 'user' ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" : "bg-[#5A5A40] dark:bg-emerald-600 text-white"
                      )}>
                        {msg.role === 'user' ? <User size={16} className="md:w-5 md:h-5" /> : <Smile size={16} className="md:w-5 md:h-5" />}
                      </div>
                      <div 
                        onClick={() => setSelectedMessageId(selectedMessageId === msg.id ? null : msg.id)}
                        className={cn(
                          "max-w-[85%] md:max-w-[80%] p-3 md:p-4 rounded-2xl shadow-sm relative group/msg cursor-pointer md:cursor-default",
                          msg.role === 'user' ? "bg-white dark:bg-zinc-800 rounded-tr-none border border-indigo-50 dark:border-indigo-900/30" : "bg-[#f0f0e8] dark:bg-zinc-900 rounded-tl-none border border-[#e5e5d5] dark:border-zinc-800"
                        )}
                      >
                        <div className="prose prose-stone dark:prose-invert prose-sm max-w-none text-sm md:text-base">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                        
                        {/* Message Actions */}
                        <div className={cn(
                          "mt-2 pt-2 border-t border-[#e5e5d5] dark:border-zinc-800 flex items-center justify-between transition-all duration-200",
                          msg.role === 'user' ? "flex-row-reverse" : "flex-row",
                          selectedMessageId === msg.id ? "opacity-100 h-auto" : "opacity-0 md:group-hover/msg:opacity-100 h-0 md:h-auto overflow-hidden md:overflow-visible"
                        )}>
                          <div className="flex gap-2">
                            {msg.role === 'model' && (
                              <button 
                                onClick={() => saveMemory(msg.content)}
                                disabled={isSavingMemory}
                                className="text-[10px] uppercase tracking-wider font-bold text-gray-400 dark:text-zinc-500 hover:text-[#5A5A40] dark:hover:text-emerald-400 flex items-center gap-1 transition-colors"
                              >
                                <Star size={12} className={isSavingMemory ? "animate-spin" : ""} />
                                {t.saveToMemoryBox}
                              </button>
                            )}
                          </div>
                          <div className="flex gap-2 items-center">
                            {msg.role === 'model' && (
                              <>
                                <button 
                                  onClick={() => handleSpeak(msg.content)}
                                  className="p-1.5 rounded-lg text-[#d5d5c5] dark:text-zinc-600 hover:text-orange-500 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all"
                                  title="Hear"
                                >
                                  <Mic size={14} />
                                </button>
                                <button 
                                  onClick={() => handleShare(t.appName, msg.content)}
                                  className="p-1.5 rounded-lg text-[#d5d5c5] dark:text-zinc-600 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"
                                  title={t.shareSocial}
                                >
                                  <Share2 size={14} />
                                </button>
                                <button 
                                  onClick={() => handleRating(msg.id, 1, msg.content)}
                                  className={cn(
                                    "p-1.5 rounded-lg transition-all",
                                    msg.rating === 1 ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-indigo-400" : "text-[#d5d5c5] dark:text-zinc-600 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                  )}
                                  title="Helpful"
                                >
                                  <ThumbsUp size={14} fill={msg.rating === 1 ? "currentColor" : "none"} />
                                </button>
                                <button 
                                  onClick={() => handleRating(msg.id, -1, msg.content)}
                                  className={cn(
                                    "p-1.5 rounded-lg transition-all",
                                    msg.rating === -1 ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" : "text-[#d5d5c5] dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  )}
                                  title="Not helpful"
                                >
                                  <ThumbsDown size={14} fill={msg.rating === -1 ? "currentColor" : "none"} />
                                </button>
                              </>
                            )}
                            {msg.id !== 'initial' && !msg.id.startsWith('quota-') && msg.id !== 'error' && (
                              <button 
                                onClick={() => deleteChatMessage(msg.id)}
                                className="p-1.5 rounded-lg text-[#d5d5c5] dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                                title="Delete message"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {isLoading && (
                  <div className="flex gap-3 md:gap-4">
                    <DadAvatar emotion={currentEmotion} isThinking />
                    <div className="bg-[#f0f0e8] dark:bg-zinc-900 p-3 md:p-4 rounded-2xl rounded-tl-none shadow-sm flex gap-1 items-center border border-[#e5e5d5] dark:border-zinc-800">
                      <div className="w-1 h-1 md:w-1.5 md:h-1.5 bg-[#5A5A40] dark:bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1 h-1 md:w-1.5 md:h-1.5 bg-[#5A5A40] dark:bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1 h-1 md:w-1.5 md:h-1.5 bg-[#5A5A40] dark:bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="flex flex-col gap-2">
                {/* Rich Text Toolbar */}
                <div className="flex gap-1 px-1 md:px-2 mb-1 items-center justify-between overflow-x-auto no-scrollbar">
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => insertFormatting('**')} className="p-1 md:p-1.5 text-[10px] md:text-xs font-bold bg-white dark:bg-zinc-800 border border-[#e5e5d5] dark:border-zinc-700 rounded hover:bg-[#f5f5f0] dark:hover:bg-zinc-700 transition-colors shadow-sm text-[#3a3a2e] dark:text-zinc-100">B</button>
                    <button onClick={() => insertFormatting('*')} className="p-1 md:p-1.5 text-[10px] md:text-xs italic bg-white dark:bg-zinc-800 border border-[#e5e5d5] dark:border-zinc-700 rounded hover:bg-[#f5f5f0] dark:hover:bg-zinc-700 transition-colors shadow-sm text-[#3a3a2e] dark:text-zinc-100">I</button>
                    <button onClick={() => insertFormatting('- ')} className="p-1 md:p-1.5 text-[10px] md:text-xs bg-white dark:bg-zinc-800 border border-[#e5e5d5] dark:border-zinc-700 rounded hover:bg-[#f5f5f0] dark:hover:bg-zinc-700 transition-colors shadow-sm text-[#3a3a2e] dark:text-zinc-100">List</button>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button 
                      onClick={handleGetSummary}
                      className="hidden md:flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-white dark:bg-zinc-800 border border-[#e5e5d5] dark:border-zinc-700 rounded-full hover:bg-[#f5f5f0] dark:hover:bg-zinc-700 transition-colors shadow-sm text-[#5A5A40] dark:text-emerald-400"
                    >
                      <History size={14} />
                      {t.summary}
                    </button>
                    <button 
                      onClick={() => setShowCheckinModal(true)}
                      className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 text-[10px] md:text-xs font-bold bg-white dark:bg-zinc-800 border border-[#e5e5d5] dark:border-zinc-700 rounded-full hover:bg-[#f5f5f0] dark:hover:bg-zinc-700 transition-colors shadow-sm text-[#5A5A40] dark:text-emerald-400"
                    >
                      <Activity size={12} className="md:w-3.5 md:h-3.5" />
                      {t.checkin}
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSend} className="relative">
                  <div className="flex gap-1 md:gap-2 items-center bg-white dark:bg-zinc-900 p-1 md:p-1.5 rounded-2xl shadow-lg border border-[#e5e5d5] dark:border-zinc-800 transition-colors">
                    <div className="flex items-center gap-0.5 md:gap-1">
                      <div className="relative">
                        <button 
                          type="button"
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className="p-1.5 md:p-2 text-[#8a8a7a] dark:text-zinc-400 hover:text-[#5A5A40] dark:hover:text-emerald-400 hover:bg-[#f5f5f0] dark:hover:bg-zinc-800 rounded-xl transition-colors"
                        >
                          <Smile size={18} className="md:w-5 md:h-5" />
                        </button>
                        <AnimatePresence>
                          {showEmojiPicker && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              className="absolute bottom-full mb-2 left-0 bg-white dark:bg-zinc-800 border border-[#e5e5d5] dark:border-zinc-700 rounded-2xl shadow-xl p-2 flex flex-wrap gap-1 w-40 z-50"
                            >
                              {commonEmojis.map(emoji => (
                                <button 
                                  key={emoji}
                                  type="button"
                                  onClick={() => addEmoji(emoji)}
                                  className="w-8 h-8 flex items-center justify-center hover:bg-[#f5f5f0] dark:hover:bg-zinc-700 rounded-lg transition-colors text-xl"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-1.5 md:p-2 text-[#8a8a7a] dark:text-zinc-400 hover:text-[#5A5A40] dark:hover:text-emerald-400 hover:bg-[#f5f5f0] dark:hover:bg-zinc-800 rounded-xl transition-colors"
                        title={t.attachFile}
                      >
                        <Paperclip size={18} className="md:w-5 md:h-5" />
                      </button>
                      
                      {!input.trim() && (
                        <button 
                          type="button"
                          onMouseDown={handleVoiceInputStart}
                          onMouseUp={handleVoiceInputEnd}
                          onMouseLeave={handleVoiceInputEnd}
                          onTouchStart={handleVoiceInputStart}
                          onTouchEnd={handleVoiceInputEnd}
                          className={cn(
                            "p-1.5 md:p-2 rounded-xl transition-all",
                            isListening 
                              ? "bg-red-500 text-white animate-pulse scale-105 shadow-md shadow-red-200 dark:shadow-red-900/20" 
                              : "text-[#8a8a7a] dark:text-zinc-400 hover:text-[#5A5A40] dark:hover:text-emerald-400 hover:bg-[#f5f5f0] dark:hover:bg-zinc-800"
                          )}
                          title={t.voiceInput}
                        >
                          <Mic size={18} className="md:w-5 md:h-5" />
                        </button>
                      )}
                    </div>

                    <input 
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={isListening ? t.listening : t.askDad}
                      className="flex-1 bg-transparent border-none focus:ring-0 py-2 md:py-2.5 px-1 md:px-2 font-sans text-sm md:text-lg text-[#3a3a2e] dark:text-zinc-100 placeholder-[#8a8a7a] dark:placeholder-zinc-500"
                    />
                    
                    {input.trim() && (
                      <button 
                        type="submit"
                        disabled={isLoading}
                        className="bg-gradient-to-r from-[#5A5A40] to-[#7a7a5a] dark:from-emerald-600 dark:to-emerald-500 text-white p-2 md:p-2.5 rounded-xl hover:shadow-md transition-all shadow-md active:scale-95 shrink-0"
                      >
                        <Send size={18} className="md:w-5 md:h-5" />
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
                <h2 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2 text-[#5A5A40] dark:text-emerald-400">{t.toolboxTitle}</h2>
                <p className="text-sm md:text-base text-[#8a8a7a] dark:text-zinc-400">{t.toolboxDesc}</p>
              </div>

              {/* Skill of the Week */}
              {skillOfTheWeek && (
                <div className="col-span-full bg-gradient-to-br from-[#5A5A40] to-[#7a7a5a] dark:from-emerald-700 dark:to-emerald-900 p-6 md:p-8 rounded-3xl text-white shadow-xl mb-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Sparkles size={120} />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                      <Star size={20} className="text-amber-400 fill-amber-400" />
                      <span className="text-xs font-sans font-bold uppercase tracking-widest text-amber-200">{t.skillOfTheWeek}</span>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold mb-2">{skillOfTheWeek.name}</h3>
                    <p className="text-sm md:text-base text-gray-100 dark:text-zinc-200 mb-6 max-w-xl">{t.skillOfTheWeekDesc}</p>
                    <button 
                      onClick={() => {
                        setActiveTab('chat');
                        setInput(language === 'en' ? `Dad, can you teach me how to ${skillOfTheWeek.name.toLowerCase()}?` : `Ayah, bisa ajari aku cara ${skillOfTheWeek.name.toLowerCase()}?`);
                      }}
                      className="bg-white dark:bg-zinc-100 text-[#5A5A40] dark:text-emerald-900 px-6 py-3 rounded-xl font-sans font-bold hover:bg-gray-100 dark:hover:bg-white transition-all flex items-center gap-2 w-fit"
                    >
                      {t.learnThis} <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )}
              {skills.map((skill) => (
                <div key={skill.id} className="bg-white dark:bg-zinc-900 p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-[#e5e5d5] dark:border-zinc-800 hover:shadow-md hover:border-orange-100 dark:hover:border-emerald-900/50 transition-all group">
                  <div className="flex justify-between items-start mb-3 md:mb-4">
                    <div className="p-2 md:p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl md:rounded-2xl text-orange-600 dark:text-orange-400 group-hover:bg-orange-600 dark:group-hover:bg-orange-500 group-hover:text-white transition-colors">
                      <Wrench size={20} className="md:w-6 md:h-6" />
                    </div>
                    {skill.completed ? (
                      <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-sans text-[10px] md:text-xs font-bold uppercase tracking-wider">
                        <CheckCircle2 size={14} className="md:w-4 md:h-4" /> {t.mastered}
                      </div>
                    ) : (
                      <button 
                        onClick={() => completeSkill(skill.id)}
                        className="text-[10px] md:text-xs font-sans font-bold uppercase tracking-wider text-[#8a8a7a] dark:text-zinc-500 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                      >
                        {t.markLearned}
                      </button>
                    )}
                  </div>
                  <h3 className="text-lg md:text-xl font-bold mb-1 md:mb-2 text-[#3a3a2e] dark:text-zinc-100">{skill.name}</h3>
                  <p className="text-xs md:text-sm text-[#8a8a7a] dark:text-zinc-400 mb-3 md:mb-4">{skill.description}</p>
                  <button 
                    onClick={() => {
                      setActiveTab('chat');
                      setInput(language === 'en' ? `Dad, can you teach me how to ${skill.name.toLowerCase()}?` : `Ayah, bisa ajari aku cara ${skill.name.toLowerCase()}?`);
                    }}
                    className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-sans text-xs md:text-sm font-bold group-hover:translate-x-1 transition-transform"
                  >
                    {t.learnThis} <ChevronRight size={14} className="md:w-4 md:h-4" />
                  </button>
                </div>
              ))}
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
                <h2 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2 text-[#5A5A40] dark:text-emerald-400">{t.calendarTitle}</h2>
                <p className="text-sm md:text-base text-[#8a8a7a] dark:text-zinc-400">{t.calendarDesc}</p>
              </div>

              <div className="bg-white dark:bg-zinc-900 p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-[#e5e5d5] dark:border-zinc-800 transition-colors">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                  <input 
                    type="text" 
                    placeholder={t.eventTitle}
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                    className="bg-[#f5f5f0] dark:bg-zinc-800 border-none focus:ring-0 rounded-xl px-4 py-3 font-sans text-sm text-[#3a3a2e] dark:text-zinc-100 placeholder-[#8a8a7a] dark:placeholder-zinc-500"
                  />
                  <input 
                    type="date" 
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                    className="bg-[#f5f5f0] dark:bg-zinc-800 border-none focus:ring-0 rounded-xl px-4 py-3 font-sans text-sm text-[#3a3a2e] dark:text-zinc-100"
                  />
                  <select 
                    value={newEvent.type}
                    onChange={(e) => setNewEvent({...newEvent, type: e.target.value})}
                    className="bg-[#f5f5f0] dark:bg-zinc-800 border-none focus:ring-0 rounded-xl px-4 py-3 font-sans text-sm text-[#3a3a2e] dark:text-zinc-100"
                  >
                    <option value="event">{t.eventPersonal}</option>
                    <option value="advice">{t.eventAdvice}</option>
                    <option value="skill">{t.eventSkill}</option>
                  </select>
                  <button 
                    onClick={addCalendarEvent}
                    disabled={!newEvent.title || !newEvent.date}
                    className="bg-amber-500 dark:bg-amber-600 text-white px-6 py-3 rounded-xl font-sans font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-md hover:bg-amber-600 dark:hover:bg-amber-500 transition-all"
                  >
                    <Plus size={18} />
                    {t.addEvent}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {calendarEvents.length === 0 ? (
                  <div className="py-12 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-dashed border-[#e5e5d5] dark:border-zinc-800">
                    <CalendarIcon size={48} className="mx-auto mb-4 text-[#d5d5c5] dark:text-zinc-700" />
                    <p className="text-[#8a8a7a] dark:text-zinc-500 font-sans">{t.noEvents}</p>
                  </div>
                ) : (
                  calendarEvents.map((event) => (
                    <div key={event.id} className="bg-white dark:bg-zinc-900 p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-[#e5e5d5] dark:border-zinc-800 flex items-center justify-between group transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center",
                          event.type === 'advice' ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" : 
                          event.type === 'skill' ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" : 
                          "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
                        )}>
                          <CalendarIcon size={24} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg text-[#3a3a2e] dark:text-zinc-100">{event.title}</h3>
                            <span className={cn(
                              "text-[8px] md:text-[10px] font-sans font-bold uppercase tracking-widest px-2 py-0.5 rounded-full",
                              event.type === 'advice' ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" : 
                              event.type === 'skill' ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" : 
                              "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                            )}>
                              {event.type === 'advice' ? t.eventAdvice : 
                               event.type === 'skill' ? t.eventSkill : 
                               t.eventPersonal}
                            </span>
                          </div>
                          <p className="text-xs text-[#8a8a7a] dark:text-zinc-500 font-sans uppercase tracking-widest">
                            {new Date(event.date).toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID', { month: 'long', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => deleteCalendarEvent(event.id)}
                        className="p-3 text-[#8a8a7a] dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
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
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4 md:mb-8 gap-4">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2 text-[#5A5A40] dark:text-emerald-400">{t.memoryBoxTitle}</h2>
                  <p className="text-sm md:text-base text-[#8a8a7a] dark:text-zinc-400">{t.memoryBoxDesc}</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <button 
                    onClick={() => handleExportMemories('txt')}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 text-[#5A5A40] dark:text-zinc-300 rounded-xl border border-[#e5e5d5] dark:border-zinc-700 text-sm font-bold hover:bg-[#f5f5f0] dark:hover:bg-zinc-700 transition-all"
                  >
                    <Download size={16} />
                    {t.exportTXT}
                  </button>
                  <button 
                    onClick={() => handleExportMemories('pdf')}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 text-[#5A5A40] dark:text-zinc-300 rounded-xl border border-[#e5e5d5] dark:border-zinc-700 text-sm font-bold hover:bg-[#f5f5f0] dark:hover:bg-zinc-700 transition-all"
                  >
                    <Download size={16} />
                    {t.exportPDF}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <AnimatePresence mode="popLayout">
                  {memories.length === 0 ? (
                    <div className="col-span-full py-20 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-dashed border-[#e5e5d5] dark:border-zinc-800">
                      <Star size={48} className="mx-auto mb-4 text-[#d5d5c5] dark:text-zinc-700" />
                      <p className="text-[#8a8a7a] dark:text-zinc-500 font-sans">{t.noMemories}</p>
                    </div>
                  ) : (
                    memories.map((memory) => (
                      <motion.div 
                        key={memory.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-white dark:bg-zinc-900 p-5 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-[#e5e5d5] dark:border-zinc-800 group relative overflow-hidden transition-colors"
                      >
                        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <button 
                            onClick={() => handleShare(t.memoryBoxTitle, memory.content)}
                            className="p-2 text-[#8a8a7a] dark:text-zinc-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
                            title={t.shareSocial}
                          >
                            <Share2 size={18} />
                          </button>
                          <button 
                            onClick={() => deleteMemory(memory.id)}
                            className="p-2 text-[#8a8a7a] dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                            <Star size={20} />
                          </div>
                          <div className="flex-1">
                            <div className="text-[10px] text-[#8a8a7a] dark:text-zinc-500 font-sans uppercase tracking-widest mb-2">
                              {new Date(memory.date).toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID', { month: 'long', day: 'numeric', year: 'numeric' })}
                            </div>
                            <div className="prose prose-stone dark:prose-invert prose-sm max-w-none text-sm md:text-base text-[#5a5a4a] dark:text-zinc-300 italic leading-relaxed">
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
                  <h2 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2 text-[#5A5A40] dark:text-emerald-400">{t.journalTitle}</h2>
                  <p className="text-sm md:text-base text-[#8a8a7a] dark:text-zinc-400">{t.journalDesc}</p>
                </div>
                <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white shadow-lg rotate-12">
                  <BookOpen size={24} className="md:w-8 md:h-8" />
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-[#e5e5d5] dark:border-zinc-800 transition-colors">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  <input 
                    type="text" 
                    placeholder={t.journalEntryTitle}
                    value={newJournalEntry.title}
                    onChange={(e) => setNewJournalEntry({...newJournalEntry, title: e.target.value})}
                    className="bg-[#f5f5f0] dark:bg-zinc-800 border-none focus:ring-0 rounded-xl px-4 py-3 font-sans text-sm text-[#3a3a2e] dark:text-zinc-100 placeholder-[#8a8a7a] dark:placeholder-zinc-500"
                  />
                  <input 
                    type="date" 
                    value={newJournalEntry.date}
                    onChange={(e) => setNewJournalEntry({...newJournalEntry, date: e.target.value})}
                    className="bg-[#f5f5f0] dark:bg-zinc-800 border-none focus:ring-0 rounded-xl px-4 py-3 font-sans text-sm text-[#3a3a2e] dark:text-zinc-100"
                  />
                  <select 
                    value={newJournalEntry.category}
                    onChange={(e) => setNewJournalEntry({...newJournalEntry, category: e.target.value})}
                    className="bg-[#f5f5f0] dark:bg-zinc-800 border-none focus:ring-0 rounded-xl px-4 py-3 font-sans text-sm text-[#3a3a2e] dark:text-zinc-100"
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
                  className="w-full bg-[#f5f5f0] dark:bg-zinc-800 border-none focus:ring-0 rounded-xl px-4 py-3 font-sans text-sm mb-4 min-h-[100px] text-[#3a3a2e] dark:text-zinc-100 placeholder-[#8a8a7a] dark:placeholder-zinc-500"
                />
                <div className="flex flex-col md:flex-row gap-3">
                  <button 
                    onClick={addJournalEntry}
                    disabled={!newJournalEntry.title || !newJournalEntry.content}
                    className="bg-emerald-500 dark:bg-emerald-600 text-white px-6 py-3 rounded-xl font-sans font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-md hover:bg-emerald-600 dark:hover:bg-emerald-500 transition-all w-full md:w-auto"
                  >
                    <Plus size={18} />
                    {t.addEntry}
                  </button>
                  <button 
                    onClick={getJournalPrompt}
                    disabled={isPrompting}
                    className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-6 py-3 rounded-xl font-sans font-bold flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-all w-full md:w-auto"
                  >
                    <Sparkles size={18} className={cn(isPrompting && "animate-spin")} />
                    {isPrompting ? t.prompting : t.getPrompt}
                  </button>
                </div>
              </div>

              {journal.length === 0 ? (
                <div className="bg-white dark:bg-zinc-900 p-8 md:p-12 rounded-2xl md:rounded-3xl text-center border-2 border-dashed border-[#e5e5d5] dark:border-zinc-800">
                  <p className="text-sm md:text-base text-[#8a8a7a] dark:text-zinc-500 italic">{t.noJournal}</p>
                </div>
              ) : (
                <div className="space-y-4 md:space-y-6">
                  {journal.map((entry) => (
                    <div key={entry.id} className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border-l-4 md:border-l-8 border-emerald-500 dark:border-emerald-600 relative overflow-hidden hover:shadow-md transition-all">
                      <div className="absolute top-0 right-0 p-2 md:p-4 opacity-5 dark:opacity-10">
                        <Heart size={60} className="md:w-20 md:h-20 text-emerald-500 dark:text-emerald-400" />
                      </div>
                      <div className="flex justify-between items-start mb-3 md:mb-4">
                        <span className="px-2 py-0.5 md:px-3 md:py-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-full text-[8px] md:text-[10px] font-sans font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                          {entry.category}
                        </span>
                        <span className="text-[10px] md:text-xs font-sans text-[#8a8a7a] dark:text-zinc-500">
                          {new Date(entry.date).toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <h3 className="text-lg md:text-2xl font-bold mb-2 md:mb-3 text-emerald-900 dark:text-emerald-400">{entry.title}</h3>
                      <p className="text-sm md:text-base text-[#5a5a4a] dark:text-zinc-300 leading-relaxed italic">"{entry.content}"</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}



          {activeTab === 'profile' && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl mx-auto space-y-8"
            >
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-[#5A5A40] dark:bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-lg transition-colors">
                    <User size={32} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-[#5A5A40] dark:text-emerald-400">{t.profile}</h2>
                    <p className="text-[#8a8a7a] dark:text-zinc-400">Personalize your experience with Dad</p>
                  </div>
                </div>
                
                <div className="flex gap-1 bg-[#f0f0e5] dark:bg-zinc-800 p-1 rounded-xl font-sans text-xs font-bold transition-colors">
                  <button 
                    onClick={() => setProfileSubTab('about')}
                    className={cn("px-4 py-2 rounded-lg transition-all", profileSubTab === 'about' ? "bg-white dark:bg-zinc-700 text-[#5A5A40] dark:text-emerald-400 shadow-sm" : "text-[#8a8a7a] dark:text-zinc-500 hover:text-[#5A5A40] dark:hover:text-emerald-300")}
                  >
                    {t.aboutMe}
                  </button>
                  <button 
                    onClick={() => setProfileSubTab('goals')}
                    className={cn("px-4 py-2 rounded-lg transition-all", profileSubTab === 'goals' ? "bg-white dark:bg-zinc-700 text-[#5A5A40] dark:text-emerald-400 shadow-sm" : "text-[#8a8a7a] dark:text-zinc-500 hover:text-[#5A5A40] dark:hover:text-emerald-300")}
                  >
                    {t.myGoals}
                  </button>
                  <button 
                    onClick={() => setProfileSubTab('progress')}
                    className={cn("px-4 py-2 rounded-lg transition-all", profileSubTab === 'progress' ? "bg-white dark:bg-zinc-700 text-[#5A5A40] dark:text-emerald-400 shadow-sm" : "text-[#8a8a7a] dark:text-zinc-500 hover:text-[#5A5A40] dark:hover:text-emerald-300")}
                  >
                    {t.progress}
                  </button>
                  <button 
                    onClick={() => setProfileSubTab('safety')}
                    className={cn("px-4 py-2 rounded-lg transition-all", profileSubTab === 'safety' ? "bg-white dark:bg-zinc-700 text-[#5A5A40] dark:text-emerald-400 shadow-sm" : "text-[#8a8a7a] dark:text-zinc-500 hover:text-[#5A5A40] dark:hover:text-emerald-300")}
                  >
                    {t.safetyNet}
                  </button>
                  <button 
                    onClick={() => setProfileSubTab('settings')}
                    className={cn("px-4 py-2 rounded-lg transition-all", profileSubTab === 'settings' ? "bg-white dark:bg-zinc-700 text-[#5A5A40] dark:text-emerald-400 shadow-sm" : "text-[#8a8a7a] dark:text-zinc-500 hover:text-[#5A5A40] dark:hover:text-emerald-300")}
                  >
                    {t.settings}
                  </button>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {profileSubTab === 'about' && (
                  <motion.div 
                    key="about"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl shadow-sm border border-[#e5e5d5] dark:border-zinc-800 space-y-6 transition-colors"
                  >
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-[#8a8a7a] dark:text-zinc-500 mb-2">{t.preferredNameLabel}</label>
                      <input 
                        type="text"
                        value={profile.preferredName || ''}
                        onChange={(e) => setProfile({...profile, preferredName: e.target.value})}
                        placeholder="e.g., Kiddo, Champ, [Your Name]..."
                        className="w-full bg-[#f5f5f0] dark:bg-zinc-800 border-none focus:ring-2 focus:ring-[#5A5A40] dark:focus:ring-emerald-500 rounded-2xl px-4 py-3 font-sans text-sm text-[#3a3a2e] dark:text-zinc-100 placeholder-[#8a8a7a] dark:placeholder-zinc-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-[#8a8a7a] dark:text-zinc-500 mb-2">{t.interests}</label>
                      <textarea 
                        value={profile.interests}
                        onChange={(e) => setProfile({...profile, interests: e.target.value})}
                        placeholder="e.g., Coding, Music, Hiking..."
                        className="w-full bg-[#f5f5f0] dark:bg-zinc-800 border-none focus:ring-2 focus:ring-[#5A5A40] dark:focus:ring-emerald-500 rounded-2xl px-4 py-3 font-sans text-sm min-h-[80px] text-[#3a3a2e] dark:text-zinc-100 placeholder-[#8a8a7a] dark:placeholder-zinc-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-[#8a8a7a] dark:text-zinc-500 mb-2">{t.goals}</label>
                      <textarea 
                        value={profile.goals}
                        onChange={(e) => setProfile({...profile, goals: e.target.value})}
                        placeholder="e.g., Learn to cook, Get a job, Save money..."
                        className="w-full bg-[#f5f5f0] dark:bg-zinc-800 border-none focus:ring-2 focus:ring-[#5A5A40] dark:focus:ring-emerald-500 rounded-2xl px-4 py-3 font-sans text-sm min-h-[80px] text-[#3a3a2e] dark:text-zinc-100 placeholder-[#8a8a7a] dark:placeholder-zinc-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-[#8a8a7a] dark:text-zinc-500 mb-2">{t.challenges}</label>
                      <textarea 
                        value={profile.challenges}
                        onChange={(e) => setProfile({...profile, challenges: e.target.value})}
                        placeholder="e.g., Procrastination, Public speaking..."
                        className="w-full bg-[#f5f5f0] dark:bg-zinc-800 border-none focus:ring-2 focus:ring-[#5A5A40] dark:focus:ring-emerald-500 rounded-2xl px-4 py-3 font-sans text-sm min-h-[80px] text-[#3a3a2e] dark:text-zinc-100 placeholder-[#8a8a7a] dark:placeholder-zinc-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-[#8a8a7a] dark:text-zinc-500 mb-2">{t.dadPersonality}</label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                        {[
                          { id: 'mentor', label: t.mentor, icon: <BrainCircuit size={18} />, desc: t.archetypeMentor },
                          { id: 'playful', label: t.playful, icon: <Smile size={18} />, desc: t.archetypePlayful },
                          { id: 'wise elder', label: t.wiseElder, icon: <History size={18} />, desc: t.archetypeWiseElder }
                        ].map((arch) => (
                          <button
                            key={arch.id}
                            onClick={() => setProfile({...profile, personality: arch.id as any})}
                            className={cn(
                              "p-4 rounded-2xl border-2 transition-all text-left group",
                              profile.personality === arch.id 
                                ? "border-[#5A5A40] dark:border-emerald-500 bg-[#5A5A40]/5 dark:bg-emerald-500/10" 
                                : "border-transparent bg-[#f5f5f0] dark:bg-zinc-800 hover:bg-[#e5e5d5] dark:hover:bg-zinc-700"
                            )}
                          >
                            <div className={cn("mb-2", profile.personality === arch.id ? "text-[#5A5A40] dark:text-emerald-400" : "text-[#8a8a7a] dark:text-zinc-500")}>
                              {arch.icon}
                            </div>
                            <div className={cn("font-bold text-sm mb-1", profile.personality === arch.id ? "text-[#3a3a2e] dark:text-zinc-100" : "text-[#8a8a7a] dark:text-zinc-400")}>{arch.label}</div>
                            <div className="text-[10px] text-[#8a8a7a] dark:text-zinc-500 leading-tight">{arch.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-[#8a8a7a] dark:text-zinc-500 mb-2">{t.favoriteJokes}</label>
                      <p className="text-xs text-[#8a8a7a] dark:text-zinc-500 mb-3">{t.favoriteJokesDesc}</p>
                      <textarea 
                        value={profile.favorite_jokes || ''}
                        onChange={(e) => setProfile({...profile, favorite_jokes: e.target.value})}
                        placeholder={t.jokesPlaceholder}
                        className="w-full bg-[#f5f5f0] dark:bg-zinc-800 border-none focus:ring-2 focus:ring-[#5A5A40] dark:focus:ring-emerald-500 rounded-2xl px-4 py-3 font-sans text-sm min-h-[100px] text-[#3a3a2e] dark:text-zinc-100 placeholder-[#8a8a7a] dark:placeholder-zinc-600"
                      />
                    </div>

                    <button 
                      onClick={updateProfile}
                      className="w-full bg-[#5A5A40] dark:bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-[#4a4a35] dark:hover:bg-emerald-500 transition-all flex items-center justify-center gap-2"
                    >
                      <Save size={20} />
                      {t.saveProfile}
                    </button>
                  </motion.div>
                )}

                {profileSubTab === 'goals' && (
                  <motion.div 
                    key="goals"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-[#e5e5d5] dark:border-zinc-800 transition-colors">
                      <h3 className="text-xl font-bold mb-4 text-[#5A5A40] dark:text-emerald-400">{t.goalsTitle}</h3>
                      <div className="flex flex-col md:flex-row gap-2">
                        <input 
                          type="text" 
                          value={newGoalTitle}
                          onChange={(e) => setNewGoalTitle(e.target.value)}
                          placeholder={t.goalPlaceholder}
                          className="flex-1 bg-[#f5f5f0] dark:bg-zinc-800 border-none focus:ring-0 rounded-xl px-4 py-3 font-sans text-sm text-[#3a3a2e] dark:text-zinc-100 placeholder-[#8a8a7a] dark:placeholder-zinc-500"
                        />
                        <button 
                          onClick={createGoal}
                          disabled={!newGoalTitle.trim() || isBreakingDownGoal}
                          className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-3 rounded-xl font-sans font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-md hover:shadow-lg transition-all"
                        >
                          {isBreakingDownGoal ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Target size={18} />}
                          {isBreakingDownGoal ? t.breakingDown : t.setGoal}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                      <Reorder.Group axis="y" values={goals} onReorder={reorderGoals} className="space-y-6">
                        {goals.map((goal) => (
                          <Reorder.Item 
                            key={goal.id} 
                            value={goal}
                            className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl shadow-sm border border-[#e5e5d5] dark:border-zinc-800 hover:border-indigo-100 dark:hover:border-indigo-900 transition-colors cursor-default"
                          >
                            <div className="flex justify-between items-start mb-6">
                              <div className="flex items-start gap-3">
                                <div className="mt-1 text-[#d5d5c5] dark:text-zinc-700 cursor-grab active:cursor-grabbing">
                                  <GripVertical size={20} />
                                </div>
                                <div>
                                  <h3 className="text-xl md:text-2xl font-bold mb-1 text-indigo-900 dark:text-indigo-400">{goal.title}</h3>
                                  <p className="text-[10px] font-sans text-[#8a8a7a] dark:text-zinc-500 uppercase tracking-widest">{t.started} {new Date(goal.created_at).toLocaleDateString()}</p>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <button 
                                  onClick={() => handleShare(goal.title, goal.description || t.goalsTitle)}
                                  className="text-[#8a8a7a] dark:text-zinc-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors p-1"
                                  title={t.shareSocial}
                                >
                                  <Share2 size={18} />
                                </button>
                                <button onClick={() => deleteGoal(goal.id)} className="text-[#8a8a7a] dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1">
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </div>
                            <div className="space-y-4">
                              <Reorder.Group axis="y" values={goal.steps} onReorder={(newSteps) => reorderSteps(goal.id, newSteps)}>
                                {goal.steps.map((step) => (
                                  <Reorder.Item 
                                    key={step.id} 
                                    value={step}
                                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer transition-colors group"
                                  >
                                    <div className="text-[#d5d5c5] dark:text-zinc-700 cursor-grab active:cursor-grabbing">
                                      <GripVertical size={16} />
                                    </div>
                                    <div 
                                      onClick={() => toggleStep(step.id, !step.completed)}
                                      className={cn("shrink-0 transition-colors", step.completed ? "text-emerald-500 dark:text-emerald-400" : "text-[#8a8a7a] dark:text-zinc-600 group-hover:text-indigo-500 dark:group-hover:text-indigo-400")}
                                    >
                                      {step.completed ? <CheckCircle size={20} /> : <Circle size={20} />}
                                    </div>
                                    <span 
                                      onClick={() => toggleStep(step.id, !step.completed)}
                                      className={cn("font-sans text-base transition-all flex-1", step.completed ? "line-through text-[#8a8a7a] dark:text-zinc-500 opacity-50" : "text-[#3a3a2e] dark:text-zinc-200")}
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

                {profileSubTab === 'progress' && (
                  <motion.div 
                    key="progress"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-8"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Skills Progress Chart */}
                      <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-[#e5e5d5] dark:border-zinc-800 transition-colors">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-[#3a3a2e] dark:text-zinc-100">
                          <BrainCircuit size={20} className="text-indigo-500 dark:text-indigo-400" />
                          {t.skillsProgress}
                        </h3>
                        <div className="h-64 w-full">
                          {stats && (
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={[
                                    { name: t.mastered, value: stats.masteredSkills },
                                    { name: 'Remaining', value: stats.totalSkills - stats.masteredSkills }
                                  ]}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={80}
                                  paddingAngle={5}
                                  dataKey="value"
                                >
                                  <Cell fill="#4F46E5" />
                                  <Cell fill={isDarkMode ? "#27272a" : "#E5E7EB"} />
                                </Pie>
                                <Tooltip 
                                  contentStyle={{ 
                                    backgroundColor: isDarkMode ? '#18181b' : '#ffffff', 
                                    borderColor: isDarkMode ? '#27272a' : '#e5e7eb',
                                    color: isDarkMode ? '#f4f4f5' : '#18181b'
                                  }} 
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          )}
                        </div>
                        <div className="mt-4 text-center">
                          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                            {stats ? Math.round((stats.masteredSkills / stats.totalSkills) * 100) : 0}%
                          </p>
                          <p className="text-xs text-[#8a8a7a] dark:text-zinc-500 uppercase tracking-widest">{t.mastered}</p>
                        </div>
                      </div>

                      {/* Engagement Stats Chart */}
                      <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-[#e5e5d5] dark:border-zinc-800 transition-colors">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-[#3a3a2e] dark:text-zinc-100">
                          <Activity size={20} className="text-emerald-500 dark:text-emerald-400" />
                          {t.engagementStats}
                        </h3>
                        <div className="h-64 w-full">
                          {stats && (
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={stats.engagement}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "#27272a" : "#f0f0f0"} />
                                <XAxis 
                                  dataKey="feature" 
                                  axisLine={false} 
                                  tickLine={false} 
                                  tick={{ fontSize: 10, fill: isDarkMode ? '#71717a' : '#8a8a7a' }} 
                                />
                                <YAxis 
                                  axisLine={false} 
                                  tickLine={false} 
                                  tick={{ fontSize: 10, fill: isDarkMode ? '#71717a' : '#8a8a7a' }} 
                                />
                                <Tooltip 
                                  contentStyle={{ 
                                    backgroundColor: isDarkMode ? '#18181b' : '#ffffff', 
                                    borderColor: isDarkMode ? '#27272a' : '#e5e7eb',
                                    borderRadius: '12px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                  }}
                                  itemStyle={{ color: isDarkMode ? '#f4f4f5' : '#18181b' }}
                                />
                                <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Check-in History */}
                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-[#e5e5d5] dark:border-zinc-800 transition-colors">
                      <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-[#3a3a2e] dark:text-zinc-100">
                        <History size={20} className="text-amber-500 dark:text-amber-400" />
                        {t.checkinHistory}
                      </h3>
                      <div className="space-y-4">
                        {checkins.length === 0 ? (
                          <p className="text-center py-8 text-[#8a8a7a] dark:text-zinc-500 italic">No check-ins yet.</p>
                        ) : (
                          checkins.map((c, i) => (
                            <div key={i} className="flex gap-4 p-4 bg-[#f5f5f0] dark:bg-zinc-800 rounded-2xl transition-colors">
                              <div className="w-12 h-12 bg-white dark:bg-zinc-700 rounded-full flex items-center justify-center text-xl shadow-sm">
                                {c.feeling === 'Happy' ? '😊' : c.feeling === 'Sad' ? '😢' : c.feeling === 'Anxious' ? '😰' : c.feeling === 'Angry' ? '😠' : '😐'}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-bold text-sm text-[#3a3a2e] dark:text-zinc-100">{c.feeling}</span>
                                  <span className="text-[10px] text-[#8a8a7a] dark:text-zinc-500">
                                    {new Date(c.date).toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-sm text-[#5a5a4a] dark:text-zinc-400 italic">"{c.notes}"</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {profileSubTab === 'safety' && (
                  <motion.div 
                    key="safety"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 p-6 rounded-3xl flex gap-4 items-start transition-colors">
                      <AlertTriangle className="text-red-500 dark:text-red-400 shrink-0" size={24} />
                      <p className="text-sm text-red-700 dark:text-red-300 font-sans font-medium">{t.emergencyWarning}</p>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl shadow-sm border border-[#e5e5d5] dark:border-zinc-800 transition-colors">
                      <h3 className="text-xl font-bold mb-4 text-[#5A5A40] dark:text-emerald-400">{t.safetyTitle}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                        <input 
                          type="text" 
                          placeholder={t.contactName}
                          value={newContact.name}
                          onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                          className="bg-[#f5f5f0] dark:bg-zinc-800 border-none focus:ring-0 rounded-xl px-4 py-3 font-sans text-sm text-[#3a3a2e] dark:text-zinc-100 placeholder-[#8a8a7a] dark:placeholder-zinc-500"
                        />
                        <input 
                          type="text" 
                          placeholder={t.contactPhone}
                          value={newContact.phone}
                          onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                          className="bg-[#f5f5f0] dark:bg-zinc-800 border-none focus:ring-0 rounded-xl px-4 py-3 font-sans text-sm text-[#3a3a2e] dark:text-zinc-100 placeholder-[#8a8a7a] dark:placeholder-zinc-500"
                        />
                        <input 
                          type="text" 
                          placeholder={t.contactRel}
                          value={newContact.relationship}
                          onChange={(e) => setNewContact({...newContact, relationship: e.target.value})}
                          className="bg-[#f5f5f0] dark:bg-zinc-800 border-none focus:ring-0 rounded-xl px-4 py-3 font-sans text-sm text-[#3a3a2e] dark:text-zinc-100 placeholder-[#8a8a7a] dark:placeholder-zinc-500"
                        />
                      </div>
                      <button 
                        onClick={addEmergencyContact}
                        disabled={!newContact.name || !newContact.phone}
                        className="w-full bg-[#5A5A40] dark:bg-emerald-600 text-white px-6 py-3 rounded-xl font-sans font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-md hover:bg-[#4a4a35] dark:hover:bg-emerald-500 transition-all"
                      >
                        <Plus size={18} />
                        {t.addContact}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {emergencyContacts.length === 0 ? (
                        <div className="col-span-full py-12 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-dashed border-[#e5e5d5] dark:border-zinc-800 transition-colors">
                          <Shield size={48} className="mx-auto mb-4 text-[#d5d5c5] dark:text-zinc-700" />
                          <p className="text-[#8a8a7a] dark:text-zinc-500 font-sans">{t.noContacts}</p>
                        </div>
                      ) : (
                        emergencyContacts.map((contact) => (
                          <div key={contact.id} className="bg-white dark:bg-zinc-900 p-5 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-[#e5e5d5] dark:border-zinc-800 flex items-center justify-between group transition-colors">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-[#f5f5f0] dark:bg-zinc-800 rounded-full flex items-center justify-center text-[#5A4040] dark:text-zinc-300">
                                <User size={24} />
                              </div>
                              <div>
                                <h3 className="font-bold text-lg text-[#3a3a2e] dark:text-zinc-100">{contact.name}</h3>
                                <p className="text-xs text-[#8a8a7a] dark:text-zinc-500 font-sans uppercase tracking-widest">{contact.relationship}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <a 
                                href={`tel:${contact.phone}`}
                                className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-600 dark:hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                                title={t.callNow}
                              >
                                <Phone size={20} />
                              </a>
                              <button 
                                onClick={() => deleteEmergencyContact(contact.id)}
                                className="p-3 text-[#8a8a7a] dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                              >
                                <Trash2 size={20} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="pt-8 border-t border-[#e5e5d5] dark:border-zinc-800 transition-colors">
                      <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/30 p-6 rounded-3xl transition-colors">
                        <div className="flex items-center gap-3 mb-4 text-orange-700 dark:text-orange-400">
                          <Settings size={24} />
                          <h3 className="text-xl font-bold">{t.resetData}</h3>
                        </div>
                        <p className="text-sm text-orange-800 dark:text-orange-300 mb-6 leading-relaxed">{t.resetConfirm}</p>
                        <div className="flex flex-wrap gap-4">
                          <button 
                            onClick={resetAllData}
                            className="bg-orange-600 text-white px-8 py-3 rounded-xl font-sans font-bold shadow-md hover:bg-orange-700 transition-all flex items-center gap-2"
                          >
                            <Trash2 size={18} />
                            {t.resetData}
                          </button>
                          <button 
                            onClick={() => {
                              setOnboardingStep(0);
                              setShowOnboarding(true);
                            }}
                            className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-sans font-bold shadow-md hover:bg-indigo-700 transition-all flex items-center gap-2"
                          >
                            <Info size={18} />
                            {t.showTutorial || "Show Tutorial"}
                          </button>
                          <button 
                            onClick={() => setShowPrivacyPolicy(true)}
                            className="bg-zinc-600 text-white px-8 py-3 rounded-xl font-sans font-bold shadow-md hover:bg-zinc-700 transition-all flex items-center gap-2"
                          >
                            <Shield size={18} />
                            {t.privacyPolicyTitle}
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {profileSubTab === 'settings' && (
                  <motion.div 
                    key="settings"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl shadow-sm border border-[#e5e5d5] dark:border-zinc-800 space-y-8 transition-colors"
                  >
                    <div className="space-y-6">
                      <h3 className="text-xl font-bold text-[#5A5A40] dark:text-emerald-400 flex items-center gap-2">
                        <Bell size={24} />
                        {t.notifications}
                      </h3>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-[#f5f5f0] dark:bg-zinc-800 rounded-2xl">
                          <div className="flex items-center gap-3">
                            <div className={cn("p-2 rounded-lg", profile.notifications_enabled ? "bg-emerald-100 text-emerald-600" : "bg-zinc-200 text-zinc-500")}>
                              {profile.notifications_enabled ? <Bell size={20} /> : <BellOff size={20} />}
                            </div>
                            <div>
                              <div className="font-bold text-sm">{t.enableNotifications}</div>
                              <div className="text-[10px] text-[#8a8a7a] dark:text-zinc-500">Get reminders from Dad</div>
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              const newVal = profile.notifications_enabled ? 0 : 1;
                              if (newVal === 1) {
                                Notification.requestPermission().then(permission => {
                                  if (permission === 'granted') {
                                    setProfile({...profile, notifications_enabled: 1});
                                  } else {
                                    alert(t.notificationPermissionDenied);
                                  }
                                });
                              } else {
                                setProfile({...profile, notifications_enabled: 0});
                              }
                            }}
                            className={cn("w-12 h-6 rounded-full transition-colors relative", profile.notifications_enabled ? "bg-emerald-500" : "bg-zinc-300")}
                          >
                            <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", profile.notifications_enabled ? "left-7" : "left-1")} />
                          </button>
                        </div>

                        {profile.notifications_enabled === 1 && (
                          <div className="space-y-3 pl-4 border-l-2 border-emerald-100 dark:border-emerald-900/30">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-[#5a5a4a] dark:text-zinc-300">{t.notifyEvents}</span>
                              <button 
                                onClick={() => setProfile({...profile, notify_calendar: profile.notify_calendar ? 0 : 1})}
                                className={cn("w-10 h-5 rounded-full transition-colors relative", profile.notify_calendar ? "bg-emerald-500" : "bg-zinc-300")}
                              >
                                <div className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all", profile.notify_calendar ? "left-5.5" : "left-0.5")} />
                              </button>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-[#5a5a4a] dark:text-zinc-300">{t.notifyJournal}</span>
                              <button 
                                onClick={() => setProfile({...profile, notify_journal: profile.notify_journal ? 0 : 1})}
                                className={cn("w-10 h-5 rounded-full transition-colors relative", profile.notify_journal ? "bg-emerald-500" : "bg-zinc-300")}
                              >
                                <div className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all", profile.notify_journal ? "left-5.5" : "left-0.5")} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-6 border-t border-[#e5e5d5] dark:border-zinc-800">
                      <h3 className="text-xl font-bold text-[#5A5A40] dark:text-emerald-400 mb-4 flex items-center gap-2">
                        <Download size={24} />
                        Data
                      </h3>
                      <button 
                        onClick={handleExportChat}
                        className="flex items-center gap-3 p-4 bg-[#f5f5f0] dark:bg-zinc-800 rounded-2xl hover:bg-[#e5e5d5] dark:hover:bg-zinc-700 transition-all w-full"
                      >
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                          <Download size={20} />
                        </div>
                        <div className="text-left">
                          <div className="font-bold text-sm">{t.exportChat}</div>
                          <div className="text-[10px] text-[#8a8a7a] dark:text-zinc-500">Download your conversations as a text file</div>
                        </div>
                      </button>
                    </div>

                    <button 
                      onClick={updateProfile}
                      className="w-full bg-[#5A5A40] dark:bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-[#4a4a35] dark:hover:bg-emerald-500 transition-all flex items-center justify-center gap-2"
                    >
                      <Save size={20} />
                      {t.saveProfile}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Celebration Overlay */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none"
          >
            <motion.div 
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl p-8 shadow-2xl border-4 border-amber-400 flex flex-col items-center text-center max-w-sm pointer-events-auto transition-colors"
            >
              <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/40 rounded-full flex items-center justify-center mb-6 relative">
                <Star size={40} className="text-amber-500 animate-pulse" />
                <motion.div 
                  animate={{ scale: [1, 1.5, 1], opacity: [0, 1, 0] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute inset-0 bg-amber-400 rounded-full"
                />
              </div>
              <h2 className="text-2xl font-bold text-[#5A5A40] dark:text-emerald-400 mb-2">{t.celebrationTitle}</h2>
              <p className="text-[#8a8a7a] dark:text-zinc-400 mb-6">{t.celebrationDesc}</p>
              <button 
                onClick={() => setShowCelebration(false)}
                className="bg-[#5A5A40] dark:bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-[#4a4a35] dark:hover:bg-emerald-500 transition-colors"
              >
                {t.close}
              </button>
            </motion.div>
            
            {/* Confetti-like particles */}
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ x: 0, y: 0, opacity: 1 }}
                animate={{ 
                  x: (Math.random() - 0.5) * 400, 
                  y: (Math.random() - 0.5) * 400, 
                  opacity: 0,
                  rotate: Math.random() * 360
                }}
                transition={{ duration: 2, ease: "easeOut" }}
                className="absolute w-3 h-3 rounded-sm"
                style={{ backgroundColor: ['#F59E0B', '#10B981', '#3B82F6', '#EF4444'][i % 4] }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-t border-[#e5e5d5] dark:border-zinc-800 px-2 py-3 flex justify-around items-center z-20 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] transition-colors">
        <button onClick={() => setActiveTab('chat')} className={cn("flex flex-col items-center p-2 rounded-2xl transition-all", activeTab === 'chat' ? "text-[#5A5A40] dark:text-emerald-400 bg-[#5A5A40]/10 dark:bg-emerald-500/10 ring-2 ring-[#5A5A40] dark:ring-emerald-500" : "text-[#8a8a7a] dark:text-zinc-500")}>
          <MessageCircle size={24} />
        </button>
        <button onClick={() => setActiveTab('toolbox')} className={cn("flex flex-col items-center p-2 rounded-2xl transition-all", activeTab === 'toolbox' ? "text-orange-700 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/20 ring-2 ring-orange-700 dark:ring-orange-500" : "text-[#8a8a7a] dark:text-zinc-500")}>
          <Wrench size={24} />
        </button>
        <button onClick={() => setActiveTab('journal')} className={cn("flex flex-col items-center p-2 rounded-2xl transition-all", activeTab === 'journal' ? "text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/20 ring-2 ring-emerald-700 dark:ring-emerald-500" : "text-[#8a8a7a] dark:text-zinc-500")}>
          <BookOpen size={24} />
        </button>
        <button onClick={() => setActiveTab('calendar')} className={cn("flex flex-col items-center p-2 rounded-2xl transition-all", activeTab === 'calendar' ? "text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/20 ring-2 ring-amber-700 dark:ring-amber-500" : "text-[#8a8a7a] dark:text-zinc-500")}>
          <CalendarIcon size={24} />
        </button>
        <button onClick={() => setActiveTab('memoryBox')} className={cn("flex flex-col items-center p-2 rounded-2xl transition-all", activeTab === 'memoryBox' ? "text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/20 ring-2 ring-red-700 dark:ring-red-500" : "text-[#8a8a7a] dark:text-zinc-500")}>
          <Heart size={24} />
        </button>
        <button onClick={() => setActiveTab('profile')} className={cn("flex flex-col items-center p-2 rounded-2xl transition-all", activeTab === 'profile' ? "text-[#5A5A40] dark:text-emerald-400 bg-[#5A5A40]/10 dark:bg-emerald-500/10 ring-2 ring-[#5A5A40] dark:ring-emerald-500" : "text-[#8a8a7a] dark:text-zinc-500")}>
          <User size={24} />
        </button>
      </nav>

      <footer className="max-w-2xl mx-auto p-8 mt-12 border-t border-[#e5e5d5] text-center">
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 text-[#8a8a7a] text-sm font-sans mb-6">
          <div className="flex items-center gap-2">
            <Info size={16} />
            <span>{t.footerNote}</span>
          </div>
          <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-[#e5e5d5] dark:border-zinc-800 pt-4 md:pt-0 md:pl-8 transition-colors">
            <a href="mailto:khudri@binadarma.ac.id" className="hover:text-[#5A5A40] dark:hover:text-emerald-400 transition-colors flex items-center gap-1">
              <Mail size={14} />
              Contact Us
            </a>
            <a href="https://elpeef.com/privacy-policy/" target="_blank" rel="noopener noreferrer" className="hover:text-[#5A5A40] dark:hover:text-emerald-400 transition-colors flex items-center gap-1">
              <Shield size={14} />
              Privacy Policy
            </a>
          </div>
        </div>
        <p className="text-[#8a8a7a] text-[10px] md:text-xs font-sans uppercase tracking-widest">{t.footerBuild}</p>
      </footer>

      {/* Emotional Check-in Modal */}
      <AnimatePresence>
        {showCheckinModal && (
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
              className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden transition-colors"
            >
              <div className="p-6 border-b border-[#e5e5d5] dark:border-zinc-800 flex items-center justify-between bg-gradient-to-r from-amber-500 to-orange-600 text-white">
                <div className="flex items-center gap-3">
                  <Activity size={24} />
                  <h2 className="text-xl font-bold">{t.checkin}</h2>
                </div>
                <button onClick={() => setShowCheckinModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <p className="text-lg font-bold text-center text-gray-800 dark:text-zinc-100">{t.checkinQuestion}</p>
                
                <div className="flex justify-around">
                  {[
                    { feeling: 'Happy', icon: '😊' },
                    { feeling: 'Neutral', icon: '😐' },
                    { feeling: 'Sad', icon: '😢' },
                    { feeling: 'Anxious', icon: '😰' },
                    { feeling: 'Angry', icon: '😠' }
                  ].map((f) => (
                    <button
                      key={f.feeling}
                      onClick={() => setNewCheckin({...newCheckin, feeling: f.feeling})}
                      className={cn(
                        "w-14 h-14 flex items-center justify-center text-3xl rounded-2xl transition-all transform hover:scale-110",
                        newCheckin.feeling === f.feeling 
                          ? "bg-amber-100 dark:bg-amber-900/40 shadow-inner scale-110 ring-2 ring-amber-500" 
                          : "bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700"
                      )}
                    >
                      {f.icon}
                    </button>
                  ))}
                </div>

                <textarea 
                  value={newCheckin.notes}
                  onChange={(e) => setNewCheckin({...newCheckin, notes: e.target.value})}
                  placeholder={t.checkinPlaceholder}
                  className="w-full bg-gray-50 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-amber-500 rounded-2xl px-4 py-3 font-sans text-sm min-h-[120px] text-[#3a3a2e] dark:text-zinc-100 placeholder-[#8a8a7a] dark:placeholder-zinc-600"
                />

                <button 
                  onClick={submitCheckin}
                  disabled={isSubmittingCheckin}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmittingCheckin ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={20} />}
                  {t.submitCheckin}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Onboarding Modal */}
      <AnimatePresence>
        {showOnboarding && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-zinc-900 rounded-[2rem] shadow-2xl w-full max-w-xl overflow-hidden transition-colors border border-white/20"
            >
              <div className="relative h-48 bg-gradient-to-br from-[#5A5A40] to-[#7a7a5a] dark:from-emerald-700 dark:to-emerald-900 flex items-center justify-center overflow-hidden">
                <button 
                  onClick={completeOnboarding}
                  className="absolute top-4 right-4 z-20 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                  title="Close"
                >
                  <X size={20} />
                </button>
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-16 -translate-y-16 blur-3xl" />
                  <div className="absolute bottom-0 right-0 w-32 h-32 bg-emerald-400 rounded-full translate-x-16 translate-y-16 blur-3xl" />
                </div>
                <motion.div 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="relative z-10"
                >
                  <DadAvatar emotion={onboardingStep === 0 ? 'HAPPY' : onboardingStep === 1 ? 'WISE' : 'PROUD'} />
                </motion.div>
              </div>

              <div className="p-8 md:p-10">
                <AnimatePresence mode="wait">
                  {onboardingStep === 0 && (
                    <motion.div 
                      key="step0"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6 text-center"
                    >
                      <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#5A5A40] dark:text-emerald-400 italic">
                        {t.onboardingWelcome}
                      </h2>
                      <p className="text-[#8a8a7a] dark:text-zinc-400 leading-relaxed font-sans">
                        {t.onboardingIntro}
                      </p>
                      <button 
                        onClick={() => setOnboardingStep(1)}
                        className="w-full bg-[#5A5A40] dark:bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-[#4a4a35] dark:hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 group"
                      >
                        {t.getStarted}
                        <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                    </motion.div>
                  )}

                  {onboardingStep === 1 && (
                    <motion.div 
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400">
                          <Info size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-[#3a3a2e] dark:text-zinc-100">{t.onboardingStep1Title}</h3>
                      </div>
                      <p className="text-[#8a8a7a] dark:text-zinc-400 font-sans leading-relaxed">
                        {t.onboardingStep1Desc}
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-2xl border border-gray-100 dark:border-zinc-700">
                          <Wrench size={20} className="text-orange-500 mb-2" />
                          <p className="text-xs font-bold text-[#3a3a2e] dark:text-zinc-200 uppercase tracking-wider">{t.toolbox}</p>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-2xl border border-gray-100 dark:border-zinc-700">
                          <Target size={20} className="text-emerald-500 mb-2" />
                          <p className="text-xs font-bold text-[#3a3a2e] dark:text-zinc-200 uppercase tracking-wider">{t.goals}</p>
                        </div>
                      </div>
                      <div className="flex gap-4 pt-4">
                        <button 
                          onClick={() => setOnboardingStep(0)}
                          className="flex-1 py-4 text-[#8a8a7a] dark:text-zinc-500 font-bold hover:text-[#5A5A40] dark:hover:text-emerald-400 transition-colors"
                        >
                          {t.back}
                        </button>
                        <button 
                          onClick={() => setOnboardingStep(2)}
                          className="flex-[2] bg-[#5A5A40] dark:bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-[#4a4a35] dark:hover:bg-emerald-500 transition-all flex items-center justify-center gap-2"
                        >
                          {t.next}
                          <ChevronRight size={20} />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {onboardingStep === 2 && (
                    <motion.div 
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                          <User size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-[#3a3a2e] dark:text-zinc-100">{t.onboardingStep2Title}</h3>
                      </div>
                      <p className="text-[#8a8a7a] dark:text-zinc-400 font-sans text-sm">
                        {t.onboardingStep2Desc}
                      </p>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] uppercase tracking-widest font-bold text-[#8a8a7a] dark:text-zinc-500 mb-1 block">{t.preferredNameLabel}</label>
                          <input 
                            type="text"
                            value={profile.preferredName || ''}
                            onChange={(e) => setProfile({...profile, preferredName: e.target.value})}
                            placeholder="e.g., Kiddo, Champ, [Your Name]..."
                            className="w-full bg-gray-50 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-[#5A5A40] dark:focus:ring-emerald-500 rounded-xl px-4 py-3 font-sans text-sm text-[#3a3a2e] dark:text-zinc-100"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-widest font-bold text-[#8a8a7a] dark:text-zinc-500 mb-1 block">{t.interests}</label>
                          <input 
                            type="text"
                            value={profile.interests}
                            onChange={(e) => setProfile({...profile, interests: e.target.value})}
                            placeholder="e.g., Coding, Gardening, History"
                            className="w-full bg-gray-50 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-[#5A5A40] dark:focus:ring-emerald-500 rounded-xl px-4 py-3 font-sans text-sm text-[#3a3a2e] dark:text-zinc-100"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-widest font-bold text-[#8a8a7a] dark:text-zinc-500 mb-1 block">{t.challenges}</label>
                          <input 
                            type="text"
                            value={profile.challenges}
                            onChange={(e) => setProfile({...profile, challenges: e.target.value})}
                            placeholder="e.g., Time management, Procrastination"
                            className="w-full bg-gray-50 dark:bg-zinc-800 border-none focus:ring-2 focus:ring-[#5A5A40] dark:focus:ring-emerald-500 rounded-xl px-4 py-3 font-sans text-sm text-[#3a3a2e] dark:text-zinc-100"
                          />
                        </div>
                      </div>

                      <div className="flex gap-4 pt-4">
                        <button 
                          onClick={() => setOnboardingStep(1)}
                          className="flex-1 py-4 text-[#8a8a7a] dark:text-zinc-500 font-bold hover:text-[#5A5A40] dark:hover:text-emerald-400 transition-colors"
                        >
                          {t.back}
                        </button>
                        <button 
                          onClick={() => setOnboardingStep(3)}
                          className="flex-[2] bg-[#5A5A40] dark:bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-[#4a4a35] dark:hover:bg-emerald-500 transition-all flex items-center justify-center gap-2"
                        >
                          {t.next}
                          <ChevronRight size={20} />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {onboardingStep === 3 && (
                    <motion.div 
                      key="step3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6 text-center"
                    >
                      <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto mb-4">
                        <Sparkles size={40} className="animate-pulse" />
                      </div>
                      <h3 className="text-2xl font-bold text-[#3a3a2e] dark:text-zinc-100">{t.onboardingStep3Title}</h3>
                      <p className="text-[#8a8a7a] dark:text-zinc-400 font-sans leading-relaxed">
                        {t.onboardingStep3Desc}
                      </p>
                      
                      <div className="flex gap-4 pt-4">
                        <button 
                          onClick={() => setOnboardingStep(2)}
                          className="flex-1 py-4 text-[#8a8a7a] dark:text-zinc-500 font-bold hover:text-[#5A5A40] dark:hover:text-emerald-400 transition-colors"
                        >
                          {t.back}
                        </button>
                        <button 
                          onClick={completeOnboarding}
                          className="flex-[2] bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                          {t.finish}
                          <CheckCircle size={20} />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Progress Dots */}
                {onboardingStep > 0 && (
                  <div className="flex justify-center gap-2 mt-8">
                    {[1, 2, 3].map((s) => (
                      <div 
                        key={s}
                        className={cn(
                          "w-2 h-2 rounded-full transition-all duration-300",
                          onboardingStep === s ? "w-6 bg-[#5A5A40] dark:bg-emerald-500" : "bg-gray-200 dark:bg-zinc-800"
                        )}
                      />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Modal */}
      <AnimatePresence>
        {showPrivacyPolicy && (
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
              className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden transition-colors"
            >
              <div className="p-6 border-b border-[#e5e5d5] dark:border-zinc-800 flex items-center justify-between bg-gradient-to-r from-zinc-700 to-zinc-900 text-white">
                <div className="flex items-center gap-3">
                  <Shield size={24} />
                  <h2 className="text-xl font-bold">{t.privacyPolicyTitle}</h2>
                </div>
                <button onClick={() => setShowPrivacyPolicy(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-8">
                <p className="text-[#3a3a2e] dark:text-zinc-300 leading-relaxed font-sans">
                  {t.privacyPolicy}
                </p>
              </div>
              <div className="p-4 bg-[#f5f5f0] dark:bg-zinc-800 border-t border-[#e5e5d5] dark:border-zinc-700 flex justify-end">
                <button 
                  onClick={() => setShowPrivacyPolicy(false)}
                  className="px-6 py-2 bg-zinc-700 text-white rounded-xl font-sans font-bold hover:bg-zinc-600 transition-all shadow-md"
                >
                  {t.close}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

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
              className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden transition-colors"
            >
              <div className="p-6 border-b border-[#e5e5d5] dark:border-zinc-800 flex items-center justify-between bg-gradient-to-r from-[#5A5A40] to-[#7a7a5a] dark:from-emerald-700 dark:to-emerald-900 text-white">
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
                    <div className="w-12 h-12 border-4 border-[#5A5A40] dark:border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-[#8a8a7a] dark:text-zinc-500 font-sans animate-pulse">{t.summarizing}</p>
                  </div>
                ) : (
                  <div className="prose prose-stone dark:prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{summaryContent}</ReactMarkdown>
                  </div>
                )}
              </div>
              <div className="p-4 bg-[#f5f5f0] dark:bg-zinc-800 border-t border-[#e5e5d5] dark:border-zinc-700 flex justify-end">
                <button 
                  onClick={() => setShowSummary(false)}
                  className="px-6 py-2 bg-[#5A5A40] dark:bg-emerald-600 text-white rounded-xl font-sans font-bold hover:bg-[#4a4a35] dark:hover:bg-emerald-500 transition-all shadow-md"
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