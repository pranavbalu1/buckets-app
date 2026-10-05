# Reusable UI components

This folder is the portable UI library for this project. It contains reusable components, their internal helpers, the dark and light theme, and example showcases. It has no imports from the finance app, Supabase, or the app's `@/` alias.

## Copying it to another repo

Copy this entire `src/components` folder into the other repo at `src/components`. Keep its internal folder structure. Install these runtime packages in the destination project:

```sh
npm install react react-dom lucide-react class-variance-authority recharts
npm install -D tailwindcss @tailwindcss/vite
```

For a TypeScript project, install React's type packages as dev dependencies too:

```sh
npm install -D @types/react @types/react-dom
```

The components are styled with Tailwind CSS v4. Add Tailwind and import the theme from the app stylesheet:

```css
@import "tailwindcss";
@import "./components/theme.css";
```

For Vite, register the plugin in `vite.config.ts` so the Tailwind import and utility classes are compiled:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({ plugins: [react(), tailwindcss()] })
```

Import components from the public entry point:

```tsx
import { Button, Card, MetricCard, Select } from './components'
```

The default theme is dark. For the provided light palette, set `data-theme="light"` on the document element; removing the attribute restores dark mode. The components use Gilroy when that font is available and fall back to system sans-serif fonts otherwise.

## Folders

- `ui/` contains reusable UI components and their private helper utilities.
- `showcase/` contains working examples that demonstrate the components.
- `TileLayout.tsx` contains optional persisted tile reordering helpers.
- `theme.css` contains the Tailwind tokens, theme palettes, and shared component classes.

The finance-specific money-flow Sankey lives in `src/features/analytics` because it depends on this app's ledger and budget models; it is intentionally outside this portable folder.
