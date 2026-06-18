import { GoogleGenAI, Type } from "@google/genai";
import { getActiveDb, handleFirestoreError, OperationType } from "./firebase";
import { collection, addDoc } from "firebase/firestore";

const PRIMARY_IMAGE_MODEL = "gemini-2.5-flash-image";
const FALLBACK_IMAGE_MODEL = "gemini-2.0-flash-exp-image-generation";
const PRIMARY_MODEL_LABEL = "Gemini 2.5 Flash Image";
const FALLBACK_MODEL_LABEL = "Gemini 2.0 Flash Exp Image";
const QUOTA_RESET_INTERVAL_MS = 24 * 60 * 60 * 1000;

function getActiveImageModel(): string {
  try {
    const stored = localStorage.getItem("mbg_image_model");
    if (stored === FALLBACK_IMAGE_MODEL) {
      const fallbackTime = parseInt(localStorage.getItem("mbg_fallback_timestamp") || "0", 10);
      if (Date.now() - fallbackTime > QUOTA_RESET_INTERVAL_MS) {
        localStorage.setItem("mbg_image_model", PRIMARY_IMAGE_MODEL);
        localStorage.removeItem("mbg_fallback_timestamp");
        return PRIMARY_IMAGE_MODEL;
      }
      return FALLBACK_IMAGE_MODEL;
    }
  } catch (_) {
  }
  return PRIMARY_IMAGE_MODEL;
}

function getImageModelLabel(modelName: string): string {
  return modelName === PRIMARY_IMAGE_MODEL ? PRIMARY_MODEL_LABEL : FALLBACK_MODEL_LABEL;
}

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

const STANDARD_MODEL_TYPES = [
  "A Scandinavian look female model with piercing blue eyes, high cheekbones, and short platinum blonde wet-look crop hair",
  "An East Asian high-fashion model with sharp facial geometry, strong jawline, sleek dark high ponytail, and elegant editorial gaze",
  "A Brazilian female model with sun-kissed glowing skin, long voluminous brunette waves, and confident expression",
  "A Slavic model with sharp, angelic-brutalist features, striking green eyes, and sleek straight chestnut bob hair",
  "A South Asian model with warm olive complexion, thick eyebrows, long dark braided hair, and elegant high-contrast features",
  "A Mediterranean model with warm golden skin, curly dark shoulder-length hair, and dramatic chic editorial features",
  "A red-haired Celtic model with delicate freckles, porcelain skin, long vibrant copper curls, and an intense high-fashion expression",
  "A Native American model with sleek long dark hair, strong high cheekbones, deep copper skin tone, and an iconic solemn high-fashion gaze",
  "A stunning North African Moroccan-Amazigh model with beautiful golden-bronze skin, curly dark hazelnut hair, and captivating expressive hazel eyes",
  "A Polynesian model with golden sun-kissed skin, long thick wavy black hair decorated with a tropical flower accent, strong athletic build, and elegant high-fashion friendly gaze",
  "A Central Asian Kazakh model with mesmerizing green-hazel eyes, light golden skin, straight dark hair with modern sharp bangs, and bold geometric facial structure",
  "A Middle Eastern model with captivating large dark eyes, warm almond-toned skin, thick dark wavy shoulder-length hair, and extremely elegant editorial expression"
];

const OUTFIT_STYLES = [
  {
    category: "High-end Activewear / Sporty Chic",
    description: "A futuristic athletic luxury concept featuring high-saturation neon color-blocking (e.g., safety orange, neon lime green, hot pink, and royal violet). The outfit is a sporty, high-performance stretch lycra bodycon athletic dress or a glossy two-piece dynamic running set. MANDATORY: There must be a daring front zip-up plunging decollete (front cleavage) and ultra-mini running shorts or athletic skirt with extremely high thigh-high side-slits (derin yırtmaçlı) built with sheer technical mesh borders."
  },
  {
    category: "Daily Casual Luxury / Streetwear",
    description: "A sophisticated everyday casual city street style with highly vibrant, playful patterns, psychedelic swirls, and rich primary colors. An asymmetric ribbed knit dress or a modern premium cotton-modal mini. MANDATORY: An open, plunging neck decollete, low backless detail, and a highly attractive, deep thigh-high side slit (derin yırtmaçlı) that creates spectacular dynamic leg exposure."
  },
  {
    category: "Corporate Business Couture / Office Chic",
    description: "An incredibly powerful corporate-inspired look in eye-catching, unconventional vivid colors like canary yellow, cobalt blue, or emerald green. A sharp-shouldered double-breasted structured blazer dress with fine pinstripe fabric or a tailored business pencil suit. MANDATORY: Worn without any undershirt or blouse underneath to expose a deeply plunging V-neckline cleavage (derin göğüs dekoltesi) and a highly provocative matching high-cut pencil skirt with a daring side slit (yırtmaç)."
  },
  {
    category: "Evening Gala / Avant-Garde Evening Wear",
    description: "A luxury night event masterpiece. A sculptural liquid-metal draped silk gown or satin cocktail slip in shimmering metallic magenta, burning copper, or deep electric teal. MANDATORY: An asymmetric off-the-shoulder plunging front neckline decollete (dekolte) and an extremely high, knife-edge thigh slit (yırtmaç) that shows off the model's leg clearly in an elegant editorial stance."
  },
  {
    category: "Minimalist Utility Techwear",
    description: "A modern utility outdoor look featuring tactical strap accents and micro-buckles, enhanced with bright warning-color accents (e.g. volt yellow, cyan, electric orange). A high-gloss spandex technical dress. MANDATORY: A deep low-cut chest decollete with functional zipper/buckle detailing and daring side-thigh slits (yırtmaç) revealing athletic legs."
  },
  {
    category: "Leisure Yacht Crew Chic / Resortwear",
    description: "An elite resort-style linen-blend or sheer silk chiffon dress saturated with vibrant tropical tones (sunset tangerine, turquoise, hot coral). MANDATORY: A halter-neck plunging chest decollete with bare shoulders and open back, and a floaty dual-slit (çift yırtmaçlı) flowing skirt catching the seaside breeze."
  },
  {
    category: "Glamorous Retro-Futuristic Space Age / Disco Glam",
    description: "A sparkling 1970s futuristic disco aesthetic. An ultra-cropped metallic sequin bodycon dress or glittering chainmail tunic in iridescent neon peach, shocking pink, and holographic silver. MANDATORY: There must be an extreme plunging keyhole decollete (derin dekolte) down to the navel and an asymmetrical jagged hemline with ultra-deep side slits (yırtmaç) showing off dynamic reflections."
  },
  {
    category: "Asymmetrical Cyberpunk Grunge",
    description: "An edgy, high-glam post-apocalyptic look with high-contrast acid neon paint splatters and cyber-mesh panels. A deconstructed shredded jersey mock-neck mini dress. MANDATORY: Features an open bare spine, an asymmetric chest slash decollete (göğüs dekoltesi), and two ultra-high thigh-level side slits (yırtmaç) with silver metal decorative safety-pin connectors."
  },
  {
    category: "Modern East-Asian Avant-Garde / Deconstructed Kimono",
    description: "An avant-garde interpretation of rich brocade. A high-fashion wrap-dress structured from glowing silk jacquard in contrasting electric indigo, rich gold, and cherry blossom pink. MANDATORY: Features a highly dramatic, asymmetric plunging wrapped crossover neckline (dekolte) and an extreme high-slit floor-length side drape (derin yırtmaç) showing off contrasting fluorescent lining."
  },
  {
    category: "Hollywood Gilded Diva / Crystal-Embellished Glamour",
    description: "Pure red-carpet opulence. A sheer nude mesh column dress encrusted with thousands of hand-sewn light-refracting crystals in multi-colored pastel shades or bright rainbow hues. MANDATORY: Design features a deeply hollowed back, an asymmetric sheer-lined front plunge decollete (dekolte), and a high-fashion side slit (derin yırtmaç) starting at the upper hip."
  },
  {
    category: "Ethereal Romantic Neo-Goth",
    description: "A romantic gothic look. A tiered ruffled silk-chiffon dress combining rich violet lace, crimson silk slips, and deep black tulle overlays. MANDATORY: Features a Victorian-inspired semi-sheer bustier decollete (dekolte) with corset routing and a highly volatile asymmetric multi-tiered slit skirt (yırtmaç) that expands in mid-movement."
  },
  {
    category: "Pop-Art Neo-Baroque / Sculptural Corsetry",
    description: "A highly exaggerated art-house silhouette with loud, colorful pop-art prints of geometric collage. A heavily structured satin corset dress with stiff bell sleeves and oversized structured hips. MANDATORY: Features a sharp square decollete (dekolte), metallic underwire details, and a high-fashion vertical double-slit front panel (çift yırtmaç) that reveals bright fluorescent undershorts."
  },
  {
    category: "Kinetic Fluid Wave / Wind-Tunnel Couture",
    description: "A dress designed to emulate liquid in movement. A micro-pleated lightweight organza gown in a gradient rainbow of canary yellow, sunset crimson, and electric cyan. MANDATORY: Features an open front cowl decollete (derin dekolte), ultra-low side openings, and a dynamic wind-whipped double-slit skirt (çift yırtmaç) that flows like gas when walking."
  },
  {
    category: "Architectural Origami Pleated Dress",
    description: "A structurally stiff masterpiece of modern design. Folded origami-pleated heavy-weight technical satin in bright cobalt blue, vivid coral red, and acid yellow. MANDATORY: Features a structured asymmetric 3D shoulder frame exposing an elegant decollete (dekolte), an open cutout waist, and a sharp origami-folded high-slit (yırtmaç) revealing high-contrast inner neon fabrics."
  }
];

const ENVIRONMENTS = [
  "Beach with deep blue waters, orange beach umbrellas, and volcanic black sand",
  "Futuristic high-contrast outdoor tennis court with warm magenta and emerald green flooring under a bright clear sky",
  "Luxury modern yacht deck with vibrant yellow cushions cruising the Mediterranean coast",
  "Sleek high-rise rooftop sky-bar with a panoramic city skyline view bathed in pink sunset rays",
  "Vibrant botanical garden oasis with exotic orchids, lush green palms, and reflecting ponds under towering trees",
  "Minimalist raw concrete plaza with brutalist stairs under a hyper-vivid blue sky",
  "High-speed asphalt athletics track with neon-painted lanes under bright sun",
  "Tokyo cyber-street under neon purple, bright yellow, and turquoise night lights",
  "Mid-century Parisian balcony with blooming red geraniums overlooking beautiful rooftops",
  "Majestic open-air luxury resort courtyard with glowing colorful pools, exotic marble pillars, and tall palm trees",
  "A dramatic modern lakeside deck made of treated redwood, surrounded by towering pine trees and foggy mountains",
  "Sun-bleached white stone terrace in Santorini with vibrant pink bougainvillea flowers and Aegean sea background",
  "A spectacular modern seaside drive on a winding coastal highway overlooking cliffs at dusk under colorful sky",
  "An elegant luxury restaurant terrace in Istanbul overlooking the sparkling turquoise Bosphorus"
];

const LIGHTING_MODES = [
  "Golden hour sunset casting warm orange and pink highlights",
  "Blue hour twilight with cool ambient shades of purple and blue",
  "High-contrast midday sun highlighting rich garment colors and sharp silhouettes",
  "Foggy morning light with diffuse ethereal rays reflecting colorful environments",
  "Neon city glows casting cyan, neon green, and magenta reflections",
  "Bright ring light outdoor studio setup highlighting hyper-pigmented colorful makeup and outfit colors",
  "Dramatic stage spotlight colored with deep amber or crimson gels emphasizing the garment cuts in an open-air theater",
  "Warm outdoor candlelit luxury terrace lighting with glowing golden tone reflections and ambient garden illumination",
  "Direct flash paparazzi style with high-contrast shadows and explosive vivid colors"
];

const COMPOSITIONS = [
  "Close-up portrait highlighting the neckline decollete",
  "Full-body wide shot showing the entire high-slit drape and posture",
  "Low-angle heroic shot showing the deep skirt slit and leg",
  "Side-profile action shot with fluid motion",
  "Dutch angle adding an avant-garde editorial tension",
  "Wide landscape with small subject emphasizing architectural location",
  "Upper-body medium shot focusing on neckline and posture",
  "Candid motion shot showing the high-slit skirt opening as the model walks"
];

const TREND_CUES = [
  "Skin-tight (dar) high-fashion silhouettes in electric neon colors emphasizing body curvature",
  "Ultra-mini bodycon dresses with provocative short hemlines in vibrant shades",
  "Deep decollete (dekolte) designs, plunging necklines, and backless details on rich multi-colored garments",
  "High-slit (derin yırtmaçlı) skirts and dresses showing leg movement with contrasting inner lining color",
  "Sophisticated second-skin materials in high-saturation primary colors layered over mini bodycon cuts",
  "Minimalist yet daring 'dar ve kısa' (tight & mini) editorial looks with bright color blocks",
  "Sheer technical fabrics in neon colors with strategic cut-outs and revealing silhouettes",
  "Sleek lycra-blend mini dresses in bright fluorescent yellow and cobalt blue emphasizing extreme form-fitting elegance"
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
    let currentImageModel = "";
    try {
      let selectedModelType = "";
      try {
        const lastIndexStr = localStorage.getItem("high_fashion_last_model_index");
        let nextIndex = 0;
        if (lastIndexStr !== null) {
          const lastIndex = parseInt(lastIndexStr, 10);
          nextIndex = (lastIndex + 1) % STANDARD_MODEL_TYPES.length;
        } else {
          nextIndex = Math.floor(Math.random() * STANDARD_MODEL_TYPES.length);
        }
        localStorage.setItem("high_fashion_last_model_index", nextIndex.toString());
        selectedModelType = STANDARD_MODEL_TYPES[nextIndex];
      } catch (e) {
        selectedModelType = STANDARD_MODEL_TYPES[Math.floor(Math.random() * STANDARD_MODEL_TYPES.length)];
      }

      let selectedOutfit;
      try {
        const lastOutfitIndexStr = localStorage.getItem("high_fashion_last_outfit_index");
        let nextOutfitIndex = 0;
        if (lastOutfitIndexStr !== null) {
          const lastOutfitIndex = parseInt(lastOutfitIndexStr, 10);
          nextOutfitIndex = (lastOutfitIndex + 1) % OUTFIT_STYLES.length;
        } else {
          nextOutfitIndex = Math.floor(Math.random() * OUTFIT_STYLES.length);
        }
        localStorage.setItem("high_fashion_last_outfit_index", nextOutfitIndex.toString());
        selectedOutfit = OUTFIT_STYLES[nextOutfitIndex];
      } catch (e) {
        selectedOutfit = OUTFIT_STYLES[Math.floor(Math.random() * OUTFIT_STYLES.length)];
      }

      const selectedEnv = ENVIRONMENTS[Math.floor(Math.random() * ENVIRONMENTS.length)];
      const selectedLight = LIGHTING_MODES[Math.floor(Math.random() * LIGHTING_MODES.length)];
      const selectedComp = COMPOSITIONS[Math.floor(Math.random() * COMPOSITIONS.length)];
      const selectedTrend = TREND_CUES[Math.floor(Math.random() * TREND_CUES.length)];
      const selectedFabric = ALLOWED_FABRICS[Math.floor(Math.random() * ALLOWED_FABRICS.length)];
      
      // 1. Generate description (for UI) AND image prompt (for AI)
      const textResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Generate a high-end 4K fashion photography description for an exclusive editorial archive.
        
        MANDATORY COLOUR PHILOSOPHY: The output image MUST feature extremely vibrant, colorful, and multi-colored elements. Avoid dull greys, monochromatic blacks, or muted tones. Incorporate rich, highly saturated hues, vivid neon highlights, glowing gradients, or color-blocked combinations (such as striking cobalt, blazing orange, hot pink, emerald green, and deep royal violet) to make the photograph incredibly lively and dramatic.
        
        MANDATORY SUBJECT: Female model specified as: ${selectedModelType}.
        OUTFIT STYLE CATEGORY: ${selectedOutfit.category}.
        OUTFIT STYLE REQUIREMENT: ${selectedOutfit.description}.
        
        STRICT ENVIRONMENT & EXCLUSION RULES (CRITICAL):
        - The image background and scene MUST STRICTLY be OUTDOOR, OPEN-AIR, or SEMI-OPEN architectural luxury terrace environments.
        - Absolutely INDOOR scenes, enclosing walls, building interiors, store interiors, or closed-off hallways are STRICTLY FORBIDDEN.
        - Ensure active background vistas such as sparkling sea horizons, gorgeous towering trees, or grand cityscapes under natural skies.
        
        ADDITIONAL MANDATORY DETAILS FOR THE IMAGED OUTFIT:
        - Must strictly include a daring low-cut/cleavage/backless detail (dekolte).
        - Must strictly include a deep, attractive thigh-high slit (derin yırtmaç) showing leg movement in the pose.
        - Ensure extreme outfit diversity and uniqueness: every dress or garment design MUST feature completely original structural attributes, avant-garde tailoring details, varying geometric cutouts, asymmetric hemlines, distinctive collar types, diverse sleeve concepts (e.g. dramatic bishop sleeves, structured high-capped shoulders, extreme bell flares, asymmetrical single-shoulder wraps, or bold halter designs), custom metallic ornaments, or complex layered drapery. Absolutely avoid repeating basic silhouettes. Each design must look like a unique, bespoke haute couture masterpiece.
        - Ensure great variety in hairstyles, ethnicity, facial geometry, and high-quality photography set surroundings.
        
        PHYSICAL ENVIRONMENT & SCENE INTERACTION RULES (MANDATORY FOR NATURAL REALISM):
        - The model and her outfit MUST physically interact with the environment:
          1. Wind & Motion: If the background is airy or outdoors, describe how the wind dynamically sweeps her hair strands and billows/drags the light fabrics (silk/chiffon) to show natural aerodynamic tension and movement.
          2. Light Caustics & Reflection Bounces: Ambient lighting from the scenery must cast colored reflections (rim light/bounce light) on her skin and dress. If there is water, marble, or metallic surfaces nearby, specify ray-traced reflections, shimmering ripple caustics, and soft ambient occlusion shadows beneath her heels.
          3. Tactile Contact & Gravity: Describe the clothing bowing to gravity, creating realistic folds or wrinkles at joints (elbows, waist, knees) and showing genuine weight, stretch, and fabric friction against her body.
          4. Surface Interaction: The model should touch her surroundings, or have her weight realistically balanced on modern chairs, rocky shorelines, elegant stairs, or yachts, creating real shadow contact points to prevent a "photoshopped" or floating look.
        
        ULTRA-REALISTIC HUMAN TEXTURES (ANTI-AI-SLOP DIRECTIVES):
        - Absolutely NO airbrushed, plastic, or doll-like skins.
        - Mandate micro-textures: real skin pore visibility under high-end studio lenses, delicate goosebumps, tiny birthmarks, fine peach fuzz on the cheeks in backlit conditions, realistic muscle definition, and a natural non-greasy skin glow or satin sweat sheen.
        - Hair must exhibit individual random flyaway strands, natural roots, and dimensional volume instead of flat solid helmet shapes.
        
        Contextual Elements: ${selectedEnv}, ${selectedLight}, ${selectedComp}, ${selectedFabric}, ${selectedTrend}.
        
        PROMPT ENGINEERING DIRECTIVES (for "imagePrompt"):
        The output MUST be a technical, hyper-detailed prompt designed for high-end AI image generators (8K, RAW, realistic). 
        You MUST use the following EXACT structural format in the "imagePrompt":
        
        PART 1: [MODEL SPECIFICATIONS]
        (Describe in extreme detail: Facial geometry, authentic skin macro-textures, pore definition, lifelike catchlights in her eyes, exact hair strand behavior with flyaways, and professional editorial posture matching the chosen model profile. Reference how her gaze connects with the camera lens naturally).
        
        PART 2: [GARMENT & COUTURE SPECIFICATIONS]
        (Describe in extreme detail: The piece's custom construction of category "${selectedOutfit.category}", complex fabric weight and tactile weave texture of ${selectedFabric}, rich vibrant multi-colored fabric colors, how the light interacts with the material via specular highlights, micro-fold stress lines, visible premium stitching, and the precise silhouette interaction with the model's form. Highlight BOTH the daring decollete/cleavage AND the thigh-high side slit to expose athletic legs. Emphasize a color palette designed to pop off the screen).
        
        PART 3: [ENVIRONMENT & LIGHTING]
        (Detailed architectural lighting, real-world physics, and environmental atmosphere of: ${selectedEnv}. Integrate the specific lighting style "${selectedLight}" causing realistic light bounces on the model, casting soft natural diffusion, and projecting dramatic ambient shadows on the surrounding textures to bind the scene as a single cohesive frame).
        
        PART 4: [TECHNICAL PARAMETERS]
        (Technical photography equipment and settings: "Shot on Hasselblad H6D-100c, 85mm lens, f/2.8 aperture, cinematic soft focus, razor-sharp focus on the eyes, warm editorial color grading, natural film grain, realistic exposure, hyper-realistic volumetric raytraced lighting").
        
        PART 5: [CONSISTENCY & QUALITY]
        (Append the EXACT quality control text below here).
  
        QUALITY CONTROL TEXT (MANDATORY APPEND): 
        "The faces of the models should not change or deteriorate; their faces must be preserved in every shooting angle. No anatomical deterioration should occur. Any potential deterioration must be pre-checked and corrected, and it should not prevent the formation of the prompt."
  
        OUTPUT REQUIREMENTS:
        1. "imagePrompt": A MASTERPIECE-level, structured technical prompt as described above. (ALWAYS IN ENGLISH).
        2. "displayDescription": A sophisticated, poetic editorial description of the piece and its aesthetic narrative in ${targetLang}. Describe the specific category (${selectedOutfit.category}) and how the elegant cleavage (dekolte) and thigh-slit (yırtmaç) define its modern form. Detail the bright colors and colorful narrative of the look.`,
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
      currentImageModel = getActiveImageModel();
      const imageResponse = await ai.models.generateContent({
        model: currentImageModel,
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
      
      const getTRDateKeyLocal = (timestamp: Date | number): string => {
        const d = new Date(timestamp);
        try {
          const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Europe/Istanbul',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          });
          return formatter.format(d);
        } catch (e) {
          const trDate = new Date(d.getTime() + 3 * 60 * 60 * 1000);
          return trDate.toISOString().split('T')[0];
        }
      };

      const dateKey = getTRDateKeyLocal(publishTime);

      const piece = {
        imageUrl: compressedImageUrl,
        timestamp: publishTime,
        dateKey,
        location: `${selectedEnv} (${selectedOutfit.category})`,
        prompt: content.imagePrompt,
        description: content.displayDescription,
        model: getImageModelLabel(currentImageModel),
        isExample: true
      };

      // 4. Persist to Firestore
      try {
        const docRef = await addDoc(collection(getActiveDb(), "entries"), piece);
        return { ...piece, id: docRef.id };
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, "entries");
        return { ...piece, id: crypto.randomUUID() };
      }

    } catch (error: any) {
      const errorMsg = error?.message || JSON.stringify(error);
      
      if (errorMsg.includes("RESOURCE_EXHAUSTED") || errorMsg.includes("429")) {
        if (currentImageModel === PRIMARY_IMAGE_MODEL) {
          try {
            localStorage.setItem("mbg_image_model", FALLBACK_IMAGE_MODEL);
            localStorage.setItem("mbg_fallback_timestamp", Date.now().toString());
          } catch (_) {
          }
        }
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
