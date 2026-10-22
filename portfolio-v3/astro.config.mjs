import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
    site: 'https://lingesh-dev.netlify.app',
    integrations: [react()],
    devToolbar: { enabled: false },
    vite: {
        // transformers.js is loaded on demand in the browser; pre-bundling it breaks its wasm loader
        optimizeDeps: { exclude: ['@huggingface/transformers'] }
    }
});
