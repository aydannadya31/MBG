import { GoogleGenAI, Type } from "@google/genai";
import { db, handleFirestoreError, OperationType } from "./firebase";
import { collection, addDoc } from "firebase/firestore";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not defined. AI generation will not work.");
      aiInstance = new GoogleGenAI({ apiKey: "MISSING_KEY" });
    } else {
      aiInstance = new GoogleGenAI({ apiKey });
    }
  }
  return aiInstance;
}

const ENVIRONMENTS = [
  "Beach", "Lake", "River", "Mountain", "Forest", "Modern City", 
  "Minimalist Home Interior", "Desert Dunes", "Dense Rainforest",
  "Nordic Fjord", "Parisian Balcony", "Tokyo Street at Night",
  "Industrial Loft", "Mediterranean Coast", "Art Deco Hotel Lobby",
  "Cloudy Wildflower Meadow", "Golden Hour Vineyard", "Brutalist Concrete Plaza"
];

const LIGHTING_MODES = [
  "Golden hour sunset", "Blue hour twilight", "High-contrast midday sun",
  "Foggy morning light", "Neon city glows", "Soft overcast light",
  "Dramatic stage spotlight", "Warm interior candlelight", "Direct flash paparazzi style"
];

const COMPOSITIONS = [
  "Close-up portrait", "Full-body wide shot", "Low-angle heroic shot",
  "Side-profile action shot", "Dutch angle", "Wide landscape with small subject",
  "Upper-body medium shot", "Candid motion shot"
];

const TREND_CUES = [
  "Skin-tight (dar) high-fashion silhouettes emphasizing body curvature",
  "Ultra-mini bodycon dresses with provocative short hemlines",
  "Deep decollete (dekolte) designs, plunging necklines, and backless details",
  "High-slit (derin yırtmaçlı) skirts and dresses showing leg movement",
  "Sophisticated second-skin materials layered over mini bodycon cuts",
  "Minimalist yet daring 'dar ve kısa' (tight & mini) editorial looks",
  "Sheer technical fabrics with strategic cut-outs and revealing silhouettes",
  "Sleek lycra-blend mini dresses emphasizing extreme form-fitting elegance"
];

const ALLOWED_FABRICS = [
  "Fluid ultra-fine silk",
  "Premium high-gloss lycra",
  "Sheer elastic mesh",
  "Second-skin technical spandex",
  "Lightweight liquid sateen",
  "Semi-transparent delicate tulle",
  "Elastic micromodal jersey",
  "Ultra-thin technical krep"
];

export async function generateNewPiece(langCode: string = 'TR', forcedTimestamp?: number): Promise<any> {
  const ai = getAI();
  if (process.env.GEMINI_API_KEY === undefined || process.env.GEMINI_API_KEY === "") {
    throw new Error("GEMINI_API_KEY eksik. Lütfen ayarlardan API anahtarınızı ekleyin.");
  }

  // Determine prompt language. Turkish remains English as per user request.
  const targetLang = langCode === 'TR' ? 'English' : 
                     langCode === 'EN' ? 'English' :
                     langCode === 'FR' ? 'French' :
                     langCode === 'IT' ? 'Italian' :
                     langCode === 'ES' ? 'Spanish' :
                     langCode === 'DE' ? 'German' : 'English';

  let attempts = 0;
  const maxAttempts = 15;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      const selectedEnv = ENVIRONMENTS[Math.floor(Math.random() * ENVIRONMENTS.length)];
      const selectedLight = LIGHTING_MODES[Math.floor(Math.random() * LIGHTING_MODES.length)];
      const selectedComp = COMPOSITIONS[Math.floor(Math.random() * COMPOSITIONS.length)];
      const selectedTrend = TREND_CUES[Math.floor(Math.random() * TREND_CUES.length)];
      const selectedFabric = ALLOWED_FABRICS[Math.floor(Math.random() * ALLOWED_FABRICS.length)];
      
      // 1. Generate description (for UI) AND image prompt (for AI)
      const textResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate a high-end 4K fashion photography description for an exclusive editorial archive.
        MANDATORY: Subject is a FEMALE model. 
        STYLE: Provocative, luxury, avant-garde. The focus is on tight silhouettes, ultra-mini lengths, daring necklines, and deep slits.
        
        Contextual Elements: ${selectedEnv}, ${selectedLight}, ${selectedComp}, ${selectedFabric}, ${selectedTrend}.
        
        PROMPT ENGINEERING DIRECTIVES (for "imagePrompt"):
        The output MUST be a technical, hyper-detailed prompt designed for high-end AI image generators (8K, RAW, realistic). 
        You MUST use the following EXACT structural format in the "imagePrompt":
        
        PART 1: [MODEL SPECIFICATIONS]
        (Describe in extreme detail: Facial geometry, skin macro-textures, pore visibility, catchlights in the eyes, exact hair strand behavior, and professional editorial posture).
        
        PART 2: [GARMENT & COUTURE SPECIFICATIONS]
        (Describe in extreme detail: The piece's construction, fabric weight, how the light interacts with the material, stitch visibility, and the precise "dar ve kısa" silhouette interaction with the model's form).
        
        PART 3: [ENVIRONMENT & LIGHTING]
        (Detailed architectural lighting and environmental atmosphere).
        
        PART 4: [TECHNICAL PARAMETERS]
        (Photography equipment and settings).
        
        PART 5: [CONSISTENCY & QUALITY]
        (Append the EXACT quality control text below here).

        QUALITY CONTROL TEXT (MANDATORY APPEND): 
        "The faces of the models should not change or deteriorate; their faces must be preserved in every shooting angle. No anatomical deterioration should occur. Any potential deterioration must be pre-checked and corrected, and it should not prevent the formation of the prompt."

        OUTPUT REQUIREMENTS:
        1. "imagePrompt": A MASTERPIECE-level, structured technical prompt as described above. (ALWAYS IN ENGLISH).
        2. "displayDescription": A sophisticated, poetic editorial description of the piece and its aesthetic narrative in ${targetLang}.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              imagePrompt: { type: Type.STRING },
              displayDescription: { type: Type.STRING }
            },
            required: ["imagePrompt", "displayDescription"]
          }
        }
      });

      const content = JSON.parse(textResponse.text || "{}");
      
      if (!content.imagePrompt) {
        console.warn(`Attempt ${attempts}: Empty prompt generated, retrying...`);
        continue;
      }

      // 2. Generate high-quality image using the ENGLISH prompt
      const imageResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: {
          parts: [
            { text: `${content.imagePrompt}. High-end commercial production, FEMALE MODEL ONLY, vibrant color palette, ultra-sharp focus, editorial look.` }
          ]
        },
        config: {
          imageConfig: {
            aspectRatio: "3:4"
          }
        }
      });

      let imageUrl = "";
      for (const part of imageResponse.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (!imageUrl) {
        console.warn(`Attempt ${attempts}: Image blocked, retrying...`);
        continue;
      }

      const compressedImageUrl = await compressImage(imageUrl, 2048, 0.75);
      const publishTime = forcedTimestamp || Date.now();
      const now = new Date(publishTime);
      const dateKey = now.toISOString().split('T')[0];

      const piece = {
        imageUrl: compressedImageUrl,
        timestamp: publishTime,
        dateKey,
        location: selectedEnv,
        prompt: content.imagePrompt,
        description: content.displayDescription,
        model: "Gemini 2.5 Flash Image",
        isExample: true
      };

      // 4. Persist to Firestore
      try {
        const docRef = await addDoc(collection(db, "entries"), piece);
        return { ...piece, id: docRef.id };
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, "entries");
        return { ...piece, id: crypto.randomUUID() };
      }

    } catch (error: any) {
      const errorMsg = error?.message || JSON.stringify(error);
      
      // If it's a quota error, we should NOT retry internally, but propagate it so the UI handles it
      if (errorMsg.includes("RESOURCE_EXHAUSTED") || errorMsg.includes("429")) {
        throw error;
      }

      console.error(`Attempt ${attempts} failed:`, errorMsg);
      
      if (attempts >= maxAttempts) {
        throw new Error(`Görsel oluşturma ${maxAttempts} denemeden sonra başarısız oldu. Lütfen sistem durumunu kontrol edin.`);
      }
      
      // Wait a bit before next attempt to avoid spamming if there's a transient issue
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

async function compressImage(base64: string, maxWidth: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to JPEG for better compression than PNG
      const compressed = canvas.toDataURL('image/jpeg', quality);
      resolve(compressed);
    };
    img.onerror = reject;
  });
}
