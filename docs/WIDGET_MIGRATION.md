# Widget Migration: Iframe to Web Component

The widget has been refactored from an `<iframe>` to a native **Web Component** using Shadow DOM. This provides better integration with the host website while maintaining style isolation.

## 1. Building the Widget Bundle

A new build process has been added to generate the standalone React bundle.

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the widget bundle and CSS:
   ```bash
   # Build the JS bundle
   npm run build:widget

   # Generate the CSS (ensure Tailwind processes the 'widget' folder)
   npx tailwindcss -i ./app/globals.css -o ./public/widget.css --minify
   ```

These commands will create `public/widget-bundle.js` and `public/widget.css`.

## 2. Updated Embed Code

The host website should now use the new custom element tag instead of the script-only injection.

### New Target Usage:

```html
<!-- 1. Load the script -->
<script src="https://your-domain.com/widget.js"></script>

<!-- 2. Place the custom element -->
<sports-reminder-widget
  token="YOUR_TOKEN"
  layout="sticky"
  sports="football,basketball,mma">
</sports-reminder-widget>
```

### Attributes:
- `token`: Public token of the tenant.
- `tenant`: (Alternative to token) The tenant slug.
- `layout`: `inline` (default) or `sticky`.
- `sports`: Comma-separated list of sport slugs to display.

## 3. Architecture Overview

- **`public/widget.js`**: The Custom Element definition. Handles Shadow DOM creation and dependency loading (React/ReactDOM).
- **`widget/index.tsx`**: Entry point for the React bundle.
- **`widget/standalone-form.tsx`**: The React component logic, refactored to use standard `fetch` API instead of Next.js Server Actions.
- **API Routes**:
  - `/api/widget/config`: Fetches tenant and sport configuration.
  - `/api/widget/matches`: Fetches matches or teams for selection.
  - `/api/widget/subscribe`: Handles subscription submissions.

## 4. Key Benefits

- **Performance**: No iframe overhead; React renders directly in the host's DOM context.
- **Isolation**: Shadow DOM ensures the host website's CSS does not leak into the widget, and vice versa.
- **Flexibility**: The `sticky` layout is now truly floating over the host's content without iframe-related positioning issues.
- **Transparency**: Fully transparent background by default.
