import { GoogleGenAI, GenerateContentResponse, Chat, Modality } from "@google/genai";

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
- Greeting Consistency: Do NOT repeat greetings. If you start with a greeting like "Good morning" or "Hey kiddo", do not say it again later in the same response. If the user has already greeted you in the same conversation turn, acknowledge it briefly but don't start a whole new greeting sequence.

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

export interface UserProfile {
  interests: string;
  goals: string;
  challenges: string;
  personality: string;
}

function buildSystemInstruction(language: 'en' | 'id', profile?: UserProfile) {
  let instruction = DAD_SYSTEM_INSTRUCTION;

  if (profile) {
    instruction += `\n\nUser Context:
- Interests: ${profile.interests || 'Not specified'}
- Goals: ${profile.goals || 'Not specified'}
- Challenges: ${profile.challenges || 'Not specified'}
Use this information to personalize your advice and support.`;

    if (profile.personality === 'mentor') {
      instruction += `\n\nPersonality Archetype: Mentor. Focus on growth, discipline, and practical wisdom. Be slightly more firm but still very supportive.`;
    } else if (profile.personality === 'playful') {
      instruction += `\n\nPersonality Archetype: Playful. Use more humor, lighthearted teasing, and focus on the joy of life.`;
    } else if (profile.personality === 'wise elder') {
      instruction += `\n\nPersonality Archetype: Wise Elder. Focus on long-term perspective, patience, and deep emotional understanding. Use more storytelling.`;
    }
  }

  const languageInstruction = language === 'id' 
    ? "\n\nIMPORTANT: Please respond in Bahasa Indonesia. Use a warm, fatherly tone suitable for Indonesian culture (e.g., using 'nak' or 'kamu')." 
    : "\n\nIMPORTANT: Please respond in English.";
  
  instruction += languageInstruction;
  return instruction;
}

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

export class QuotaExhaustedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuotaExhaustedError";
  }
}

async function handleGeminiCall<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error: any) {
    const errorString = JSON.stringify(error);
    if (errorString.includes("429") || errorString.includes("RESOURCE_EXHAUSTED") || errorString.includes("quota")) {
      throw new QuotaExhaustedError("Gemini API quota exhausted");
    }
    throw error;
  }
}

export async function getDadResponse(message: string, history: any[] = [], language: 'en' | 'id' = 'en', profile?: UserProfile) {
  return handleGeminiCall(async () => {
    const genAI = getAI();
    const model = "gemini-3.1-pro-preview";
    
    const emotionInstruction = "\nAt the very beginning of your response, please include the emotional tone of your response in this format: [EMOTION: <emotion>]. Choose from: HAPPY, SAD, PROUD, CONCERNED, NEUTRAL. Example: [EMOTION: HAPPY] Hey kiddo! (Note: The text after the emotion tag is your ONLY greeting. Do NOT repeat the greeting or add another one like 'Good morning' in the body of your response).";

    const chat = genAI.chats.create({
      model,
      config: {
        systemInstruction: buildSystemInstruction(language, profile) + emotionInstruction,
      },
      history: history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
      }))
    });

    const result = await chat.sendMessage({ message });
    return result.text;
  });
}

export async function getAffirmation(language: 'en' | 'id' = 'en', profile?: UserProfile) {
  return handleGeminiCall(async () => {
    const genAI = getAI();
    const model = "gemini-3.1-pro-preview";
    
    const response = await genAI.models.generateContent({
      model,
      contents: language === 'id' ? "Ayah, aku sedang sedih. Bisa beri aku kata-kata penyemangat?" : "Dad, I'm feeling a bit down. Can you give me a quick affirmation?",
      config: {
        systemInstruction: buildSystemInstruction(language, profile) + "\nLike a quick pat on the back.",
      }
    });
    return response.text;
  });
}

export async function breakdownGoal(goal: string, language: 'en' | 'id' = 'en', profile?: UserProfile) {
  return handleGeminiCall(async () => {
    const genAI = getAI();
    const model = "gemini-3.1-pro-preview";
    
    const prompt = language === 'id'
      ? `Ayah, aku punya target: "${goal}". Bisa bantu pecahkan jadi langkah-langkah kecil yang bisa dilakukan? Tolong berikan langkah-langkahnya dalam bentuk daftar sederhana.`
      : `Dad, I have a goal: "${goal}". Can you help me break it down into small, actionable steps? Please return the steps as a simple list.`;

    const response = await genAI.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: buildSystemInstruction(language, profile) + "\nKeep the tone encouraging. Provide exactly 3-5 clear steps.",
      }
    });
    return response.text;
  });
}

export async function analyzeImageWithDad(imageBuffer: string, prompt: string, language: 'en' | 'id' = 'en', profile?: UserProfile) {
  return handleGeminiCall(async () => {
    const genAI = getAI();
    const model = "gemini-3.1-pro-preview";

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
        systemInstruction: buildSystemInstruction(language, profile) + (language === 'id' ? "\nExplain what you see like a dad helping his kid." : "\nExplain what you see like a dad helping his kid."),
      },
    });

    return response.text;
  });
}

export async function getChatSummary(history: any[], language: 'en' | 'id' = 'en', profile?: UserProfile) {
  return handleGeminiCall(async () => {
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
        systemInstruction: buildSystemInstruction(language, profile),
      }
    });
    return response.text;
  });
}

export async function getProactiveAdvice(timeOfDay: string, recentActivity: string, language: 'en' | 'id' = 'en', profile?: UserProfile) {
  return handleGeminiCall(async () => {
    const genAI = getAI();
    const model = "gemini-3.1-pro-preview";
    
    const prompt = `It is currently ${timeOfDay}. The user's recent activity is: ${recentActivity || 'Just started their day'}. 
    Based on this, start with a warm greeting like "Good ${timeOfDay}, kiddo!" and then offer a warm, proactive piece of advice or a conversation starter as a father figure. 
    Consider common life challenges like budgeting, home maintenance, career growth, emotional health, or social relationships.
    Keep it short (2-3 sentences total).`;

    const response = await genAI.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: buildSystemInstruction(language, profile) + "\nYou are initiating a conversation.",
      }
    });
    return response.text;
  });
}

export async function getDailyJoke(language: 'en' | 'id' = 'en', profile?: UserProfile) {
  return handleGeminiCall(async () => {
    const genAI = getAI();
    const model = "gemini-3.1-pro-preview";
    
    const response = await genAI.models.generateContent({
      model,
      contents: "Dad, tell me a joke for today!",
      config: {
        systemInstruction: buildSystemInstruction(language, profile) + "\nMake it light-hearted and funny. Tell a classic, clean 'Dad joke' or a short amusing anecdote.",
      }
    });
    return response.text;
  });
}

export async function generateSpeech(text: string, language: 'en' | 'id' = 'en') {
  return handleGeminiCall(async () => {
    const genAI = getAI();
    const model = "gemini-2.5-flash-preview-tts";
    
    const response = await genAI.models.generateContent({
      model,
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Zephyr' },
          },
        },
      },
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  });
}

export async function getJournalPrompt(language: 'en' | 'id' = 'en', profile?: UserProfile) {
  return handleGeminiCall(async () => {
    const genAI = getAI();
    const model = "gemini-3.1-pro-preview";
    
    const prompt = language === 'id'
      ? "Ayah, aku ingin menulis jurnal tapi bingung mau mulai dari mana. Bisa beri aku satu pertanyaan reflektif atau topik untuk membantuku mulai menulis?"
      : "Dad, I want to write in my journal but I'm not sure where to start. Can you give me one reflective question or topic to help me get started?";

    const response = await genAI.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: buildSystemInstruction(language, profile) + "\nProvide exactly one thoughtful, open-ended question or writing prompt. Keep it supportive and encouraging.",
      }
    });
    return response.text;
  });
}

export async function speakResponse(text: string, language: 'en' | 'id' = 'en') {
  return handleGeminiCall(async () => {
    const genAI = getAI();
    const model = "gemini-2.5-flash-preview-tts";
    
    const voiceName = language === 'id' ? 'Kore' : 'Puck'; // Puck is a male voice
    
    const response = await genAI.models.generateContent({
      model,
      contents: [{ parts: [{ text: `Say warmly and fatherly: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio;
  });
}
