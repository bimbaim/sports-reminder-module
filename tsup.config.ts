import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'widget-bundle': 'widget/widget-bundle.tsx',
  },
  format: ['iife'],
  globalName: 'SportsReminderWidgetBundle',
  minify: true,
  outDir: 'public',
  splitting: false,
  clean: false, // Don't clean public because it might contain other assets
  dts: false,
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  outExtension() {
    return {
      js: '.js',
    };
  },
});
