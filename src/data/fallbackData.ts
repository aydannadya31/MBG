import { ContentEntry } from '../types';

export function getFallbackEntries(): ContentEntry[] {
  const now = Date.now();
  const getTimestampForOffset = (hoursAgo: number) => now - hoursAgo * 3600000;
  const getDateKeyForTimestamp = (ts: number) => new Date(ts).toISOString().split('T')[0];

  const items = [
    {
      id: 'fb_entry_1',
      imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=80',
      location: 'Art Deco Hotel Lobby',
      prompt: 'A high-end 8K commercial fashion photography of a female model wearing a skin-tight high-fashion yellow silhouette knit dress emphasizing body curvature. Art Deco hotel lobby background, soft warm candle light, raw color tones, professional posture, face preserved.',
      description: 'Luminous sunshine knit couture draped in a retro-modern Art Deco lobby, catching soft ambient light lines.',
      model: 'Gemini 2.5 Flash Image',
      isExample: true,
      likes: 124,
      dislikes: 3,
      offset: 0
    },
    {
      id: 'fb_entry_2',
      imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1000&q=80',
      location: 'Parisian Balcony',
      prompt: 'Daring high-fashion female model posing on a Parisian balcony overlooking the city skyline, wearing an elegant plunging neckline black haute couture silk mini gown, deep decollete, high contrast midday sun lighting.',
      description: 'Sophisticated black draped silk capturing the Parisian breeze and structured urban shadows during golden midday sun.',
      model: 'Gemini 2.5 Flash Image',
      isExample: true,
      likes: 98,
      dislikes: 1,
      offset: 1
    },
    {
      id: 'fb_entry_3',
      imageUrl: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1000&q=80',
      location: 'Brutalist Concrete Plaza',
      prompt: 'Minimalist look of a female model in a form-fitting futuristic second-skin metallic grey ensemble, sheer elastic fabric layers, harsh architectural shadow play, 8K realistic close-up.',
      description: 'Avant-garde metallic textures contrasting beautifully against minimal brutalist concrete angles and heavy sunlight shadows.',
      model: 'Gemini 2.5 Flash Image',
      isExample: true,
      likes: 87,
      dislikes: 2,
      offset: 2
    },
    {
      id: 'fb_entry_4',
      imageUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1000&q=80',
      location: 'Cloudy Wildflower Meadow',
      prompt: 'Avant-garde fashion editorial of a female model in an ultra-mini bodycon dress of delicate tulle, dynamic high-slit, cloudy wildflower meadow environment, foggy morning light.',
      description: 'Delicate cream tulle and structured corset contours blending into the organic softness of misty wildflower fields.',
      model: 'Gemini 2.5 Flash Image',
      isExample: true,
      likes: 156,
      dislikes: 4,
      offset: 3
    },
    {
      id: 'fb_entry_5',
      imageUrl: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1000&q=80',
      location: 'Tokyo Street at Night',
      prompt: 'Stunning female model posing under neon city glows of a Tokyo street at night, wearing a sleek lycra-blend mini dress emphasizing form-fitting elegance, direct flash paparazzi style.',
      description: 'Vibrant neon street reflections sculpting a sharp red and white studio-lit contemporary high-fashion stance.',
      model: 'Gemini 2.5 Flash Image',
      isExample: true,
      likes: 210,
      dislikes: 5,
      offset: 4
    },
    {
      id: 'fb_entry_6',
      imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1000&q=80',
      location: 'Desert Dunes',
      prompt: 'Editorial photography of a female model on desert dunes, lightweight liquid sateen cream colored flowing gown, golden hour sunset, dramatic stage lighting look, 8K ultra fine.',
      description: 'A liquid-cream sateen silhouette mimicking the fluid ridges of golden desert sands under a low twilight horizon.',
      model: 'Gemini 2.5 Flash Image',
      isExample: true,
      likes: 142,
      dislikes: 2,
      offset: 5
    }
  ];

  return items.map(item => {
    const ts = getTimestampForOffset(item.offset);
    return {
      id: item.id,
      imageUrl: item.imageUrl,
      location: item.location,
      prompt: item.prompt,
      description: item.description,
      model: item.model,
      isExample: item.isExample,
      likes: item.likes,
      dislikes: item.dislikes,
      timestamp: ts,
      dateKey: getDateKeyForTimestamp(ts)
    };
  });
}
