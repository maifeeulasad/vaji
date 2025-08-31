# Vaji Live Editor Example - Project Overview

## 🎯 What We've Created

A comprehensive Vite React project that demonstrates the full capabilities of the Vaji live editor plugin. This example showcases real-time editing of React components without page refresh.

## 📁 Project Structure

```
/home/maifee/codes/vaji/example/vite/react/
├── src/
│   ├── App.tsx                 # Main component with basic live editing examples
│   ├── App.css                 # Enhanced styles for the demo
│   ├── LiveEditingDemo.tsx     # Advanced demo component
│   ├── LiveEditingDemo.css     # Styles for advanced demo
│   ├── UsageGuide.tsx          # Interactive usage guide
│   ├── UsageGuide.css          # Styles for usage guide
│   └── main.tsx                # Entry point
├── vite.config.ts              # Vite configuration with Vaji plugin
├── package.json                # Dependencies including vaji package
└── README.md                   # Detailed documentation
```

## ⚡ Key Features Demonstrated

### 1. **Text Content Editing**
- Click on any text to edit inline
- Real-time updates without page refresh
- Support for formatted text and multi-line content

### 2. **CSS Class Modifications**
- Dynamic styling changes
- Theme switching capabilities
- Visual feedback for class updates

### 3. **Image Management**
- Click-to-replace functionality
- File upload support
- Animated images support

### 4. **Interactive Components**
- Toggle-able content sections
- Button interactions
- State management integration

## 🔧 Configuration

The Vaji plugin is configured in `vite.config.ts`:

```typescript
import viteReactLiveEditor from 'vaji'

export default defineConfig({
  plugins: [
    react(),
    viteReactLiveEditor({ isEditable: true })
  ],
})
```

## 🚀 Running the Example

1. **Navigate to the project**:
   ```bash
   cd /home/maifee/codes/vaji/example/vite/react
   ```

2. **Install dependencies** (already done):
   ```bash
   pnpm install
   ```

3. **Start development server** (currently running):
   ```bash
   pnpm dev
   ```

4. **Open browser**: Navigate to `http://localhost:5173/`

## 🎮 How to Use

### Basic Editing
- **Text**: Click on any text to edit inline
- **Buttons**: Use "Show/Hide" buttons to toggle different sections
- **Counter**: Click the count button to test React state updates

### Advanced Features
- Click "Show Advanced Demo" to see more complex examples
- Click "Show Usage Guide" for interactive instructions
- Each section demonstrates different aspects of live editing

### Component Sections
1. **Main Demo**: Basic text and image editing
2. **Usage Guide**: Interactive instructions
3. **Advanced Demo**: Complex layouts and interactions

## 📝 Components Overview

### App.tsx
- Main entry component
- Basic live editing examples
- Toggle controls for other sections
- Feature showcase cards

### LiveEditingDemo.tsx
- Advanced editing scenarios
- Multiple content types
- Interactive elements
- Image replacement demos

### UsageGuide.tsx
- Step-by-step instructions
- Best practices
- Usage tips and notes

## 🎨 Styling

- Modern CSS with gradients and animations
- Responsive design for mobile/desktop
- Hover effects and transitions
- Dark theme with accent colors

## 🔍 Technical Details

### Dependencies
- **vaji**: The live editor plugin (local package)
- **formidable**: Required peer dependency for file uploads
- **vite**: Build tool and dev server
- **react**: UI framework

### Plugin Integration
- Automatic detection of editable elements
- Internal API endpoints for updates
- File system integration for persistence
- Hot module replacement compatibility

## 🎯 Learning Outcomes

This example demonstrates:
- How to integrate Vaji with a React project
- Real-time editing capabilities
- Component architecture for editable content
- Best practices for live editing UIs
- Plugin configuration and setup

## 🔗 Next Steps

1. **Explore the live demo**: Open the browser and interact with elements
2. **Edit content**: Try modifying text, classes, and images
3. **Check source files**: See how changes persist to the actual files
4. **Customize**: Modify the components to fit your needs

## 🛠️ Development Notes

- Server is running on `http://localhost:5173/`
- Plugin debug mode is enabled
- All changes are saved to source files
- TypeScript compilation is successful
- All components are properly integrated

**Status**: ✅ Ready to use and explore!
