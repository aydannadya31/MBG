import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const apiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  const apiKey2 = env.GEMINI_API_KEY2 || process.env.GEMINI_API_KEY2;
  const apiKey3 = env.GEMINI_API_KEY3 || process.env.GEMINI_API_KEY3;
  const apiKey4 = env.GEMINI_API_KEY4 || process.env.GEMINI_API_KEY4;
  return {
    base: './',
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(apiKey),
      'process.env.GEMINI_API_KEY2': JSON.stringify(apiKey2),
      'process.env.GEMINI_API_KEY3': JSON.stringify(apiKey3),
      'process.env.GEMINI_API_KEY4': JSON.stringify(apiKey4),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
