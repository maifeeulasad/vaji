# vaji

## Installation

Pick command for whichever system you are using.
```
npm i vaji
yarn add vaji
pnpm add vaji
```

## Usage

### Vite + React

```ts
...
import viteReactLiveEditor from 'vaji/dist/vite-react-live-editor';
...
export default defineConfig({
  plugins: [
    react(),
    ...
    viteReactLiveEditor({
      isEditable: true // process.env.NODE_ENV === 'development' // Only enable in dev mode
    }),
    ...
  ],
});
```
