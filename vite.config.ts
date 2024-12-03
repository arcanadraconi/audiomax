import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/v2': {
          target: 'https://api.play.ht',
          changeOrigin: true,
          secure: false,
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              proxyReq.setHeader('Authorization', `Bearer ${env.VITE_PLAYHT_SECRET_KEY}`);
              proxyReq.setHeader('X-User-ID', env.VITE_PLAYHT_USER_ID);
              proxyReq.setHeader('Origin', 'https://api.play.ht');
              proxyReq.setHeader('Accept', 'application/json');
              proxyReq.setHeader('Content-Type', 'application/json');
            });
          }
        },
        '/.netlify/functions/': {
          target: 'http://localhost:8888',
          changeOrigin: true,
          secure: false,
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
