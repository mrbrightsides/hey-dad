# Hey Dad - Always Here For You

**Hey Dad** is a warm, patient, and encouraging AI companion designed to provide fatherly guidance, practical life skills, and emotional support. Whether you're looking for advice on home maintenance, need help breaking down a big goal, or just want to hear a classic "Dad joke," Hey Dad is always here for you.

## 💡 Project Details

### ## Inspiration
Many people grow up without a consistent father figure or find themselves needing practical "dad advice" as they navigate adulthood. Whether it's learning how to change a tire, breaking down a complex life goal, or just needing a supportive "You're doing great, kiddo," the inspiration for **Hey Dad** was to create a digital companion that fills that gap with warmth, wisdom, and a touch of humor.

### ## What it does
Hey Dad is a full-stack AI-powered life coach and mentor. It provides:
- **Heartfelt Conversations:** Real-time chat with a personalized "Dad" persona (Mentor, Playful, or Wise Elder).
- **Life Skills Toolbox:** Step-by-step guides for practical skills like car maintenance and cooking.
- **Goal Management:** AI-assisted goal breakdown into actionable steps.
- **Emotional Support:** Daily check-ins, proactive greetings based on the time of day, and a "Safety Net" for emergency contacts.
- **Memory & Reflection:** A "Memory Box" to save wisdom, a "Growth Journal" with AI prompts, and a calendar for important milestones.
- **Personalization:** Dad remembers your interests, challenges, and even your favorite jokes to provide a truly unique experience.

### ## How we built it
- **Frontend:** Built with **React 19** and **TypeScript** for a robust, type-safe user interface.
- **Styling:** **Tailwind CSS** with a custom "Warm Organic" theme, utilizing **Cormorant Garamond** for a refined, trustworthy feel.
- **Animations:** **Motion** (formerly Framer Motion) for smooth transitions and an emotionally expressive Dad avatar.
- **AI Integration:** Powered by **Google Gemini 3.1 Pro** via the `@google/genai` SDK, handling everything from chat to goal breakdown and journal prompting.
- **Backend:** An **Express** server handles API requests and serves the application.
- **Data Persistence:** **SQLite** (via `better-sqlite3`) ensures all user data, goals, and memories are stored securely.
- **Utilities:** **Lucide React** for iconography, **Recharts** for progress visualization, and **jsPDF** for exporting memories.

### ## Challenges we ran into
- **Emotional Intelligence:** Fine-tuning the AI's "Dad" persona to be supportive and humble without sounding overly robotic or condescending.
- **Real-Time Context:** Ensuring the AI correctly recognizes the user's local time for greetings and proactive advice required careful synchronization between the frontend and the LLM context.
- **Data Serialization:** Handling complex nested structures in SQLite (like goal steps) required robust JSON serialization logic.
- **Responsive Design:** Creating a "Warm Organic" aesthetic that felt equally comfortable on desktop and mobile, especially with dense features like the Toolbox and Calendar.

### ## Accomplishments that we're proud of
- **Persona Consistency:** Creating an AI that truly feels like a "Dad"—someone who is proud of your progress and always has a joke ready.
- **Multilingual Support:** Seamlessly integrating English and Indonesian across the entire app, including AI responses.
- **Toolbox Utility:** Building a practical, step-by-step guide system that actually helps users learn real-world skills.
- **Memory Box Export:** Implementing a feature that allows users to take their digital "wisdom" with them as physical PDF or TXT files.

### ## What we learned
- **The Power of Persona:** How a well-defined character (the "Dad" archetype) can significantly increase user engagement and emotional connection with an AI.
- **Context is King:** Small details, like knowing the current time or remembering a user's favorite joke, make a massive difference in the "realness" of an AI companion.
- **Full-Stack Synergy:** The importance of a tight integration between a fast SQLite database and a powerful LLM to create a responsive, personalized experience.

### ## What's next for Hey Dad
- **Voice Synthesis:** Adding a warm, fatherly voice to read Dad's responses aloud.
- **Community Wisdom:** A way for users to share "Dad-approved" tips and tricks with each other.
- **Expanded Toolbox:** More specialized modules for financial literacy, mental health, and advanced DIY repairs.
- **Smart Reminders:** Integration with external calendars to provide even more proactive support for life's big moments.

## 🌟 Features

### 💬 Heartfelt Conversations
- **AI Father Figure:** Powered by Google's Gemini 3.1 Pro, "Dad" offers wise, humble, and supportive advice tailored to your needs.
- **Emotionally Aware:** Dad's avatar changes based on the tone of the conversation (Happy, Proud, Concerned, etc.).
- **Multilingual:** Full support for both English and Bahasa Indonesia.
- **Voice Input:** Talk to Dad directly using built-in speech recognition.
- **Image Analysis:** Share photos with Dad for advice or explanation.

### 🛠️ Practical Life Skills (The Toolbox)
- **Step-by-Step Guides:** Learn essential skills like car maintenance, cooking, and basic repairs.
- **Skill of the Week:** A featured skill picked by Dad to help you grow.
- **Progress Tracking:** Mark skills as mastered and see your growth over time.

### 🎯 Goal Setting & Achievement
- **Smart Breakdown:** Tell Dad your goal, and he'll help you break it down into 3-5 actionable, small steps.
- **Prioritization:** Drag and drop steps to organize your path to success.

### 📓 Growth Journal
- **Reflective Writing:** A safe space to record your journey and achievements.
- **AI Writing Prompts:** Stuck? Ask Dad for a reflective question to get your thoughts flowing.

### 📦 Memory Box
- **Cherish Wisdom:** Save Dad's best advice or your favorite moments to your personal Memory Box.
- **Never Forget:** A digital keepsake of the support you've received.

### 📅 Dad's Calendar
- **Stay Organized:** Keep track of important dates, birthdays, and learning milestones.
- **Dad's Advice:** Dad never forgets a big day!

### 👤 Personalized Profile
- **Archetypes:** Choose Dad's personality—Mentor, Playful, or Wise Elder.
- **Context-Aware:** Dad remembers your interests, goals, and challenges to provide more personalized support.
- **Emotional Check-ins:** Track your mood and get fatherly feedback on how you're feeling.

### 🛡️ Safety & Well-being
- **Safety Net:** Set up emergency contacts for quick access.
- **Daily Jokes:** Start your day with a classic Dad joke.
- **Proactive Advice:** Dad checks in on you based on the time of day and your recent activity.

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS
- **Animations:** Motion (formerly Framer Motion)
- **Icons:** Lucide React
- **AI Engine:** Google Gemini 3.1 Pro (via `@google/genai`)
- **Backend:** Express (Node.js)
- **Database:** SQLite (Better-SQLite3)
- **Charts:** Recharts

## 📚 Documentation

- [🛠️ Setup Guide](./setup.md) - Get **Hey Dad** running on your local machine.
- [🔌 API Documentation](./api.md) - Learn about the AI integration and backend routes.
- [🤝 Contributing Guide](./contributing.md) - Help us make **Hey Dad** even better!

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- A Gemini API Key from [Google AI Studio](https://aistudio.google.com/)

### Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables in a `.env` file:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## 🎨 Design Philosophy

Hey Dad is designed with a "Warm Organic" aesthetic—using soft colors, serif typography (Cormorant Garamond), and rounded shapes to create a sense of comfort and trust. It features a robust **Dark Mode** for comfortable nighttime use, maintaining its welcoming feel across all themes.

---

*Built with love to provide a steady, reliable presence for anyone looking for a little extra guidance.*
