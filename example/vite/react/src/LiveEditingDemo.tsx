import React, { useState } from 'react';
import './LiveEditingDemo.css';

// Example component showcasing various editable elements
const LiveEditingDemo: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);

  return (
    <div className="live-demo-container">
      <header className="demo-header">
        <h1>Advanced Live Editing Demo</h1>
        <p className="header-subtitle">
          Explore the full capabilities of Vaji live editor
        </p>
      </header>

      <section className="demo-section">
        <h2>Text Content Editing</h2>
        <div className="content-grid">
          <div className="demo-card">
            <h3>Simple Text</h3>
            <p>This is a simple paragraph that can be edited in real-time.</p>
          </div>
          
          <div className="demo-card">
            <h3>Formatted Text</h3>
            <p className="formatted-text">
              This text has <strong>bold</strong> and <em>italic</em> formatting.
            </p>
          </div>
          
          <div className="demo-card">
            <h3>Multi-line Content</h3>
            <div className="multi-line">
              <p>Line one of multi-line content</p>
              <p>Line two with different styling</p>
              <p className="highlighted">Line three with highlights</p>
            </div>
          </div>
        </div>
      </section>

      <section className="demo-section">
        <h2>CSS Class Editing</h2>
        <div className="class-demo">
          <div className="style-showcase primary">
            <p>This element uses the 'primary' theme</p>
          </div>
          <div className="style-showcase secondary">
            <p>This element uses the 'secondary' theme</p>
          </div>
          <div className="style-showcase success">
            <p>This element uses the 'success' theme</p>
          </div>
        </div>
      </section>

      <section className="demo-section">
        <h2>Interactive Elements</h2>
        <div className="interactive-demo">
          <button 
            className="toggle-btn"
            onClick={() => setIsVisible(!isVisible)}
          >
            Toggle Visibility
          </button>
          
          {isVisible && (
            <div className="toggleable-content">
              <h4>Dynamic Content</h4>
              <p>This content can be toggled and also edited live!</p>
            </div>
          )}
        </div>
      </section>

      <section className="demo-section">
        <h2>Image Editing</h2>
        <div className="image-demo">
          <div className="image-card">
            <img 
              src="/vite.svg" 
              alt="Vite logo" 
              className="demo-image"
            />
            <p>Replace this image by clicking on it</p>
          </div>
          
          <div className="image-card">
            <img 
              src="/react.svg" 
              alt="React logo" 
              className="demo-image spinning"
            />
            <p>Animated images are also editable</p>
          </div>
        </div>
      </section>

      <footer className="demo-footer">
        <p className="footer-text">
          Made with ❤️ using Vaji Live Editor
        </p>
      </footer>
    </div>
  );
};

export default LiveEditingDemo;
