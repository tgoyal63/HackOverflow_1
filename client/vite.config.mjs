import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Keep the existing production smoke-check and asset-manifest URL contract.
function assetManifest() {
  return {
    name: 'asset-manifest',
    generateBundle(_options, bundle) {
      const output = Object.values(bundle);
      const entry = output.find((file) => file.type === 'chunk' && file.isEntry);
      const css = output.find((file) => file.fileName.endsWith('.css'));
      const files = Object.fromEntries(output.map((file) => [file.fileName, `/${file.fileName}`]));
      files['main.js'] = `/${entry.fileName}`;
      if (css) files['main.css'] = `/${css.fileName}`;
      this.emitFile({
        type: 'asset',
        fileName: 'asset-manifest.json',
        source: JSON.stringify({ files, entrypoints: [entry.fileName, css?.fileName].filter(Boolean) }, null, 2),
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), assetManifest()],
  build: {
    outDir: 'build',
    target: 'es2015',
    rolldownOptions: {
      output: {
        entryFileNames: 'static/js/[name].[hash].js',
        chunkFileNames: 'static/js/[name].[hash].js',
        assetFileNames: (asset) => asset.names.some((name) => name.endsWith('.css'))
          ? 'static/css/[name].[hash][extname]'
          : 'static/media/[name].[hash][extname]',
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/testSetup.js'],
    include: ['src/**/*.test.{js,jsx}'],
    restoreMocks: true,
  },
});
