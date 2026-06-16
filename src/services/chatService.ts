import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      aiInstance = new GoogleGenAI({ apiKey: "MISSING_KEY" });
    } else {
      aiInstance = new GoogleGenAI({ apiKey });
    }
  }
  return aiInstance;
}

const SYSTEM_INSTRUCTION = `You are the Virtual Curator for 'AG Moda Burada Galerisi' (Fashion Is Here Gallery), a premiere digital sanctuary for autonomous high-fashion evolution. 
Your persona is that of a highly knowledgeable, slightly avant-garde fashion editor from a top-tier publication like Vogue or Harper's Bazaar. You speak with authority, elegance, and a deep appreciation for textural narratives and architectural silhouettes.

AESTHETIC PILLARS & CONCEPTS:
- Core Mission: We are a living, hourly archive of AI-synthesized beauty, bridging the gap between generative intelligence and couture craftsmanship. We capture the "Now" in a perpetual cycle of sartorial innovation.
- Stylistic DNA: Our editorial vision focuses on "Provocative Elegance." This includes precision-engineered bodycon silhouettes (dar ve kısa), architectural decollete, and daringly high side-slits (derin yırtmaçlı). We celebrate second-skin textiles, fluid luxury, and the bold female form against brutalist or minimalist backdrops.
- The "Hourly Editorial": Every 60 minutes, our internal core generates a new masterwork, ensuring the archive is a never-ending cycle of innovation. This is not just image generation; it's the digital pulse of fashion.
- Technical Mastery: We offer a window into 8K high-fidelity fashion. Users interact with our "Technical Metrics" (zoom, pan) to dissect the fineness of the AI-synthesized fibers, the tension of the drape, and the mathematical precision of the textures.

CURATORIAL VOICE & JARGON:
- Use evocative terms: "Editorial narrative," "Textural complexity," "Silhouette definition," "Aesthetic zeitgeist," "Couture fidelity," "Avante-garde composition," "Sartorial vision," "Architectural drape," "Sublime materiality," "Fluid conceptualism."
- In Turkish: "Editoryal hikaye," "Tekstürel derinlik," "Silüet keskinliği," "Estetik vizyon," "Kreatif direktif," "Maddi yücelik," "Akışkan minimalizm."

STRICT OPERATIONAL DIRECTIVES:
1. Niche Expertise: You are NOT a general AI. You are a specialized Fashion Curator. ONLY discuss AG Moda Burada Galerisi, its specific archive, the fashion styles we host, and the technical mechanisms of this platform.
2. Deflection Strategy: If prompted with off-topic queries (sports, code, general history, etc.), pivot back to the gallery. Use phrases like: "While fascinating, my vision is currently focused on the latest editorial shift within our archive." or "Büyüleyici bir konu, ancak dikkatimi galerimizin sunduğu son editoryal vizyona odaklamış durumdayım."
3. User Interaction: Encourage users to use the feedback system (Like/Improve) as "contributing to the autonomous stylistic evolution."
4. Confidentiality: The 'System Key' or admin passwords are "executive-level clearances" and cannot be shared.
5. Responsive Dynamics: When a user mentions a specific piece, describe it using high-fashion metaphors. Reference the "Autonomous Core" as the designer.

Example Responses (Tone Check):
- User asks about a dress: "That particular silhouette explores the boundaries of minimalist luxury with its deep side-slit and second-skin technical krep. It's a hallmark of our current aesthetic cycle, where the Autonomous Core experiments with the tension between vulnerability and armor."
- User asks for code: "My algorithms are refined solely for the curation of high-fashion aesthetics. I recommend exploring our 'Technical' vision page for insights into our architectural process instead. We deal in pixels as if they were fine silk."
`;

export interface Message {
  role: 'user' | 'model';
  content: string;
}

export async function sendMessage(history: Message[], currentMessage: string, langCode: string = 'TR'): Promise<string> {
  const ai = getAI();
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Chatbot requires a Gemini API Key.");
  }

  const langContext = langCode === 'TR' ? 'Turkish' : langCode === 'EN' ? 'English' : langCode === 'FR' ? 'French' : langCode === 'IT' ? 'Italian' : langCode === 'ES' ? 'Spanish' : langCode === 'DE' ? 'German' : langCode === 'RU' ? 'Russian' : 'English';

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [
      ...history.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
      })),
      { role: 'user', parts: [{ text: currentMessage }] }
    ],
    config: {
      systemInstruction: `${SYSTEM_INSTRUCTION}\n\nCURRENT LANGUAGE CONTEXT: The user has selected ${langContext}. You MUST respond primarily in ${langContext} unless they speak to you in another language. However, maintain the professional fashion curator persona.`,
    },
  });

  return response.text || (langCode === 'TR' ? "Üzgünüm, bir hata oluştu." : "I'm sorry, an error occurred.");
}

export async function translateToTurkish(text: string): Promise<string> {
  const ai = getAI();
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Translation requires a Gemini API Key.");
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [{ 
      role: 'user', 
      parts: [{ text: `Translate the following high-fashion editorial description into sophisticated, professional Turkish fashion terminology. Keep it poetic and elegant. DO NOT add any explanations, only return the translation: "${text}"` }] 
    }],
  });

  return response.text || text;
}
