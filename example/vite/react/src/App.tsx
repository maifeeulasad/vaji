import { useState } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';
import LiveEditingDemo from './LiveEditingDemo';
import UsageGuide from './UsageGuide';
function App() {
  const [count, setCount] = useState(0);
  const [showDemo, setShowDemo] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  return <>
      <div>
        {/* <a href="https://vite.dev" target="_blank"> */}
          <img src={viteLogo} className="logo" alt="Vite logo" />
        {/* </a> */}
        {/* <a href="https://react.dev" target="_blank"> */}
          <img src="/vaji/src/assets/cloud-fog-svgrepo-com.svg" className="logo react" alt="React logo" />
        {/* </a> */}
      </div>
      
      {/* Editable heading */}
      <h1>Vaji Live Editor Demo</h1>
      
      {/* Editable subheading */}
      <h2 className="subtitle">Experience Real-Time Editing</h2>
      
      <div className="card">
        <button onClick={() => setCount(count => count + 1)}>
          count is {count}
        </button>
        
        <button onClick={() => setShowDemo(!showDemo)} style={{
        marginLeft: '1rem'
      }}>
          {showDemo ? 'Hide' : 'Show'} Advanced Demo
        </button>
        
        <button onClick={() => setShowGuide(!showGuide)} style={{
        marginLeft: '1rem'
      }}>
          {showGuide ? 'Hide' : 'Show'} Usage Guide
        </button>
        
        {/* Editable description */}
        <p className="description">
          This is a live-editable paragraph. Try editing this text in real-time!
        </p>
        
        {/* Editable call-to-action */}
        <p className="cta">
          Welcome to Vaji - the ultimate live editing experience for React components
        </p>
      </div>
      
      {/* Features section with editable content */}
      <div className="features">
        <div className="feature-card">
          <h3>Real-Time Editing</h3>
          <p>Edit text content instantly without page refresh</p>
        </div>
        
        <div className="feature-card">
          <h3>CSS Class Updates</h3>
          <p className="highlight">Modify CSS classes on the fly</p>
          <p>Not implemented as of now</p>
        </div>
        
        <div className="feature-card">
          <h3>Image Management</h3>
          <img src={reactLogo} className="feature-icon" alt="Feature icon" />
          <p>Upload and replace images dynamically</p>
        </div>
      </div>
      
      {/* Usage guide */}
      {showGuide && <UsageGuide />}
      
      {/* Advanced demo component */}
      {showDemo && <LiveEditingDemo />}
      
      <p className="read-the-docs">
        Click anywhere to start editing with Vaji live editor
      </p>
    </>;
}
export default App;