import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';
// import { imagetools } from 'vite-imagetools';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root: '.',
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        game: resolve(__dirname, 'game.html'),
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  publicDir: 'public',
  plugins: [
    // Plugin imagetools commenté pour éviter l'erreur de cache
    // imagetools({
    //   defaultDirectives: (url) => {
    //     // Pour les grandes images (backgrounds, bannières)
    //     if (url.pathname.includes('background') || url.pathname.includes('banniere') || url.pathname.includes('ImageVitrine')) {
    //       return new URLSearchParams({
    //         format: 'webp;jpg',
    //         quality: '75',
    //         effort: '6',
    //       });
    //     }
    //     // Pour les sprites de jeu, on garde la qualité haute
    //     if (url.pathname.includes('Buildings') || url.pathname.includes('Troops') || url.pathname.includes('Effects')) {
    //       return new URLSearchParams({
    //         format: 'png',
    //         quality: '90',
    //       });
    //     }
    //     // Par défaut pour les autres images
    //     return new URLSearchParams({
    //       format: 'webp;png',
    //       quality: '80',
    //     });
    //   },
    // }),
    // Plugin pour l'optimisation avec Sharp
    ViteImageOptimizer({
      test: /\.(jpe?g|png|gif|tiff|webp|svg|avif)$/i,
      exclude: undefined,
      include: undefined,
      includePublic: true,
      logStats: true,
      ansiColors: true,
      // Configuration spécifique pour les très grandes images
      beforeOptimize: (imagePath, quality) => {
        // Si l'image est trop grande, on réduit encore plus la qualité
        if (imagePath.includes('banniere') || imagePath.includes('paysantouroi') || imagePath.includes('evolution') || imagePath.includes('attaque')) {
          return { quality: quality * 0.6 };
        }
        return { quality };
      },
      svg: {
        multipass: true,
        plugins: [
          {
            name: 'preset-default',
            params: {
              overrides: {
                cleanupNumericValues: false,
                removeViewBox: false,
              },
              cleanupIDs: {
                minify: false,
                remove: false,
              },
              convertPathData: false,
            },
          },
          'sortAttrs',
          {
            name: 'addAttributesToSVGElement',
            params: {
              attributes: [{ xmlns: 'http://www.w3.org/2000/svg' }],
            },
          },
        ],
      },
      png: {
        quality: 40,
        compressionLevel: 9,
      },
      jpeg: {
        quality: 50,
        progressive: true,
      },
      jpg: {
        quality: 50,
        progressive: true,
      },
      tiff: {
        quality: 50,
      },
      gif: {},
      webp: {
        lossless: false,
        quality: 40,
        alphaQuality: 70,
        effort: 6,
        smartSubsample: true,
      },
      avif: {
        lossless: false,
        quality: 30,
        effort: 6,
      },
      cache: false,
      cacheLocation: undefined,
    }),
  ],
});