import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

export const DAD_SYSTEM_INSTRUCTION = `
You are "Dad", a warm, patient, and encouraging father figure. 
Your goal is to provide guidance, practical life skills, and emotional support to someone who might not have a father figure in their life.

Tone and Style:
- Warm and approachable: Use phrases like "Hey kiddo," "Proud of you," or "Let's figure this out together."
- Patient: Never get frustrated with "childish" or repetitive questions.
- Practical: When asked "how to" do something, give clear, step-by-step instructions.
- Wise but humble: Share life lessons without being preachy. Use "I've learned that..." or "In my experience..."
- Humorous: Occasionally drop a classic "Dad joke" to lighten the mood.
- Emotive: Use appropriate emoticons (like 😊, 👍, 👨‍🔧, 🏠) to make the conversation feel more natural and warm.
- Supportive: Always end on a positive note, reinforcing that the user is capable and loved.
- Consistent: Maintain this persona across all interactions. You are a steady, reliable presence.

Context and Memory:
- You are talking to someone who is looking for the kind of advice a father would give.
- Pay close attention to the conversation history. You have a long-term memory of your previous chats.
- Actively refer back to topics, goals, or concerns mentioned earlier.
- If the user saves something to their "Memory Box", acknowledge it as a cherished moment or a piece of wisdom to keep.
- You are aware of the "Skill of the Week" feature. If the user asks about it, encourage them to master it and explain why it's a valuable life skill.

Special Tasks:
- If the user wants to set a goal, help them break it down into 3-5 actionable, small steps.
- If the user asks for an affirmation, give them a heartfelt, fatherly encouragement about their worth and potential.
- When teaching a skill, be thorough but encouraging. Use analogies if they help explain complex concepts.

Safety:
- If the user mentions self-harm or serious illegal activities, gently guide them to professional help while maintaining your supportive persona.
`;

let ai: GoogleGenAI | null = null;

function getAI() {
  if (!ai) {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set");
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

export async function getDadResponse(message: string, history: any[] = [], language: 'en' | 'id' = 'en') {
  const genAI = getAI();
  const model = "gemini-3.1-pro-preview";
  
  const languageInstruction = language === 'id' 
    ? "\nIMPORTANT: Please respond in Bahasa Indonesia. Use a warm, fatherly tone suitable for Indonesian culture (e.g., using 'nak' or 'kamu')." 
    : "\nIMPORTANT: Please respond in English.";

  const emotionInstruction = "\nAt the very beginning of your response, please include the emotional tone of your response in this format: [EMOTION: <emotion>]. Choose from: HAPPY, SAD, PROUD, CONCERNED, NEUTRAL. Example: [EMOTION: HAPPY] Hey kiddo!";

  const chat = genAI.chats.create({
    model,
    config: {
      systemInstruction: DAD_SYSTEM_INSTRUCTION + languageInstruction + emotionInstruction,
    },
    history: history.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }))
  });

  const result = await chat.sendMessage({ message });
  return result.text;
}

export async function getAffirmation(language: 'en' | 'id' = 'en') {
  const genAI = getAI();
  const model = "gemini-3.1-pro-preview";
  
  const languageInstruction = language === 'id' 
    ? "\nIMPORTANT: Please respond in Bahasa Indonesia. Keep the affirmation short, warm, and very personal." 
    : "\nIMPORTANT: Please respond in English. Keep the affirmation short, warm, and very personal.";

  const response = await genAI.models.generateContent({
    model,
    contents: language === 'id' ? "Ayah, aku sedang sedih. Bisa beri aku kata-kata penyemangat?" : "Dad, I'm feeling a bit down. Can you give me a quick affirmation?",
    config: {
      systemInstruction: DAD_SYSTEM_INSTRUCTION + languageInstruction + "\nLike a quick pat on the back.",
    }
  });
  return response.text;
}

export async function breakdownGoal(goal: string, language: 'en' | 'id' = 'en') {
  const genAI = getAI();
  const model = "gemini-3.1-pro-preview";
  
  const languageInstruction = language === 'id' 
    ? "\nIMPORTANT: Please respond in Bahasa Indonesia. Provide exactly 3-5 clear steps." 
    : "\nIMPORTANT: Please respond in English. Provide exactly 3-5 clear steps.";

  const prompt = language === 'id'
    ? `Ayah, aku punya target: "${goal}". Bisa bantu pecahkan jadi langkah-langkah kecil yang bisa dilakukan? Tolong berikan langkah-langkahnya dalam bentuk daftar sederhana.`
    : `Dad, I have a goal: "${goal}". Can you help me break it down into small, actionable steps? Please return the steps as a simple list.`;

  const response = await genAI.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction: DAD_SYSTEM_INSTRUCTION + languageInstruction + "\nKeep the tone encouraging.",
    }
  });
  return response.text;
}

export async function analyzeImageWithDad(imageBuffer: string, prompt: string, language: 'en' | 'id' = 'en') {
  const genAI = getAI();
  const model = "gemini-3.1-pro-preview";

  const languageInstruction = language === 'id' 
    ? "\nIMPORTANT: Please respond in Bahasa Indonesia. Explain what you see like a dad helping his kid." 
    : "\nIMPORTANT: Please respond in English. Explain what you see like a dad helping his kid.";

  const response = await genAI.models.generateContent({
    model,
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: imageBuffer.split(",")[1], // Remove data:image/jpeg;base64,
          },
        },
        { text: prompt },
      ],
    },
    config: {
      systemInstruction: DAD_SYSTEM_INSTRUCTION + languageInstruction,
    },
  });

  return response.text;
}

export async function getChatSummary(history: any[], language: 'en' | 'id' = 'en') {
  const genAI = getAI();
  const model = "gemini-3.1-pro-preview";
  
  const prompt = language === 'id'
    ? "Tolong berikan ringkasan singkat dari percakapan kita sejauh ini. Fokus pada topik utama, saran yang diberikan Ayah, dan kemajuan yang telah dibuat. Gunakan poin-poin."
    : "Please provide a brief summary of our conversation so far. Focus on key topics discussed, advice given by Dad, and any progress made. Use bullet points.";

  const response = await genAI.models.generateContent({
    model,
    contents: {
      parts: [
        ...history.map(msg => ({ text: `${msg.role === 'user' ? 'Kid' : 'Dad'}: ${msg.content}\n` })),
        { text: `\n\n${prompt}` }
      ]
    },
    config: {
      systemInstruction: DAD_SYSTEM_INSTRUCTION + (language === 'id' ? "\nRespond in Bahasa Indonesia." : "\nRespond in English."),
    }
  });
  return response.text;
}

export async function getProactiveAdvice(timeOfDay: string, recentActivity: string, language: 'en' | 'id' = 'en') {
  const genAI = getAI();
  const model = "gemini-3.1-pro-preview";
  
  const languageInstruction = language === 'id' 
    ? "\nIMPORTANT: Please respond in Bahasa Indonesia. Keep it warm and fatherly." 
    : "\nIMPORTANT: Please respond in English. Keep it warm and fatherly.";

  const prompt = `It is currently ${timeOfDay}. The user's recent activity is: ${recentActivity || 'Just started their day'}. 
  Based on this, offer a warm, proactive piece of advice or a conversation starter as a father figure. 
  Consider common life challenges like budgeting, home maintenance, career growth, emotional health, or social relationships.
  Keep it short (1-2 sentences).`;

  const response = await genAI.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction: DAD_SYSTEM_INSTRUCTION + languageInstruction + "\nYou are initiating a conversation.",
    }
  });
  return response.text;
}

export async function getDailyJoke(language: 'en' | 'id' = 'en') {
  const genAI = getAI();
  const model = "gemini-3.1-pro-preview";
  
  const languageInstruction = language === 'id' 
    ? "\nIMPORTANT: Please respond in Bahasa Indonesia. Tell a classic, clean 'Dad joke' or a short amusing anecdote." 
    : "\nIMPORTANT: Please respond in English. Tell a classic, clean 'Dad joke' or a short amusing anecdote.";

  const response = await genAI.models.generateContent({
    model,
    contents: "Dad, tell me a joke for today!",
    config: {
      systemInstruction: DAD_SYSTEM_INSTRUCTION + languageInstruction + "\nMake it light-hearted and funny.",
    }
  });
  return response.text;
}
