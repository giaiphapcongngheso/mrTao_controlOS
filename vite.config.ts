import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import pkg from './package.json' with { type: 'json' };

function kiotVietProxyPlugin(): Plugin {
  return {
    name: 'kiotviet-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const [pathname, search] = (req.url || '').split('?');

        if (pathname.startsWith('/api/kiotviet/')) {
          try {
            const searchParams = new URLSearchParams(search || '');
            const clientId = searchParams.get('clientId');
            const clientSecret = searchParams.get('clientSecret');
            const retailer = searchParams.get('retailer');
            const pageSize = searchParams.get('pageSize') || '100';

            if (!clientId || !clientSecret || !retailer) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Missing credentials' }));
              return;
            }

            // 1. Get OAuth2 Token from KiotViet
            const tokenForm = new URLSearchParams({
              scopes: 'PublicApi.Access',
              grant_type: 'client_credentials',
              client_id: clientId,
              client_secret: clientSecret,
            });

            const tokenRes = await fetch('https://id.kiotviet.vn/connect/token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: tokenForm.toString(),
            });

            if (!tokenRes.ok) {
              const errText = await tokenRes.text();
              throw new Error(`KiotViet Token error: ${errText}`);
            }

            const tokenData = await tokenRes.json() as { access_token?: string };
            const accessToken = tokenData.access_token;
            if (!accessToken) {
              throw new Error('KiotViet token response missing access_token');
            }

            // 2. Fetch data from KiotViet API
            const entity = pathname.split('/').pop() || 'products';
            const targetUrl = new URL(`https://public.kiotapi.com/${entity}`);
            if (entity === 'products') {
              targetUrl.searchParams.set('includeInventory', 'true');
              targetUrl.searchParams.set('includePricebook', 'true');
            }
            targetUrl.searchParams.set('pageSize', pageSize);

            const apiRes = await fetch(targetUrl.toString(), {
              headers: {
                Retailer: retailer,
                Authorization: `Bearer ${accessToken}`,
              },
            });

            const apiData = await apiRes.json();
            res.statusCode = apiRes.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(apiData));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown proxy error' }));
          }
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    base: '/',
    define: {
      __APP_VERSION__: JSON.stringify(process.env.VITE_APP_VERSION || pkg.version),
    },
    plugins: [react(), tailwindcss(), kiotVietProxyPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@shared': path.resolve(__dirname, 'share'),
      },
    },
    // Pre-bundle heavy dependencies to reduce HTTP requests in dev mode.
    // Without this, Vite serves each internal module as a separate request,
    // causing hundreds of waterfall requests on first load.
    optimizeDeps: {
      include: [
        'firebase/app',
        'firebase/firestore',
        'firebase/auth',
        'firebase/storage',
        '@tanstack/react-router',
        '@tanstack/react-query',
        '@tanstack/react-table',
        '@tanstack/react-virtual',
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        'lucide-react',
        'motion',
        'zustand',
        'clsx',
        'tailwind-merge',
        'class-variance-authority',
        'date-fns',
        'zod',
        'react-hook-form',
        'sonner',
        'axios',
      ],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
