# vaji

## Usage

### Vite + React

```ts
...
import reactLiveEditor from 'vaji/dist/vite-react-live-editor';
...
export default defineConfig({
  plugins: [
    react(),
    ...
    reactLiveEditor({
      isEditable: true // process.env.NODE_ENV === 'development' // Only enable in dev mode
    }),
    ...
  ],
});
```