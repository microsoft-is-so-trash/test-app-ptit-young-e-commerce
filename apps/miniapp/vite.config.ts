import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { PRODUCTION_API_BASE_URL, resolveApiBaseUrl } from './src/lib/api-base-url';

export { PRODUCTION_API_BASE_URL, resolveApiBaseUrl };

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const apiBaseUrl = resolveApiBaseUrl(mode, env.VITE_API_BASE_URL);

  return {
    base: './',
    plugins: [react()],
    define: {
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(apiBaseUrl),
      // Cho phép bật Demo Mode trên Web Demo (Vercel), ưu tiên biến môi trường VITE_DEMO_MODE (mặc định 'true' nếu không khai báo khác)
      'import.meta.env.VITE_DEMO_MODE': JSON.stringify(env.VITE_DEMO_MODE || 'true'),
      'import.meta.env.VITE_DEVICE_CLIENT_MODE': JSON.stringify(
        env.VITE_DEVICE_CLIENT_MODE || '',
      ),
      'import.meta.env.VITE_DEMO_OFFLINE': JSON.stringify(
        env.VITE_DEMO_OFFLINE || 'false',
      ),
      // Web quản trị là ứng dụng riêng; cổng đăng nhập chung cần biết đường tới nó.
      'import.meta.env.VITE_ADMIN_URL': JSON.stringify(env.VITE_ADMIN_URL || ''),
    },
    resolve: {
      alias: {
        '@eco-oil/shared-types': fileURLToPath(new URL('../../packages/shared-types/src/index.ts', import.meta.url)),
      },
    },
    build: {
      modulePreload: { polyfill: false },
      rollupOptions: {
        output: {
          entryFileNames: 'assets/[name].module.js',
          chunkFileNames: 'assets/[name].[hash].module.js',
          assetFileNames: 'assets/[name][extname]',
        },
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  };
});
