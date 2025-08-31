# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

# Vaji Live Editor - React Example

This is a comprehensive example demonstrating how to use the Vaji live editor plugin with a Vite React project.

## Features Demonstrated

- **Real-time text editing**: Edit text content directly in the browser
- **CSS class modifications**: Change CSS classes on the fly
- **Image management**: Upload and replace images dynamically
- **Live component updates**: See changes instantly without page refresh

## Setup

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Start the development server**:
   ```bash
   pnpm dev
   ```

3. **Open your browser** and navigate to the local development URL (usually `http://localhost:5173`)

## How It Works

### Configuration

The Vaji plugin is configured in `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import viteReactLiveEditor from 'vaji'

export default defineConfig({
  plugins: [
    react(),
    viteReactLiveEditor({ isEditable: true })
  ],
})
```

### Editable Elements

The plugin automatically detects and makes the following elements editable:

1. **Text Content**: Any text within JSX elements
2. **CSS Classes**: className attributes on elements
3. **Images**: src attributes and image imports

### Live Editing Features

- **Click on any text** to edit it inline
- **Modify CSS classes** to change styling
- **Upload new images** to replace existing ones
- **See changes instantly** without page refresh

## API Endpoints

When `isEditable: true` is set, the plugin creates internal API endpoints:

- `POST /vaji-internal/update-component` - Updates component content
- Supports both JSON and multipart/form-data for file uploads

## Example Components

The `App.tsx` file includes several examples of editable content:

- Main heading: "Vaji Live Editor Demo"
- Subtitle with custom styling
- Interactive description text
- Call-to-action section
- Feature cards with different content types
- Images with dynamic replacement

## Development Notes

- The plugin works in development mode when `isEditable: true`
- Changes are persisted to the actual source files
- Supports TypeScript and modern React patterns
- Compatible with Vite's HMR (Hot Module Replacement)

## Troubleshooting

1. **Import errors**: Make sure the vaji package is properly built (`pnpm build` in the main package)
2. **Peer dependencies**: Install `formidable` if you encounter peer dependency warnings
3. **Type errors**: Ensure TypeScript compilation is successful

## Learn More

- [Vite Documentation](https://vite.dev/)
- [React Documentation](https://react.dev/)
- [Vaji Plugin Repository](../../..)

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
