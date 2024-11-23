import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      'import.meta.env.OPENROUTER_API_KEY': JSON.stringify(env.OPENROUTER_API_KEY),
      'import.meta.env.PLAYHT_SECRET_KEY': JSON.stringify(env.PLAYHT_SECRET_KEY),
      'import.meta.env.PLAYHT_USER_ID': JSON.stringify(env.PLAYHT_USER_ID)
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
        }
      }
    }
  };
});
