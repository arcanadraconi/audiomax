import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Existing env variables
      'import.meta.env.OPENROUTER_API_KEY': JSON.stringify(env.OPENROUTER_API_KEY),
      'import.meta.env.PLAYHT_SECRET_KEY': JSON.stringify(env.PLAYHT_SECRET_KEY),
      'import.meta.env.PLAYHT_USER_ID': JSON.stringify(env.PLAYHT_USER_ID),
      // Firebase env variables
      'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(env.VITE_FIREBASE_API_KEY),
      'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(env.VITE_FIREBASE_AUTH_DOMAIN),
      'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(env.VITE_FIREBASE_PROJECT_ID),
      'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(env.VITE_FIREBASE_STORAGE_BUCKET),
      'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(env.VITE_FIREBASE_MESSAGING_SENDER_ID),
      'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(env.VITE_FIREBASE_APP_ID),
      'import.meta.env.VITE_FIREBASE_MEASUREMENT_ID': JSON.stringify(env.VITE_FIREBASE_MEASUREMENT_ID)
    },
    server: {
      proxy: {
        '/api/v2/voices': {
          target: 'https://api.play.ht',
          changeOrigin: true,
          secure: false,
          headers: {
            'Authorization': `Bearer ${env.PLAYHT_SECRET_KEY}`,
            'X-User-ID': env.PLAYHT_USER_ID
          }
        },
        '/samples': {
          target: 'https://play.ht',
          changeOrigin: true,
          secure: false
        },
        // Add proxy for our auth API
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false
        }
      }
    },
    build: {
      rollupOptions: {
        external: [],
      },
      commonjsOptions: {
        include: [/node_modules/],
        transformMixedEsModules: true
      }
    },
    optimizeDeps: {
      include: ['firebase/app', 'firebase/auth']
    },
    resolve: {
      alias: {
        '@': '/src',
      },
    }
  };
});
