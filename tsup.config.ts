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
  clean: false,
  dts: false,
  platform: 'browser',
  treeshake: true,
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env.NEXT_PUBLIC_SPORTS_REMINDER_SUPABASE_URL': JSON.stringify(''),
    'process.env.NEXT_PUBLIC_SPORTS_REMINDER_SUPABASE_ANON_KEY': JSON.stringify(''),
  },
  outExtension() {
    return {
      js: '.js',
    };
  },
});
